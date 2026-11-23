/* Seller dashboard: see orders, move them along, and edit stock by size. */
document.addEventListener("DOMContentLoaded", () => {
  const { $, $$, P, S, money, esc, orders, saveOrders, setOrderStatus, STATUS, stockOf, setStock, store, toast, countUp } = Kc;
  const SIZES = window.SIZES;
  let open = null;

  const when = (t) => new Date(t).toLocaleString(S.locale, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  const label = (k) => (STATUS.find((s) => s.key === k) || {}).label || k;

  function stats() {
    const o = orders();
    const revenue = o.reduce((n, x) => n + x.total, 0);
    const toPack = o.filter((x) => x.status === "paid" || x.status === "packing").length;
    let low = 0;
    P.forEach((p) => SIZES.forEach((s) => { const q = stockOf(p, s); if (q > 0 && q <= S.lowStockAt) low++; }));
    $("#stats").innerHTML = `
      <div class="stat reveal in"><small>Orders</small><b data-count="${o.length}">0</b></div>
      <div class="stat reveal in"><small>Paid in total</small><b data-count="${revenue}" data-money="1">0</b></div>
      <div class="stat reveal in"><small>To pack or send</small><b data-count="${toPack}">0</b></div>
      <div class="stat reveal in"><small>Sizes running low</small><b data-count="${low}">0</b></div>`;
    countUp($("#stats"));
  }

  function ordersTab() {
    const o = orders();
    if (!o.length) { $("#tab-orders").innerHTML = '<div class="empty" style="padding:28px 0"><p>No orders yet. Place one in the shop, or add sample orders below.</p><a class="btn btn-accent" href="shop.html">Go to the shop</a></div>'; return; }
    $("#tab-orders").innerHTML = `
      <div class="scroll-x"><table class="otbl">
        <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Placed</th><th>Status</th></tr></thead>
        <tbody>${o.map((x) => `
          <tr>
            <td><b>${esc(x.id)}</b><div class="det"><button class="rm" data-open="${esc(x.id)}">${open === x.id ? "Hide details" : "Details"}</button></div></td>
            <td>${esc(x.customer.name)}<div class="det">${esc(x.customer.phone)}</div></td>
            <td>${x.items.reduce((n, i) => n + i.qty, 0)}</td>
            <td>${money(x.total)}<div class="det"><span class="pillx paid">Paid</span></div></td>
            <td>${when(x.createdAt)}</td>
            <td><label class="sr-only" for="st-${esc(x.id)}">Status for ${esc(x.id)}</label>
              <select class="sel" id="st-${esc(x.id)}" data-status="${esc(x.id)}">${STATUS.map((s) => `<option value="${s.key}" ${s.key === x.status ? "selected" : ""}>${s.label}</option>`).join("")}</select>
              <div class="det"><a href="track.html?order=${encodeURIComponent(x.id)}" style="text-decoration:underline">Open tracking page</a></div></td>
          </tr>
          ${open === x.id ? `<tr><td colspan="6" style="background:#FAF7F2">
            ${x.items.map((i) => `<div class="det" style="color:var(--ink)">${esc(i.name)}, ${esc(i.color)}, size ${i.size} × ${i.qty}: ${money(i.price * i.qty)}</div>`).join("")}
            <div class="det">Deliver to ${esc(x.customer.name)}, ${esc(x.address.street)}, ${esc(x.address.city)}, ${esc(x.address.zone)}. Delivery fee ${money(x.delivery)}.</div>
            <div class="det">Paid by ${esc(x.payment.method)} (${esc(x.payment.provider)}), reference ${esc(x.payment.reference)}. Email ${esc(x.customer.email)}.</div>
            <div class="det">${(x.history || []).map((h) => esc(label(h.status)) + " " + when(h.at)).join(" · ")}</div>
          </td></tr>` : ""}`).join("")}</tbody>
      </table></div>`;
  }

  function stockTab() {
    $("#tab-stock").innerHTML = `<p class="muted" style="font-size:14px;margin-bottom:6px">Change a number and it saves straight away. Red means ${S.lowStockAt} or fewer left.</p>` + P.map((p) => `
      <div class="stock-prod">
        <h3><img src="${p.colors[0].images[0]}" alt=""> ${esc(p.name)} <span class="muted" style="font-size:14px;font-weight:400">${money(p.price)}</span></h3>
        <div class="stock-row">${SIZES.map((s) => { const q = stockOf(p, s); return `<div><label for="s-${p.id}-${s}">${s}</label><input id="s-${p.id}-${s}" type="number" min="0" inputmode="numeric" value="${q}" data-stock="${p.id}" data-size="${s}" class="${q > 0 && q <= S.lowStockAt ? "low" : ""}"></div>`; }).join("")}</div>
      </div>`).join("");
  }

  function refresh() { stats(); ordersTab(); }

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-tab]");
    if (t) {
      $$("[data-tab]").forEach((b) => { const on = b === t; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); });
      $("#tab-orders").hidden = t.dataset.tab !== "orders";
      $("#tab-stock").hidden = t.dataset.tab !== "stock";
      if (t.dataset.tab === "stock") stockTab();
      return;
    }
    const o = e.target.closest("[data-open]");
    if (o) { open = open === o.dataset.open ? null : o.dataset.open; ordersTab(); return; }
    if (e.target.closest("#seed")) { seed(); return; }
    if (e.target.closest("#reset")) {
      if (confirm("Delete every order, saved shoe, cart item and stock change on this browser?")) {
        ["kc_orders", "kc_seq", "kc_stock", "kc_cart", "kc_saved", "kc_size"].forEach(store.del);
        toast("Demo data cleared"); Kc.updateBadges(); refresh(); if (!$("#tab-stock").hidden) stockTab();
      }
    }
  });
  document.addEventListener("change", (e) => {
    const st = e.target.closest("[data-status]");
    if (st) { setOrderStatus(st.dataset.status, st.value); toast(st.dataset.status + ": " + label(st.value)); refresh(); return; }
    const sk = e.target.closest("[data-stock]");
    if (sk) { setStock(sk.dataset.stock, Number(sk.dataset.size), sk.value); const q = stockOf(Kc.product(sk.dataset.stock), Number(sk.dataset.size)); sk.value = q; sk.classList.toggle("low", q > 0 && q <= S.lowStockAt); stats(); toast("Stock saved"); }
  });

  function seed() {
    const names = [["Chinedu Okafor", "08031234567"], ["Amaka Ibe", "08098765432"], ["Tunde Adeyemi", "07055501234"], ["Funke Bello", "09011122233"]];
    const picks = [["marina-oxford", "Black", 43, 1, "paid"], ["court-low", "White", 42, 2, "packing"], ["lagos-runner", "Cream and green", 43, 1, "shipped"], ["ikoyi-derby", "Brown", 44, 1, "delivered"]];
    const list = orders();
    let n = Kc.store.get("kc_seq", 0);
    picks.forEach((pk, i) => {
      const p = Kc.product(pk[0]); n++;
      const sub = p.price * pk[3], zone = S.deliveryZones[i % S.deliveryZones.length];
      const t0 = Date.now() - (i + 1) * 3600e3 * 7;
      const hist = [{ status: "paid", at: t0 }];
      ["packing", "shipped", "delivered"].forEach((s) => { if (STATUS.findIndex((x) => x.key === s) <= STATUS.findIndex((x) => x.key === pk[4])) hist.push({ status: s, at: t0 + 3600e3 * (hist.length) }); });
      list.push({ id: "KC-" + String(n).padStart(4, "0"), createdAt: t0, status: pk[4], history: hist,
        customer: { name: names[i][0], phone: names[i][1], email: names[i][0].split(" ")[0].toLowerCase() + "@example.com" },
        address: { street: (12 + i * 7) + " Sample Street", city: "Ikeja", zone: zone.name },
        items: [{ id: p.id, name: p.name, color: pk[1], size: pk[2], qty: pk[3], price: p.price, img: p.colors[0].images[0] }],
        subtotal: sub, delivery: zone.fee, total: sub + zone.fee, payment: { provider: "mock", method: "card", reference: "SAMPLE-" + n, status: "paid" } });
    });
    Kc.store.set("kc_seq", n);
    list.sort((a, b) => b.createdAt - a.createdAt);
    saveOrders(list);
    toast("Sample orders added"); refresh();
  }

  window.addEventListener("storage", (e) => { if (e.key === "kc_orders" || e.key === "kc_stock") refresh(); });
  refresh();
});
