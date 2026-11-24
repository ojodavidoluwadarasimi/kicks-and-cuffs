/* Order tracking: where the request is, and paying once it is approved. */
Kc.ready(() => {
  const { $, S, esc, money, param, STATUS, STATUS_LABEL, observe, toast, phoneOf, rememberOrder } = Kc;
  const root = $("#track-root");
  let currentId = (param("order") || "").toUpperCase();
  let phone = currentId ? phoneOf(currentId) : "";
  let isNew = param("new") === "1";
  let shown = null; // signature of what is on screen, so we only redraw when something changed

  const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const when = (t) => new Date(t).toLocaleString(S.locale, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  const reveal = () => { Kc.split(); observe(root); root.querySelectorAll("[data-split]").forEach((e) => requestAnimationFrame(() => e.classList.add("in"))); };

  function lookupForm(msg) {
    shown = null;
    root.innerHTML = `
      <div class="page-head"><h1 data-split>Track your order</h1><p class="reveal" style="--d:.3s">Enter your order number and the phone number you used.</p></div>
      <form id="lookup" class="look" novalidate>
        <div class="field"><label for="oid">Order number</label><input class="inp" id="oid" placeholder="KC-0001" autocomplete="off" style="text-transform:uppercase" value="${esc(currentId)}"></div>
        <div class="field"><label for="ph">Phone number</label><input class="inp" id="ph" type="tel" inputmode="tel" placeholder="0801 234 5678" autocomplete="tel" value="${esc(phone)}"></div>
        <button class="btn btn-accent" type="submit">Find my order</button>
      </form>
      ${msg ? `<p class="li-warn" style="margin-top:12px">${esc(msg)}</p>` : ""}`;
    reveal();
    $("#lookup").addEventListener("submit", (e) => {
      e.preventDefault();
      currentId = $("#oid").value.trim().toUpperCase(); phone = $("#ph").value.trim();
      history.replaceState(null, "", "track.html?order=" + encodeURIComponent(currentId));
      load(true);
    });
  }

  async function load(first) {
    if (!currentId || !phone) return lookupForm("");
    try {
      const o = await Api.lookup(currentId, phone);
      rememberOrder(o.id, phone);
      draw(o);
    } catch (err) {
      if (first || !shown) lookupForm(err.message);
    }
  }

  function draw(o) {
    const sig = o.status + "|" + (o.history || []).length;
    if (sig === shown) return;
    shown = sig;
    const ended = o.status === "declined" || o.status === "cancelled";
    const idx = STATUS.findIndex((s) => s.key === o.status);
    const at = {}; (o.history || []).forEach((h) => { at[h.status] = h.at; });

    const steps = STATUS.map((s, i) => {
      const cls = i < idx || (i === idx && s.key === "delivered") ? "done" : i === idx ? "now" : "todo";
      return `
      <div class="step ${cls} reveal" style="--d:${0.1 + i * 0.1}s">
        <div class="rail"><span class="dot">${cls === "done" ? CHECK : ""}</span>${i < STATUS.length - 1 ? '<span class="bar"></span>' : ""}</div>
        <div class="txt"><b>${s.label}</b><small>${at[s.key] ? when(at[s.key]) + ". " : ""}${i <= idx ? s.note : ""}</small></div>
      </div>`;
    }).join("");

    const heads = {
      pending: [isNew ? "Your request is in." : "Waiting for the seller.", "Request sent"],
      accepted: ["Approved. Time to pay.", "Approved"],
      confirming: ["We are checking your payment.", "Payment sent"],
      paid: ["Payment confirmed.", "Paid"],
      packing: ["Packing your pair.", "Order " + o.id],
      shipped: ["On the way.", "Order " + o.id],
      delivered: ["Delivered. Enjoy your pair.", "Order " + o.id],
      declined: ["Not approved this time.", "Request declined"],
      cancelled: ["Request cancelled.", "Cancelled"]
    };
    const [heading, eyebrow] = heads[o.status] || ["Your order", "Order " + o.id];
    const sub = {
      pending: "The seller reviews each request and approves or declines it. This page updates by itself, so you can keep it open or come back later.",
      accepted: "The seller approved your order. Pay below and we will start packing your pair.",
      confirming: "Your payment is being confirmed. We will start packing as soon as it is.",
      declined: "You have not been charged. You can pick another pair or another size.",
      cancelled: "You have not been charged, and the pair is back in stock."
    }[o.status] || "Keep this page. It updates as your pair moves.";

    const contact = S.contact.whatsapp ? `<a class="btn" style="margin-top:20px" href="https://wa.me/${esc(S.contact.whatsapp)}?text=${encodeURIComponent("Hello, my order number is " + o.id)}">Message the seller</a>` : "";
    const canCancel = o.status === "pending" || o.status === "accepted";
    const THANKED = "kc_thanked";

    const bank = o.bank || {};
    const haveBank = bank.accountNumber && bank.bankName;
    const wa = S.contact.whatsapp ? `https://wa.me/${esc(S.contact.whatsapp)}?text=${encodeURIComponent("Hello, I want to pay for order " + o.id + ". Please send me the account details.")}` : "";
    const payFirstPanel = o.status === "pending" && S.paystackOn && S.payFirst ? `
      <section class="pay-panel reveal">
        <h2>Pay ${money(o.total)} now</h2>
        <p class="muted" style="font-size:14px;margin-bottom:12px">Your pair is already held for you. Pay now and we start packing as soon as it goes through. No need to wait.</p>
        <button class="btn btn-accent btn-block pulse" id="paynow" type="button">Pay ${money(o.total)} now</button>
        <p class="muted" style="font-size:13px;margin-top:8px;text-align:center">Card, bank transfer or USSD. Confirmed automatically.</p>
      </section>` : "";
    const payPanel = payFirstPanel || o.status === "accepted" ? payFirstPanel || `
      <section class="pay-panel reveal">
        <h2>Pay ${money(o.total)}</h2>
        ${S.paystackOn ? `<button class="btn btn-accent btn-block pulse" id="paynow" type="button">Pay ${money(o.total)} now</button>
        <p class="muted" style="font-size:13px;margin:8px 0 18px;text-align:center">Card, bank transfer or USSD. Confirmed automatically.</p>
        ${haveBank ? '<p class="muted" style="font-size:14px;text-align:center;margin-bottom:10px">Or pay by direct bank transfer</p>' : ""}` : ""}
        ${haveBank ? `
        <p class="muted" style="font-size:14px;margin-bottom:12px">Send the exact amount by bank transfer, then tap the button below.</p>
        <dl class="bank">
          <div><dt>Bank</dt><dd>${esc(bank.bankName)}</dd></div>
          <div><dt>Account number</dt><dd><b id="acct">${esc(bank.accountNumber)}</b> <button class="btn-link" id="copy-acct" type="button">Copy</button></dd></div>
          <div><dt>Account name</dt><dd>${esc(bank.accountName)}</dd></div>
          <div><dt>Amount</dt><dd><b>${money(o.total)}</b></dd></div>
          <div><dt>Narration</dt><dd>${esc(o.id)}</dd></div>
        </dl>
        ${bank.instructions ? `<p class="muted" style="font-size:14px">${esc(bank.instructions)}</p>` : ""}
        <div class="field" style="margin-top:12px"><label for="ref">Transfer reference or sender name <span class="muted">(optional, helps us find it faster)</span></label><input class="inp" id="ref" maxlength="60" autocomplete="off"></div>
        <button class="btn btn-accent btn-block pulse" id="sent" style="margin-top:12px">I have sent ${money(o.total)}</button>`
        : `<p class="muted" style="font-size:15px">The seller will share the payment details with you. ${wa ? "Message them on WhatsApp and quote your order number." : ""}</p>${wa ? `<a class="btn btn-accent" href="${wa}" target="_blank" rel="noopener">Get payment details</a>` : ""}`}
      </section>` : o.status === "confirming" ? `
      <section class="pay-panel reveal">
        <h2>We are checking your payment</h2>
        <p class="muted" style="font-size:15px">Thank you. The seller is confirming your transfer${o.payment && o.payment.reference ? " (reference " + esc(o.payment.reference) + ")" : ""}. This page updates by itself the moment it is confirmed.</p>
      </section>` : "";

    const note = o.status === "declined" && o.declineReason ? `<div class="notice"><b>Message from the seller</b><p>${esc(o.declineReason)}</p></div>` : "";

    root.innerHTML = `
      <section class="track-hero" id="th">
        <div class="eyebrow" style="color:#CFC7B8">${esc(eyebrow)}</div>
        <h1 data-split>${esc(heading)}</h1>
        <p>Order <b>${esc(o.id)}</b>. ${esc(sub)}</p>
      </section>
      ${note}
      ${payPanel}
      ${ended ? "" : `<section class="steps">${steps}</section>`}

      <section class="summary reveal" style="margin-top:8px">
        <h2>In this order</h2>
        ${o.items.map((it) => `<div class="line-item" style="grid-template-columns:72px 1fr;padding:12px 0;animation:none"><img src="${esc(it.img)}" alt="" style="width:72px;height:72px"><div><div class="li-top"><span>${esc(it.name)}</span><span>${money(it.price * it.qty)}</span></div><div class="li-sub">${esc(it.color)}, size ${it.size}, quantity ${it.qty}</div></div></div>`).join("")}
        <div class="sum-row"><span class="muted">Subtotal</span><b>${money(o.subtotal)}</b></div>
        ${o.discount ? `<div class="sum-row"><span class="muted">Discount ${esc(o.code || "")}</span><b>-${money(o.discount)}</b></div>` : ""}
        <div class="sum-row"><span class="muted">Delivery (${esc(o.address.zone)})</span><b>${money(o.delivery)}</b></div>
        <div class="sum-row total"><span>${o.payment ? "Total paid" : "Total"}</span><span>${money(o.total)}</span></div>
        <p class="muted" style="font-size:14px;margin-top:10px">Delivering to ${esc(o.customer.name)}, ${esc(o.address.street)}, ${esc(o.address.city)}, ${esc(o.address.state || o.address.zone)}.</p>
        ${contact}
      </section>
      <p style="margin:24px 0 0;display:flex;gap:16px;flex-wrap:wrap;align-items:center">
        <a href="shop.html" class="btn btn-accent">Keep shopping</a><a href="track.html" class="btn">Track another order</a>
        ${canCancel ? '<button class="btn-link" id="cancel-req">Cancel this request</button>' : ""}
      </p>`;
    reveal();
    if (isNew && !Kc.reduced && o.status === "pending") { confetti(); }
    if (["paid", "packing", "shipped", "delivered"].includes(o.status)) {
      const done = Kc.store.get("kc_thanked", []);
      if (!done.includes(o.id)) { done.push(o.id); Kc.store.set("kc_thanked", done.slice(-50)); thanks(o); }
    }
    isNew = false;
  }

  document.addEventListener("click", async (e) => {
    if (e.target.closest("#copy-acct")) {
      const t = $("#acct").textContent;
      try { await navigator.clipboard.writeText(t); toast("Account number copied", "ok"); } catch (err) { toast("Account number: " + t); }
    }
    if (e.target.closest("#paynow")) {
      const btn = e.target.closest("#paynow"); btn.disabled = true; btn.textContent = "Opening secure payment...";
      try { const r = await Api.payOnline(currentId, phone); location.href = r.url; }
      catch (err) { btn.disabled = false; btn.textContent = "Try again"; toast(err.message, "bad"); }
      return;
    }
    if (e.target.closest("#sent")) {
      const btn = e.target.closest("#sent"); btn.disabled = true;
      try { const o = await Api.submitPayment(currentId, phone, ($("#ref") || {}).value || ""); shown = null; draw(await Api.lookup(currentId, phone)); toast("Thank you. We are confirming your payment.", "ok"); }
      catch (err) { btn.disabled = false; toast(err.message, "bad"); }
    }
    if (e.target.closest("#cancel-req")) {
      if (!confirm("Cancel this request?")) return;
      try { await Api.cancel(currentId, phone); shown = null; draw(await Api.lookup(currentId, phone)); toast("Request cancelled"); }
      catch (err) { toast(err.message, "bad"); }
    }
  });

  function thanks(o) {
    const first = esc(o.customer.name.split(" ")[0]);
    const zone = S.deliveryZones.find((z) => z.name === o.address.zone);
    const cats = new Set(o.items.map((i) => (Kc.product(i.id) || {}).category));
    const bought = new Set(o.items.map((i) => i.id));
    const picks = Kc.P.filter((p) => !bought.has(p.id) && !cats.has(p.category) && Kc.anyStock(p)).concat(Kc.P.filter((p) => !bought.has(p.id) && cats.has(p.category) && Kc.anyStock(p))).slice(0, 3);
    const wa = S.contact.whatsapp ? `<a class="btn" href="https://wa.me/${esc(S.contact.whatsapp)}?text=${encodeURIComponent("Hello, I just paid for order " + o.id + ".")}" target="_blank" rel="noopener">Chat with us</a>` : "";
    const ov = document.createElement("div");
    ov.className = "thanks-ov";
    ov.innerHTML = `
      <div class="thanks" role="dialog" aria-modal="true" aria-label="Thank you">
        <svg class="tick" viewBox="0 0 52 52" width="84" height="84" aria-hidden="true"><circle cx="26" cy="26" r="24" fill="none" stroke="#2F6B3F" stroke-width="3"/><path d="M15 27l8 8 14-16" fill="none" stroke="#2F6B3F" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <h2>Thank you for patronizing us, ${first}.</h2>
        <p class="thanks-lead">Your payment of <b>${money(o.total)}</b> is confirmed. We look forward to seeing you again.</p>
        <div class="thanks-ref">Order <b>${esc(o.id)}</b></div>
        <ol class="thanks-steps">
          <li><b>We pack your pair</b><span>Every pair is checked before it leaves.</span></li>
          <li><b>It heads to ${esc(o.address.city)}</b><span>${zone ? "Delivery to " + esc(zone.name) + " takes about " + esc(zone.eta) + "." : "We will update your tracking page."}</span></li>
          <li><b>You step out in style</b><span>Not the right fit? You have ${S.returnsDays} days to exchange it.</span></li>
        </ol>
        ${picks.length ? `<h3>Finish the look</h3><div class="thanks-picks">${picks.map((p) => `<a href="product.html?id=${esc(p.id)}"><img src="${esc(p.colors[0].images[0])}" alt=""><span>${esc(p.name)}</span><small>${money(p.price)}</small></a>`).join("")}</div>` : ""}
        <p class="thanks-tip">Tap the heart on any shoe to save it, so your favorites are waiting when you come back.</p>
        <div class="thanks-actions"><button class="btn btn-accent" id="thanks-close">See my order</button><a class="btn" href="shop.html">Keep shopping</a>${wa}</div>
      </div>`;
    document.body.appendChild(ov);
    document.body.classList.add("lock");
    requestAnimationFrame(() => ov.classList.add("open"));
    const close = () => { ov.classList.remove("open"); document.body.classList.remove("lock"); setTimeout(() => ov.remove(), 300); };
    ov.querySelector("#thanks-close").onclick = close;
    ov.addEventListener("click", (e) => { if (e.target === ov) close(); });
    document.addEventListener("keydown", function esc_(e) { if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc_); } });
    if (!Kc.reduced) {
      const c = document.createElement("div"); c.className = "conf conf-fixed";
      const cols = ["#C93B17", "#F1E1D0", "#2F6B3F", "#E8A33D", "#14130F"];
      for (let i = 0; i < 60; i++) {
        const s = document.createElement("i"), a = Math.random() * Math.PI * 2, d = 120 + Math.random() * 260;
        s.style.cssText = `background:${cols[i % cols.length]};--x:${Math.cos(a) * d}px;--y:${Math.sin(a) * d * 0.9 - 60}px;--r:${Math.random() * 720 - 360}deg;animation-delay:${Math.random() * 0.25}s`;
        c.appendChild(s);
      }
      ov.appendChild(c); setTimeout(() => c.remove(), 2600);
    }
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

  // keep the page fresh: poll the server, or listen for changes made in this browser (demo mode)
  setInterval(() => { if (!document.hidden && !document.body.classList.contains("lock") && currentId && phone) load(false); }, 12000);
  window.addEventListener("storage", (e) => { if (e.key === "kc_orders") load(false); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) load(false); });

  // coming back from Paystack: confirm the payment right away (the webhook also does this in the background)
  const back = param("reference") || param("trxref");
  if (back && currentId && phone) {
    history.replaceState(null, "", "track.html?order=" + encodeURIComponent(currentId));
    Api.verifyPayment(currentId, phone, back).catch(() => {}).finally(() => load(true));
  } else load(true);
});
