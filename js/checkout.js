/* Checkout: details, delivery fee, payment and order creation. */
document.addEventListener("DOMContentLoaded", () => {
  const { $, $$, S, cart, lineInfo, money, esc, cartSubtotal, stockOf, product, placeOrder, toast, observe } = Kc;

  if (!cart().length) { location.replace("cart.html"); return; }

  const zoneSel = $("#zone");
  zoneSel.innerHTML = '<option value="">Choose where we deliver</option>' + S.deliveryZones.map((z) => `<option value="${esc(z.name)}">${esc(z.name)}</option>`).join("");

  const zone = () => S.deliveryZones.find((z) => z.name === zoneSel.value);
  const fee = () => (zone() ? zone().fee : 0);

  function summary(busy) {
    const lines = cart().map((l) => { const { p } = lineInfo(l); return `<div class="sum-row"><span>${esc(p.name)}, ${esc(l.color)}, size ${l.size} × ${l.qty}</span><b>${money(p.price * l.qty)}</b></div>`; }).join("");
    const sub = cartSubtotal();
    $("#co-summary").innerHTML = `
      <h2>Order summary</h2>
      <div class="sum-items">${lines}</div>
      <div class="sum-row"><span class="muted">Subtotal</span><b>${money(sub)}</b></div>
      <div class="sum-row"><span class="muted">Delivery</span><b>${zone() ? money(fee()) : "Choose an area"}</b></div>
      <div class="sum-row total"><span>Total</span><span>${money(sub + fee())}</span></div>
      <button class="btn btn-accent btn-block pulse" id="pay" style="margin-top:14px" ${busy ? "disabled" : ""}>${busy ? "One moment..." : "Pay " + money(sub + fee())}</button>
      <p class="pay-hint" style="text-align:center">Your details stay in this browser until the store goes live.</p>`;
  }

  zoneSel.addEventListener("change", () => {
    const z = zone();
    $("#zone-eta").textContent = z ? "Delivery to " + z.name + " takes about " + z.eta + "." : "";
    summary();
  });

  function check() {
    const f = $("#co-form");
    const v = (n) => f.elements[n].value.trim();
    const errs = {};
    if (v("name").length < 3) errs.name = "Please enter your full name.";
    if (!/^(\+?234|0)[789][01]\d{8}$/.test(v("phone").replace(/[\s-]/g, ""))) errs.phone = "Enter a Nigerian phone number, like 0801 234 5678.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v("email"))) errs.email = "Enter a valid email address.";
    if (v("address").length < 6) errs.address = "Please enter your street address.";
    if (v("city").length < 2) errs.city = "Please enter your city or town.";
    if (!zone()) errs.zone = "Choose a delivery area.";
    $$("[data-err]").forEach((e) => { e.textContent = errs[e.dataset.err] || ""; });
    $$("#co-form input, #co-form select").forEach((i) => i.classList.toggle("bad", !!errs[i.name]));
    const first = Object.keys(errs)[0];
    if (first) f.elements[first].focus();
    return !Object.keys(errs).length;
  }

  document.addEventListener("click", async (e) => {
    if (!e.target.closest("#pay")) return;
    // stock check again, in case it changed
    const gone = cart().find((l) => stockOf(product(l.id), l.size) < l.qty);
    if (gone) { toast("An item in your cart is no longer available in that size.", "bad"); setTimeout(() => (location.href = "cart.html"), 1200); return; }
    if (!check()) { toast("Please fix the highlighted details", "bad"); return; }

    const f = $("#co-form");
    const v = (n) => f.elements[n].value.trim();
    const method = f.elements.method.value;
    const sub = cartSubtotal(), delivery = fee(), total = sub + delivery;
    summary(true);
    try {
      const result = await Payment.pay({ amount: total, method, customer: { name: v("name"), email: v("email"), phone: v("phone") } });
      const order = placeOrder({
        customer: { name: v("name"), phone: v("phone"), email: v("email") },
        address: { street: v("address"), city: v("city"), zone: v("zone") },
        items: cart().map((l) => { const { p } = lineInfo(l); return { id: p.id, name: p.name, color: l.color, size: l.size, qty: l.qty, price: p.price, img: lineInfo(l).img }; }),
        subtotal: sub, delivery, total,
        payment: { provider: result.provider, method, reference: result.reference, status: "paid" }
      });
      location.href = "track.html?order=" + encodeURIComponent(order.id) + "&new=1";
    } catch (err) {
      summary(false);
      toast(err.message || "Payment did not go through.", "bad");
    }
  });

  summary();
  observe();
});
