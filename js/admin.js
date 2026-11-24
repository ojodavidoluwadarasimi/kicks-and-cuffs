/* Seller dashboard. Only a signed-in seller account can use it.
   Security is enforced by the database, not by this page. */
Kc.ready(() => {
  const { $, $$, S, money, esc, STATUS_LABEL, toast, countUp } = Kc;
  const SIZES = window.SIZES;
  const app = $("#app");
  let orders = [], products = [], codes = [], bank = null, settings = null;
  let tab = "requests", open = null, declining = null, lastPending = null, timer = null;
  let draft = null, editing = false, saving = false;

  const when = (t) => new Date(t).toLocaleString(S.locale, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  const day = (t) => new Date(t).toLocaleDateString(S.locale, { day: "numeric", month: "short" });
  const ago = (t) => { const m = Math.max(1, Math.round((Date.now() - t) / 60000)); return m < 60 ? m + " min ago" : m < 1440 ? Math.round(m / 60) + " h ago" : Math.round(m / 1440) + " d ago"; };
  const intl = (p) => { const d = String(p).replace(/\D/g, ""); return d.startsWith("234") ? d : "234" + d.replace(/^0/, ""); };
  const PAID = ["paid", "packing", "shipped", "delivered"];
  const byStatus = (st) => orders.filter((o) => o.status === st);
  const lines = (t) => String(t || "").split("\n").map((x) => x.trim()).filter(Boolean);
  const slug = (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

  /* ======================= login ======================= */
  function loginView(msg) {
    clearInterval(timer); document.title = "Seller login | " + S.name;
    app.innerHTML = `
      <div class="page-head"><h1 data-split>Seller login</h1><p class="reveal" style="--d:.3s">Only the store owner can open the dashboard. Anyone with the username and password can log in, so keep them private.</p></div>
      <form id="login" class="look" novalidate>
        <div class="field"><label for="u">Username</label><input class="inp" id="u" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" required></div>
        <div class="field"><label for="p">Password</label><input class="inp" id="p" type="password" autocomplete="current-password" required></div>
        <p class="li-warn" id="login-err" role="alert">${esc(msg || "")}</p>
        <button class="btn btn-accent" type="submit">Log in</button>
        <button class="btn-link" type="button" id="forgot">Forgot your password?</button>
      </form>`;
    Kc.split(); $$("[data-split]", app).forEach((e) => requestAnimationFrame(() => e.classList.add("in")));
    $("#login").addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector("button[type=submit]"); btn.disabled = true; btn.textContent = "Checking...";
      try { await Api.sellerSignIn($("#u").value.trim(), $("#p").value); await start(); }
      catch (err) { $("#login-err").textContent = err.message; btn.disabled = false; btn.textContent = "Log in"; }
    });
    $("#forgot").addEventListener("click", async () => {
      const em = $("#u").value.trim();
      if (!em) { $("#login-err").textContent = "Type your username above first."; return; }
      try { await Api.resetPassword(await Api.loginEmail(em)); $("#login-err").textContent = "If that email has an account, a reset link is on its way."; }
      catch (err) { $("#login-err").textContent = err.message; }
    });
  }

  /* ======================= shell ======================= */
  const pendingN = () => byStatus("pending").length;
  function shell() {
    const n = pendingN();
    app.innerHTML = `
      <div class="page-head ad-head"><h1 data-split>Seller dashboard</h1><button class="btn" id="logout">Log out</button></div>
      <div class="stats" id="stats"></div>
      <div class="tabs" role="tablist">
        ${[["requests", "Requests"], ["orders", "All orders"], ["products", "Products"], ["insights", "Insights"], ["codes", "Discounts"], ["customers", "Customers"], ["settings", "Settings"]]
          .map(([k, l]) => `<button class="chip pill" role="tab" data-tab="${k}">${l}${k === "requests" && n ? ` <span class="badge-n">${n}</span>` : ""}</button>`).join("")}
      </div>
      <section class="panel" id="panel"></section>`;
    Kc.split(); $$("[data-split]", app).forEach((e) => requestAnimationFrame(() => e.classList.add("in")));
    stats(); paintTabs(); panel();
  }
  function paintTabs() { $$("[data-tab]").forEach((b) => { const on = b.dataset.tab === tab; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); }); }
  function stats() {
    const revenue = orders.filter((x) => PAID.includes(x.status)).reduce((n, x) => n + x.total, 0);
    const box = (label, n, m) => `<div class="stat"><small>${label}</small><b data-count="${n}"${m ? ' data-money="1"' : ""}>0</b></div>`;
    $("#stats").innerHTML = box("New requests", pendingN()) + box("Payments to confirm", byStatus("confirming").length) +
      box("To pack or send", byStatus("paid").length + byStatus("packing").length) + box("Paid in total", revenue, true);
    countUp($("#stats"));
  }
  function panel() {
    const el = $("#panel"); if (!el) return;
    ({ requests: requestsTab, orders: ordersTab, products: productsTab, insights: insightsTab, codes: codesTab, customers: customersTab, settings: settingsTab })[tab](el);
  }

  /* ======================= requests ======================= */
  function card(o) {
    const wa = `https://wa.me/${intl(o.customer.phone)}?text=${encodeURIComponent("Hello " + o.customer.name.split(" ")[0] + ", this is " + S.name + " about your order " + o.id + ".")}`;
    let actions = "";
    if (o.status === "pending") actions = `<div class="req-actions"><button class="btn btn-accent" data-act="accept" data-id="${esc(o.id)}">Accept</button><button class="btn" data-decline-open="${esc(o.id)}">Decline</button></div>`;
    if (o.status === "confirming") actions = `<div class="req-actions"><span class="pillx packing">Customer says they paid${o.payment && o.payment.reference ? ": " + esc(o.payment.reference) : ""}</span></div>
      <div class="req-actions"><button class="btn btn-accent" data-act="confirm_payment" data-id="${esc(o.id)}">Money received</button><button class="btn" data-act="reject_payment" data-id="${esc(o.id)}">Not received</button></div>`;
    if (o.status === "accepted") actions = `<div class="req-actions"><span class="pillx packing">Waiting for payment</span><button class="btn-link" data-act="confirm_payment" data-id="${esc(o.id)}">Mark as paid</button><button class="btn-link" data-decline-open="${esc(o.id)}">Decline instead</button></div>`;
    const why = declining === o.id ? `
      <div class="decline-box"><label for="why-${esc(o.id)}">Why are you declining? The customer will see this.</label>
        <input class="inp" id="why-${esc(o.id)}" maxlength="200" placeholder="For example: that size just sold out">
        <div class="req-actions"><button class="btn" data-decline="${esc(o.id)}">Send decline</button><button class="btn-link" data-decline-cancel>Back</button></div></div>` : "";
    return `<article class="req">
      <header><b>${esc(o.id)}</b><span class="muted">${ago(o.createdAt)}</span></header>
      <div class="req-who"><b>${esc(o.customer.name)}</b><a href="tel:${esc(o.customer.phone)}">${esc(o.customer.phone)}</a> · <a href="${wa}" target="_blank" rel="noopener">WhatsApp</a> · <a href="mailto:${esc(o.customer.email)}">${esc(o.customer.email)}</a></div>
      <div class="req-where"><b>${esc(o.address.state)}</b>${esc(o.address.city)} · ${esc(o.address.street)} <span class="muted">(${esc(o.address.zone)}, delivery ${money(o.delivery)})</span></div>
      ${o.items.map((i) => `<div class="req-item"><img src="${esc(i.img)}" alt=""><span>${esc(i.name)}, ${esc(i.color)}, size ${i.size} × ${i.qty}</span><b>${money(i.price * i.qty)}</b></div>`).join("")}
      ${o.note ? `<p class="req-note">“${esc(o.note)}”</p>` : ""}
      ${o.discount ? `<div class="req-total"><span>Discount ${esc(o.code || "")}</span><b>-${money(o.discount)}</b></div>` : ""}
      <div class="req-total"><span>Total with delivery</span><b>${money(o.total)}</b></div>${actions}${why}</article>`;
  }
  function requestsTab(el) {
    const p = byStatus("pending"), c = byStatus("confirming"), a = byStatus("accepted");
    const sec = (title, list) => (list.length ? `<h2 class="sub-h">${title} (${list.length})</h2>` + list.map(card).join("") : "");
    el.innerHTML = (p.length + c.length + a.length === 0 ? '<div class="empty" style="padding:28px 0"><p>Nothing needs you right now. New requests show up here by themselves.</p></div>' : "") +
      sec("Waiting for your decision", p) + sec("Payments to confirm", c) + sec("Approved, waiting for payment", a);
  }

  /* ======================= orders ======================= */
  function ordersTab(el) {
    if (!orders.length) { el.innerHTML = '<div class="empty" style="padding:28px 0"><p>No orders yet.</p></div>'; return; }
    const chain = ["paid", "packing", "shipped", "delivered"];
    el.innerHTML = `<div class="scroll-x"><table class="otbl"><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Placed</th><th>Status</th></tr></thead><tbody>${orders.map((x) => {
      const i = chain.indexOf(x.status);
      const status = i >= 0
        ? `<label class="sr-only" for="st-${esc(x.id)}">Status for ${esc(x.id)}</label><select class="sel" id="st-${esc(x.id)}" data-status="${esc(x.id)}">${chain.map((k, n) => `<option value="${k}" ${k === x.status ? "selected" : ""} ${n < i ? "disabled" : ""}>${STATUS_LABEL[k]}</option>`).join("")}</select>`
        : `<span class="pillx ${x.status === "declined" || x.status === "cancelled" ? "" : "packing"}">${esc(STATUS_LABEL[x.status] || x.status)}</span>`;
      return `<tr><td><b>${esc(x.id)}</b><div class="det"><button class="rm" data-open="${esc(x.id)}">${open === x.id ? "Hide details" : "Details"}</button></div></td>
        <td>${esc(x.customer.name)}<div class="det">${esc(x.customer.phone)}</div></td><td>${money(x.total)}</td><td>${when(x.createdAt)}</td><td>${status}</td></tr>
        ${open === x.id ? `<tr><td colspan="5" style="background:#FAF7F2">
          ${x.items.map((it) => `<div class="det" style="color:var(--ink)">${esc(it.name)}, ${esc(it.color)}, size ${it.size} × ${it.qty}: ${money(it.price * it.qty)}</div>`).join("")}
          <div class="det">Deliver to ${esc(x.customer.name)}, ${esc(x.address.street)}, ${esc(x.address.city)}, ${esc(x.address.state)} (${esc(x.address.zone)}). Delivery ${money(x.delivery)}.</div>
          ${x.payment ? `<div class="det">Paid by ${esc(x.payment.method)}${x.payment.reference ? ", reference " + esc(x.payment.reference) : ""}.</div>` : ""}
          ${x.declineReason ? `<div class="det">Declined: ${esc(x.declineReason)}</div>` : ""}
          <div class="det">${(x.history || []).map((h) => esc(STATUS_LABEL[h.status] || h.status) + " " + when(h.at)).join(" · ")}</div>
          ${PAID.includes(x.status) ? `<p style="margin-top:8px"><button class="btn" data-print="${esc(x.id)}">Print packing slip</button></p>` : ""}
        </td></tr>` : ""}`;
    }).join("")}</tbody></table></div>`;
  }
  function printSlip(id) {
    const o = orders.find((x) => x.id === id); if (!o) return;
    const w = window.open("", "_blank");
    if (!w) { toast("Allow pop-ups to print the slip.", "bad"); return; }
    w.document.write(`<!doctype html><title>${esc(o.id)}</title><style>body{font:15px/1.5 system-ui,sans-serif;margin:32px;color:#14130f}h1{font-size:24px;margin:0}table{border-collapse:collapse;width:100%;margin:16px 0}td,th{border-bottom:1px solid #ddd;padding:8px;text-align:left}.r{text-align:right}small{color:#666}</style>
      <h1>${esc(S.name)}</h1><p><small>Packing slip</small><br><b>${esc(o.id)}</b> · ${esc(when(o.createdAt))}</p>
      <p><b>${esc(o.customer.name)}</b><br>${esc(o.customer.phone)}<br>${esc(o.address.street)}, ${esc(o.address.city)}, ${esc(o.address.state)}</p>
      <table><tr><th>Shoe</th><th>Colour</th><th>Size</th><th>Qty</th><th class="r">Price</th></tr>
      ${o.items.map((i) => `<tr><td>${esc(i.name)}</td><td>${esc(i.color)}</td><td>${i.size}</td><td>${i.qty}</td><td class="r">${esc(money(i.price * i.qty))}</td></tr>`).join("")}
      <tr><td colspan="4">Delivery</td><td class="r">${esc(money(o.delivery))}</td></tr><tr><th colspan="4">Total</th><th class="r">${esc(money(o.total))}</th></tr></table>
      ${o.note ? `<p>Note from customer: ${esc(o.note)}</p>` : ""}<p><small>Thank you for shopping with us.</small></p><script>window.onload=function(){window.print()}<\/script>`);
    w.document.close();
  }

  /* ======================= products (add, edit, preview) ======================= */
  const blank = () => ({ id: "", name: "", category: "corporate", type: "", price: "", isNew: true, tagline: "", colors: [{ name: "", hex: "#1B1814", images: [] }],
    stock: Object.fromEntries(SIZES.map((s) => [s, 0])), about: [], features: [], specs: {}, care: [], occasions: [], active: true, sort: products.length });
  const totalStock = (p) => SIZES.reduce((n, s) => n + (Number((p.stock || {})[s]) || 0), 0);

  function productsTab(el) {
    if (editing) return formView(el);
    el.innerHTML = `<div class="ad-head" style="margin-bottom:6px"><h2 class="sub-h" style="margin:0">Your shoes (${products.length})</h2><button class="btn btn-accent" id="add-product">Add a shoe</button></div>
      <p class="muted" style="font-size:14px;margin-bottom:6px">Change a stock number and it saves straight away. Red means ${S.lowStockAt} or fewer left. Pairs in a waiting request are already taken out of stock.</p>` +
      (products.length ? products.map((p) => `
      <div class="stock-prod">
        <h3><img src="${esc((p.colors[0] || { images: [""] }).images[0] || "")}" alt=""> ${esc(p.name)} <span class="muted" style="font-size:14px;font-weight:400">${money(p.price)}${p.active ? "" : " · hidden"}</span></h3>
        <div class="stock-row">${SIZES.map((s) => { const q = Number((p.stock || {})[s]) || 0; return `<div><label for="s-${p.id}-${s}">${s}</label><input id="s-${p.id}-${s}" type="number" min="0" inputmode="numeric" value="${q}" data-stock="${esc(p.id)}" data-size="${s}" class="${q > 0 && q <= S.lowStockAt ? "low" : ""}"></div>`; }).join("")}</div>
        <div class="req-actions" style="margin-top:8px"><button class="btn" data-edit="${esc(p.id)}">Edit</button><button class="btn" data-toggle="${esc(p.id)}">${p.active ? "Hide from shop" : "Show in shop"}</button><button class="btn-link" data-delete="${esc(p.id)}">Delete</button></div>
      </div>`).join("") : '<div class="empty" style="padding:28px 0"><p>No shoes yet. Add your first one.</p></div>');
  }

  function formView(el) {
    const d = draft, isNew = !d._saved;
    el.innerHTML = `<div class="ad-head"><h2 class="sub-h" style="margin:0">${isNew ? "Add a shoe" : "Edit " + esc(d.name)}</h2><button class="btn-link" id="form-cancel">Back to list</button></div>
      <div class="pf">
        <form id="pform" novalidate autocomplete="off">
          <fieldset class="fs"><legend>The basics</legend><div class="fields">
            <div class="field"><label for="f-name">Name</label><input class="inp" id="f-name" data-f="name" maxlength="80" value="${esc(d.name)}"></div>
            <div class="two-col">
              <div class="field"><label for="f-cat">Category</label><select class="inp" id="f-cat" data-f="category"><option value="corporate" ${d.category === "corporate" ? "selected" : ""}>Corporate shoes</option><option value="sneakers" ${d.category === "sneakers" ? "selected" : ""}>Sneakers</option></select></div>
              <div class="field"><label for="f-price">Price (${esc(S.currency)})</label><input class="inp" id="f-price" data-f="price" type="number" min="0" inputmode="numeric" value="${esc(d.price)}"></div>
            </div>
            <div class="field"><label for="f-type">Type <span class="muted">(for example Cap-toe oxford)</span></label><input class="inp" id="f-type" data-f="type" maxlength="60" value="${esc(d.type)}"></div>
            <div class="field"><label for="f-tag">One line that sells it</label><input class="inp" id="f-tag" data-f="tagline" maxlength="160" value="${esc(d.tagline)}"></div>
            <label class="chk"><input type="checkbox" data-f="isNew" ${d.isNew ? "checked" : ""}> Show a "New" tag</label>
            <label class="chk"><input type="checkbox" data-f="active" ${d.active ? "checked" : ""}> Visible in the shop</label>
          </div></fieldset>
          <fieldset class="fs"><legend>Colours and photos</legend><div id="colors"></div><button class="btn" type="button" id="add-color">Add another colour</button></fieldset>
          <fieldset class="fs"><legend>Pairs in stock, by size</legend><div class="stock-row">${SIZES.map((s) => `<div><label for="f-s${s}">${s}</label><input id="f-s${s}" type="number" min="0" inputmode="numeric" data-fs="${s}" value="${Number(d.stock[s]) || 0}"></div>`).join("")}</div></fieldset>
          <fieldset class="fs"><legend>About this shoe</legend><div class="fields">
            <div class="field"><label for="f-about">Description <span class="muted">(leave a blank line between paragraphs)</span></label><textarea class="inp" id="f-about" data-f="about" rows="5">${esc(d.about.join("\n\n"))}</textarea></div>
            <div class="field"><label for="f-feat">Features <span class="muted">(one per line)</span></label><textarea class="inp" id="f-feat" data-f="features" rows="4">${esc(d.features.join("\n"))}</textarea></div>
            <div class="field"><label for="f-spec">Details <span class="muted">(one per line, like Sole: Rubber)</span></label><textarea class="inp" id="f-spec" data-f="specs" rows="4">${esc(Object.entries(d.specs).map(([k, v]) => k + ": " + v).join("\n"))}</textarea></div>
            <div class="field"><label for="f-care">Care tips <span class="muted">(one per line)</span></label><textarea class="inp" id="f-care" data-f="care" rows="3">${esc(d.care.join("\n"))}</textarea></div>
            <div class="field"><label for="f-occ">Good for <span class="muted">(one per line, like Weddings)</span></label><textarea class="inp" id="f-occ" data-f="occasions" rows="3">${esc(d.occasions.join("\n"))}</textarea></div>
          </div></fieldset>
          <p class="li-warn" id="form-err" role="alert"></p>
          <div class="req-actions"><button class="btn btn-accent" type="submit" id="save-product">Save shoe</button><button class="btn" type="button" id="form-cancel2">Cancel</button></div>
        </form>
        <aside class="pv" aria-label="Preview"><h3>Preview</h3><p class="muted" style="font-size:13px">This is how it will look in the shop. It updates as you type.</p><div id="pv-card"></div><div id="pv-page"></div></aside>
      </div>`;
    paintColors(); paintPreview();
  }

  function paintColors() {
    const box = $("#colors"); if (!box) return;
    box.innerHTML = draft.colors.map((c, i) => `
      <div class="colr" data-ci="${i}">
        <div class="two-col"><div class="field"><label for="c-n${i}">Colour name</label><input class="inp" id="c-n${i}" data-cf="name" data-ci="${i}" maxlength="40" value="${esc(c.name)}" placeholder="For example Black"></div>
        <div class="field"><label for="c-h${i}">Swatch</label><input class="inp swatch" id="c-h${i}" type="color" data-cf="hex" data-ci="${i}" value="${esc(c.hex)}"></div></div>
        <div class="thumbs">${c.images.map((u, k) => `<div class="thumb"><img src="${esc(u)}" alt=""><button type="button" class="thumb-x" data-rm-img="${i}:${k}" aria-label="Remove photo">×</button>${k === 0 ? '<span class="thumb-main">Main</span>' : ""}</div>`).join("")}
          <label class="thumb add"><input type="file" accept="image/jpeg,image/png,image/webp" multiple data-upload="${i}" hidden><span>+ Photo</span></label></div>
        <div class="req-actions">${draft.colors.length > 1 ? `<button class="btn-link" type="button" data-rm-color="${i}">Remove this colour</button>` : ""}</div>
      </div>`).join("");
  }

  function readDraft() {
    const f = $("#pform"); if (!f) return;
    $$("[data-f]", f).forEach((el) => {
      const k = el.dataset.f, v = el.type === "checkbox" ? el.checked : el.value;
      if (k === "about") draft.about = String(v).split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
      else if (["features", "care", "occasions"].includes(k)) draft[k] = lines(v);
      else if (k === "specs") draft.specs = Object.fromEntries(lines(v).filter((l) => l.includes(":")).map((l) => [l.slice(0, l.indexOf(":")).trim(), l.slice(l.indexOf(":") + 1).trim()]));
      else if (k === "price") draft.price = v === "" ? "" : Math.max(0, Math.floor(Number(v) || 0));
      else draft[k] = v;
    });
    $$("[data-fs]", f).forEach((el) => { draft.stock[el.dataset.fs] = Math.max(0, Math.floor(Number(el.value) || 0)); });
    $$("[data-cf]", f).forEach((el) => { draft.colors[Number(el.dataset.ci)][el.dataset.cf] = el.value; });
    if (!draft._saved) draft.id = slug(draft.name);
  }

  function previewProduct() {
    const p = Object.assign({}, draft);
    p.price = Number(draft.price) || 0;
    p.colors = draft.colors.map((c) => ({ name: c.name || "Colour", hex: c.hex, images: c.images }));
    return p;
  }
  function paintPreview() {
    const p = previewProduct(), size = SIZES.find((s) => Number(p.stock[s]) > 0) || SIZES[3];
    const hasImg = p.colors.some((c) => c.images.length);
    const card = $("#pv-card"), pg = $("#pv-page"); if (!card) return;
    card.innerHTML = p.name && hasImg ? `<div class="pv-grid">${Kc.cardHTML(p, size, 0)}</div>` : '<div class="pv-empty">Add a name and a photo to see the card.</div>';
    card.querySelectorAll(".reveal").forEach((e) => e.classList.add("in"));
    const img = (p.colors.find((c) => c.images.length) || { images: [] }).images[0];
    pg.innerHTML = `<h3 style="margin-top:18px">Product page</h3><div class="pv-page">
      ${img ? `<img src="${esc(img)}" alt="">` : '<div class="pv-empty">No photo yet</div>'}
      <div class="pv-body"><div class="muted" style="font-size:13px">${esc(p.type)}</div><h4>${esc(p.name || "Shoe name")}</h4>
      <div style="font-weight:700;font-size:20px">${money(p.price)}</div><p class="muted">${esc(p.tagline)}</p>
      <div class="pv-sw">${p.colors.map((c) => `<span title="${esc(c.name)}" style="background:${esc(c.hex)}"></span>`).join("")}</div>
      <div class="pv-sizes">${SIZES.map((s) => `<span class="${Number(p.stock[s]) > 0 ? "" : "off"}">${s}</span>`).join("")}</div>
      ${p.about.map((a) => `<p>${esc(a)}</p>`).join("")}
      ${p.features.length ? `<ul>${p.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>` : ""}
      ${Object.keys(p.specs).length ? `<dl class="pv-specs">${Object.entries(p.specs).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>` : ""}</div></div>`;
  }

  async function saveDraft() {
    if (saving) return;
    readDraft();
    const d = draft, err = (m) => { $("#form-err").textContent = m; $("#form-err").scrollIntoView({ block: "center", behavior: "smooth" }); };
    if (d.name.trim().length < 2) return err("Please give the shoe a name.");
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(d.id)) return err("The name needs some letters or numbers.");
    if (!d._saved && products.some((p) => p.id === d.id)) return err("You already have a shoe with this name. Please use a different name.");
    if (!(Number(d.price) > 0)) return err("Please enter a price.");
    if (d.colors.some((c) => !c.name.trim())) return err("Every colour needs a name.");
    if (d.colors.some((c) => !c.images.length)) return err("Every colour needs at least one photo.");
    const names = d.colors.map((c) => c.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) return err("Two colours have the same name.");
    saving = true; const btn = $("#save-product"); btn.disabled = true; btn.textContent = "Saving...";
    try {
      const out = Object.assign({}, d, { price: Number(d.price), name: d.name.trim(), colors: d.colors.map((c) => ({ name: c.name.trim(), hex: c.hex, images: c.images })) });
      await Api.saveProduct(out);
      products = await Api.allProducts();
      toast(d._saved ? "Saved" : "Added to the shop", "ok");
      editing = false; draft = null; panel();
    } catch (e) { err(e.message); btn.disabled = false; btn.textContent = "Save shoe"; }
    saving = false;
  }

  /* ======================= insights ======================= */
  function insightsTab(el) {
    const paid = orders.filter((o) => PAID.includes(o.status));
    const revenue = paid.reduce((n, o) => n + o.total, 0);
    const decided = orders.filter((o) => !["pending"].includes(o.status));
    const approved = decided.filter((o) => !["declined", "cancelled"].includes(o.status)).length;
    const days = [...Array(14)].map((_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (13 - i)); return d.getTime(); });
    const sums = days.map((t) => paid.filter((o) => { const c = new Date(o.createdAt); c.setHours(0, 0, 0, 0); return c.getTime() === t; }).reduce((n, o) => n + o.total, 0));
    const max = Math.max(...sums, 1);
    const bars = sums.map((v, i) => { const h = Math.round((v / max) * 110); return `<g><rect x="${i * 36 + 6}" y="${120 - h}" width="26" height="${h}" rx="5" fill="${v ? "var(--accent)" : "#E3DCCF"}"><title>${day(days[i])}: ${money(v)}</title></rect><text x="${i * 36 + 19}" y="136" text-anchor="middle" font-size="9" fill="#6B665C">${new Date(days[i]).getDate()}</text></g>`; }).join("");
    const sold = {}; paid.forEach((o) => o.items.forEach((i) => { sold[i.name] = (sold[i.name] || 0) + i.qty; }));
    const best = Object.entries(sold).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const low = []; products.forEach((p) => SIZES.forEach((s) => { const q = Number(p.stock[s]) || 0; if (q > 0 && q <= S.lowStockAt) low.push(`${p.name}, size ${s}: ${q} left`); }));
    el.innerHTML = `
      <div class="ins">
        <div class="stat"><small>Average order</small><b>${paid.length ? money(Math.round(revenue / paid.length)) : "None yet"}</b></div>
        <div class="stat"><small>Requests you approved</small><b>${decided.length ? Math.round((approved / decided.length) * 100) + "%" : "None yet"}</b></div>
        <div class="stat"><small>Paid orders</small><b>${paid.length}</b></div>
      </div>
      <h2 class="sub-h">Paid sales, last 14 days</h2>
      <div class="scroll-x"><svg viewBox="0 0 510 142" width="510" height="142" role="img" aria-label="Paid sales for the last 14 days">${bars}</svg></div>
      <h2 class="sub-h">Best sellers</h2>
      ${best.length ? `<ol class="rank">${best.map(([n, q]) => `<li><span>${esc(n)}</span><b>${q} pair${q > 1 ? "s" : ""}</b></li>`).join("")}</ol>` : '<p class="muted">Sales will show here once orders are paid.</p>'}
      <h2 class="sub-h">Running low</h2>
      ${low.length ? `<ul class="rank">${low.map((t) => `<li><span>${esc(t)}</span></li>`).join("")}</ul>` : '<p class="muted">Nothing is running low.</p>'}`;
  }

  /* ======================= discount codes ======================= */
  function codesTab(el) {
    el.innerHTML = `
      <form id="code-form" class="look" style="max-width:520px" novalidate><h2 class="sub-h" style="margin:0">New discount code</h2>
        <p class="muted" style="font-size:14px">Customers type the code at checkout. The discount comes off the shoes, not the delivery fee.</p>
        <div class="two-col"><div class="field"><label for="dc-code">Code</label><input class="inp" id="dc-code" name="code" maxlength="20" autocapitalize="characters" placeholder="WELCOME10"></div>
          <div class="field"><label for="dc-pct">Percent off</label><input class="inp" id="dc-pct" name="percent" type="number" min="1" max="90" placeholder="10"></div></div>
        <div class="two-col"><div class="field"><label for="dc-min">Smallest order (${esc(S.currency)}, optional)</label><input class="inp" id="dc-min" name="min" type="number" min="0" value="0"></div>
          <div class="field"><label for="dc-max">Most uses (optional)</label><input class="inp" id="dc-max" name="max" type="number" min="1"></div></div>
        <p class="li-warn" id="dc-err" role="alert"></p><button class="btn btn-accent" type="submit">Create code</button></form>
      <h2 class="sub-h">Your codes (${codes.length})</h2>
      ${codes.length ? codes.map((c) => `<div class="req"><header><b>${esc(c.code)}</b><span class="muted">${c.percent}% off</span></header>
        <div class="req-where">Used ${c.uses}${c.max_uses ? " of " + c.max_uses : ""} times${c.min_order ? " · from " + money(c.min_order) : ""} · ${c.active ? "Active" : "Paused"}</div>
        <div class="req-actions"><button class="btn" data-code-toggle="${esc(c.code)}">${c.active ? "Pause" : "Turn on"}</button><button class="btn-link" data-code-del="${esc(c.code)}">Delete</button></div></div>`).join("") : '<p class="muted">No codes yet.</p>'}`;
  }

  /* ======================= customers ======================= */
  function customersTab(el) {
    const m = new Map();
    orders.forEach((o) => {
      const k = String(o.customer.phone).replace(/\D/g, "").slice(-10);
      const c = m.get(k) || { name: o.customer.name, phone: o.customer.phone, email: o.customer.email, n: 0, spent: 0, last: 0 };
      c.n++; if (PAID.includes(o.status)) c.spent += o.total; c.last = Math.max(c.last, o.createdAt); m.set(k, c);
    });
    const list = [...m.values()].sort((a, b) => b.spent - a.spent || b.last - a.last);
    el.innerHTML = list.length ? `<div class="scroll-x"><table class="otbl"><thead><tr><th>Customer</th><th>Orders</th><th>Spent</th><th>Last order</th><th></th></tr></thead><tbody>${list.map((c) => `<tr>
      <td><b>${esc(c.name)}</b><div class="det">${esc(c.phone)} · ${esc(c.email)}</div></td><td>${c.n}</td><td>${money(c.spent)}</td><td>${day(c.last)}</td>
      <td><a class="btn" href="https://wa.me/${intl(c.phone)}" target="_blank" rel="noopener">WhatsApp</a></td></tr>`).join("")}</tbody></table></div>` : '<div class="empty" style="padding:28px 0"><p>Your customers will appear here after their first order.</p></div>';
  }

  /* ======================= settings ======================= */
  function settingsTab(el) {
    if (!bank || !settings) { el.innerHTML = '<p class="muted">Loading...</p>'; return; }
    const blocked = new Set(settings.blocked_states || []);
    el.innerHTML = `
      <form id="bank-form" class="look" style="max-width:520px" novalidate><h2 class="sub-h" style="margin:0">Where customers send money</h2>
        <p class="muted" style="font-size:14px">Customers see these details after you approve their order. Use the account you want payments to reach.</p>
        <div class="field"><label for="b-bank">Bank</label><input class="inp" id="b-bank" name="bank_name" maxlength="80" value="${esc(bank.bank_name)}"></div>
        <div class="field"><label for="b-num">Account number</label><input class="inp" id="b-num" name="account_number" inputmode="numeric" maxlength="20" value="${esc(bank.account_number)}"></div>
        <div class="field"><label for="b-name">Account name</label><input class="inp" id="b-name" name="account_name" maxlength="80" value="${esc(bank.account_name)}"></div>
        <div class="field"><label for="b-ins">Extra instructions <span class="muted">(optional)</span></label><input class="inp" id="b-ins" name="instructions" maxlength="300" value="${esc(bank.instructions)}"></div>
        <button class="btn btn-accent" type="submit">Save bank details</button></form>
      <form id="ps-form" class="look" style="max-width:520px;margin-top:30px" novalidate><h2 class="sub-h" style="margin:0">Online payment (Paystack)</h2>
        <p class="muted" style="font-size:14px">When on, customers see a "Pay now" button with card, transfer and USSD, and orders turn to paid by themselves. Turn it on only after your Paystack keys are added. Bank transfer stays as a backup.</p>
        <label class="chk"><input type="checkbox" name="on" ${settings.paystack_on ? "checked" : ""}> Accept online payments</label>
        <label class="chk"><input type="checkbox" name="first" ${settings.pay_first !== false ? "checked" : ""}> Let customers pay straight away, without waiting for my approval</label>
        <button class="btn btn-accent" type="submit">Save</button></form>
      <form id="ann-form" class="look" style="max-width:520px;margin-top:30px" novalidate><h2 class="sub-h" style="margin:0">Announcement bar</h2>
        <p class="muted" style="font-size:14px">A line at the top of every page, for news like "Closed on Sunday".</p>
        <div class="field"><label for="a-text">Message</label><input class="inp" id="a-text" name="announcement" maxlength="200" value="${esc(settings.announcement)}"></div>
        <label class="chk"><input type="checkbox" name="on" ${settings.announcement_on ? "checked" : ""}> Show it on the site</label>
        <button class="btn btn-accent" type="submit">Save announcement</button></form>
      <form id="ship-form" class="look" style="max-width:620px;margin-top:30px" novalidate><h2 class="sub-h" style="margin:0">Delivery</h2>
        ${settings.delivery_zones.map((z, i) => `<div class="two-col"><div class="field"><label for="z-f${i}">${esc(z.name)}: fee (${esc(S.currency)})</label><input class="inp" id="z-f${i}" data-zf="${i}" type="number" min="0" value="${esc(z.fee)}"></div>
          <div class="field"><label for="z-e${i}">Time</label><input class="inp" id="z-e${i}" data-ze="${i}" maxlength="40" value="${esc(z.eta)}"></div></div>`).join("")}
        <div class="two-col"><div class="field"><label for="s-low">Warn when this few are left</label><input class="inp" id="s-low" name="low" type="number" min="0" value="${esc(settings.low_stock_at)}"></div>
          <div class="field"><label for="s-ret">Days to return a pair</label><input class="inp" id="s-ret" name="ret" type="number" min="0" value="${esc(settings.returns_days)}"></div></div>
        <div class="field"><span class="lbl">States you do not deliver to</span><div class="states">${window.STATES.map((s) => `<label class="chk"><input type="checkbox" data-bs="${esc(s)}" ${blocked.has(s) ? "checked" : ""}> ${esc(s)}</label>`).join("")}</div></div>
        <button class="btn btn-accent" type="submit">Save delivery settings</button></form>
      <form id="pw" class="look" style="max-width:420px;margin-top:30px" novalidate><h2 class="sub-h" style="margin:0">Change your password</h2>
        <div class="field"><label for="nxt">New password (at least 8 characters)</label><input class="inp" id="nxt" type="password" autocomplete="new-password"></div>
        <p class="li-warn" id="pw-err" role="alert"></p><button class="btn btn-accent" type="submit">Change password</button></form>`;
  }

  /* ======================= data and events ======================= */
  async function loadAll() {
    const [o, p, b, s, c] = await Promise.all([Api.orders(), Api.allProducts(), Api.bank(), Api.loadSettingsRow(), Api.codes()]);
    orders = o; products = p; bank = b; settings = s; codes = c;
  }
  async function refresh(light) {
    try {
      orders = await Api.orders();
      if (!light) products = await Api.allProducts();
    } catch (err) { if (err.code === "forbidden" || /log in/i.test(err.message)) return loginView("Your session ended. Please log in again."); return; }
    const n = pendingN();
    if (lastPending !== null && n > lastPending) toast("New order request", "ok");
    lastPending = n;
    document.title = (n ? "(" + n + ") " : "") + "Seller dashboard | " + S.name;
    stats();
    const b = $('[data-tab="requests"]'); if (b) b.innerHTML = "Requests" + (n ? ` <span class="badge-n">${n}</span>` : "");
    const busy = declining || editing || (document.activeElement && document.activeElement.matches("input, select, textarea"));
    if (!busy && (tab === "requests" || tab === "orders" || tab === "insights" || tab === "customers")) panel();
  }
  async function start() {
    try { await loadAll(); }
    catch (err) { return loginView(err.message); }
    lastPending = pendingN(); shell();
    clearInterval(timer); timer = setInterval(() => { if (!document.hidden) refresh(true); }, 12000);
  }
  const act = async (fn, msg) => { try { await fn(); toast(msg, "ok"); declining = null; await refresh(true); panel(); } catch (e) { toast(e.message, "bad"); } };

  document.addEventListener("click", async (e) => {
    const t = e.target; let b;
    if ((b = t.closest("[data-tab]"))) { tab = b.dataset.tab; editing = false; paintTabs(); panel(); return; }
    if ((b = t.closest("[data-open]"))) { open = open === b.dataset.open ? null : b.dataset.open; panel(); return; }
    if ((b = t.closest("[data-act]"))) {
      const msgs = { accept: "Accepted. The customer can now pay.", confirm_payment: "Payment confirmed. Time to pack.", reject_payment: "Marked as not received." };
      b.disabled = true; act(() => Api.decide(b.dataset.id, b.dataset.act), msgs[b.dataset.act]); return;
    }
    if ((b = t.closest("[data-decline-open]"))) { declining = b.dataset.declineOpen; panel(); const w = $("#why-" + declining); if (w) w.focus(); return; }
    if (t.closest("[data-decline-cancel]")) { declining = null; panel(); return; }
    if ((b = t.closest("[data-decline]"))) { const id = b.dataset.decline; act(() => Api.decide(id, "decline", ($("#why-" + id).value || "").trim()), "Declined. The pair is back in stock."); return; }
    if ((b = t.closest("[data-code-toggle]"))) { const c = codes.find((x) => x.code === b.dataset.codeToggle); act(async () => { await Api.saveCode(Object.assign({}, c, { active: !c.active })); codes = await Api.codes(); }, c.active ? "Code paused" : "Code is on"); return; }
    if ((b = t.closest("[data-code-del]"))) { if (confirm("Delete code " + b.dataset.codeDel + "?")) act(async () => { await Api.deleteCode(b.dataset.codeDel); codes = await Api.codes(); }, "Deleted"); return; }
    if ((b = t.closest("[data-print]"))) { printSlip(b.dataset.print); return; }
    if (t.closest("#logout")) { await Api.signOut(); clearInterval(timer); loginView("You are logged out."); return; }
    // products
    if (t.closest("#add-product")) { draft = blank(); editing = true; panel(); return; }
    if ((b = t.closest("[data-edit]"))) { const p = products.find((x) => x.id === b.dataset.edit); draft = JSON.parse(JSON.stringify(p)); draft._saved = true; draft.price = String(draft.price); editing = true; panel(); window.scrollTo({ top: 0 }); return; }
    if (t.closest("#form-cancel") || t.closest("#form-cancel2")) { editing = false; draft = null; panel(); return; }
    if (t.closest("#add-color")) { readDraft(); draft.colors.push({ name: "", hex: "#C93B17", images: [] }); paintColors(); paintPreview(); return; }
    if ((b = t.closest("[data-rm-color]"))) { readDraft(); draft.colors.splice(Number(b.dataset.rmColor), 1); paintColors(); paintPreview(); return; }
    if ((b = t.closest("[data-rm-img]"))) { readDraft(); const [i, k] = b.dataset.rmImg.split(":").map(Number); draft.colors[i].images.splice(k, 1); paintColors(); paintPreview(); return; }
    if ((b = t.closest("[data-toggle]"))) { const p = products.find((x) => x.id === b.dataset.toggle); act(async () => { await Api.setActive(p.id, !p.active); products = await Api.allProducts(); }, p.active ? "Hidden from the shop" : "Now visible in the shop"); return; }
    if ((b = t.closest("[data-delete]"))) {
      const p = products.find((x) => x.id === b.dataset.delete);
      if (confirm("Delete " + p.name + "? Past orders keep their details. To keep the shoe but stop selling it, use Hide instead.")) act(async () => { await Api.deleteProduct(p.id); products = await Api.allProducts(); }, "Deleted");
    }
  });
  document.addEventListener("input", (e) => { if (e.target.closest("#pform")) { readDraft(); paintPreview(); } });
  document.addEventListener("change", async (e) => {
    const up = e.target.closest("[data-upload]");
    if (up) {
      readDraft();
      if (!draft.name.trim()) { toast("Type the shoe name first, then add photos.", "bad"); up.value = ""; return; }
      const i = Number(up.dataset.upload), files = Array.from(up.files); toast("Uploading " + files.length + (files.length > 1 ? " photos..." : " photo..."));
      for (const f of files) {
        try { draft.colors[i].images.push(await Api.uploadProductImage(f, slug(draft.name) || "shoe")); paintColors(); paintPreview(); }
        catch (err) { toast(err.message, "bad"); }
      }
      return;
    }
    const st = e.target.closest("[data-status]");
    if (st) { act(() => Api.decide(st.dataset.status, st.value), st.dataset.status + ": " + STATUS_LABEL[st.value]); return; }
    const sk = e.target.closest("[data-stock]");
    if (sk) {
      const p = products.find((x) => x.id === sk.dataset.stock), q = Math.max(0, Math.floor(Number(sk.value) || 0));
      const next = Object.assign({}, p.stock, { [sk.dataset.size]: q });
      try { await Api.saveStock(p.id, next); p.stock = next; sk.value = q; sk.classList.toggle("low", q > 0 && q <= S.lowStockAt); toast("Stock saved", "ok"); }
      catch (err) { toast(err.message, "bad"); sk.value = Number(p.stock[sk.dataset.size]) || 0; }
    }
  });
  document.addEventListener("submit", async (e) => {
    const f = e.target; e.preventDefault();
    if (f.id === "pform") return saveDraft();
    if (f.id === "code-form") {
      const code = f.code.value.trim().toUpperCase(), pct = Math.floor(Number(f.percent.value)), err = $("#dc-err");
      if (!/^[A-Z0-9]{3,20}$/.test(code)) { err.textContent = "Use 3 to 20 letters or numbers, no spaces."; return; }
      if (!(pct >= 1 && pct <= 90)) { err.textContent = "Percent off must be between 1 and 90."; return; }
      if (codes.some((c) => c.code === code)) { err.textContent = "That code already exists."; return; }
      try { await Api.saveCode({ code, percent: pct, min_order: Math.max(0, Math.floor(Number(f.min.value) || 0)), max_uses: f.max.value ? Math.max(1, Math.floor(Number(f.max.value))) : null }); codes = await Api.codes(); toast("Code created", "ok"); panel(); }
      catch (e2) { err.textContent = e2.message; }
      return;
    }
    try {
      if (f.id === "bank-form") { bank = await Api.saveBank({ bank_name: f.bank_name.value.trim(), account_number: f.account_number.value.trim(), account_name: f.account_name.value.trim(), instructions: f.instructions.value.trim() }); toast("Bank details saved", "ok"); }
      else if (f.id === "ps-form") { settings = await Api.saveSettings({ paystack_on: f.on.checked, pay_first: f.first.checked }); toast(settings.paystack_on ? "Online payment is on" : "Online payment is off", "ok"); }
      else if (f.id === "ann-form") { settings = await Api.saveSettings({ announcement: f.announcement.value.trim(), announcement_on: f.on.checked && !!f.announcement.value.trim() }); toast("Saved", "ok"); }
      else if (f.id === "ship-form") {
        const zones = settings.delivery_zones.map((z, i) => Object.assign({}, z, { fee: Math.max(0, Math.floor(Number($("[data-zf='" + i + "']").value) || 0)), eta: $("[data-ze='" + i + "']").value.trim() || z.eta }));
        settings = await Api.saveSettings({ delivery_zones: zones, blocked_states: $$("[data-bs]:checked").map((c) => c.dataset.bs), low_stock_at: Math.max(0, Math.floor(Number(f.low.value) || 0)), returns_days: Math.max(0, Math.floor(Number(f.ret.value) || 0)) });
        S.lowStockAt = settings.low_stock_at; toast("Delivery settings saved", "ok");
      } else if (f.id === "pw") { await Api.updatePassword($("#nxt").value); toast("Password changed", "ok"); f.reset(); $("#pw-err").textContent = ""; }
    } catch (err) { toast(err.message, "bad"); const pe = $("#pw-err"); if (pe && f.id === "pw") pe.textContent = err.message; }
  });

  if (!Kc.sb) { loginView("The store is not connected to Supabase yet."); }
  else if (Kc.state.user && Api.isSeller()) start();
  else loginView("");
});
