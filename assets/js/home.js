/* Home: today's Sun, At a Glance (Cycle 25 plot), My Updates, Photo of the Month. */
(function () {
  "use strict";
  const esc = (s) => Site.esc(s);

  // ---------- today's Sun (NASA SDO "latest" images, refreshed every 15 minutes) ----------
  const CHANNELS = {
    "HMIIC": ["HMI Continuum", "Visible-light surface: sunspots as we would see them."],
    "HMIB": ["HMI Magnetogram", "Line-of-sight magnetic field: white and black are opposite polarities."],
    "0304": ["AIA 304 Å", "Chromosphere and transition region: filaments and prominences."],
    "0171": ["AIA 171 Å", "Quiet corona and the magnetic loops above active regions."],
    "0193": ["AIA 193 Å", "Corona at about 1.2 million °C: coronal holes show as dark patches."],
  };
  function initSun() {
    const img = document.querySelector("[data-sun-img]");
    if (!img) return;
    const title = document.querySelector("[data-sun-title]");
    const note = document.querySelector("[data-sun-note]");
    const seg = document.querySelector("[data-sun-channels]");
    const slot = () => Math.floor(Date.now() / 9e5); // changes every 15 minutes
    let current = "HMIIC";
    function show(ch) {
      current = ch;
      img.classList.add("is-loading");
      img.src = `https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_${ch}.jpg?v=${slot()}`;
      img.alt = `The Sun right now, seen by NASA's Solar Dynamics Observatory in ${CHANNELS[ch][0]}`;
      title.textContent = CHANNELS[ch][0];
      note.textContent = CHANNELS[ch][1];
      seg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.ch === ch)));
    }
    img.addEventListener("load", () => img.classList.remove("is-loading"));
    img.addEventListener("error", () => { img.classList.remove("is-loading"); note.textContent = "SDO's latest image is not reachable right now."; });
    seg.innerHTML = Object.entries(CHANNELS).map(([k, [l]]) => `<button type="button" data-ch="${k}" aria-pressed="false">${l.replace("AIA ", "").replace("HMI ", "").replace(/^\w/, (c) => c.toUpperCase())}</button>`).join("");
    seg.addEventListener("click", (e) => { const b = e.target.closest("[data-ch]"); if (b) show(b.dataset.ch); });
    show(current);
    setInterval(() => { if (!document.hidden) show(current); }, 9e5);
  }

  // ---------- My Updates ----------
  async function initUpdates() {
    const list = document.querySelector("[data-updates]");
    if (!list) return;
    try {
      const { items } = await Site.json("data/updates.json");
      list.innerHTML = items.map((it) => `
        <li class="feed-item">
          <div class="feed-date">${Site.fmtDate(it.date, { day: false })}</div>
          <div>
            <span class="feed-title">${esc(it.title)}</span>
            ${it.summary ? `<p class="feed-summary">${esc(it.summary)}</p>` : ""}
            <div class="feed-meta"><span class="chip chip-accent">${esc(it.kind)}</span>
              ${(it.links || []).map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join(" · ")}
            </div>
          </div>
        </li>`).join("");
    } catch {
      list.innerHTML = `<li class="empty">Updates are on their way.</li>`;
    }
  }

  // ---------- Photo of the Month ----------
  async function initPotm() {
    const sec = document.querySelector("[data-potm]");
    if (!sec) return;
    try {
      const g = await Site.json("data/gallery.json");
      const p = g.photo_of_the_month;
      if (!p) return; // section stays hidden until a photo is picked
      sec.querySelector("[data-potm-card]").innerHTML = `
        <img src="${esc(p.thumb)}" alt="${esc(p.title)}" loading="lazy" width="${p.width}" height="${p.height}">
        <div class="body">
          <p class="eyebrow">Photo of the Month</p>
          <h3>${esc(p.title)}</h3>
          <p class="muted small">${esc([p.place, Site.fmtDate(p.date)].filter(Boolean).join(" · "))}</p>
          ${p.note || p.caption ? `<p>${esc(p.note || p.caption)}</p>` : ""}
          <a class="btn" href="photography.html">See the gallery</a>
        </div>`;
      sec.hidden = false;
    } catch {}
  }

  document.addEventListener("DOMContentLoaded", () => {
    initSun();
    initUpdates();
    initPotm();
    const chart = document.querySelector("[data-cycle-chart]");
    const polar = document.querySelector("[data-polar-chart]");
    if (polar) PolarField.mount(polar);
    if (chart) Sunspots.mount(chart, (d) => {
      // Cycle 25 began at the December 2019 minimum; mark the smoothed maximum so far.
      const c25 = d.smooth.filter((p) => p.t >= 2019.9);
      const peak = c25.reduce((a, b) => (b.v > a.v ? b : a), c25[0]);
      return {
        from: 2019.9, showPred: true, ariaLabel: "Solar Cycle 25 sunspot number with NOAA forecast",
        markers: peak ? [{ t: peak.t, text: `Smoothed peak ${peak.v.toFixed(0)}, ${Site.fmtDate(peak.tag)}` }] : [],
      };
    });
  });
})();
