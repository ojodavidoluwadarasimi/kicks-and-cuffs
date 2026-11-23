/* Home page: size chooser and the "new this week" shoes. */
document.addEventListener("DOMContentLoaded", () => {
  const { $, getSize, setSize, cardHTML, sizeChipsHTML, observe, P } = Kc;

  function draw() {
    const size = getSize();
    $("#size-chips").innerHTML = sizeChipsHTML(size);
    $("#size-line").textContent = "Showing pairs in stock in size " + size + ".";
    const picks = P.filter((p) => p.isNew).slice(0, 4);
    $("#new-grid").innerHTML = picks.map((p, i) => cardHTML(p, size, i * 0.1)).join("");
    observe($("#new-grid"));
  }

  $("#size-chips").addEventListener("click", (e) => {
    const b = e.target.closest("[data-size]");
    if (b) setSize(Number(b.dataset.size));
  });
  document.addEventListener("kc:size", draw);
  document.addEventListener("kc:saved", () => {});
  draw();
});
