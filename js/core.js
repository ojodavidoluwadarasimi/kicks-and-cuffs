/* ==========================================================
   KICKS & CUFFS  |  shared code
   Storage, cart, orders, stock, header, footer and animations.
   Everything is saved in this browser (localStorage) until the
   server step is added.
   ========================================================== */

document.documentElement.classList.add("js");

const Kc = (() => {
  const S = window.STORE;
  const P = window.PRODUCTS;

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

  /* ---------- stock ---------- */
  const stockOverrides = () => store.get("kc_stock", {});
  function stockOf(p, size) {
    const o = stockOverrides();
    if (o[p.id] && o[p.id][size] !== undefined) return Number(o[p.id][size]);
    return p.stock[size] || 0;
  }
  function setStock(id, size, qty) {
    const o = stockOverrides();
    o[id] = o[id] || {};
    o[id][size] = Math.max(0, Math.floor(Number(qty) || 0));
    store.set("kc_stock", o);
  }
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

  /* ---------- orders ---------- */
  const orders = () => store.get("kc_orders", []);
  const saveOrders = (o) => store.set("kc_orders", o);
  function nextOrderId() {
    const n = store.get("kc_seq", 0) + 1;
    store.set("kc_seq", n);
    return "KC-" + String(n).padStart(4, "0");
  }
  function placeOrder(data) {
    const o = orders();
    const order = Object.assign({ id: nextOrderId(), createdAt: Date.now(), status: "paid" }, data);
    order.history = [{ status: "paid", at: Date.now() }];
    o.unshift(order);
    saveOrders(o);
    order.items.forEach((it) => setStock(it.id, it.size, stockOf(product(it.id), it.size) - it.qty));
    saveCart([]);
    return order;
  }
  function setOrderStatus(id, status) {
    const o = orders();
    const order = o.find((x) => x.id === id);
    if (!order) return;
    order.status = status;
    order.history = order.history || [];
    order.history.push({ status, at: Date.now() });
    saveOrders(o);
  }
  const STATUS = [
    { key: "paid", label: "Payment confirmed", note: "We received your payment." },
    { key: "packing", label: "Packing your pair", note: "The seller is getting your shoes ready." },
    { key: "shipped", label: "On the way", note: "Your order has left and is heading to you." },
    { key: "delivered", label: "Delivered", note: "Enjoy your new pair." }
  ];

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
        <div class="wrap ftr-base"><span class="logo">${esc(S.name.toUpperCase())}</span><span>Demo store. Name, colors, delivery fees and shoes are set in one file so any seller can use it.</span></div>
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
    bindChrome();
    split();
    observe();
    parallax();
    marquees();
    pointerFx();
    document.body.classList.add("ready");
  }

  return {
    S, P, store, $, $$, money, esc, param, product, reduced,
    getSize, setSize, stockOf, setStock, stockState, anyStock, stockOverrides,
    saved, toggleSaved,
    cart, saveCart, addToCart, setQty, removeLine, lineInfo, cartCount, cartSubtotal,
    orders, saveOrders, placeOrder, setOrderStatus, STATUS,
    cardHTML, sizeChipsHTML, toast, observe, split, countUp, flyToCart, updateBadges, init
  };
})();

document.addEventListener("DOMContentLoaded", () => Kc.init());
