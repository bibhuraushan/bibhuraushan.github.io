/* publications.js — Year filter + tabs + ADS-style JSON + "et al. (year)" + "+YourName" if not in first 3 */
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const YOUR_NAME = "Bibhuti Kumar Jha";

  let CURRENT_ITEMS = [];
  let CURRENT_YEAR = "all";

  function keyFromHash() {
    const h = (location.hash || "").replace("#", "").trim();
    if (!h) return "";
    if (h.startsWith("tab=")) return h.slice(4).trim();
    return h;
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function doiUrl(doi) {
    if (!doi) return "";
    const s = String(doi).trim();
    if (s.startsWith("http://") || s.startsWith("https://")) return s;
    return `https://doi.org/${s}`;
  }

  function arxivUrl(arxivID) {
    if (!arxivID) return "";
    const s = String(arxivID).trim();
    if (s.startsWith("http://") || s.startsWith("https://")) return s;
    return `https://arxiv.org/abs/${s}`;
  }

  function monthRank(m) {
    const map = {
      jan: 1,
      feb: 2,
      mar: 3,
      apr: 4,
      may: 5,
      jun: 6,
      jul: 7,
      aug: 8,
      sep: 9,
      oct: 10,
      nov: 11,
      dec: 12,
    };
    const k = String(m || "")
      .slice(0, 3)
      .toLowerCase();
    return map[k] || 0;
  }

  function pubKey(it) {
    const y = Number(it.year) || 0;
    const mo = monthRank(it.month);
    return y * 100 + mo; // YYYYMM-ish
  }

  // --- Authors: A, B, C et al. (YEAR) +YourName (if not in first 3) ---
  function formatAuthors(authorsArr, year) {
    if (!Array.isArray(authorsArr) || authorsArr.length === 0) return "";

    const authors = authorsArr
      .map((a) => String(a || "").trim())
      .filter(Boolean);

    if (!authors.length) return "";

    const firstThree = authors.slice(0, 3);
    const more = authors.length > 3;

    const youInList = authors.some(
      (a) => a.toLowerCase() === YOUR_NAME.toLowerCase(),
    );
    const youInFirstThree = firstThree.some(
      (a) => a.toLowerCase() === YOUR_NAME.toLowerCase(),
    );

    let s = firstThree.map((a) => escapeHtml(a)).join(", ");

    if (more) s += " et al.";
    if (year) s += ` (${escapeHtml(year)})`;

    // If you are not in the first three but you exist in the author list:
    if (youInList && !youInFirstThree) {
      s += ` +${escapeHtml(YOUR_NAME)}`;
    }

    // Bold your name wherever it appears
    const needle = YOUR_NAME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(needle, "gi");
    s = s.replace(
      re,
      `<span class="author-highlight">${escapeHtml(YOUR_NAME)}</span>`,
    );

    return s;
  }

  // --- Venue: full name + volume + pages (no abbreviation) ---
  function formatVenue(it) {
    // Same style as latest_publication.js: "Journal • Vol. X • No. Y • pp. Z • YEAR"
    const parts = [];

    // Prefer full name
    if (it.journal) parts.push(it.journal);
    else if (it.venue) parts.push(it.venue);
    else if (it.venue_short) parts.push(it.venue_short);

    // Your JSON uses "issue" not "number" (support both)
    if (it.volume) parts.push(`Vol. ${it.volume}`);

    if (it.pages) parts.push(`pp. ${it.pages}`);

    // const y = it.year ? String(it.year) : "";
    // if (y) parts.push(y);

    return parts.filter(Boolean).join(" • ");
  }

  function iconLinkPill(href, label, iconClass) {
    const url = String(href || "").trim();
    if (!url) return "";
    return `
      <a class="pub-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">
        <i class="${escapeHtml(iconClass)}" aria-hidden="true"></i>
        ${escapeHtml(label)}
      </a>`;
  }

  function titleHTML(it) {
    const title = escapeHtml(it.title || "Untitled");
    const url = it.link || it.ads || "";
    if (!url) return title;
    return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${title}</a>`;
  }

  function setError(show, msg = "") {
    const box = $("#pubError");
    const m = $("#pubErrorMsg");
    if (!box || !m) return;
    box.hidden = !show;
    m.textContent = msg;
  }

  function setHeaderFromTab(tabBtn) {
    const t = $("#pubHeaderTitle");
    const s = $("#pubHeaderSub");
    if (t) t.textContent = tabBtn?.dataset?.title || "Publications";
    if (s) s.textContent = tabBtn?.dataset?.sub || "";
  }

  // Build year dropdown based on CURRENT_ITEMS; preserve selection if possible.
  function buildYearDropdown(items) {
    const sel = $("#pubYear");
    if (!sel) return;

    const years = [
      ...new Set(
        (items || [])
          .map((x) => Number(x.year))
          .filter((y) => Number.isFinite(y) && y > 0),
      ),
    ].sort((a, b) => b - a);

    const opts = [
      `<option value="all">All Years</option>`,
      ...years.map((y) => `<option value="${y}">${y}</option>`),
    ];

    sel.innerHTML = opts.join("");

    // Keep current year if it exists in this tab; otherwise reset to all.
    const wanted = String(CURRENT_YEAR);
    const exists = wanted === "all" || years.some((y) => String(y) === wanted);
    CURRENT_YEAR = exists ? wanted : "all";
    sel.value = CURRENT_YEAR;
  }

  function filteredItems(items) {
    if (CURRENT_YEAR === "all") return items.slice();
    return items.filter((x) => String(x.year) === String(CURRENT_YEAR));
  }

  function renderList() {
    const list = $("#pubList");
    const empty = $("#pubEmpty");
    const count = $("#pubCount");
    if (!list || !empty || !count) return;

    const items = filteredItems(CURRENT_ITEMS);
    // Always show newest first in the list
    items.sort(
      (a, b) =>
        pubKey(b) - pubKey(a) ||
        String(a.title || "").localeCompare(String(b.title || "")),
    );

    count.textContent = String(items.length);

    if (!items.length) {
      list.innerHTML = "";
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    list.innerHTML = items
      .map((it) => {
        const authorsLine = formatAuthors(it.authors, it.year);
        const venueLine = formatVenue(it);

        const links = [
          iconLinkPill(it.ads, "ADS", "fa-solid fa-magnifying-glass"),
          iconLinkPill(doiUrl(it.doi), "DOI", "fa-solid fa-link"),
          iconLinkPill(arxivUrl(it.arxiv), "arXiv", "fa-solid fa-file-lines"),
          iconLinkPill(it.pdf, "PDF", "fa-solid fa-file-pdf"),
          iconLinkPill(
            it.link,
            "Link",
            "fa-solid fa-arrow-up-right-from-square",
          ),
        ].filter(Boolean);

        return `
        <article class="glass-card pub-item">
          <div class="pub-item-head">
            <h3 class="pub-title">${titleHTML(it)}</h3>
            <span class="pub-year">${escapeHtml([it.year, it.month].filter(Boolean).join(" "))}</span>
          </div>

          <div class="pub-meta">
            ${authorsLine ? `<div class="pub-authors">${authorsLine}</div>` : ""}
            ${venueLine ? `<div class="pub-venue">${venueLine}</div>` : ""}
          </div>

          ${links.length ? `<div class="pub-links">${links.join("")}</div>` : ""}
        </article>
      `;
      })
      .join("");
  }

  async function loadJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} while fetching ${url}`);
    return res.json();
  }

  async function activate(tabKey, { updateHash = true } = {}) {
    const tabs = $$(".pub-tab");
    if (!tabs.length) return;

    const activeTab = tabs.find((t) => t.dataset.tab === tabKey) || tabs[0];

    tabs.forEach((t) => {
      const on = t === activeTab;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });

    setHeaderFromTab(activeTab);
    setError(false, "");

    try {
      const data = await loadJson(activeTab.dataset.json);
      CURRENT_ITEMS = Array.isArray(data) ? data : [];
      buildYearDropdown(CURRENT_ITEMS);
      renderList();
    } catch (err) {
      CURRENT_ITEMS = [];
      buildYearDropdown(CURRENT_ITEMS);
      renderList();
      setError(true, String(err?.message || err));
    }

    if (updateHash) {
      history.replaceState(null, "", `#tab=${activeTab.dataset.tab}`);
    }
  }

  function init() {
    const tabs = $$(".pub-tab");
    if (!tabs.length) return;

    // Tab click
    tabs.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        activate(btn.dataset.tab, { updateHash: true });
      });
    });

    // Year filter
    const yearSel = $("#pubYear");
    if (yearSel) {
      yearSel.addEventListener("change", () => {
        CURRENT_YEAR = yearSel.value || "all";
        renderList();
      });
    }

    // Initial tab
    const initial =
      keyFromHash() ||
      tabs.find((t) => t.classList.contains("active"))?.dataset.tab ||
      tabs[0].dataset.tab;
    activate(initial, { updateHash: !!location.hash });

    // React to hash changes
    window.addEventListener("hashchange", () => {
      const k = keyFromHash();
      if (k) activate(k, { updateHash: false });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
