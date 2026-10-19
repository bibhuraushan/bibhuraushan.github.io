/* Research page: sunspot record figure, schematic butterfly diagram, talks list. */
(function () {
  "use strict";
  const esc = (s) => Site.esc(s);

  // A schematic (not data) butterfly diagram: three cycles of spots drifting equatorward.
  function butterfly(svg) {
    const NS = "http://www.w3.org/2000/svg";
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const W = 260, H = 170, mid = 85, cycles = 3, cw = (W - 20) / cycles;
    const line = document.createElementNS(NS, "line");
    Object.entries({ x1: 10, x2: W - 10, y1: mid, y2: mid, stroke: "var(--border-strong)", "stroke-dasharray": "3 3" }).forEach(([k, v]) => line.setAttribute(k, v));
    svg.appendChild(line);
    for (let c = 0; c < cycles; c++) {
      for (let i = 0; i < 110; i++) {
        const phase = rand();
        const lat = (32 - 26 * phase) * (0.75 + 0.5 * rand());
        const x = 10 + c * cw + phase * cw * 1.05;
        for (const sign of [1, -1]) {
          if (rand() < 0.3) continue;
          const dot = document.createElementNS(NS, "circle");
          dot.setAttribute("cx", x.toFixed(1));
          dot.setAttribute("cy", (mid - sign * lat * 2.3).toFixed(1));
          dot.setAttribute("r", (1.1 + rand() * 1.4).toFixed(1));
          dot.setAttribute("fill", sign > 0 ? "var(--sun-2)" : "var(--sun-1)");
          dot.setAttribute("opacity", "0.75");
          svg.appendChild(dot);
        }
      }
    }
    for (const [y, t] of [[14, "N"], [mid + 4, "0°"], [H - 6, "S"]]) {
      const tx = document.createElementNS(NS, "text");
      tx.setAttribute("x", 2); tx.setAttribute("y", y); tx.setAttribute("class", "axis-label"); tx.textContent = t;
      svg.appendChild(tx);
    }
  }

  async function talks() {
    const ul = document.querySelector("[data-talks]");
    if (!ul) return;
    try {
      const { items } = await Site.json("data/talks.json");
      ul.innerHTML = items.map((t) => `
        <li class="feed-item">
          <div class="feed-date">${Site.fmtDate(t.date)}</div>
          <div>
            <span class="feed-title">${t.url ? `<a href="${esc(t.url)}" target="_blank" rel="noopener">${esc(t.title)}</a>` : esc(t.title)}</span>
            <p class="feed-summary">${esc([t.event, t.host !== t.event ? t.host : "", t.location].filter(Boolean).join(" · "))}</p>
            <div class="feed-meta"><span class="chip chip-accent">${esc(t.kind)}</span>${t.note ? `<span class="chip">${esc(t.note)}</span>` : ""}
              ${t.slides ? `<a href="${esc(t.slides)}" target="_blank" rel="noopener">Slides</a>` : ""}<span>${esc(t.date_text || "")}</span></div>
          </div>
        </li>`).join("") || `<li class="empty">Talks will be listed here.</li>`;
    } catch { ul.innerHTML = `<li class="empty">Talks could not be loaded.</li>`; }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const b = document.querySelector("[data-butterfly]");
    if (b) butterfly(b);
    const rec = document.querySelector("[data-sunspot-record]");
    if (rec) Sunspots.mount(rec, { from: 1749, showPred: false, height: 240, ariaLabel: "Monthly and smoothed sunspot number since 1749" });
    talks();
  });
})();
