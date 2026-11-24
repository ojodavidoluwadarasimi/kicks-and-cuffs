/* Customer account: optional. Sign up, log in, edit profile and photo, see past orders. */
Kc.ready(() => {
  const { $, $$, S, money, esc, STATUS_LABEL, toast } = Kc;
  const root = $("#acct");
  let mode = "login";
  const hash = location.hash + location.search;
  const recovering = /type=recovery/.test(hash);
  const initial = (n) => esc((n || "?").trim().charAt(0).toUpperCase());

  function authView(msg, ok) {
    const su = mode === "signup";
    document.title = (su ? "Create account" : "Log in") + " | " + S.name;
    root.innerHTML = `
      <div class="page-head"><h1 data-split>${su ? "Create your account" : "Welcome back"}</h1><p class="reveal" style="--d:.3s">${su ? "An account is optional. It keeps your details and orders in one place." : "Log in to see your orders and edit your profile."}</p></div>
      <form id="auth" class="look" novalidate>
        ${su ? '<div class="field"><label for="fn">Full name</label><input class="inp" id="fn" autocomplete="name" maxlength="80"></div>' : ""}
        <div class="field"><label for="em">Email</label><input class="inp" id="em" type="email" autocomplete="email" autocapitalize="none"></div>
        <div class="field"><label for="pw">Password ${su ? "(at least 8 characters)" : ""}</label><input class="inp" id="pw" type="password" autocomplete="${su ? "new-password" : "current-password"}"></div>
        <p class="${ok ? "ok-msg" : "li-warn"}" id="auth-msg" role="alert">${esc(msg || "")}</p>
        <button class="btn btn-accent" type="submit">${su ? "Create account" : "Log in"}</button>
        ${su ? "" : '<button class="btn-link" type="button" id="forgot">Forgot your password?</button>'}
        <button class="btn-link" type="button" id="swap">${su ? "I already have an account" : "Create an account"}</button>
      </form>
      <p class="muted" style="margin-top:18px">You can also order without an account. <a href="shop.html" style="text-decoration:underline">Keep shopping</a></p>`;
    Kc.split(); $$("[data-split]", root).forEach((e) => requestAnimationFrame(() => e.classList.add("in")));
    $("#swap").onclick = () => { mode = su ? "login" : "signup"; authView(); };
    const f = $("#auth");
    f.onsubmit = async (e) => {
      e.preventDefault();
      const em = $("#em").value.trim(), pw = $("#pw").value, b = f.querySelector("button[type=submit]");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return authView("Enter a valid email address.");
      if (su && $("#fn").value.trim().length < 2) return authView("Please enter your name.");
      if (pw.length < (su ? 8 : 1)) return authView(su ? "Use a password with at least 8 characters." : "Enter your password.");
      b.disabled = true; b.textContent = "Please wait...";
      try {
        if (su) { const r = await Api.signUp(em, pw, $("#fn").value.trim()); if (r.needsConfirm) { mode = "login"; return authView("Almost done. We sent a link to " + em + ". Open it, then log in.", true); } }
        else await Api.signIn(em, pw);
        home();
      } catch (err) { authView(err.message); }
    };
    const fg = $("#forgot");
    if (fg) fg.onclick = async () => {
      const em = $("#em").value.trim();
      if (!em) return authView("Type your email first, then tap Forgot password.");
      try { await Api.resetPassword(em); authView("If that email has an account, a reset link is on its way.", true); } catch (err) { authView(err.message); }
    };
  }

  function resetView(msg) {
    root.innerHTML = `<div class="page-head"><h1>Choose a new password</h1></div>
      <form id="rp" class="look" novalidate><div class="field"><label for="np">New password (at least 8 characters)</label><input class="inp" id="np" type="password" autocomplete="new-password"></div>
      <p class="li-warn" role="alert">${esc(msg || "")}</p><button class="btn btn-accent" type="submit">Save password</button></form>`;
    $("#rp").onsubmit = async (e) => { e.preventDefault(); try { await Api.updatePassword($("#np").value); history.replaceState(null, "", "account.html"); await Api.refreshProfile(); toast("Password changed", "ok"); home(); } catch (err) { resetView(err.message); } };
  }

  async function home() {
    const pr = Kc.state.profile || {}, us = Kc.state.user;
    document.title = "My account | " + S.name;
    root.innerHTML = `
      <div class="acct-head"><h1 data-split>My account</h1><button class="btn-link" id="out" type="button">Log out</button></div>
      <section class="prof-card">
        <div class="prof-top">
          <div class="prof-av" id="av">${pr.avatar_url ? `<img src="${esc(pr.avatar_url)}" alt="Your photo">` : `<span>${initial(pr.full_name || us.email)}</span>`}</div>
          <div class="prof-id"><b>${esc(pr.full_name || "Your name")}</b><span>${esc(us.email)}</span>
            <label class="prof-photo" for="photo">Change photo</label><input id="photo" type="file" accept="image/jpeg,image/png,image/webp" hidden></div>
        </div>
        <form id="pf" novalidate>
          <div class="field"><label for="pn">Full name</label><input class="inp" id="pn" maxlength="80" value="${esc(pr.full_name || "")}"></div>
          <div class="field"><label for="pp">Phone number</label><input class="inp" id="pp" type="tel" maxlength="20" value="${esc(pr.phone || "")}" placeholder="0801 234 5678"></div>
          <p class="li-warn" id="pf-msg" role="alert"></p><button class="btn btn-accent btn-block" type="submit">Save changes</button>
        </form>
      </section>
      <h2 class="sub-h" style="margin-top:36px">My orders</h2><div id="orders"><p class="muted">Loading...</p></div>`;
    Kc.split(); $$("[data-split]", root).forEach((e) => requestAnimationFrame(() => e.classList.add("in")));
    $("#out").onclick = async () => { await Api.signOut(); mode = "login"; Kc.paintLive && Kc.paintLive(); authView("You are logged out.", true); };
    $("#photo").onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try { toast("Uploading..."); await Api.uploadAvatar(f); toast("Photo updated", "ok"); home(); } catch (err) { toast(err.message, "bad"); }
    };
    $("#pf").onsubmit = async (e) => {
      e.preventDefault();
      const n = $("#pn").value.trim(), p = $("#pp").value.trim(), m = $("#pf-msg");
      if (n.length < 2) { m.textContent = "Please enter your name."; return; }
      if (p && !/^(\+?234|0)[789][01]\d{8}$/.test(p.replace(/[\s-]/g, ""))) { m.textContent = "Enter a Nigerian phone number, like 0801 234 5678."; return; }
      try { await Api.updateProfile({ full_name: n, phone: p }); m.textContent = ""; toast("Profile saved", "ok"); } catch (err) { m.textContent = err.message; }
    };
    try {
      const list = await Api.myOrders();
      $("#orders").innerHTML = list.length ? list.map((o) => `<a class="req" style="display:block" href="track.html?order=${encodeURIComponent(o.id)}">
        <header><b>${esc(o.id)}</b><span class="muted">${new Date(o.createdAt).toLocaleDateString(S.locale, { day: "numeric", month: "short", year: "numeric" })}</span></header>
        <div class="req-where">${esc(STATUS_LABEL[o.status] || o.status)} · ${o.items.reduce((n, i) => n + i.qty, 0)} pair(s)</div>
        <div class="req-total"><span>Total</span><b>${money(o.total)}</b></div></a>`).join("") : '<p class="muted">No orders yet. <a href="shop.html" style="text-decoration:underline">Find your pair</a></p>';
    } catch (err) { $("#orders").innerHTML = '<p class="li-warn">' + esc(err.message) + "</p>"; }
  }

  if (!Kc.sb) { root.innerHTML = '<div class="empty"><p>Accounts are not available right now.</p></div>'; return; }
  Kc.sb.auth.onAuthStateChange((ev) => { if (ev === "PASSWORD_RECOVERY") resetView(); });
  if (recovering) resetView();
  else if (Kc.state.user) home();
  else authView();
});
