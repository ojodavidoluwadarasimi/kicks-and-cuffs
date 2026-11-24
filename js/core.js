/* ==========================================================
   KICKS & CUFFS  |  shared code
   Loads the shoes and settings from Supabase, plus the cart, header,
   footer and animations. The cart and saved shoes stay in this
   browser. Orders, stock and accounts live in Supabase.
   ========================================================== */

document.documentElement.classList.add("js");

const Kc = (() => {
  const S = window.STORE;
  const P = window.PRODUCTS; // starter list from data.js; replaced by the live shoes from Supabase
  const CFG = window.KC_CONFIG || {};
  const sb = window.supabase && CFG.supabaseUrl ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey) : null;
  const state = { offline: !sb, user: null, profile: null };

  /* ---------- storage ---------- */
  const mem = {};
  const store = {
    get(k, d) {
      try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }
      catch (e) { return k in mem ? mem[k] : d; }
    },
    set(k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { mem[k] = v; }
    },
    del(k) {
      try { localStorage.removeItem(k); } catch (e) { delete mem[k]; }
    }
  };

  /* ---------- helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const money = (n) => S.currency + Number(n).toLocaleString(S.locale);
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const param = (k) => new URLSearchParams(location.search).get(k);
  const product = (id) => P.find((p) => p.id === id);
  const reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- size preference ---------- */
  const getSize = () => store.get("kc_size", 43);
  const setSize = (n) => { store.set("kc_size", n); document.dispatchEvent(new CustomEvent("kc:size", { detail: n })); };

  /* ---------- stock (kept on each product in Supabase) ---------- */
  const stockOf = (p, size) => Number((p.stock || {})[size]) || 0;
  function stockState(p, size) {
    const left = stockOf(p, size);
    if (left <= 0) return { state: "out", left, label: "Sold out in size " + size };
    if (left <= S.lowStockAt) return { state: "low", left, label: "Only " + left + " left in size " + size };
    return { state: "in", left, label: "In stock in size " + size };
  }
  const anyStock = (p) => window.SIZES.some((s) => stockOf(p, s) > 0);

  /* ---------- saved shoes ---------- */
  const saved = () => store.get("kc_saved", []);
  function toggleSaved(id) {
    const s = saved();
    const i = s.indexOf(id);
    if (i >= 0) s.splice(i, 1); else s.push(id);
    store.set("kc_saved", s);
    updateBadges();
    return i < 0;
  }

  /* ---------- cart ---------- */
  const cart = () => store.get("kc_cart", []);
  const saveCart = (c) => { store.set("kc_cart", c); updateBadges(true); };
  function addToCart(id, color, size, qty = 1) {
    const p = product(id);
    const c = cart();
    const line = c.find((l) => l.id === id && l.color === color && l.size === size);
    const have = line ? line.qty : 0;
    const max = stockOf(p, size);
    if (max <= 0) return { ok: false, msg: "Sorry, that size is sold out." };
    if (have + qty > max) return { ok: false, msg: "Only " + max + " in stock in size " + size + "." };
    if (line) line.qty += qty; else c.push({ id, color, size, qty });
    saveCart(c);
    return { ok: true };
  }
  function setQty(index, qty) {
    const c = cart();
    if (!c[index]) return;
    const p = product(c[index].id);
    const max = stockOf(p, c[index].size);
    c[index].qty = Math.max(1, Math.min(qty, Math.max(1, max)));
    saveCart(c);
  }
  function removeLine(index) {
    const c = cart();
    c.splice(index, 1);
    saveCart(c);
  }
  function lineInfo(l) {
    const p = product(l.id);
    const col = p.colors.find((x) => x.name === l.color) || p.colors[0];
    return { p, col, img: col.images[0], total: p.price * l.qty };
  }
  const cartCount = () => cart().reduce((n, l) => n + l.qty, 0);
  const cartSubtotal = () => cart().reduce((n, l) => n + product(l.id).price * l.qty, 0);

  /* ---------- orders (stored in Supabase; see js/api.js) ---------- */
  // Every stage an order can be in. "declined" and "cancelled" end the order.
  const STATUS = [
    { key: "pending", label: "Request sent", note: "Waiting for the seller to approve your order." },
    { key: "accepted", label: "Approved", note: "The seller approved your order. Send your payment to confirm it." },
    { key: "confirming", label: "Confirming your payment", note: "We are checking that your transfer arrived." },
    { key: "paid", label: "Payment confirmed", note: "We received your payment." },
    { key: "packing", label: "Packing your pair", note: "The seller is getting your shoes ready." },
    { key: "shipped", label: "On the way", note: "Your order has left and is heading to you." },
    { key: "delivered", label: "Delivered", note: "Enjoy your new pair." }
  ];
  const STATUS_LABEL = Object.assign({ declined: "Declined", cancelled: "Cancelled" }, ...STATUS.map((x) => ({ [x.key]: x.label })));

  // Which delivery area a state belongs to (same rule the server uses).
  function zoneFor(state) {
    const z = S.deliveryZones;
    return z.find((x) => Array.isArray(x.states) && x.states.includes(state)) || z.find((x) => x.states === "rest") || null;
  }
  const isBlocked = (state) => (S.blockedStates || []).includes(state);

  // Orders this device sent, so tracking can open without asking for the phone again.
  const mine = () => store.get("kc_mine", []);
  function rememberOrder(id, phone) {
    const m = mine().filter((x) => x.id !== id);
    m.unshift({ id, phone });
    store.set("kc_mine", m.slice(0, 20));
  }
  const phoneOf = (id) => (mine().find((x) => x.id === String(id).toUpperCase()) || {}).phone || "";

  /* ---------- product card ---------- */
  function cardHTML(p, size, delay = 0) {
    const st = stockState(p, size);
    const img = p.colors[0].images;
    const second = img[1] || img[0];
    const isSaved = saved().indexOf(p.id) >= 0;
    return `
    <article class="card reveal" style="--d:${delay}s">
      <a class="card-link" href="product.html?id=${p.id}">
        <div class="card-img ${st.state === "out" ? "is-out" : ""}">
          <img class="a" src="${img[0]}" alt="${esc(p.name)}" loading="lazy">
          <img class="b" src="${second}" alt="" loading="lazy">
          <span class="badge badge-${st.state}">${st.label}</span>
          ${p.isNew ? '<span class="tag-new">New</span>' : ""}
        </div>
        <div class="card-info">
          <h3>${esc(p.name)}</h3>
          <p class="muted">${esc(p.type)}</p>
          <p class="price">${money(p.price)}</p>
        </div>
      </a>
      <button class="save ${isSaved ? "on" : ""}" data-save="${p.id}" aria-label="${isSaved ? "Remove " : "Save "}${esc(p.name)}" aria-pressed="${isSaved}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="${isSaved ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>
      </button>
    </article>`;
  }

  function sizeChipsHTML(active) {
    return window.SIZES.map((n) => `<button class="chip ${n === active ? "on" : ""}" data-size="${n}" aria-pressed="${n === active}">${n}</button>`).join("");
  }

  /* ---------- toast ---------- */
  function toast(msg, type) {
    let t = $("#toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg;
    t.className = "show " + (type || "");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { t.className = ""; }, 2600);
  }

  /* ---------- header and footer ---------- */
  const ICON = {
    menu: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg>',
    search: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/></svg>',
    heart: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
    cart: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4h2l2.2 11h10.6L20 7H6.2"/><circle cx="9" cy="19" r="1.3"/><circle cx="17" cy="19" r="1.3"/></svg>',
    close: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };

  const USER_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>';

  /* ---------- live data: shoes, settings and who is signed in ---------- */
  const fromRow = (r) => ({
    id: r.id, name: r.name, category: r.category, type: r.type, price: r.price, isNew: r.is_new, tagline: r.tagline,
    colors: r.colors || [], stock: r.stock || {}, about: r.about || [], features: r.features || [], specs: r.specs || {},
    care: r.care || [], occasions: r.occasions || [], active: r.active, sort: r.sort
  });

  async function loadProducts() {
    const { data, error } = await sb.from("products").select("*").eq("active", true).order("sort").order("created_at");
    if (error) throw error;
    P.length = 0;
    data.map(fromRow).forEach((p) => P.push(p));
  }
  async function loadSettings() {
    const { data, error } = await sb.from("settings").select("*").eq("id", 1).maybeSingle();
    if (error || !data) return;
    S.deliveryZones = data.delivery_zones;
    S.blockedStates = data.blocked_states || [];
    S.lowStockAt = data.low_stock_at;
    S.returnsDays = data.returns_days;
    S.paystackOn = !!data.paystack_on;
    S.payFirst = data.pay_first !== false;
    S.announcement = data.announcement_on ? data.announcement : "";
  }
  async function loadUser() {
    const { data } = await sb.auth.getSession();
    state.user = data && data.session ? data.session.user : null;
    state.profile = null;
    if (state.user) {
      const r = await sb.from("profiles").select("*").eq("id", state.user.id).maybeSingle();
      state.profile = r.data || null;
    }
  }
  const loaded = (async () => {
    if (!sb) return;
    try { await Promise.all([loadProducts(), loadSettings(), loadUser()]); state.offline = false; }
    catch (e) { console.error(e); state.offline = true; }
  })();

  // Page scripts start here: after the page is ready and the live data has arrived.
  function ready(fn) {
    const run = () => loaded.then(() => { paintLive(); return fn(); });
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
  }
  let painted = false;
  function paintLive() {
    if (painted) return; painted = true;
    const a = document.querySelector("[data-account]");
    if (a && state.user) {
      const url = state.profile && state.profile.avatar_url;
      a.innerHTML = url ? `<img class="avatar-s" src="${esc(url)}" alt="">` : USER_ICON;
      a.setAttribute("aria-label", "My account");
    }
    if (S.announcement && !document.querySelector(".announce")) {
      const d = document.createElement("div");
      d.className = "announce"; d.setAttribute("role", "status"); d.textContent = S.announcement;
      document.body.insertBefore(d, document.body.firstChild);
    }
    if (state.offline && sb && !document.querySelector(".offline-note")) {
      const d = document.createElement("div");
      d.className = "announce offline-note"; d.setAttribute("role", "status");
      d.textContent = "We could not reach the store just now. You are seeing our saved catalog, and ordering is paused. Please try again in a moment.";
      document.body.insertBefore(d, document.body.firstChild);
    }
  }

  function whatsappButton() {
    const c = S.contact;
    if (!c.whatsapp || document.querySelector(".wa-fab")) return;
    const a = document.createElement("a");
    a.className = "wa-fab";
    a.href = "https://wa.me/" + c.whatsapp + "?text=" + encodeURIComponent("Hello " + S.name + ", I have a question about your shoes.");
    a.target = "_blank"; a.rel = "noopener";
    a.setAttribute("aria-label", "Chat with us on WhatsApp");
    a.innerHTML = '<svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><path fill="#fff" d="M16 3.2A12.7 12.7 0 0 0 5.2 22.5L3.4 28.8l6.5-1.7A12.7 12.7 0 1 0 16 3.2zm0 2.3a10.4 10.4 0 1 1-5.3 19.4l-.4-.2-3.8 1 1-3.7-.3-.4A10.4 10.4 0 0 1 16 5.5zm-4 5.3c-.3 0-.7.1-1 .5-.4.4-1.3 1.2-1.3 3s1.3 3.6 1.5 3.8c.2.3 2.6 4.1 6.4 5.6 3.2 1.2 3.8.9 4.5.9.7-.1 2.2-.9 2.5-1.8.3-.9.3-1.6.2-1.8l-.7-.4-2.4-1.2c-.3-.1-.6-.2-.8.2l-1.1 1.4c-.2.2-.4.3-.7.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.5-.6.4-.6c.1-.2 0-.4 0-.6l-1.1-2.6c-.3-.7-.6-.6-.8-.6z"/></svg><span class="wa-tip">Chat with us</span>';
    document.body.appendChild(a);
  }

  function renderChrome() {
    const page = document.body.dataset.page || "";
    const h = $("#site-header");
    if (h) {
      h.innerHTML = `
      <header class="hdr"><div class="hdr-in">
        <button class="icon-btn menu-btn" data-menu aria-label="Open menu">${ICON.menu}</button>
        <a class="logo" href="index.html">${esc(S.name.toUpperCase())}</a>
        <nav class="nav" aria-label="Main">
          <a href="shop.html" class="${page === "shop" ? "cur" : ""}">Shop</a>
          <a href="shop.html?cat=corporate">Corporate</a>
          <a href="shop.html?cat=sneakers">Sneakers</a>
          <a href="info.html#delivery">Delivery</a>
          <a href="info.html#about">About</a>
        </nav>
        <div class="hdr-actions">
          <button class="icon-btn" data-search aria-label="Search">${ICON.search}</button>
          <a class="icon-btn has-badge" href="shop.html?saved=1" aria-label="Saved shoes">${ICON.heart}<span class="count" data-saved-count></span></a>
          <a class="icon-btn" href="account.html" aria-label="My account" data-account>${USER_ICON}</a>
          <a class="icon-btn has-badge" href="cart.html" aria-label="Cart">${ICON.cart}<span class="count" data-cart-count></span></a>
        </div>
      </div></header>
      <div class="drawer" id="drawer" aria-hidden="true">
        <div class="drawer-bg" data-menu></div>
        <div class="drawer-panel">
          <div class="drawer-top"><span class="logo">${esc(S.name.toUpperCase())}</span><button class="icon-btn" data-menu aria-label="Close menu">${ICON.close}</button></div>
          <a href="shop.html">Shop all</a>
          <a href="shop.html?cat=corporate">Corporate</a>
          <a href="shop.html?cat=sneakers">Sneakers</a>
          <a href="shop.html?saved=1">Saved shoes</a>
          <a href="track.html">Track an order</a>
          <a href="account.html">My account</a>
          <a href="info.html#delivery">Delivery and returns</a>
          <a href="info.html#size-guide">Size guide</a>
          <a href="info.html#about">About us</a>
        </div>
      </div>
      <div class="search-ov" id="search" aria-hidden="true">
        <div class="search-box">
          <div class="search-row"><input id="search-input" type="search" placeholder="Search oxfords, sneakers, loafers" aria-label="Search shoes" autocomplete="off"><button class="icon-btn" data-search-close aria-label="Close search">${ICON.close}</button></div>
          <div id="search-results" class="search-results"></div>
        </div>
      </div>`;
    }
    const f = $("#site-footer");
    if (f) {
      const c = S.contact;
      const bits = [];
      if (c.whatsapp) bits.push(`<a href="https://wa.me/${esc(c.whatsapp)}">WhatsApp us</a>`);
      if (c.phone) bits.push(`<a href="tel:${esc(c.phone)}">${esc(c.phone)}</a>`);
      if (c.email) bits.push(`<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`);
      f.innerHTML = `
      <footer class="ftr">
        <div class="wrap ftr-in">
          <div>
            <div class="ftr-cta reveal" data-split>Find your pair.</div>
            <a class="btn btn-accent" href="shop.html" data-magnetic>Shop all shoes</a>
          </div>
          <div class="ftr-cols">
            <div><h4>Shop</h4><a href="shop.html">All shoes</a><a href="shop.html?cat=corporate">Corporate</a><a href="shop.html?cat=sneakers">Sneakers</a><a href="shop.html?saved=1">Saved shoes</a></div>
            <div><h4>Help</h4><a href="track.html">Track an order</a><a href="info.html#delivery">Delivery</a><a href="info.html#returns">Returns</a><a href="info.html#size-guide">Size guide</a></div>
            <div><h4>Store</h4><a href="info.html#about">About us</a><a href="info.html#contact">Contact</a><a href="admin.html">Seller dashboard</a>${bits.join("")}</div>
          </div>
        </div>
        <div class="wrap ftr-base"><span class="logo">${esc(S.name.toUpperCase())}</span><span>© ${new Date().getFullYear()} ${esc(S.name)}. Made by <a class="credit" href="${c.whatsapp ? "https://wa.me/" + esc(c.whatsapp) : "#"}" target="_blank" rel="noopener">Ojo David Oluwadarasimi</a></span></div>
      </footer>`;
    }
    updateBadges();
  }

  function updateBadges(bump) {
    const n = cartCount();
    $$("[data-cart-count]").forEach((el) => {
      el.textContent = n || "";
      el.style.display = n ? "flex" : "none";
      if (bump) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
    });
    const s = saved().length;
    $$("[data-saved-count]").forEach((el) => { el.textContent = s || ""; el.style.display = s ? "flex" : "none"; });
  }

  function bindChrome() {
    document.addEventListener("click", (e) => {
      const m = e.target.closest("[data-menu]");
      if (m) { const d = $("#drawer"); const open = d.classList.toggle("open"); d.setAttribute("aria-hidden", String(!open)); document.body.classList.toggle("lock", open); return; }
      if (e.target.closest("[data-search]")) { openSearch(); return; }
      if (e.target.closest("[data-search-close]")) { closeSearch(); return; }
      const sv = e.target.closest("[data-save]");
      if (sv) {
        e.preventDefault();
        const on = toggleSaved(sv.dataset.save);
        sv.classList.toggle("on", on);
        sv.setAttribute("aria-pressed", String(on));
        sv.querySelector("svg").setAttribute("fill", on ? "currentColor" : "none");
        toast(on ? "Saved" : "Removed from saved");
        document.dispatchEvent(new CustomEvent("kc:saved"));
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { closeSearch(); const d = $("#drawer"); if (d && d.classList.contains("open")) { d.classList.remove("open"); document.body.classList.remove("lock"); } }
    });
    const inp = $("#search-input");
    if (inp) inp.addEventListener("input", () => {
      const q = inp.value.trim().toLowerCase();
      const box = $("#search-results");
      if (!q) { box.innerHTML = ""; return; }
      const hits = P.filter((p) => (p.name + " " + p.type + " " + p.category + " " + p.colors.map((c) => c.name).join(" ")).toLowerCase().includes(q));
      box.innerHTML = hits.length ? hits.map((p) => `
        <a class="sr" href="product.html?id=${p.id}"><img src="${p.colors[0].images[0]}" alt=""><span><b>${esc(p.name)}</b><small>${esc(p.type)}</small></span><span>${money(p.price)}</span></a>`).join("")
        : '<p class="muted pad">No shoes match that search.</p>';
    });
  }
  function openSearch() { const s = $("#search"); s.classList.add("open"); s.setAttribute("aria-hidden", "false"); document.body.classList.add("lock"); setTimeout(() => $("#search-input").focus(), 50); }
  function closeSearch() { const s = $("#search"); if (!s) return; s.classList.remove("open"); s.setAttribute("aria-hidden", "true"); if (!($("#drawer") && $("#drawer").classList.contains("open"))) document.body.classList.remove("lock"); }

  /* ---------- animations ---------- */
  function split() {
    $$("[data-split]").forEach((el) => {
      if (el.dataset.done) return;
      el.dataset.done = "1";
      const accentFrom = el.dataset.accentFrom ? Number(el.dataset.accentFrom) : -1;
      const words = el.textContent.trim().split(/\s+/);
      el.setAttribute("aria-label", el.textContent.trim());
      el.innerHTML = words.map((w, i) => `<span class="w" aria-hidden="true"><span style="--i:${i}" class="${accentFrom >= 0 && i >= accentFrom ? "acc" : ""}">${esc(w)}</span></span>`).join(" ");
      el.classList.add("reveal");
    });
  }

  let io;
  function observe(root = document) {
    if (!("IntersectionObserver" in window) || reduced) { $$(".reveal,.wipe,.zoom,.draw", root).forEach((e) => e.classList.add("in")); return; }
    if (!io) io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      // a fully clipped element (the wipe) is never "visible" to the browser, so wipes are triggered by their parent
      (en.target._wipes || [en.target]).forEach((e) => e.classList.add("in"));
      io.unobserve(en.target);
    }), { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    $$(".reveal,.wipe,.zoom,.draw", root).forEach((e) => {
      if (e.classList.contains("in")) return;
      if (e.classList.contains("wipe")) {
        const host = e.parentElement;
        (host._wipes = host._wipes || []).push(e);
        io.observe(host);
      } else io.observe(e);
    });
  }

  function parallax() {
    const els = $$("[data-parallax]");
    if (!els.length || reduced) return;
    let ticking = false;
    const run = () => {
      const vh = innerHeight;
      els.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        const k = parseFloat(el.dataset.parallax) || 0.1;
        const mid = r.top + r.height / 2 - vh / 2;
        el.style.transform = `translate3d(0, ${(-mid * k).toFixed(1)}px, 0)`;
      });
      ticking = false;
    };
    addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(run); } }, { passive: true });
    run();
  }

  function marquees() {
    const ms = $$(".marquee-track");
    if (!ms.length || reduced || !ms[0].getAnimations) return;
    let last = scrollY, vel = 0;
    const tick = () => {
      const d = scrollY - last; last = scrollY;
      vel = vel * 0.9 + d * 0.1;
      const rate = 1 + Math.min(Math.abs(vel) * 0.35, 6);
      ms.forEach((m) => m.getAnimations().forEach((a) => { try { a.updatePlaybackRate(rate * (vel < -0.5 ? -1 : 1)); } catch (e) {} }));
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function pointerFx() {
    if (reduced || !matchMedia("(hover: hover)").matches) return;
    document.addEventListener("pointermove", (e) => {
      const t = e.target.closest && e.target.closest("[data-tilt]");
      if (t) {
        const r = t.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        t.style.transform = `perspective(900px) rotateY(${(x * 10).toFixed(2)}deg) rotateX(${(-y * 10).toFixed(2)}deg) scale(1.02)`;
      }
      const m = e.target.closest && e.target.closest("[data-magnetic]");
      if (m) {
        const r = m.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
        m.style.transform = `translate(${(x * 0.18).toFixed(1)}px, ${(y * 0.25).toFixed(1)}px)`;
      }
    });
    document.addEventListener("pointerout", (e) => {
      const t = e.target.closest && e.target.closest("[data-tilt],[data-magnetic]");
      if (t && !t.contains(e.relatedTarget)) t.style.transform = "";
    });
  }

  function countUp(root = document) {
    $$("[data-count]", root).forEach((el) => {
      const to = Number(el.dataset.count) || 0;
      const money_ = el.dataset.money === "1";
      const fmt = (v) => (money_ ? money(Math.round(v)) : Math.round(v).toLocaleString(S.locale));
      if (reduced) { el.textContent = fmt(to); return; }
      const t0 = performance.now(), dur = 900;
      const step = (t) => { const k = Math.min(1, (t - t0) / dur); el.textContent = fmt(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
  }

  function flyToCart(fromEl) {
    const target = $(".hdr-actions a[href='cart.html']");
    if (!fromEl || !target || reduced) return;
    const a = fromEl.getBoundingClientRect(), b = target.getBoundingClientRect();
    const g = document.createElement("div");
    g.className = "fly";
    g.style.cssText = `left:${a.left}px;top:${a.top}px;width:${a.width}px;height:${a.height}px;background-image:url("${fromEl.currentSrc || fromEl.src}")`;
    document.body.appendChild(g);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    const anim = g.animate([
      { transform: "translate(0,0) scale(1) rotate(0)", opacity: 1, borderRadius: "16px" },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 90}px) scale(.5) rotate(-12deg)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(.08) rotate(20deg)`, opacity: 0.2, borderRadius: "50%" }
    ], { duration: 850, easing: "cubic-bezier(.5,0,.3,1)" });
    anim.onfinish = () => g.remove();
  }

  function init() {
    renderChrome();
    whatsappButton();
    bindChrome();
    split();
    observe();
    parallax();
    marquees();
    pointerFx();
    document.body.classList.add("ready");
  }

  /* A ready-to-send WhatsApp message built from the cart (or an order), so the owner gets every detail. */
  function waOrderLink(o) {
    o = o || {};
    const items = o.items || cart().map((l) => { const { p } = lineInfo(l); return { name: p.name, color: l.color, size: l.size, qty: l.qty, price: p.price }; });
    const sub = items.reduce((n, i) => n + i.price * i.qty, 0);
    const t = [];
    t.push("Hello " + S.name + ", I would like to order" + (o.id ? " (order " + o.id + ")" : "") + ":", "");
    items.forEach((i, n) => t.push((n + 1) + ". " + i.name + ", " + i.color + ", size " + i.size + ", qty " + i.qty + " = " + money(i.price * i.qty)));
    t.push("", "Subtotal: " + money(sub));
    if (o.discount) t.push("Discount" + (o.code ? " (" + o.code + ")" : "") + ": -" + money(o.discount));
    if (o.delivery != null) t.push("Delivery: " + money(o.delivery));
    t.push("Total: " + money(o.total != null ? o.total : sub - (o.discount || 0) + (o.delivery || 0)));
    const w = [o.name, o.phone, [o.street, o.city, o.state].filter(Boolean).join(", ")].filter(Boolean);
    if (w.length) t.push("", "Name: " + (o.name || ""), "Phone: " + (o.phone || ""), "Deliver to: " + ([o.street, o.city, o.state].filter(Boolean).join(", ") || "not chosen yet"));
    if (o.note) t.push("Note: " + o.note);
    t.push("", "Is everything available? Please send me the payment details.");
    return "https://wa.me/" + S.contact.whatsapp + "?text=" + encodeURIComponent(t.join("\n"));
  }

  return {
    waOrderLink, S, P, store, $, $$, money, esc, param, product, reduced,
    getSize, setSize, stockOf, stockState, anyStock,
    saved, toggleSaved,
    cart, saveCart, addToCart, setQty, removeLine, lineInfo, cartCount, cartSubtotal,
    STATUS, STATUS_LABEL, zoneFor, isBlocked, mine, rememberOrder, phoneOf, sb, state, fromRow, ready, loaded: () => loaded,
    cardHTML, sizeChipsHTML, toast, observe, split, countUp, flyToCart, updateBadges, init
  };
})();

document.addEventListener("DOMContentLoaded", () => Kc.init());
