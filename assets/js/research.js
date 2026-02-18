/* research.js — tabs + header sync + deep links */
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function keyFromHash() {
    const h = (location.hash || "").replace("#", "").trim();
    if (!h) return "";
    if (h.startsWith("tab=")) return h.slice(4).trim();
    return h;
  }

  function setHeaderFromTab(tabBtn) {
    const headerTitle = $("#rshHeaderTitle");
    const headerSub = $("#rshHeaderSub");
    if (!headerTitle || !headerSub || !tabBtn) return;

    // const title =
    const title = tabBtn.dataset.title || "Research";
    const sub =
      tabBtn.dataset.sub || "A curated view of my scientific interests";
    headerTitle.textContent = title;
    headerSub.textContent = sub;
  }

  function activate(key, { updateHash = true } = {}) {
    const tabs = $$(".rsh-tab");
    const panes = $$(".rsh-pane");
    if (!tabs.length || !panes.length) return;

    // Find matching tab; fallback to first tab
    const activeTab = tabs.find((t) => t.dataset.tab === key) || tabs[0];
    const activeKey = activeTab.dataset.tab;

    tabs.forEach((t) => t.classList.toggle("active", t === activeTab));
    panes.forEach((p) =>
      p.classList.toggle("active", p.id === `tab-${activeKey}`),
    );

    setHeaderFromTab(activeTab);

    if (updateHash) {
      history.replaceState(null, "", `#tab=${activeKey}`);
    }
  }

  function init() {
    const tabs = $$(".rsh-tab");
    const panes = $$(".rsh-pane");

    // If markup isn't present, do nothing (prevents errors on other pages)
    if (!tabs.length || !panes.length) return;

    // Click handlers
    tabs.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        activate(btn.dataset.tab, { updateHash: true });
      });
    });

    // Initial state
    const initial =
      keyFromHash() ||
      tabs.find((t) => t.classList.contains("active"))?.dataset.tab ||
      tabs[0].dataset.tab;
    activate(initial, { updateHash: !!location.hash });

    // Hash navigation
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
