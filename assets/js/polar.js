/* Cycle 25 polar fields from the AFT baseline (data/aft-polar.json, written by
   tools/update_aft_polar.py). North and south on one axis, with the reversal dates marked. */
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const el = (name, attrs = {}, parent) => {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    parent?.appendChild(n);
    return n;
  };
  const toT = (d) => { const [y, m, dd] = d.split("-").map(Number); return y + (m - 1) / 12 + (dd - 1) / 365.25; };

  // The last sign change of a hemisphere's field is its reversal.
  function reversal(pts, key) {
    let at = null;
    for (let i = 1; i < pts.length; i++) if (Math.sign(pts[i][key]) !== Math.sign(pts[i - 1][key])) at = pts[i];
    return at;
  }

  function draw(box, pts, units) {
    const W = Math.max(box.clientWidth, 280), H = Math.round(Math.min(340, Math.max(220, W * 0.5)));
    const m = { t: 14, r: 12, b: 26, l: 34 };
    const from = pts[0].t, to = pts.at(-1).t;
    const lim = Math.ceil(Math.max(...pts.map((p) => Math.max(Math.abs(p.n), Math.abs(p.s)))));
    const x = (t) => m.l + ((t - from) / (to - from)) * (W - m.l - m.r);
    const y = (v) => m.t + ((lim - v) / (2 * lim)) * (H - m.t - m.b);

    box.innerHTML = "";
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "AFT polar magnetic field, north and south, Solar Cycle 25" }, box);
    const step = lim > 4 ? 2 : 1;
    for (let v = -lim; v <= lim; v += step) {
      el("line", { class: v === 0 ? "zero-line" : "grid-line", x1: m.l, x2: W - m.r, y1: y(v), y2: y(v) }, svg);
      el("text", { class: "axis-label", x: m.l - 6, y: y(v) + 4, "text-anchor": "end" }, svg).textContent = v;
    }
    for (let yr = Math.ceil(from); yr <= to; yr += W < 480 ? 2 : 1) {
      el("text", { class: "axis-label", x: x(yr), y: H - 6, "text-anchor": "middle" }, svg).textContent = yr;
    }
    const path = (key) => pts.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p[key]).toFixed(1)}`).join("");
    el("path", { class: "series-north", d: path("n") }, svg);
    el("path", { class: "series-south", d: path("s") }, svg);

    // Direct labels at the right end, and the reversal dates.
    const last = pts.at(-1);
    for (const [key, name, cls] of [["n", "North", "label-north"], ["s", "South", "label-south"]]) {
      el("text", { class: `marker-label ${cls}`, x: W - m.r - 2, y: y(last[key]) + (last[key] > 0 ? -8 : 16), "text-anchor": "end" }, svg).textContent = name;
      const rv = reversal(pts, key);
      if (!rv) continue;
      el("line", { class: "cross", x1: x(rv.t), x2: x(rv.t), y1: m.t, y2: H - m.b }, svg);
      el("circle", { class: `dot dot-${key}`, cx: x(rv.t), cy: y(0), r: 4 }, svg);
    }
    const rn = reversal(pts, "n"), rs = reversal(pts, "s");
    const note = box.closest(".card")?.querySelector("[data-polar-reversal]");
    if (note) note.textContent = [rn && `north ${Site.fmtDate(rn.d)}`, rs && `south ${Site.fmtDate(rs.d)}`].filter(Boolean).join(", ");

    // Hover: crosshair + both values for the nearest day.
    const cross = el("line", { class: "cross", y1: m.t, y2: H - m.b, visibility: "hidden" }, svg);
    let tip = box.querySelector(".chart-tip");
    if (!tip) { tip = document.createElement("div"); tip.className = "chart-tip"; box.appendChild(tip); }
    const hit = el("rect", { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: "transparent" }, svg);
    hit.addEventListener("pointermove", (ev) => {
      const r = svg.getBoundingClientRect();
      const t = from + (((ev.clientX - r.left) * (W / r.width) - m.l) / (W - m.l - m.r)) * (to - from);
      const i = Math.max(0, Math.min(pts.length - 1, Math.round(((t - from) / (to - from)) * (pts.length - 1))));
      const p = pts[i];
      cross.setAttribute("x1", x(p.t)); cross.setAttribute("x2", x(p.t)); cross.setAttribute("visibility", "visible");
      tip.innerHTML = `<div class="muted">${Site.fmtDate(p.d)}</div><div>North <b>${p.n.toFixed(2)} ${units}</b></div><div>South <b>${p.s.toFixed(2)} ${units}</b></div>`;
      tip.style.left = Math.min(Math.max((x(p.t) / W) * r.width, 70), r.width - 70) + "px";
      tip.style.top = (y(Math.max(p.n, p.s)) / H) * r.height + "px";
      tip.classList.add("show");
    });
    hit.addEventListener("pointerleave", () => { cross.setAttribute("visibility", "hidden"); tip.classList.remove("show"); });
  }

  async function mount(box) {
    try {
      const data = await Site.json("data/aft-polar.json");
      const pts = data.items.map(([d, n, s]) => ({ d, n, s, t: toT(d) }));
      const render = () => draw(box, pts, data.units || "G");
      render();
      let w = box.clientWidth;
      new ResizeObserver(() => { if (Math.abs(box.clientWidth - w) > 20) { w = box.clientWidth; render(); } }).observe(box);
      const upd = box.closest(".card")?.querySelector("[data-polar-updated]");
      if (upd) upd.textContent = Site.fmtDate(pts.at(-1).d);
    } catch {
      box.innerHTML = `<div class="empty small">The AFT polar field data is not available. Run <code>tools/update_aft_polar.py</code>.</div>`;
    }
  }

  window.PolarField = { mount };
})();
