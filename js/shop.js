/* Shop page: filters by type and size, sort, and the saved list. */
document.addEventListener("DOMContentLoaded", () => {
  const { $, P, getSize, setSize, stockOf, stockState, saved, cardHTML, sizeChipsHTML, observe, param, esc } = Kc;

  const state = {
    cat: ["corporate", "sneakers"].includes(param("cat")) ? param("cat") : "all",
    savedOnly: param("saved") === "1",
    stockOnly: false,
    sort: "new"
  };

  const CATS = [["all", "All"], ["corporate", "Corporate"], ["sneakers", "Sneakers"]];

  function draw() {
    const size = getSize();

    $("#cat-pills").innerHTML = CATS.map(([k, label]) =>
      `<button class="chip pill ${state.cat === k && !state.savedOnly ? "on" : ""}" data-cat="${k}" aria-pressed="${state.cat === k && !state.savedOnly}">${label}</button>`).join("") +
      `<button class="chip pill ${state.savedOnly ? "on" : ""}" data-saved aria-pressed="${state.savedOnly}">Saved (${saved().length})</button>`;
    $("#size-chips").innerHTML = sizeChipsHTML(size);
    $("#stock-only").setAttribute("aria-pressed", String(state.stockOnly));

    let list = P.slice();
    if (state.savedOnly) { const s = saved(); list = list.filter((p) => s.includes(p.id)); }
    else if (state.cat !== "all") list = list.filter((p) => p.category === state.cat);
    if (state.stockOnly) list = list.filter((p) => stockOf(p, size) > 0);
    if (state.sort === "low") list.sort((a, b) => a.price - b.price);
    else if (state.sort === "high") list.sort((a, b) => b.price - a.price);
    else list.sort((a, b) => Number(b.isNew) - Number(a.isNew));

    const title = state.savedOnly ? "Saved" : state.cat === "corporate" ? "Corporate" : state.cat === "sneakers" ? "Sneakers" : "All shoes";
    const t = $("#shop-title");
    if (t.getAttribute("aria-label") !== title) { t.removeAttribute("data-done"); t.className = ""; t.textContent = title; Kc.split(); requestAnimationFrame(() => t.classList.add("in")); }

    $("#shop-count").textContent = list.length + (list.length === 1 ? " shoe" : " shoes") + " for size " + size;
    $("#shop-grid").innerHTML = list.map((p, i) => cardHTML(p, size, Math.min(i, 8) * 0.06)).join("");
    observe($("#shop-grid"));

    const empty = $("#shop-empty");
    if (!list.length) {
      empty.hidden = false;
      empty.innerHTML = state.savedOnly
        ? "<p>You have not saved any shoes yet. Tap the heart on a shoe to keep it here.</p><a class='btn' href='shop.html'>Browse all shoes</a>"
        : "<p>Nothing in stock in size " + esc(size) + " for this filter.</p><button class='btn' id='clear-stock'>Show everything</button>";
      const c = $("#clear-stock");
      if (c) c.onclick = () => { state.stockOnly = false; draw(); };
    } else empty.hidden = true;
  }

  document.addEventListener("click", (e) => {
    const c = e.target.closest("[data-cat]");
    if (c) { state.cat = c.dataset.cat; state.savedOnly = false; draw(); return; }
    if (e.target.closest("[data-saved]")) { state.savedOnly = !state.savedOnly; draw(); return; }
    const s = e.target.closest("#size-chips [data-size]");
    if (s) { setSize(Number(s.dataset.size)); return; }
    if (e.target.closest("#stock-only")) { state.stockOnly = !state.stockOnly; draw(); }
  });
  $("#sort").addEventListener("change", (e) => { state.sort = e.target.value; draw(); });
  document.addEventListener("kc:size", draw);
  document.addEventListener("kc:saved", () => { if (state.savedOnly) draw(); else $("#cat-pills [data-saved]").textContent = "Saved (" + saved().length + ")"; });
  draw();
});
