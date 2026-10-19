/* Publications: reads data/publications.json (written by tools/update_publications.py)
   and data/summaries.json (hand-written plain-language summaries). */
(function () {
  "use strict";
  const esc = (s) => Site.esc(s);
  const ME = /^(Bibhuti( Kumar| K\.)? Jha|B\. ?K\. Jha|Jha, B)/;
  const CATS = {
    refereed: "Refereed", preprint: "Preprint", proceedings: "Proceedings and abstracts",
    software: "Software", thesis: "Thesis", data: "Data", other: "Other",
  };

  let loaded = null;
  Site.pubs = () => (loaded ||= Promise.all([
    Site.json("data/publications.json"),
    Site.json("data/summaries.json").catch(() => ({})),
  ]).then(([p, s]) => ({ ...p, items: p.items.map((it) => ({ ...it, summary: s[it.bibcode] || "" })) })));

  function authors(list, max = 6) {
    const mark = (a) => (ME.test(a) ? `<span class="me">${esc(a)}</span>` : esc(a));
    if (list.length <= max) return list.map(mark).join(", ");
    const mine = list.findIndex((a) => ME.test(a));
    const shown = list.slice(0, max - 1).map(mark);
    if (mine >= max - 1) shown.push("…", mark(list[mine]));
    return shown.join(", ") + ` <span class="muted">+${list.length - shown.filter((s) => s !== "…").length} more</span>`;
  }

  function venue(it) {
    const bits = [it.venue_short || it.venue];
    if (it.volume) bits.push(it.volume);
    if (it.pages && !String(it.pages).startsWith("arXiv")) bits.push(it.pages);
    return `${esc(bits.filter(Boolean).join(", "))} · ${esc([it.month, it.year].filter(Boolean).join(" "))}`;
  }

  function links(it) {
    const out = [];
    if (it.pdf) out.push(`<a class="btn btn-sm" href="${esc(it.pdf)}" target="_blank" rel="noopener">${Site.icon("pdf")}PDF</a>`);
    if (it.doi) out.push(`<a class="btn btn-sm" href="https://doi.org/${esc(it.doi)}" target="_blank" rel="noopener">DOI</a>`);
    out.push(`<a class="btn btn-sm" href="${esc(it.ads)}" target="_blank" rel="noopener">ADS</a>`);
    out.push(`<a class="btn btn-sm" href="${esc(it.bibtex)}" target="_blank" rel="noopener" title="BibTeX on NASA ADS">${Site.icon("quote")}BibTeX</a>`);
    return `<div class="btn-row">${out.join("")}</div>`;
  }

  Site.pubHTML = (it, { headingLevel = 3 } = {}) => `
    <article class="pub">
      <h${headingLevel}><a href="${esc(it.ads)}" target="_blank" rel="noopener">${esc(it.title)}</a></h${headingLevel}>
      <p class="authors">${authors(it.authors)}</p>
      <p class="venue">${venue(it)}${it.category !== "refereed" ? ` · <span class="chip">${CATS[it.category] || it.category}</span>` : ""}${it.first_author ? ` · <span class="chip chip-accent">First author</span>` : ""}</p>
      ${it.summary ? `<p class="summary"><b>In short:</b> ${esc(it.summary)}</p>` : ""}
      ${links(it)}
    </article>`;

  // ---------- Research > Publications tab ----------
  async function initList(root) {
    const data = await Site.pubs();
    const items = data.items;
    const state = { q: "", year: "", cat: "refereed", first: false };
    const years = [...new Set(items.map((i) => i.year))].sort((a, b) => b - a);
    const yearSel = root.querySelector("[data-year]");
    yearSel.innerHTML = `<option value="">All years</option>` + years.map((y) => `<option>${y}</option>`).join("");
    const counts = (k) => items.filter((i) => k === "all" || i.category === k || (k === "other" && !["refereed", "preprint", "proceedings"].includes(i.category))).length;
    const pills = root.querySelector("[data-cats]");
    const catList = [["refereed", "Refereed"], ["preprint", "Preprints"], ["proceedings", "Proceedings"], ["other", "Software and thesis"], ["all", "All"]];
    pills.innerHTML = catList.filter(([k]) => counts(k)).map(([k, l]) => `<button type="button" data-cat="${k}" aria-pressed="${k === state.cat}">${l} <span class="muted">${counts(k)}</span></button>`).join("");
    const list = root.querySelector("[data-list]");
    const count = root.querySelector("[data-count]");

    function apply() {
      const q = state.q.toLowerCase();
      const shown = items.filter((i) =>
        (state.cat === "all" || i.category === state.cat || (state.cat === "other" && !["refereed", "preprint", "proceedings"].includes(i.category))) &&
        (!state.year || String(i.year) === state.year) &&
        (!state.first || i.first_author) &&
        (!q || (i.title + " " + i.authors.join(" ") + " " + i.venue + " " + i.summary).toLowerCase().includes(q)));
      count.textContent = `${shown.length} ${shown.length === 1 ? "paper" : "papers"}`;
      if (!shown.length) { list.innerHTML = `<div class="empty">No papers match these filters.</div>`; return; }
      let html = "", yr = null;
      for (const it of shown) {
        if (it.year !== yr) { yr = it.year; html += `<h3 class="pub-year">${yr}</h3>`; }
        html += Site.pubHTML(it, { headingLevel: 4 });
      }
      list.innerHTML = html;
    }
    pills.addEventListener("click", (e) => {
      const b = e.target.closest("[data-cat]"); if (!b) return;
      state.cat = b.dataset.cat;
      pills.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      apply();
    });
    yearSel.addEventListener("change", () => { state.year = yearSel.value; apply(); });
    root.querySelector("[data-first]").addEventListener("change", (e) => { state.first = e.target.checked; apply(); });
    root.querySelector("[data-q]").addEventListener("input", (e) => { state.q = e.target.value.trim(); apply(); });
    const upd = root.querySelector("[data-pubs-updated]");
    if (upd && data.updated) upd.textContent = Site.fmtDate(data.updated.slice(0, 10));
    apply();
  }

  // ---------- small lists of papers by bibcode (project cards) ----------
  async function initPaperLists() {
    const lists = document.querySelectorAll("[data-papers]");
    if (!lists.length) return;
    const { items } = await Site.pubs();
    const by = Object.fromEntries(items.map((i) => [i.bibcode, i]));
    lists.forEach((ul) => {
      ul.innerHTML = ul.dataset.papers.split(",").map((b) => by[b.trim()]).filter(Boolean)
        .map((it) => `<li><a href="${esc(it.ads)}" target="_blank" rel="noopener">${esc(it.title)}</a> <span class="muted small">${esc(it.venue_short)} ${it.year}</span></li>`).join("");
    });
  }


  // ---------- Home: latest paper ----------
  async function initLatest() {
    const el = document.querySelector("[data-latest-pub]");
    if (!el) return;
    try {
      const { items } = await Site.pubs();
      const it = items.find((i) => i.category === "refereed") || items[0];
      el.innerHTML = Site.pubHTML(it).replace('class="pub"', 'class="pub" style="padding:0;border:0"');
    } catch { el.closest("section")?.remove(); }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const root = document.querySelector("[data-publications]");
    if (root) initList(root).catch(() => (root.querySelector("[data-list]").innerHTML = `<div class="empty">The publication list could not be loaded. <a href="https://ui.adsabs.harvard.edu/search/q=author%3A%22Jha%2C%20Bibhuti%20Kumar%22" target="_blank" rel="noopener">See it on NASA ADS</a>.</div>`));
    initPaperLists().catch(() => {});
    initLatest();
  });
})();
