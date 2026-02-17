/* publications.js — Final version
   - Loads from <body data-pubs-json="...">
   - Default: ALL years (grouped by year desc)
   - Year dropdown filter
   - Optional search
   - Robust DOI + arXiv handling
*/

(function () {
  const jsonPath =
    document.body.getAttribute("data-pubs-json") || "data/publications.json";

  const elYear = document.getElementById("yearSelect");
  const elSearch = document.getElementById("searchBox");
  const elClear = document.getElementById("clearSearch");
  const elList = document.getElementById("pubList");
  const elCount = document.getElementById("count");
  const elCountLabel = document.getElementById("countLabel");

  if (!elYear || !elList || !elCount) return;

  const esc = (s) =>
    String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  // --- Author highlighting ---
  const AUTHOR_NAME = "Bibhuti Kumar Jha"; // change here if needed
  const AUTHOR_ALIASES = [
    "Bibhuti Kumar Jha",
    "B. K. Jha",
    "Bibhuti K. Jha",
    "Bibhuti Jha",
    "Jha, Bibhuti Kumar",
    "Jha, Bibhuti K.",
    "Jha, B. K.",
  ];

  // Escape for RegExp
  function reEscape(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // Escape special characters for safe RegExp use
  function escapeForRegex(text) {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // Normalize authors to a display string (handles string OR array OR null)
  function authorsToString(authors) {
    if (Array.isArray(authors)) return authors.join(", ");
    if (authors == null) return "";
    return String(authors);
  }

  // Ensure there is exactly one space after commas (and tidy whitespace)
  function normalizeAuthorSpacing(authors) {
    const s = authorsToString(authors).trim();
    if (!s) return "";
    return s
      .replace(/,\s*/g, ", ") // add one space after comma
      .replace(/\s{2,}/g, " "); // collapse multiple spaces
  }

  function highlightAuthor(authorsValue) {
    const raw = normalizeAuthorSpacing(authorsValue);
    if (!raw) return "";

    // escape HTML first
    let html = esc(raw);

    // highlight all alias variants
    for (const name of AUTHOR_ALIASES) {
      const pat = new RegExp(`\\b${escapeForRegex(esc(name))}\\b`, "g");
      html = html.replace(pat, `<span class="author-hi">${esc(name)}</span>`);
    }

    return html;
  }

  async function loadJSON(path) {
    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok)
      throw new Error(
        `HTTP ${res.status} ${res.statusText} while loading ${path}`,
      );
    return await res.json();
  }

  function normalize(p) {
    return {
      year: Number(p.year) || 0,
      title: p.title || "",
      authors: p.authors || "",
      venue: p.venue || "",
      volume: p.volume || "",
      pages: p.pages || "",
      status: p.status || "",
      ads: p.ads || "",
      arxiv: p.arxiv || "",
      doi: p.doi || "",
      tags: Array.isArray(p.tags) ? p.tags : [],
    };
  }

  function venueLine(p) {
    const parts = [];
    if (p.venue) parts.push(p.venue);
    if (p.volume) parts.push(p.volume);
    if (p.pages) parts.push(p.pages);
    return parts.join(", ");
  }

  /* ---------- DOI handling ---------- */

  function doiUrl(doi) {
    if (!doi) return "";
    const s = String(doi).trim();
    if (!s) return "";

    if (/^https?:\/\//i.test(s)) return s;

    const cleaned = s
      .replace(/^doi:\s*/i, "")
      .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
      .trim();

    return cleaned ? `https://doi.org/${cleaned}` : "";
  }

  /* ---------- arXiv handling (UPDATED) ---------- */

  function arxivUrl(arxivID) {
    if (!arxivID) return "";
    let s = String(arxivID).trim();
    if (!s) return "";

    // If full URL already
    if (/^https?:\/\//i.test(s)) {
      return s.replace(/^https?:\/\/www\.arxiv\.org/i, "https://arxiv.org");
    }

    // Remove common prefixes
    s = s
      .replace(/^arxiv:\s*/i, "")
      .replace(/^https?:\/\/(www\.)?arxiv\.org\/abs\//i, "")
      .replace(/^https?:\/\/(www\.)?arxiv\.org\/pdf\//i, "")
      .replace(/\.pdf$/i, "")
      .trim();

    return s ? `https://arxiv.org/abs/${s}` : "";
  }

  function link(label, url) {
    if (!url) return "";
    return `<a class="pub-link" href="${esc(
      url,
    )}" target="_blank" rel="noopener">${esc(label)}</a>`;
  }

  function itemHTML(p) {
    const v = venueLine(p);
    const status = p.status
      ? `<span class="pub-pill">${esc(p.status)}</span>`
      : "";
    const tags = (p.tags || [])
      .slice(0, 8)
      .map((t) => `<span class="tag">${esc(t)}</span>`)
      .join("");

    const links = [
      link("ADS", p.ads),
      link("DOI", doiUrl(p.doi)),
      link("arXiv", arxivUrl(p.arxiv)),
    ]
      .filter(Boolean)
      .join("");

    return `
      <div class="pub-item">
        <div class="pub-title"><strong>${esc(p.title)}</strong> ${status}</div>
        <div class="pub-meta">${highlightAuthor(p.authors)}</div>
        ${v ? `<div class="pub-meta">${esc(v)}</div>` : ""}
        ${
          links || tags
            ? `
          <div class="pub-bottom">
            <div class="pub-links">${links}</div>
            <div class="pub-tags">${tags}</div>
          </div>`
            : ""
        }
      </div>
    `;
  }

  function matchesQuery(p, q) {
    const query = (q || "").trim().toLowerCase();
    if (!query) return true;
    const hay = `${p.title} ${p.authors} ${p.venue} ${(p.tags || []).join(
      " ",
    )}`.toLowerCase();
    return hay.includes(query);
  }

  function uniqueYears(pubs) {
    const years = [...new Set(pubs.map((p) => p.year).filter(Boolean))];
    years.sort((a, b) => b - a);
    return years;
  }

  function groupByYear(pubs) {
    const map = new Map();
    for (const p of pubs) {
      const y = p.year || 0;
      if (!map.has(y)) map.set(y, []);
      map.get(y).push(p);
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }

  function renderAllGrouped(pubs) {
    const grouped = groupByYear(pubs);

    return grouped
      .map(
        ([year, items]) => `
      <div class="pub-year-block">
        <h3 class="pub-year">${year}</h3>
        <div class="pub-list">
          ${items.map(itemHTML).join("")}
        </div>
      </div>
    `,
      )
      .join("");
  }

  function renderSingleYear(pubs, year) {
    const items = pubs.filter((p) => p.year === year);
    return items.length
      ? `<div class="pub-list">${items.map(itemHTML).join("")}</div>`
      : `<p class="muted">No publications found for ${year}.</p>`;
  }

  function setCount(n) {
    elCount.textContent = String(n);
    if (elCountLabel) elCountLabel.textContent = n === 1 ? "item" : "items";
  }

  function showFileModeHint() {
    elList.innerHTML = `
      <div class="pub-item">
        <div class="pub-title"><strong>Local file mode detected</strong></div>
        <div class="pub-meta">You opened this page as <code>file://</code>. Browsers block JSON loading.</div>
        <div class="pub-meta">Run this from repo root:</div>
        <pre class="pub-error">python -m http.server 8000</pre>
        <div class="pub-meta">Then open: <code>http://localhost:8000/publications.html</code></div>
      </div>
    `;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      if (location.protocol === "file:") {
        showFileModeHint();
        return;
      }

      const raw = await loadJSON(jsonPath);
      const pubs0 = raw.map(normalize);

      pubs0.sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));

      const years = uniqueYears(pubs0);

      if (!years.length) {
        elList.innerHTML = `<p class="muted">No publications found in <code>${esc(
          jsonPath,
        )}</code>.</p>`;
        setCount(0);
        return;
      }

      elYear.innerHTML =
        `<option value="all">All years</option>` +
        years.map((y) => `<option value="${y}">${y}</option>`).join("");

      elYear.value = "all";

      const update = () => {
        const q = elSearch ? elSearch.value || "" : "";
        const yearVal = elYear.value;

        let view = pubs0.filter((p) => matchesQuery(p, q));

        if (yearVal === "all") {
          setCount(view.length);
          elList.innerHTML = view.length
            ? renderAllGrouped(view)
            : `<p class="muted">No publications found.</p>`;
        } else {
          const year = Number(yearVal);
          const yearView = view.filter((p) => p.year === year);
          setCount(yearView.length);
          elList.innerHTML = renderSingleYear(view, year);
        }
      };

      elYear.addEventListener("change", update);
      if (elSearch) elSearch.addEventListener("input", update);
      if (elClear)
        elClear.addEventListener("click", () => {
          elSearch.value = "";
          update();
        });

      update();
    } catch (err) {
      console.error(err);
      elList.innerHTML = `
        <div class="pub-item">
          <div class="pub-title"><strong>Failed to load publications</strong></div>
          <div class="pub-meta">Tried: <code>${esc(jsonPath)}</code></div>
          <pre class="pub-error">${esc(err.message)}</pre>
        </div>
      `;
      setCount(0);
    }
  });
})();
