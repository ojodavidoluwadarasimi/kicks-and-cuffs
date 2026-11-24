/* Checkout: your details, where to deliver, and sending the order request. */
Kc.ready(() => {
  const { $, $$, S, cart, saveCart, lineInfo, money, esc, cartSubtotal, stockOf, product, zoneFor, isBlocked, rememberOrder, toast, observe } = Kc;

  if (!cart().length) { location.replace("cart.html"); return; }
  if (Kc.state.offline) { toast("The store is not reachable right now. Please try again in a moment.", "bad"); }

  const stateSel = $("#state");
  stateSel.innerHTML = '<option value="">Choose your state</option>' + window.STATES.map((s) => `<option value="${esc(s)}"${isBlocked(s) ? " disabled" : ""}>${esc(s)}${isBlocked(s) ? " (not delivering yet)" : ""}</option>`).join("");

  const zone = () => (stateSel.value && !isBlocked(stateSel.value) ? zoneFor(stateSel.value) : null);
  const fee = () => (zone() ? zone().fee : 0);
  let promo = null; // { code, percent, discount }
  const disc = () => (promo ? Math.floor(cartSubtotal() * promo.percent / 100) : 0);
  const val = (n) => ($("#co-form").elements[n] ? $("#co-form").elements[n].value.trim() : "");
  const waHref = () => Kc.waOrderLink({ name: val("name"), phone: val("phone"), street: val("address"), city: val("city"), state: stateSel.value, note: val("note"),
    discount: disc(), code: promo && promo.code, delivery: zone() ? fee() : null, total: cartSubtotal() - disc() + fee() });

  function summary(busy) {
    const lines = cart().map((l) => { const { p } = lineInfo(l); return `<div class="sum-row"><span>${esc(p.name)}, ${esc(l.color)}, size ${l.size} × ${l.qty}</span><b>${money(p.price * l.qty)}</b></div>`; }).join("");
    const sub = cartSubtotal();
    $("#co-summary").innerHTML = `
      <h2>Order summary</h2>
      <div class="sum-items">${lines}</div>
      <div class="sum-row"><span class="muted">Subtotal</span><b>${money(sub)}</b></div>
      ${promo ? `<div class="sum-row"><span class="muted">Code ${esc(promo.code)} (${promo.percent}% off)</span><b>-${money(disc())}</b></div>` : ""}
      <div class="sum-row"><span class="muted">Delivery</span><b>${zone() ? money(fee()) : "Choose your state"}</b></div>
      <div class="sum-row total"><span>Total</span><span>${money(sub - disc() + fee())}</span></div>
      <button class="btn btn-accent btn-block pulse" id="send" style="margin-top:14px" ${busy ? "disabled" : ""}>${busy ? "Placing your order..." : "Place order and pay"}</button>
      <a class="btn btn-block wa-order" id="wa-co" href="${waHref()}" target="_blank" rel="noopener" style="margin-top:10px">Message the seller on WhatsApp</a>
      <p class="pay-hint" style="text-align:center">You pay on the next page. Your pair is held for you for 6 hours.</p>`;
  }

  stateSel.addEventListener("change", () => {
    const z = zone(), box = $("#zone-box");
    box.hidden = !z;
    if (z) box.innerHTML = `<b>${esc(z.name)}</b> · delivery ${money(z.fee)} · about ${esc(z.eta)}`;
    summary();
  });

  document.addEventListener("input", (e) => { if (e.target.closest("#co-form")) { const a = $("#wa-co"); if (a) a.href = waHref(); } });
  document.addEventListener("click", async (e) => {
    if (!e.target.closest("#apply-code")) return;
    const inp = $("#code"), msg = $("#code-msg"), c = inp.value.trim();
    if (!c) { promo = null; msg.textContent = ""; summary(); return; }
    try { const r = await Api.checkCode(c, cartSubtotal()); promo = r; msg.className = "ok-msg"; msg.textContent = r.percent + "% off applied."; }
    catch (err) { promo = null; msg.className = "li-warn"; msg.textContent = err.message; }
    summary();
  });

  function check() {
    const f = $("#co-form");
    const v = (n) => f.elements[n].value.trim();
    const errs = {};
    if (v("name").length < 3) errs.name = "Please enter your full name.";
    if (!/^(\+?234|0)[789][01]\d{8}$/.test(v("phone").replace(/[\s-]/g, ""))) errs.phone = "Enter a Nigerian phone number, like 0801 234 5678.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v("email"))) errs.email = "Enter a valid email address.";
    if (!stateSel.value) errs.state = "Choose your state.";
    else if (isBlocked(stateSel.value)) errs.state = "We do not deliver to " + stateSel.value + " yet.";
    if (v("city").length < 2) errs.city = "Please enter your city or area.";
    if (v("address").length < 6) errs.address = "Please enter your street address.";
    showErrors(errs);
    return !Object.keys(errs).length;
  }
  function showErrors(errs) {
    const f = $("#co-form");
    $$("[data-err]").forEach((e) => { e.textContent = errs[e.dataset.err] || ""; });
    $$("#co-form input, #co-form select").forEach((i) => i.classList.toggle("bad", !!errs[i.name]));
    const first = Object.keys(errs).find((k) => f.elements[k]);
    if (first) f.elements[first].focus();
  }

  document.addEventListener("click", async (e) => {
    if (!e.target.closest("#send")) return;
    const gone = cart().find((l) => stockOf(product(l.id), l.size) < l.qty);
    if (gone) { toast("An item in your cart is no longer available in that size.", "bad"); setTimeout(() => (location.href = "cart.html"), 1200); return; }
    if (!check()) { toast("Please fix the highlighted details", "bad"); return; }

    const f = $("#co-form");
    const v = (n) => f.elements[n].value.trim();
    summary(true);
    try {
      const order = await Api.createOrder({
        customer: { name: v("name"), phone: v("phone"), email: v("email") },
        address: { street: v("address"), city: v("city"), state: stateSel.value },
        note: v("note"),
        code: promo ? promo.code : "",
        items: cart().map((l) => ({ id: l.id, color: l.color, size: l.size, qty: l.qty }))
      });
      rememberOrder(order.id, v("phone"));
      saveCart([]);
      location.href = "track.html?order=" + encodeURIComponent(order.id) + "&new=1";
    } catch (err) {
      summary(false);
      if (err.field && !["cart", "code"].includes(err.field)) showErrors({ [err.field]: err.message });
      if (err.field === "code") { promo = null; summary(false); }
      toast(err.message || "We could not place your order.", "bad");
      if (err.field === "cart") setTimeout(() => (location.href = "cart.html"), 1800);
    }
  });

  // signed-in customers get their details filled in
  const pr = Kc.state.profile, us = Kc.state.user;
  if (us) {
    const f = $("#co-form");
    if (pr && pr.full_name) f.elements.name.value = pr.full_name;
    if (pr && pr.phone) f.elements.phone.value = pr.phone;
    if (us.email) f.elements.email.value = us.email;
  }

  summary();
  observe();
});
