/* Data and Tools: datasets, software and notebooks from data/tools.json. */
(function () {
  "use strict";
  const esc = (s) => Site.esc(s);
  const ext = (href, label, cls = "btn btn-sm") => `<a class="${cls}" href="${esc(href)}" target="_blank" rel="noopener">${label}</a>`;

  const dataset = (d) => `
    <article class="card">
      <div class="chip-row" style="margin-bottom:.6rem">${d.host ? `<span class="chip">${esc(d.host)}</span>` : ""}${d.format ? `<span class="chip">${esc(d.format)}</span>` : ""}</div>
      <h3>${esc(d.title)}</h3>
      <p class="muted">${esc(d.summary)}</p>
      <dl class="small" style="display:grid;grid-template-columns:auto 1fr;gap:.2rem .8rem;margin:0 0 1rem">
        ${d.coverage ? `<dt class="muted">Time range</dt><dd style="margin:0">${esc(d.coverage)}</dd>` : ""}
        ${d.version ? `<dt class="muted">Version</dt><dd style="margin:0">${esc(d.version)}</dd>` : ""}
      </dl>
      <div class="btn-row">${ext(d.url, "Open")}${d.doi ? ext(d.doi, "DOI") : ""}</div>
    </article>`;

  const software = (s) => `
    <article class="card">
      <h3 class="mono" style="font-size:1.1rem">${esc(s.title)}</h3>
      <p class="muted">${esc(s.summary)}</p>
      ${s.install ? `<pre><code>${esc(s.install)}</code></pre>` : ""}
      <div class="chip-row" style="margin:.75rem 0">${(s.stack || []).map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div>
      <div class="btn-row">${s.repo ? ext(s.repo, Site.icon("github") + "Code") : ""}${s.docs ? ext(s.docs, "Docs") : ""}${s.doi ? ext(s.doi, "DOI") : ""}</div>
    </article>`;

  const notebook = (n) => `
    <a class="card card-link" href="${esc(n.url)}" target="_blank" rel="noopener">
      <h3>${esc(n.title)}</h3><p class="muted">${esc(n.summary)}</p>
    </a>`;

  document.addEventListener("DOMContentLoaded", async () => {
    const targets = { datasets: dataset, software, notebooks: notebook };
    let data;
    try { data = await Site.json("data/tools.json"); } catch { return; }
    for (const [key, fn] of Object.entries(targets)) {
      const el = document.querySelector(`[data-tools="${key}"]`);
      if (el) el.innerHTML = (data[key] || []).map(fn).join("") || `<div class="empty">Nothing listed yet.</div>`;
    }
  });
})();
