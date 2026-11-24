/* Cart page. */
Kc.ready(() => {
  const { $, cart, lineInfo, money, esc, stockOf, setQty, removeLine, cartSubtotal, observe, S } = Kc;
  const root = $("#cart-root");

  function draw() {
    const c = cart();
    if (!c.length) {
      root.innerHTML = `<div class="empty" style="grid-column:1/-1;padding:40px 0"><p>Your cart is empty.</p><a class="btn btn-accent" href="shop.html">Find your pair</a></div>`;
      return;
    }
    const lines = c.map((l, i) => {
      const { p, col, img } = lineInfo(l);
      const left = stockOf(p, l.size);
      const warn = left <= 0 ? "No longer in stock in this size" : (l.qty >= left ? "That is all we have in this size" : (left <= S.lowStockAt ? "Only " + left + " left in this size" : ""));
      return `
      <div class="line-item" style="animation-delay:${i * 0.08}s">
        <a href="product.html?id=${p.id}"><img src="${img}" alt="${esc(p.name)}, ${esc(col.name)}"></a>
        <div>
          <div class="li-top"><a href="product.html?id=${p.id}">${esc(p.name)}</a><span>${money(p.price * l.qty)}</span></div>
          <div class="li-sub">${esc(l.color)}, size ${l.size}</div>
          ${warn ? `<div class="li-warn">${warn}</div>` : ""}
          <div class="li-bot">
            <div class="qty"><button data-dec="${i}" aria-label="Decrease quantity">−</button><span>${l.qty}</span><button data-inc="${i}" aria-label="Increase quantity">+</button></div>
            <button class="rm" data-rm="${i}">Remove</button>
          </div>
        </div>
      </div>`;
    }).join("");
    const sub = cartSubtotal();
    const blocked = c.some((l) => stockOf(Kc.product(l.id), l.size) < 1);
    root.innerHTML = `
      <div>${lines}<p style="margin-top:18px"><a href="shop.html" style="text-decoration:underline;color:var(--muted)">Keep shopping</a></p></div>
      <aside class="summary reveal">
        <h2>Order summary</h2>
        <div class="sum-row"><span class="muted">Subtotal</span><b>${money(sub)}</b></div>
        <div class="sum-row"><span class="muted">Delivery</span><span class="muted">Added at checkout</span></div>
        <div class="sum-row total"><span>Total</span><span>${money(sub)}</span></div>
        <a class="btn btn-accent btn-block pulse ${blocked ? "disabled" : ""}" href="checkout.html" style="margin-top:14px" ${blocked ? 'aria-disabled="true"' : ""}>Checkout</a>
        ${blocked ? '<p class="li-warn" style="margin-top:10px">Remove the item that is out of stock to continue.</p>' : ""}
        <a class="btn btn-block wa-order" id="wa-cart" href="${Kc.waOrderLink()}" target="_blank" rel="noopener" style="margin-top:10px">Order on WhatsApp</a>
        <p class="pay-hint" style="text-align:center">Prefer to chat first? We receive your full cart on WhatsApp.</p>
      </aside>`;
    observe(root);
  }

  root.addEventListener("click", (e) => {
    const c = cart();
    const inc = e.target.closest("[data-inc]"), dec = e.target.closest("[data-dec]"), rm = e.target.closest("[data-rm]");
    if (inc) { const i = Number(inc.dataset.inc); const before = c[i].qty; setQty(i, before + 1); if (cart()[i].qty === before) Kc.toast("That is all we have in this size", "bad"); draw(); }
    else if (dec) { const i = Number(dec.dataset.dec); setQty(i, c[i].qty - 1); draw(); }
    else if (rm) { removeLine(Number(rm.dataset.rm)); draw(); }
  });
  draw();
});
