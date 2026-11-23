/* ==========================================================
   KICKS & CUFFS  |  payments
   One function, Payment.pay(), is all the checkout calls.
   Which provider runs is set by STORE.paymentProvider.

   "mock"     works now: a pretend payment window for the demo.
   "monnify"  Nigerian sellers. Added in the server step.
   "stripe"   international sellers. Added in the server step.

   Real payments need a small server, because secret keys must
   never sit in a web page, and a payment must be checked by the
   server before an order is marked paid.
   ========================================================== */

const Payment = (() => {
  const $ = (s, r = document) => r.querySelector(s);

  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function fmt(n) { return window.STORE.currency + Number(n).toLocaleString(window.STORE.locale); }

  const METHOD_TEXT = {
    card: "Pay with your debit card",
    transfer: "Pay by bank transfer",
    ussd: "Pay with a USSD code"
  };

  /* --- pretend payment window --- */
  function mock(p) {
    return new Promise((resolve, reject) => {
      const ov = document.createElement("div");
      ov.className = "pay-ov";
      ov.innerHTML = `
        <div class="pay-box" role="dialog" aria-modal="true" aria-label="Payment">
          <div class="pay-top"><b>Secure payment</b><span class="pay-demo">Demo</span></div>
          <div class="pay-amt">${fmt(p.amount)}</div>
          <div class="pay-line">${METHOD_TEXT[p.method] || "Pay"}</div>
          <div class="pay-line muted">Order for ${esc(p.customer.name)}</div>
          <div class="pay-body" id="pay-body">
            <button class="btn btn-accent btn-block" id="pay-go">Pay ${fmt(p.amount)}</button>
            <button class="btn-link" id="pay-fail">Simulate a failed payment</button>
            <button class="btn-link" id="pay-cancel">Cancel</button>
          </div>
          <p class="pay-note">This is a pretend payment window. No money moves. Real payments are added in the server step.</p>
        </div>`;
      document.body.appendChild(ov);
      document.body.classList.add("lock");
      requestAnimationFrame(() => ov.classList.add("open"));

      const close = () => { ov.classList.remove("open"); document.body.classList.remove("lock"); setTimeout(() => ov.remove(), 300); };
      const body = $("#pay-body", ov);

      $("#pay-cancel", ov).onclick = () => { close(); reject(new Error("Payment cancelled.")); };
      $("#pay-fail", ov).onclick = () => {
        body.innerHTML = '<div class="pay-spin"></div><p class="pay-line">Checking your payment</p>';
        setTimeout(() => { close(); reject(new Error("The payment did not go through. You have not been charged.")); }, 1300);
      };
      $("#pay-go", ov).onclick = () => {
        body.innerHTML = '<div class="pay-spin"></div><p class="pay-line">Confirming your payment</p>';
        setTimeout(() => {
          body.innerHTML = '<div class="pay-ok"><svg viewBox="0 0 52 52" width="64" height="64"><circle cx="26" cy="26" r="24" fill="none" stroke="#2F6B3F" stroke-width="3"/><path d="M15 27l8 8 14-16" fill="none" stroke="#2F6B3F" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg></div><p class="pay-line"><b>Payment confirmed</b></p>';
          setTimeout(() => {
            close();
            resolve({ provider: "mock", status: "paid", method: p.method, reference: "DEMO-" + Date.now().toString(36).toUpperCase() });
          }, 1100);
        }, 1500);
      };
    });
  }

  /* --- real providers: added in the server step --- */
  function monnify(/* p */) {
    // Plan: the server creates the transaction, the page opens the Monnify
    // checkout, and the server confirms the payment before the order is paid.
    return Promise.reject(new Error("Monnify is not connected yet. It is added in the server step."));
  }
  function stripe(/* p */) {
    return Promise.reject(new Error("Stripe is not connected yet. It is added in the server step."));
  }

  const providers = { mock, monnify, stripe };

  function pay(payload) {
    const name = window.STORE.paymentProvider;
    const run = providers[name];
    if (!run) return Promise.reject(new Error("Unknown payment provider: " + name));
    return run(payload);
  }

  return { pay, providers };
})();
