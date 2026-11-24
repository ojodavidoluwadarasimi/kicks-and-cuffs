/* Product page: gallery, colors, sizes, add to cart and the full "about" details. */
Kc.ready(() => {
  const { $, $$, P, S, money, esc, param, product, getSize, setSize, stockOf, stockState, saved, toggleSaved,
          addToCart, cardHTML, observe, toast, flyToCart, split } = Kc;

  const p = product(param("id"));
  const root = $("#pdp");
  if (!p) {
    root.innerHTML = '<div class="empty" style="grid-column:1/-1"><p>We could not find that shoe.</p><a class="btn" href="shop.html">Back to the shop</a></div>';
    return;
  }

  document.title = p.name + " | " + S.name;
  $("#crumb-cat").innerHTML = `<a href="shop.html?cat=${p.category}">${p.category === "corporate" ? "Corporate" : "Sneakers"}</a>`;
  $("#crumb-name").textContent = p.name;

  const st = { color: 0, shot: 0, size: null, justAdded: false };
  const pickDefaultSize = () => {
    const pref = getSize();
    if (stockOf(p, pref) > 0) return pref;
    return window.SIZES.find((s) => stockOf(p, s) > 0) || null;
  };
  st.size = pickDefaultSize();

  const deliveryHTML = () => `
    <p>We deliver across Nigeria. Fees and times depend on where you are:</p>
    <ul>${S.deliveryZones.map((z) => `<li><b>${esc(z.name)}:</b> ${Kc.money(z.fee)}, about ${esc(z.eta)}</li>`).join("")}</ul>
    <p>Not happy with the size? You can return or exchange an unworn pair in its box within ${S.returnsDays} days. <a href="info.html#returns" style="text-decoration:underline">Read the full policy</a>.</p>`;

  function render() {
    const col = p.colors[st.color];
    const shot = Math.min(st.shot, col.images.length - 1);
    const note = st.size ? stockState(p, st.size) : null;
    const isSaved = saved().includes(p.id);
    const anyIn = window.SIZES.some((s) => stockOf(p, s) > 0);

    root.innerHTML = `
    <div class="gallery">
      <div class="main-img" data-tilt><img id="main-img" src="${col.images[shot]}" alt="${esc(p.name)}, ${esc(col.name)}"></div>
      ${col.images.length > 1 ? `<div class="thumbs">${col.images.map((src, i) => `<button class="thumb ${i === shot ? "on" : ""}" data-shot="${i}" aria-label="Photo ${i + 1} of ${col.images.length}" aria-pressed="${i === shot}"><img src="${src}" alt=""></button>`).join("")}</div>` : ""}
    </div>

    <div class="pdp-info">
      <div class="eyebrow">${p.category === "corporate" ? "Corporate" : "Sneakers"} / ${esc(p.type)}</div>
      <h1 data-split>${esc(p.name)}</h1>
      <div class="pdp-price">${money(p.price)}</div>
      <p class="tagline">${esc(p.tagline)}</p>

      <div class="opt">
        <div class="opt-head"><span>Color: <span class="muted" style="font-weight:400">${esc(col.name)}</span></span></div>
        <div class="swatches">${p.colors.map((c, i) => `<button class="sw" data-color="${i}" aria-label="${esc(c.name)}" aria-pressed="${i === st.color}" style="background:${c.hex}"></button>`).join("")}</div>
      </div>

      <div class="opt">
        <div class="opt-head"><span>Size (EU)</span><a href="info.html#size-guide">Size guide</a></div>
        <div class="size-grid">${window.SIZES.map((n) => {
          const out = stockOf(p, n) <= 0;
          return `<button class="chip ${n === st.size ? "on" : ""}" data-size="${n}" aria-pressed="${n === st.size}" aria-disabled="${out}">${n}</button>`;
        }).join("")}</div>
        <div class="stock-note ${note ? note.state : ""}" id="stock-note" role="status">${note ? esc(note.label) : "Sold out in every size right now"}</div>
      </div>

      <div class="buy">
        <button class="btn btn-accent ${anyIn ? "pulse" : ""}" id="add" ${anyIn ? "" : "disabled"} data-magnetic>${st.justAdded ? "Added. View your cart" : "Add to cart"}</button>
        <button class="heart-btn ${isSaved ? "on" : ""}" id="heart" aria-label="${isSaved ? "Remove from saved" : "Save this shoe"}" aria-pressed="${isSaved}">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="${isSaved ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>
        </button>
      </div>
      <p class="pay-hint">Pay securely with Paystack: card, bank transfer or USSD.</p>

      <div class="opt">
        <div class="opt-head"><span>Good for</span></div>
        <div class="occ">${p.occasions.map((o) => `<span>${esc(o)}</span>`).join("")}</div>
      </div>

      <div class="acc-list">
        <details class="acc-i" open><summary>About this shoe</summary><div class="acc-body">${p.about.map((t) => `<p>${esc(t)}</p>`).join("")}<ul style="margin-top:14px">${p.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul></div></details>
        <details class="acc-i"><summary>Details</summary><div class="acc-body"><dl class="specs">${Object.entries(p.specs).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}<div><dt>Colors</dt><dd>${p.colors.map((c) => esc(c.name)).join(", ")}</dd></div></dl></div></details>
        <details class="acc-i"><summary>Care</summary><div class="acc-body"><ul>${p.care.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></div></details>
        <details class="acc-i"><summary>Delivery and returns</summary><div class="acc-body">${deliveryHTML()}</div></details>
        <details class="acc-i"><summary>Track your order</summary><div class="acc-body"><p>After you pay, you get an order number and a page that shows every step until your pair arrives: payment confirmed, packing, on the way and delivered.</p></div></details>
      </div>
    </div>`;
    split();
    $$("#pdp [data-split]").forEach((e) => requestAnimationFrame(() => e.classList.add("in")));
  }

  function swapImage() {
    const col = p.colors[st.color];
    const shot = Math.min(st.shot, col.images.length - 1);
    const img = $("#main-img");
    img.src = col.images[shot];
    img.alt = p.name + ", " + col.name;
    img.classList.remove("swap"); void img.offsetWidth; img.classList.add("swap");
    $$(".thumb").forEach((t, i) => { t.classList.toggle("on", i === shot); t.setAttribute("aria-pressed", String(i === shot)); });
  }

  root.addEventListener("click", (e) => {
    const sh = e.target.closest("[data-shot]");
    if (sh) { st.shot = Number(sh.dataset.shot); swapImage(); return; }
    const co = e.target.closest("[data-color]");
    if (co) { st.color = Number(co.dataset.color); st.shot = 0; render(); return; }
    const sz = e.target.closest("[data-size]");
    if (sz) {
      const n = Number(sz.dataset.size);
      if (stockOf(p, n) <= 0) { toast("Size " + n + " is sold out", "bad"); return; }
      st.size = n; st.justAdded = false; setSize(n);
      $$(".size-grid .chip").forEach((c) => { const on = Number(c.dataset.size) === n; c.classList.toggle("on", on); c.setAttribute("aria-pressed", String(on)); });
      const s = stockState(p, n); const note = $("#stock-note"); note.className = "stock-note " + s.state; note.textContent = s.label;
      $("#add").textContent = "Add to cart";
      return;
    }
    if (e.target.closest("#heart")) {
      const on = toggleSaved(p.id);
      const h = $("#heart"); h.classList.toggle("on", on); h.setAttribute("aria-pressed", String(on));
      h.querySelector("svg").setAttribute("fill", on ? "currentColor" : "none");
      toast(on ? "Saved" : "Removed from saved");
      return;
    }
    if (e.target.closest("#add")) {
      if (st.justAdded) { location.href = "cart.html"; return; }
      if (!st.size) { toast("Choose a size first", "bad"); return; }
      const res = addToCart(p.id, p.colors[st.color].name, st.size, 1);
      if (!res.ok) { toast(res.msg, "bad"); return; }
      flyToCart($("#main-img"));
      st.justAdded = true;
      $("#add").textContent = "Added. View your cart";
      toast(p.name + " added to your cart");
    }
  });

  document.addEventListener("kc:size", () => { /* page keeps its own choice */ });

  render();

  /* related: the other kind of shoe first, so it reads as "wear it with" */
  const other = P.filter((x) => x.id !== p.id && x.category !== p.category);
  const same = P.filter((x) => x.id !== p.id && x.category === p.category);
  const rel = other.concat(same).slice(0, 4);
  $("#related-sec").hidden = false;
  $("#related").innerHTML = rel.map((x, i) => cardHTML(x, st.size || getSize(), i * 0.08)).join("");
  observe($("#related-sec"));
});
