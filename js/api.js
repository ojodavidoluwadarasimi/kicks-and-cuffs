/* ==========================================================
   KICKS & CUFFS  |  everything that talks to Supabase
   Pages never call Supabase directly. They use this one object.

   Customers  : payOnline, verifyPayment, createOrder, lookup, submitPayment, cancel, myOrders
   Accounts   : signUp, signIn, signOut, resetPassword, updatePassword,
                updateProfile, uploadAvatar
   The seller : sellerSignIn, orders, decide, saveProduct, deleteProduct,
                uploadProductImage, saveStock, saveSettings, bank
   ========================================================== */

const Api = (() => {
  const { sb, state } = Kc;

  /* Errors from the database arrive as "field::message". Turn them into something a person can read. */
  function fail(error) {
    const m = String((error && error.message) || "");
    const i = m.indexOf("::");
    if (i > 0 && /^[a-z_]+$/.test(m.slice(0, i))) return Object.assign(new Error(m.slice(i + 2)), { field: m.slice(0, i), code: m.slice(0, i) });
    if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return Object.assign(new Error("Could not reach the store. Check your internet and try again."), { code: "network" });
    if (/Invalid login credentials/i.test(m)) return Object.assign(new Error("Wrong email or password."), { code: "login" });
    if (/Email not confirmed/i.test(m)) return Object.assign(new Error("Please confirm your email first. We sent you a link."), { code: "unconfirmed" });
    if (/already registered|already been registered/i.test(m)) return Object.assign(new Error("That email already has an account. Try logging in."), { code: "exists" });
    if (/rate limit|too many/i.test(m)) return Object.assign(new Error("Too many tries. Please wait a few minutes and try again."), { code: "rate" });
    if (/Password should be/i.test(m)) return Object.assign(new Error("Use a password with at least 8 characters."), { code: "weak" });
    if (/row-level security|permission denied|not authorized/i.test(m)) return Object.assign(new Error("You do not have permission to do that."), { code: "forbidden" });
    return Object.assign(new Error(m || "Something went wrong. Please try again."), { code: "unknown" });
  }
  function need() {
    if (!sb) throw Object.assign(new Error("The store is not connected. Please try again later."), { code: "network" });
    return sb;
  }
  async function rpc(name, args) {
    const { data, error } = await need().rpc(name, args);
    if (error) throw fail(error);
    return data;
  }
  async function run(q) {
    const { data, error } = await q;
    if (error) throw fail(error);
    return data;
  }

  /* shrink a photo in the browser before uploading, so pages stay fast */
  async function shrink(file, max, quality) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Please choose a JPG, PNG or WebP photo.");
    if (file.size > 12 * 1024 * 1024) throw new Error("That photo is too large. Please choose one under 12 MB.");
    let bmp;
    try { bmp = await createImageBitmap(file); } catch (e) { throw new Error("We could not read that photo."); }
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("We could not prepare that photo."))), "image/jpeg", quality));
  }

  /* ---------------- customers ---------------- */
  const createOrder = (payload) => rpc("create_order", { p: payload });
  const lookup = (id, phone) => rpc("track_order", { p_id: id, p_phone: phone });
  const submitPayment = (id, phone, reference) => rpc("submit_payment", { p_id: id, p_phone: phone, p_reference: reference || "" });
  const cancel = (id, phone) => rpc("cancel_order", { p_id: id, p_phone: phone });
  const myOrders = () => rpc("my_orders", {});
  const checkCode = (code, subtotal) => rpc("check_code", { p_code: code, p_subtotal: subtotal });

  /* online payment (Paystack), handled by a Supabase Edge Function so the secret key never reaches the browser */
  async function pay(body) {
    let r, d;
    try {
      r = await fetch(window.KC_CONFIG.supabaseUrl + "/functions/v1/paystack", { method: "POST", headers: { "Content-Type": "application/json", apikey: window.KC_CONFIG.supabaseKey }, body: JSON.stringify(body) });
      d = await r.json();
    } catch (e) { throw fail({ message: "Failed to fetch" }); }
    if (!r.ok) throw Object.assign(new Error(d.error || "Payment could not be started."), { code: "pay" });
    return d;
  }
  const payOnline = (id, phone) => pay({ action: "init", id, phone, returnUrl: location.origin + location.pathname + "?order=" + encodeURIComponent(id) });
  const verifyPayment = (id, phone, reference) => pay({ action: "verify", id, phone, reference });

  /* ---------------- accounts ---------------- */
  async function refreshProfile() {
    const { data } = await need().auth.getSession();
    state.user = data && data.session ? data.session.user : null;
    state.profile = null;
    if (state.user) state.profile = await run(sb.from("profiles").select("*").eq("id", state.user.id).maybeSingle());
    return state.profile;
  }
  async function signUp(email, password, fullName) {
    const { data, error } = await need().auth.signUp({ email, password, options: { data: { full_name: fullName }, emailRedirectTo: location.origin + location.pathname.replace(/[^/]*$/, "") + "account.html" } });
    if (error) throw fail(error);
    // when email confirmation is switched on, there is no session until the link is clicked
    if (data.session) await refreshProfile();
    return { needsConfirm: !data.session };
  }
  async function signIn(email, password) {
    const { error } = await need().auth.signInWithPassword({ email, password });
    if (error) throw fail(error);
    return refreshProfile();
  }
  async function signOut() { await need().auth.signOut(); state.user = null; state.profile = null; }
  async function resetPassword(email) {
    const { error } = await need().auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname.replace(/[^/]*$/, "") + "account.html" });
    if (error) throw fail(error);
  }
  async function updatePassword(next) {
    if (String(next).length < 8) throw Object.assign(new Error("Use a password with at least 8 characters."), { code: "weak" });
    const { error } = await need().auth.updateUser({ password: next });
    if (error) throw fail(error);
  }
  async function updateProfile(fields) {
    state.profile = await run(need().from("profiles").update(fields).eq("id", state.user.id).select().single());
    return state.profile;
  }
  async function uploadAvatar(file) {
    const blob = await shrink(file, 480, 0.85);
    const path = state.user.id + "/avatar.jpg";
    const up = await sb.storage.from("avatars").upload(path, blob, { upsert: true, contentType: "image/jpeg", cacheControl: "3600" });
    if (up.error) throw fail(up.error);
    const url = sb.storage.from("avatars").getPublicUrl(path).data.publicUrl + "?v=" + Date.now();
    return updateProfile({ avatar_url: url });
  }

  /* ---------------- the seller ---------------- */
  const isSeller = () => !!(state.profile && state.profile.role === "admin");
  async function sellerSignIn(login, password) {
    const email = await loginEmail(login);
    let p; try { p = await signIn(email, password); } catch (e) { throw e.code === "login" ? Object.assign(new Error("Wrong username or password."), { code: "login" }) : e; }
    if (!p || p.role !== "admin") { await signOut(); throw Object.assign(new Error("Wrong username or password."), { code: "forbidden" }); }
    return p;
  }
  const loginEmail = (login) => rpc("login_email", { p_login: login });
  const orders = () => rpc("admin_orders", {});
  const decide = (id, action, reason) => rpc("admin_decide", { p_id: id, p_action: action, p_reason: reason || "" });

  const toRow = (p) => ({
    id: p.id, name: p.name, category: p.category, type: p.type, price: p.price, is_new: !!p.isNew, tagline: p.tagline,
    colors: p.colors, stock: p.stock, about: p.about, features: p.features, specs: p.specs, care: p.care, occasions: p.occasions,
    active: p.active !== false, sort: p.sort || 0
  });
  const allProducts = async () => (await run(need().from("products").select("*").order("sort").order("created_at"))).map(Kc.fromRow);
  const saveProduct = (p) => run(need().from("products").upsert(toRow(p)).select().single());
  const deleteProduct = (id) => run(need().from("products").delete().eq("id", id));
  const setActive = (id, active) => run(need().from("products").update({ active }).eq("id", id));
  const saveStock = (id, stock) => run(need().from("products").update({ stock }).eq("id", id));
  async function uploadProductImage(file, slug) {
    const blob = await shrink(file, 1400, 0.86);
    const path = slug + "/" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + ".jpg";
    const up = await need().storage.from("products").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
    if (up.error) throw fail(up.error);
    return sb.storage.from("products").getPublicUrl(path).data.publicUrl;
  }
  const loadSettingsRow = () => run(need().from("settings").select("*").eq("id", 1).single());
  const saveSettings = (patch) => run(need().from("settings").update(patch).eq("id", 1).select().single());
  const codes = () => run(need().from("discount_codes").select("*").order("created_at", { ascending: false }));
  const saveCode = (c) => run(need().from("discount_codes").upsert(c).select().single());
  const deleteCode = (code) => run(need().from("discount_codes").delete().eq("code", code));
  const bank = () => run(need().from("bank_details").select("*").eq("id", 1).single());
  const saveBank = (b) => run(need().from("bank_details").update(b).eq("id", 1).select().single());

  return {
    createOrder, lookup, submitPayment, cancel, myOrders, checkCode, codes, saveCode, deleteCode,
    signUp, signIn, signOut, resetPassword, updatePassword, updateProfile, uploadAvatar, refreshProfile,
    isSeller, sellerSignIn, loginEmail, orders, decide, allProducts, saveProduct, deleteProduct, setActive, saveStock,
    uploadProductImage, loadSettingsRow, saveSettings, bank, saveBank, fail
  };
})();
