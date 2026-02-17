(function () {
  const grid = document.getElementById("hiGrid");
  if (!grid) return;

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function fmtDate(iso) {
    if (!iso) return "";
    // keep it simple + consistent
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  }

  function itemHTML(x) {
    return `
      <a class="hi-item" href="${esc(x.url)}" target="_blank" rel="noopener">
        <div class="hi-top">
          <span class="hi-date muted">${esc(fmtDate(x.date) || "Highlight")}</span>
        </div>
        <div class="hi-item-title">${esc(x.title)}</div>
        <div class="hi-meta muted">${esc(x.source || "")}</div>
      </a>
    `;
  }

  fetch("data/highlights.json", { cache: "no-store" })
    .then((r) => {
      if (!r.ok) throw new Error("Failed to load highlights.json");
      return r.json();
    })
    .then((items) => {
      const arr = Array.isArray(items) ? items : [];
      // newest first
      arr.sort((a, b) => String(b.date).localeCompare(String(a.date)));

      if (!arr.length) {
        grid.innerHTML = `<div class="muted">No highlights yet.</div>`;
        return;
      }

      // show top 6 on home
      grid.innerHTML = arr.slice(0, 6).map(itemHTML).join("");
    })
    .catch(() => {
      grid.innerHTML = `<div class="muted">Couldn’t load highlights.</div>`;
    });
})();
