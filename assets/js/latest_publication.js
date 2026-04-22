/* latest_publication.js — show the newest item from data/publications.json */
(function () {
  const host = document.getElementById("latestPub");
  if (!host) return;

  const esc = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  // Try several common date shapes: "date", "published", or just "year"
  function parsePubTime(p) {
    const raw =
      p.date || p.published || p.published_date || p.pub_date || p.month || "";

    // If raw looks like YYYY-MM-DD or YYYY/MM/DD
    if (typeof raw === "string" && /\d{4}[-/]\d{2}[-/]\d{2}/.test(raw)) {
      const iso = raw.replace(/\//g, "-");
      const d = new Date(iso);
      if (!Number.isNaN(d.getTime())) return d.getTime();
    }

    // If year exists, use Dec 31 of that year as tie-breaker
    const y = Number(p.year);
    if (Number.isFinite(y) && y > 0) return new Date(y, 11, 31).getTime();

    return 0;
  }

  function doiUrl(doi) {
    if (!doi) return "";
    if (doi.startsWith("http://") || doi.startsWith("https://")) return doi;
    return `https://doi.org/${doi}`;
  }

  function arxivUrl(arxivID) {
    if (!arxivID) return "";
    const s = String(arxivID).trim();
    if (s.startsWith("http://") || s.startsWith("https://")) return s;
    return `https://arxiv.org/abs/${s}`;
  }

  function safeLink(label, url) {
    if (!url) return "";
    return `<a class="pub-link" href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>`;
  }

  function formatVenue(p) {
    // Try common keys used in your JSON
    const parts = [];
    if (p.journal) parts.push(p.journal);
    else if (p.venue) parts.push(p.venue);

    if (p.volume) parts.push(`Vol. ${p.volume}`);
    if (p.number) parts.push(`No. ${p.number}`);
    if (p.pages) parts.push(`pp. ${p.pages}`);

    const y = p.year ? String(p.year) : "";
    if (y) parts.push(y);

    return parts.filter(Boolean).join(" • ");
  }

  function firstSentence(title) {
    const t = String(title ?? "").trim();
    return t;
  }

  const YOUR_NAME = "Bibhuti Kumar Jha";
  const YOUR_NAME_VARIANTS = new Set([
    "bibhuti kumar jha",
    "bibhuti jha",
    "jha, bibhuti kumar",
    "jha, bibhuti",
  ]);

  function highlightAuthor(authors) {
    if (!authors) return "";
    const list = Array.isArray(authors)
      ? authors
      : String(authors).split(/,\s*/);
    const normalized = list
      .map((a) => String(a).trim())
      .map((a) => (YOUR_NAME_VARIANTS.has(a.toLowerCase()) ? YOUR_NAME : a))
      .filter(Boolean);
    if (!normalized.length) return "";
    const needle = YOUR_NAME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return normalized
      .map((a) =>
        a === YOUR_NAME
          ? `<span class="author-highlight">${esc(a)}</span>`
          : esc(a),
      )
      .join(", ")
      .replace(
        new RegExp(needle, "gi"),
        `<span class="author-highlight">${esc(YOUR_NAME)}</span>`,
      );
  }

  function itemHTML(p) {
    const title = firstSentence(p.title);
    const venue = formatVenue(p);
    const authors = highlightAuthor(p.authors);

    const links = [
      safeLink("ADS", p.ads),
      safeLink("DOI", doiUrl(p.doi)),
      safeLink("arXiv", arxivUrl(p.arxiv)),
      safeLink("PDF", p.pdf),
    ]
      .filter(Boolean)
      .join("");

    return `
      <div class="latestpub-item">
        <div class="latestpub-title">${esc(title)}</div>
        ${authors ? `<div class="latestpub-authors">${authors}</div>` : ""}
        ${venue ? `<div class="latestpub-venue muted">${esc(venue)}</div>` : ""}
        ${links ? `<div class="latestpub-links">${links}</div>` : ""}
      </div>
    `;
  }

  fetch("data/publications.json", { cache: "no-store" })
    .then((r) => {
      if (!r.ok) throw new Error("Failed to load publications.json");
      return r.json();
    })
    .then((data) => {
      const items = Array.isArray(data) ? data : data.publications || [];
      if (!Array.isArray(items) || items.length === 0) {
        host.innerHTML = `<div class="muted">No publications found.</div>`;
        return;
      }

      // newest first
      items.sort((a, b) => parsePubTime(b) - parsePubTime(a));

      host.innerHTML = itemHTML(items[0]);
    })
    .catch(() => {
      host.innerHTML = `<div class="muted">Couldn’t load the latest publication.</div>`;
    });
})();
