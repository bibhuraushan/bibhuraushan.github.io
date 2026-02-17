/* cv_web.js — left sidebar tabs + panes */
(function () {
  const tabs = Array.from(document.querySelectorAll(".cvl-tab"));
  const panes = Array.from(document.querySelectorAll(".cvl-pane"));
  // const crumb = document.getElementById("cvlCrumb");

  function paneKeyFromHash() {
    const h = (location.hash || "").replace("#", "").trim();
    // support formats: #education OR #tab=education
    if (!h) return "";
    if (h.startsWith("tab=")) return h.slice(4);
    return h;
  }

  function setActive(key, pushHash = true) {
    tabs.forEach((t) => t.classList.toggle("active", t.dataset.tab === key));
    panes.forEach((p) => p.classList.toggle("active", p.id === `tab-${key}`));

    // if (crumb) {
    //   const label =
    //     tabs.find((t) => t.dataset.tab === key)?.innerText?.trim() || key;
    //   crumb.textContent = label.replace(/\s+/g, " ");
    // }

    if (pushHash) {
      // keep URL clean and shareable
      history.replaceState(null, "", `#tab=${key}`);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    tabs.forEach((btn) => {
      btn.addEventListener("click", () => setActive(btn.dataset.tab));
    });

    const initial = paneKeyFromHash() || "about";
    setActive(initial, !!location.hash);

    window.addEventListener("hashchange", () => {
      const key = paneKeyFromHash() || "about";
      setActive(key, false);
    });
  });
})();
