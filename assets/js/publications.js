(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const YOUR_NAME = "Bibhuti Kumar Jha";
  const YOUR_NAME_VARIANTS = new Set([
    "bibhuti kumar jha",
    "bibhuti jha",
    "jha, bibhuti kumar",
    "jha, bibhuti",
  ]);

  let CURRENT_ITEMS = [];
  let CURRENT_YEAR = "all";
  let CURRENT_KIND = "publication";

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

  function itemKey(it) {
    const y = Number(it.year) || 0;
    const mo = monthRank(it.month);
    return y * 100 + mo;
  }

  function formatAuthors(authorsArr, year) {
    if (!Array.isArray(authorsArr) || authorsArr.length === 0) return "";

    const authors = authorsArr
      .map((a) => String(a || "").trim())
      .map((author) =>
        YOUR_NAME_VARIANTS.has(author.toLowerCase()) ? YOUR_NAME : author,
      )
      .filter(Boolean);

    if (!authors.length) return "";

    const firstThree = authors.slice(0, 3);
    const more = authors.length > 3;
    const youInList = authors.some((a) => a.toLowerCase() === YOUR_NAME.toLowerCase());
    const youInFirstThree = firstThree.some((a) => a.toLowerCase() === YOUR_NAME.toLowerCase());

    let s = firstThree.map((a) => escapeHtml(a)).join(", ");
    if (more) s += " et al.";
    if (year) s += ` (${escapeHtml(year)})`;
    if (youInList && !youInFirstThree) s += ` +${escapeHtml(YOUR_NAME)}`;

    const needle = YOUR_NAME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return s.replace(
      new RegExp(needle, "gi"),
      `<span class="author-highlight">${escapeHtml(YOUR_NAME)}</span>`,
    );
  }

  function formatVenue(it) {
    const parts = [];
    if (it.journal) parts.push(it.journal);
    else if (it.venue) parts.push(it.venue);
    else if (it.venue_short) parts.push(it.venue_short);
    if (it.volume) parts.push(`Vol. ${it.volume}`);
    if (it.pages) parts.push(`pp. ${it.pages}`);
    return parts.filter(Boolean).join(" • ");
  }

  function iconLinkPill(href, label, iconClass) {
    const url = String(href || "").trim();
    if (!url) return "";
    return `
      <a class="pub-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">
        <i class="${escapeHtml(iconClass)}" aria-hidden="true"></i>
        ${escapeHtml(label)}
      </a>
    `;
  }

  function titleHTML(it) {
    const title = escapeHtml(it.title || "Untitled");
    const url = it.link || it.ads || "";
    if (!url) return title;
    return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${title}</a>`;
  }

  function setError(show, msg = "") {
    const box = $("#pubError");
    const text = $("#pubErrorMsg");
    if (!box || !text) return;
    box.hidden = !show;
    text.textContent = msg;
  }

  function setHeaderFromTab(tabBtn) {
    const title = $("#pubHeaderTitle");
    const sub = $("#pubHeaderSub");
    if (title) title.textContent = tabBtn?.dataset?.title || "Archive";
    if (sub) sub.textContent = tabBtn?.dataset?.sub || "";
  }

  function buildYearDropdown(items) {
    const wrap = $(".pub-controls-left");
    const sel = $("#pubYear");
    if (!sel || !wrap) return;

    const years = [
      ...new Set(
        (items || [])
          .map((x) => Number(x.year))
          .filter((y) => Number.isFinite(y) && y > 0),
      ),
    ].sort((a, b) => b - a);

    wrap.hidden = years.length === 0;
    sel.innerHTML = [
      `<option value="all">All Years</option>`,
      ...years.map((y) => `<option value="${y}">${y}</option>`),
    ].join("");

    const wanted = String(CURRENT_YEAR);
    const exists = wanted === "all" || years.some((y) => String(y) === wanted);
    CURRENT_YEAR = exists ? wanted : "all";
    sel.value = CURRENT_YEAR;
  }

  function filteredItems(items) {
    if (CURRENT_YEAR === "all") return items.slice();
    return items.filter((x) => String(x.year) === String(CURRENT_YEAR));
  }

  function renderPublicationItem(it) {
    const authorsLine = formatAuthors(it.authors, it.year);
    const venueLine = formatVenue(it);
    const links = [
      iconLinkPill(it.ads, "ADS", "fa-solid fa-magnifying-glass"),
      iconLinkPill(doiUrl(it.doi), "DOI", "fa-solid fa-link"),
      iconLinkPill(arxivUrl(it.arxiv), "arXiv", "fa-solid fa-file-lines"),
      iconLinkPill(it.pdf, "PDF", "fa-solid fa-file-pdf"),
      iconLinkPill(it.link, "Link", "fa-solid fa-arrow-up-right-from-square"),
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
  }

  function renderTalkItem(it) {
    const metaLine = [it.event, it.institute, it.location]
      .filter(Boolean)
      .join(", ");

    return `
      <article class="glass-card pub-item pub-item-talk">
        <div class="pub-item-head">
          <h3 class="pub-title">${escapeHtml(it.title || "Untitled talk")}</h3>
          <span class="pub-year">${escapeHtml([it.year, it.month].filter(Boolean).join(" "))}</span>
        </div>
        <div class="pub-meta">
          ${it.kind ? `<div class="pub-chip-row"><span class="pub-chip">${escapeHtml(it.kind)}</span></div>` : ""}
          ${metaLine ? `<div class="pub-talk-meta">${escapeHtml(metaLine)}</div>` : ""}
          ${it.date_text ? `<div class="pub-talk-date">${escapeHtml(it.date_text)}</div>` : ""}
        </div>
      </article>
    `;
  }

  function renderSoftwareItem(it) {
    const links = [
      iconLinkPill(it.repo, "Repo", "fa-brands fa-github"),
      iconLinkPill(it.docs, "Docs", "fa-solid fa-book"),
      iconLinkPill(it.link, "Link", "fa-solid fa-arrow-up-right-from-square"),
    ].filter(Boolean);
    const metaLine = [it.status, Array.isArray(it.stack) ? it.stack.join(" • ") : ""]
      .filter(Boolean)
      .join(" • ");

    return `
      <article class="glass-card pub-item">
        <div class="pub-item-head">
          <h3 class="pub-title">${escapeHtml(it.title || "Untitled software")}</h3>
          <span class="pub-year">${escapeHtml([it.year, it.month].filter(Boolean).join(" "))}</span>
        </div>
        <div class="pub-meta">
          ${it.summary ? `<div>${escapeHtml(it.summary)}</div>` : ""}
          ${metaLine ? `<div>${escapeHtml(metaLine)}</div>` : ""}
        </div>
        ${links.length ? `<div class="pub-links">${links.join("")}</div>` : ""}
      </article>
    `;
  }

  function renderDataItem(it) {
    const links = [iconLinkPill(it.link, "Open", "fa-solid fa-database")].filter(
      Boolean,
    );
    const metaLine = [it.status, it.coverage, it.format]
      .filter(Boolean)
      .join(" • ");

    return `
      <article class="glass-card pub-item">
        <div class="pub-item-head">
          <h3 class="pub-title">${escapeHtml(it.title || "Untitled dataset")}</h3>
          <span class="pub-year">${escapeHtml([it.year, it.month].filter(Boolean).join(" "))}</span>
        </div>
        <div class="pub-meta">
          ${it.summary ? `<div>${escapeHtml(it.summary)}</div>` : ""}
          ${metaLine ? `<div>${escapeHtml(metaLine)}</div>` : ""}
        </div>
        ${links.length ? `<div class="pub-links">${links.join("")}</div>` : ""}
      </article>
    `;
  }

  function renderItem(it) {
    if (CURRENT_KIND === "talk") return renderTalkItem(it);
    if (CURRENT_KIND === "software") return renderSoftwareItem(it);
    if (CURRENT_KIND === "data") return renderDataItem(it);
    return renderPublicationItem(it);
  }

  function renderList() {
    const list = $("#pubList");
    const empty = $("#pubEmpty");
    const count = $("#pubCount");
    if (!list || !empty || !count) return;

    const items = filteredItems(CURRENT_ITEMS).sort(
      (a, b) =>
        itemKey(b) - itemKey(a) ||
        String(a.title || "").localeCompare(String(b.title || "")),
    );

    count.textContent = String(items.length);

    if (!items.length) {
      list.innerHTML = "";
      empty.hidden = false;
      return;
    }

    empty.hidden = true;
    list.innerHTML = items.map(renderItem).join("");
  }

  async function loadJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} while fetching ${url}`);
    return res.json();
  }

  async function activate(tabKey, { updateHash = true } = {}) {
    const tabs = $$(".pub-tab");
    if (!tabs.length) return;

    const activeTab = tabs.find((tab) => tab.dataset.tab === tabKey) || tabs[0];

    tabs.forEach((tab) => {
      const on = tab === activeTab;
      tab.classList.toggle("active", on);
      tab.setAttribute("aria-selected", on ? "true" : "false");
    });

    CURRENT_KIND = activeTab.dataset.kind || "publication";
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

    tabs.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        activate(btn.dataset.tab, { updateHash: true });
      });
    });

    const yearSel = $("#pubYear");
    if (yearSel) {
      yearSel.addEventListener("change", () => {
        CURRENT_YEAR = yearSel.value || "all";
        renderList();
      });
    }

    const initial =
      keyFromHash() ||
      tabs.find((tab) => tab.classList.contains("active"))?.dataset.tab ||
      tabs[0].dataset.tab;

    activate(initial, { updateHash: !!location.hash });

    window.addEventListener("hashchange", () => {
      const key = keyFromHash();
      if (key) activate(key, { updateHash: false });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
