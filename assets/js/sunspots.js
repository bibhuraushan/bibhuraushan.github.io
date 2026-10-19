/* Sunspot-number charts drawn from NOAA SWPC's live solar-cycle JSON.
   Used by Home (Cycle 25 progress), Research (Overview figure) and Data and Tools. */
(function () {
  "use strict";
  const SWPC = "https://services.swpc.noaa.gov/json/solar-cycle/";
  const NS = "http://www.w3.org/2000/svg";

  let cache = null;
  // Monthly SILSO sunspot number since 1749, a 13-month smoothed curve, and SWPC's forecast.
  async function load() {
    if (cache) return cache;
    cache = (async () => {
      const [obsRaw, predRaw] = await Promise.all([
        Site.json(SWPC + "observed-solar-cycle-indices.json"),
        Site.json(SWPC + "predicted-solar-cycle.json").catch(() => []),
      ]);
      const toT = (tag) => { const [y, m] = tag.split("-").map(Number); return y + (m - 0.5) / 12; };
      const obs = obsRaw.filter((d) => d.ssn >= 0).map((d) => ({ t: toT(d["time-tag"]), tag: d["time-tag"], v: d.ssn, f107: d["f10.7"], swpc: d.observed_swpc_ssn }));
      // Standard 13-month smoothing: half weight on the two end months.
      const smooth = [];
      for (let i = 6; i < obs.length - 6; i++) {
        let s = 0.5 * (obs[i - 6].v + obs[i + 6].v);
        for (let k = -5; k <= 5; k++) s += obs[i + k].v;
        smooth.push({ t: obs[i].t, tag: obs[i].tag, v: s / 12 });
      }
      const pred = predRaw.map((d) => ({ t: toT(d["time-tag"]), tag: d["time-tag"], v: d.predicted_ssn, lo: d.low_ssn, hi: d.high_ssn }));
      return { obs, smooth, pred };
    })();
    return cache;
  }

  const el = (name, attrs = {}, parent) => {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    parent?.appendChild(n);
    return n;
  };
  const niceStep = (max, n = 4) => {
    const raw = max / n, p = 10 ** Math.floor(Math.log10(raw)), f = raw / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
  };
  const label = (tag) => Site.fmtDate(tag);

  // draw(container, {from, to, showPred, markers:[{t, text}], height})
  function draw(box, data, opt) {
    const { obs, smooth, pred } = data;
    const from = opt.from ?? obs[0].t, to = opt.to ?? (pred.length ? pred.at(-1).t : obs.at(-1).t);
    const inRange = (d) => d.t >= from && d.t <= to;
    const O = obs.filter(inRange), S = smooth.filter(inRange), P = opt.showPred ? pred.filter(inRange) : [];
    const W = Math.max(box.clientWidth, 280), H = opt.height ?? Math.round(Math.min(340, Math.max(220, W * 0.5)));
    const m = { t: 14, r: 12, b: 26, l: 34 };
    const ymax = Math.max(...O.map((d) => d.v), ...P.map((d) => d.hi), 10) * 1.06;
    const step = niceStep(ymax);
    const x = (t) => m.l + ((t - from) / (to - from)) * (W - m.l - m.r);
    const y = (v) => H - m.b - (v / (Math.ceil(ymax / step) * step)) * (H - m.t - m.b);

    box.innerHTML = "";
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": opt.ariaLabel || "Sunspot number over time" }, box);
    // grid + y labels
    for (let v = 0; v <= Math.ceil(ymax / step) * step + 0.01; v += step) {
      el("line", { class: "grid-line", x1: m.l, x2: W - m.r, y1: y(v), y2: y(v) }, svg);
      el("text", { class: "axis-label", x: m.l - 6, y: y(v) + 4, "text-anchor": "end" }, svg).textContent = Math.round(v);
    }
    // x labels: years
    const span = to - from;
    const xStep = span > 150 ? 25 : span > 60 ? 10 : span > 20 ? 5 : span > 8 ? 2 : 1;
    for (let yr = Math.ceil(from / xStep) * xStep; yr <= to; yr += xStep) {
      el("text", { class: "axis-label", x: x(yr), y: H - 6, "text-anchor": "middle" }, svg).textContent = yr;
    }
    const path = (pts, key = "v") => pts.map((d, i) => `${i ? "L" : "M"}${x(d.t).toFixed(1)},${y(d[key]).toFixed(1)}`).join("");
    if (P.length) {
      const band = P.map((d, i) => `${i ? "L" : "M"}${x(d.t).toFixed(1)},${y(d.hi).toFixed(1)}`).join("") +
        P.slice().reverse().map((d) => `L${x(d.t).toFixed(1)},${y(d.lo).toFixed(1)}`).join("") + "Z";
      el("path", { class: "band", d: band }, svg);
    }
    el("path", { class: "series-obs", d: path(O) }, svg);
    if (P.length) el("path", { class: "series-pred", d: path(P) }, svg);
    el("path", { class: "series-main", d: path(S) }, svg);

    for (const mk of opt.markers || []) {
      const p = S.find((d) => Math.abs(d.t - mk.t) < 0.05) || O.find((d) => Math.abs(d.t - mk.t) < 0.05);
      if (!p) continue;
      el("circle", { class: "dot", cx: x(p.t), cy: y(p.v), r: 4.5 }, svg);
      const anchor = x(p.t) > W * 0.7 ? "end" : "start";
      el("text", { class: "marker-label", x: x(p.t) + (anchor === "end" ? -8 : 8), y: Math.max(y(p.v) - 8, 12), "text-anchor": anchor }, svg).textContent = mk.text;
    }

    // hover: crosshair + tooltip on the nearest month
    const cross = el("line", { class: "cross", y1: m.t, y2: H - m.b, visibility: "hidden" }, svg);
    const dot = el("circle", { class: "dot", r: 4, visibility: "hidden" }, svg);
    let tip = box.querySelector(".chart-tip");
    if (!tip) { tip = document.createElement("div"); tip.className = "chart-tip"; box.appendChild(tip); }
    const months = [...O, ...P.filter((d) => d.t > (O.at(-1)?.t ?? 0))];
    const byTag = (arr) => Object.fromEntries(arr.map((d) => [d.tag, d]));
    const sm = byTag(S), pr = byTag(P), ob = byTag(O);
    const hit = el("rect", { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: "transparent" }, svg);
    const move = (ev) => {
      const r = svg.getBoundingClientRect();
      const px = ((ev.touches?.[0]?.clientX ?? ev.clientX) - r.left) * (W / r.width);
      const t = from + ((px - m.l) / (W - m.l - m.r)) * (to - from);
      let best = months[0], bd = Infinity;
      for (const d of months) { const dd = Math.abs(d.t - t); if (dd < bd) { bd = dd; best = d; } }
      const s = sm[best.tag], p = pr[best.tag], o = ob[best.tag];
      const yv = s?.v ?? p?.v ?? o?.v;
      cross.setAttribute("x1", x(best.t)); cross.setAttribute("x2", x(best.t)); cross.setAttribute("visibility", "visible");
      dot.setAttribute("cx", x(best.t)); dot.setAttribute("cy", y(yv)); dot.setAttribute("visibility", "visible");
      tip.innerHTML = `<div class="muted">${label(best.tag)}</div>` +
        (o ? `<div>Monthly <b>${o.v.toFixed(1)}</b></div>` : "") +
        (s ? `<div>Smoothed <b>${s.v.toFixed(1)}</b></div>` : "") +
        (p ? `<div>Forecast <b>${p.v.toFixed(0)}</b> <span class="muted">(${p.lo.toFixed(0)}–${p.hi.toFixed(0)})</span></div>` : "");
      tip.style.left = Math.min(Math.max((x(best.t) / W) * r.width, 70), r.width - 70) + "px";
      tip.style.top = (y(yv) / H) * r.height + "px";
      tip.classList.add("show");
    };
    const leave = () => { cross.setAttribute("visibility", "hidden"); dot.setAttribute("visibility", "hidden"); tip.classList.remove("show"); };
    hit.addEventListener("pointermove", move);
    hit.addEventListener("pointerleave", leave);
    hit.addEventListener("touchstart", move, { passive: true });
  }

  // mount(container, opt): loads data, draws, redraws on resize; shows a short error if SWPC is down.
  async function mount(box, opt = {}) {
    try {
      const data = await load();
      const render = () => draw(box, data, typeof opt === "function" ? opt(data) : opt);
      render();
      let w = box.clientWidth;
      new ResizeObserver(() => { if (Math.abs(box.clientWidth - w) > 20) { w = box.clientWidth; render(); } }).observe(box);
      return data;
    } catch (e) {
      box.innerHTML = `<div class="empty small">The sunspot record could not be loaded from NOAA SWPC right now. <a href="https://www.swpc.noaa.gov/products/solar-cycle-progression" target="_blank" rel="noopener">See it on SWPC</a>.</div>`;
      return null;
    }
  }

  window.Sunspots = { load, mount };
})();
