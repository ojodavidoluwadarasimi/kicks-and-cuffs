/* Info page: fills in delivery fees, sizes and contact details from the settings file. */
Kc.ready(() => {
  const { $, S, money, esc } = Kc;

  $("#zones").innerHTML = S.deliveryZones.map((z) => `<tr><td><b>${esc(z.name)}</b></td><td>${money(z.fee)}</td><td>${esc(z.eta)}</td></tr>`).join("");
  $("#sizes").innerHTML = window.SIZE_GUIDE.map((r) => `<tr><td><b>${r.eu}</b></td><td>${r.uk}</td><td>${r.cm.toFixed(1)}</td></tr>`).join("");
  document.querySelectorAll("[data-returns]").forEach((e) => { e.textContent = S.returnsDays; });

  const c = S.contact, rows = [];
  if (c.whatsapp) rows.push(`<p><b>WhatsApp:</b> <a style="text-decoration:underline" href="https://wa.me/${esc(c.whatsapp)}">Message us</a></p>`);
  if (c.phone) rows.push(`<p><b>Phone:</b> <a style="text-decoration:underline" href="tel:${esc(c.phone)}">${esc(c.phone)}</a></p>`);
  if (c.email) rows.push(`<p><b>Email:</b> <a style="text-decoration:underline" href="mailto:${esc(c.email)}">${esc(c.email)}</a></p>`);
  if (c.address) rows.push(`<p><b>Address:</b> ${esc(c.address)}</p>`);
  if (c.hours) rows.push(`<p><b>Hours:</b> ${esc(c.hours)}</p>`);
  $("#contact-list").innerHTML = rows.join("") || "<p>Message us with your order number and we will help.</p>";
});
