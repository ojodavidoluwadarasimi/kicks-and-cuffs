/* Order tracking page. */
document.addEventListener("DOMContentLoaded", () => {
  const { $, S, orders, esc, money, param, STATUS, observe } = Kc;
  const root = $("#track-root");
  let currentId = (param("order") || "").toUpperCase();
  const isNew = param("new") === "1";

  const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const when = (t) => new Date(t).toLocaleString(S.locale, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

  function lookupForm(msg) {
    root.innerHTML = `
      <div class="page-head"><h1 data-split>Track your order</h1><p class="reveal" style="--d:.3s">Enter the order number from your confirmation, for example KC-0001.</p></div>
      <form id="lookup" class="row" style="margin-top:18px;align-items:stretch">
        <label class="sr-only" for="oid">Order number</label>
        <input class="inp" id="oid" placeholder="KC-0001" style="flex:1 1 220px;max-width:320px;text-transform:uppercase" autocomplete="off">
        <button class="btn btn-accent" type="submit">Find my order</button>
      </form>
      ${msg ? `<p class="li-warn" style="margin-top:12px">${esc(msg)}</p>` : ""}`;
    Kc.split(); observe(root);
    document.querySelectorAll("#track-root [data-split]").forEach((e) => requestAnimationFrame(() => e.classList.add("in")));
    $("#lookup").addEventListener("submit", (e) => {
      e.preventDefault();
      const id = $("#oid").value.trim().toUpperCase();
      if (!orders().find((o) => o.id === id)) { lookupForm("We could not find " + (id || "that order") + " on this device."); return; }
      currentId = id; history.replaceState(null, "", "track.html?order=" + id); draw();
    });
  }

  function draw() {
    const o = orders().find((x) => x.id === currentId);
    if (!o) { lookupForm(currentId ? "We could not find " + currentId + " on this device." : ""); return; }
    const idx = STATUS.findIndex((s) => s.key === o.status);
    const at = {}; (o.history || []).forEach((h) => { at[h.status] = h.at; });

    const steps = STATUS.map((s, i) => {
      const cls = i < idx || (i === idx && s.key === "delivered") ? "done" : i === idx ? "now" : "todo";
      return `
      <div class="step ${cls} reveal" style="--d:${0.1 + i * 0.12}s">
        <div class="rail"><span class="dot">${cls === "done" ? CHECK : ""}</span>${i < STATUS.length - 1 ? '<span class="bar"></span>' : ""}</div>
        <div class="txt"><b>${s.label}</b><small>${at[s.key] ? when(at[s.key]) + ". " : ""}${i <= idx ? s.note : ""}</small></div>
      </div>`;
    }).join("");

    const heading = o.status === "delivered" ? "Delivered. Enjoy your pair." : isNew ? "Your order is in." : "Your order";
    const contact = S.contact.whatsapp ? `<a class="btn" style="margin-top:20px" href="https://wa.me/${esc(S.contact.whatsapp)}?text=${encodeURIComponent("Hello, my order number is " + o.id)}">Message the seller</a>` : "";

    root.innerHTML = `
      <section class="track-hero" id="th">
        <div class="eyebrow" style="color:#CFC7B8">${o.status === "paid" ? "Payment confirmed" : "Order " + esc(o.id)}</div>
        <h1 data-split>${heading}</h1>
        <p>Order <b>${esc(o.id)}</b>. Keep this page. It updates as your pair moves.</p>
      </section>

      <section class="steps">${steps}</section>

      <section class="summary reveal" style="margin-top:8px">
        <h2>In this order</h2>
        ${o.items.map((it) => `<div class="line-item" style="grid-template-columns:72px 1fr;padding:12px 0;animation:none"><img src="${esc(it.img)}" alt="" style="width:72px;height:72px"><div><div class="li-top"><span>${esc(it.name)}</span><span>${money(it.price * it.qty)}</span></div><div class="li-sub">${esc(it.color)}, size ${it.size}, quantity ${it.qty}</div></div></div>`).join("")}
        <div class="sum-row"><span class="muted">Subtotal</span><b>${money(o.subtotal)}</b></div>
        <div class="sum-row"><span class="muted">Delivery (${esc(o.address.zone)})</span><b>${money(o.delivery)}</b></div>
        <div class="sum-row total"><span>Total paid</span><span>${money(o.total)}</span></div>
        <p class="muted" style="font-size:14px;margin-top:10px">Delivering to ${esc(o.customer.name)}, ${esc(o.address.street)}, ${esc(o.address.city)}.</p>
        ${contact}
      </section>
      <p style="margin:24px 0 0;display:flex;gap:16px;flex-wrap:wrap"><a href="shop.html" class="btn btn-accent">Keep shopping</a><a href="track.html" class="btn">Track another order</a></p>`;
    Kc.split(); observe(root);
    document.querySelectorAll("#track-root [data-split]").forEach((e) => requestAnimationFrame(() => e.classList.add("in")));
    if (isNew && !Kc.reduced) confetti();
  }

  function confetti() {
    const host = $("#th"); if (!host || host.querySelector(".conf")) return;
    const c = document.createElement("div"); c.className = "conf";
    const cols = ["#C93B17", "#F1E1D0", "#F6F3EE", "#2F6B3F", "#E8A33D"];
    for (let i = 0; i < 38; i++) {
      const s = document.createElement("i");
      const a = Math.random() * Math.PI * 2, d = 90 + Math.random() * 220;
      s.style.cssText = `background:${cols[i % cols.length]};--x:${Math.cos(a) * d}px;--y:${Math.sin(a) * d * 0.8 - 40}px;--r:${Math.random() * 720 - 360}deg;animation-delay:${Math.random() * 0.2}s`;
      c.appendChild(s);
    }
    host.appendChild(c);
    setTimeout(() => c.remove(), 2200);
  }

  window.addEventListener("storage", (e) => { if (e.key === "kc_orders") draw(); });
  draw();
});
