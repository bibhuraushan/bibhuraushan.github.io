/* cv_web.js — left sidebar tabs + panes */
(function () {
  const tabs = Array.from(document.querySelectorAll(".cvl-tab"));
  const panes = Array.from(document.querySelectorAll(".cvl-pane"));

  if (!tabs.length || !panes.length) return;

  function paneKeyFromHash() {
    const h = (location.hash || "").replace("#", "").trim();
    if (!h) return "";
    if (h.startsWith("tab=")) return h.slice(4);
    return h;
  }

  function setActive(key, pushHash = true) {
    const resolvedKey = tabs.some((tab) => tab.dataset.tab === key)
      ? key
      : tabs[0].dataset.tab;

    tabs.forEach((tab) =>
      tab.classList.toggle("active", tab.dataset.tab === resolvedKey),
    );
    panes.forEach((pane) =>
      pane.classList.toggle("active", pane.id === `tab-${resolvedKey}`),
    );

    if (pushHash) {
      history.replaceState(null, "", `#tab=${resolvedKey}`);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    tabs.forEach((btn) => {
      btn.addEventListener("click", () => setActive(btn.dataset.tab));
    });

    const initial = paneKeyFromHash() || tabs[0].dataset.tab;
    setActive(initial, !!location.hash);

    window.addEventListener("hashchange", () => {
      const key = paneKeyFromHash() || tabs[0].dataset.tab;
      setActive(key, false);
    });
  });
})();
