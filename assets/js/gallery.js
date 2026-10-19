/* Photography: one grid per album from data/gallery.json, with a full-screen viewer. */
(function () {
  "use strict";
  const esc = (s) => Site.esc(s);

  function viewer() {
    const dlg = document.createElement("dialog");
    dlg.className = "lightbox";
    dlg.innerHTML = `
      <button class="lb-close" type="button" aria-label="Close">×</button>
      <button class="lb-prev" type="button" aria-label="Previous photo">‹</button>
      <button class="lb-next" type="button" aria-label="Next photo">›</button>
      <div class="lightbox-inner"><img alt=""><div class="lb-cap"></div></div>`;
    document.body.appendChild(dlg);
    let list = [], i = 0;
    const img = dlg.querySelector("img"), cap = dlg.querySelector(".lb-cap");
    const show = (j) => {
      i = (j + list.length) % list.length;
      const p = list[i];
      img.src = p.src; img.alt = p.title;
      const meta = [p.place, Site.fmtDate(p.date)].filter(Boolean).join(" · ");
      cap.innerHTML = `<b>${esc(p.title)}</b>${meta ? ` <span>${esc(meta)}</span>` : ""}${p.caption ? `<br><span>${esc(p.caption)}</span>` : ""}`;
    };
    dlg.querySelector(".lb-close").onclick = () => dlg.close();
    dlg.querySelector(".lb-prev").onclick = () => show(i - 1);
    dlg.querySelector(".lb-next").onclick = () => show(i + 1);
    dlg.addEventListener("click", (e) => { if (e.target === dlg || e.target.classList.contains("lightbox-inner")) dlg.close(); });
    dlg.addEventListener("keydown", (e) => { if (e.key === "ArrowRight") show(i + 1); if (e.key === "ArrowLeft") show(i - 1); });
    return { open(photos, j) { list = photos; show(j); dlg.showModal(); } };
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const grids = document.querySelectorAll("[data-album]");
    if (!grids.length) return;
    let data = { albums: [] };
    try { data = await Site.json("data/gallery.json"); } catch {}
    const lb = viewer();
    grids.forEach((grid) => {
      const album = data.albums.find((a) => a.id === grid.dataset.album);
      const photos = album?.photos || [];
      if (!photos.length) {
        grid.outerHTML = `<div class="empty">No photos in this album yet.</div>`;
        return;
      }
      grid.innerHTML = photos.map((p, j) => `
        <button type="button" data-i="${j}" aria-label="Open ${esc(p.title)}">
          <img src="${esc(p.thumb)}" alt="${esc(p.title)}" loading="lazy" width="${p.width}" height="${p.height}">
          <span class="cap">${esc(p.title)}</span>
        </button>`).join("");
      grid.addEventListener("click", (e) => { const b = e.target.closest("[data-i]"); if (b) lb.open(photos, Number(b.dataset.i)); });
    });
  });
})();
