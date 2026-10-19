/* suryascience.org — shared behaviour: theme, menu, tabs, footer, helpers. */
(function () {
  "use strict";

  // ---------- helpers ----------
  const Site = (window.Site = {});

  Site.esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  Site.json = async (url, { bust = false } = {}) => {
    const u = bust ? url + (url.includes("?") ? "&" : "?") + "t=" + Date.now() : url;
    const res = await fetch(u, { cache: bust ? "no-store" : "default" });
    if (!res.ok) throw new Error(res.status + " " + url);
    return res.json();
  };

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  Site.MONTHS = MONTHS;

  // "2026-01-20" -> "20 Jan 2026"; "2026-01" -> "Jan 2026"
  Site.fmtDate = (iso, { day = true } = {}) => {
    if (!iso) return "";
    const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
    if (!m) return String(y);
    if (!d || !day) return `${MONTHS[m - 1]} ${y}`;
    return `${d} ${MONTHS[m - 1]} ${y}`;
  };

  Site.icon = (name) => ICONS[name] || "";
  const svg = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const ICONS = {
    mail: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
    github: svg('<path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>'),
    orcid: svg('<circle cx="12" cy="12" r="9"/><path d="M8.5 10v6M8.5 7.5v.01M11.5 16v-6h2a3 3 0 0 1 0 6z"/>'),
    scholar: svg('<path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/>'),
    ads: svg('<circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="10" ry="4.2"/><ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(60 12 12)"/>'),
    linkedin: svg('<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7"/>'),
    pin: svg('<path d="M12 21s7-6.1 7-12a7 7 0 0 0-14 0c0 5.9 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>'),
    link: svg('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
    pdf: svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>'),
    quote: svg('<path d="M7 8h4v4c0 2-1 3.5-4 4M14 8h4v4c0 2-1 3.5-4 4"/>'),
    copy: svg('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'),
    sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
    moon: svg('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'),
  };

  // ---------- theme ----------
  const root = document.documentElement;
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const stored = () => { try { return localStorage.getItem("theme"); } catch { return null; } };
  const isDark = () => (root.dataset.theme ? root.dataset.theme === "dark" : media.matches);
  function paintToggle() {
    const btn = document.querySelector("[data-theme-toggle]");
    if (!btn) return;
    const dark = isDark();
    btn.innerHTML = dark ? ICONS.sun : ICONS.moon;
    btn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
  }
  const s = stored();
  if (s === "light" || s === "dark") root.dataset.theme = s;
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-theme-toggle]");
    if (!btn) return;
    const next = isDark() ? "light" : "dark";
    // Going back to the system's own choice clears the override.
    if ((next === "dark") === media.matches) { delete root.dataset.theme; try { localStorage.removeItem("theme"); } catch {} }
    else { root.dataset.theme = next; try { localStorage.setItem("theme", next); } catch {} }
    paintToggle();
    document.dispatchEvent(new CustomEvent("themechange"));
  });
  media.addEventListener?.("change", () => { paintToggle(); document.dispatchEvent(new CustomEvent("themechange")); });

  // ---------- mobile menu ----------
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-menu-toggle]");
    const nav = document.querySelector(".nav");
    if (btn && nav) {
      const open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
    } else if (nav?.classList.contains("open") && !e.target.closest(".nav")) {
      nav.classList.remove("open");
      document.querySelector("[data-menu-toggle]")?.setAttribute("aria-expanded", "false");
    }
  });

  // ---------- tabs ----------
  // Markup: [data-tabs] > .tablist > button.tab[data-tab=id]; panels are #panel-<id>.
  // The URL hash (#id, or the old site's #tab=id) selects a tab, so tabs are linkable.
  function initTabs(group) {
    const tabs = [...group.querySelectorAll(".tab")];
    const ids = tabs.map((t) => t.dataset.tab);
    function select(id, { focus = false, push = false } = {}) {
      if (!ids.includes(id)) id = ids[0];
      tabs.forEach((t) => {
        const on = t.dataset.tab === id;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById("panel-" + t.dataset.tab);
        if (panel) panel.hidden = !on;
        if (on) {
          if (focus) t.focus({ preventScroll: true });
          // Keep the active tab visible in the scrollable row without moving the page.
          const row = t.parentElement;
          if (t.offsetLeft < row.scrollLeft || t.offsetLeft + t.offsetWidth > row.scrollLeft + row.clientWidth) {
            row.scrollLeft = t.offsetLeft - 16;
          }
        }
      });
      if (push) history.replaceState(null, "", "#" + id);
      document.dispatchEvent(new CustomEvent("tabchange", { detail: { id } }));
    }
    tabs.forEach((t, i) => {
      t.setAttribute("role", "tab");
      t.id = "tab-" + t.dataset.tab;
      t.setAttribute("aria-controls", "panel-" + t.dataset.tab);
      const panel = document.getElementById("panel-" + t.dataset.tab);
      if (panel) { panel.setAttribute("role", "tabpanel"); panel.setAttribute("aria-labelledby", t.id); panel.tabIndex = 0; }
      t.addEventListener("click", () => select(t.dataset.tab, { push: true }));
      t.addEventListener("keydown", (e) => {
        let j = null;
        if (e.key === "ArrowRight") j = (i + 1) % tabs.length;
        if (e.key === "ArrowLeft") j = (i - 1 + tabs.length) % tabs.length;
        if (e.key === "Home") j = 0;
        if (e.key === "End") j = tabs.length - 1;
        if (j !== null) { e.preventDefault(); select(ids[j], { focus: true, push: true }); }
      });
    });
    // A hash can name a tab, or any element inside a tab panel (e.g. #project-sft):
    // then that panel opens and the element scrolls into view.
    const fromHash = () => {
      const h = decodeURIComponent(location.hash.slice(1)).replace(/^tab=/, "");
      if (ids.includes(h)) return { tab: h };
      const target = h ? document.getElementById(h) : null;
      const panel = target?.closest(".tabpanel");
      if (panel && group.contains(panel)) return { tab: panel.id.replace(/^panel-/, ""), target };
      return null;
    };
    const go = (hit, smooth) => {
      select(hit.tab);
      if (hit.target) requestAnimationFrame(() => hit.target.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" }));
      else if (smooth) group.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    const first = fromHash();
    first ? go(first, false) : select(ids[0]);
    window.addEventListener("hashchange", () => { const hit = fromHash(); if (hit) go(hit, true); });
    group._select = select;
  }

  // ---------- profile links (footer + anywhere with [data-profile-links]) ----------
  const LINK_ORDER = [
    ["email", "Email", "mail"], ["github", "GitHub", "github"], ["orcid", "ORCID", "orcid"],
    ["scholar", "Google Scholar", "scholar"], ["ads", "NASA ADS", "ads"], ["linkedin", "LinkedIn", "linkedin"],
  ];
  Site.profile = Site.json("data/profile.json").catch(() => null);
  // The email address is kept as {user, domain} and shown as "user [at] domain", so it never
  // sits whole in the HTML or JSON for scrapers. The mailto link is built only on click.
  Site.profileLinks = (p) =>
    LINK_ORDER.filter(([k]) => p?.links?.[k]).map(([k, label, icon]) => {
      if (k !== "email") return { key: k, label, icon, href: p.links[k], text: label };
      const { user, domain } = p.links.email;
      return { key: k, label, icon, href: "#", text: `${user} [at] ${domain}`, attrs: ` data-mail-u="${Site.esc(user)}" data-mail-d="${Site.esc(domain)}"` };
    });
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-mail-u]");
    if (!a) return;
    e.preventDefault();
    location.href = "mailto:" + a.dataset.mailU + "@" + a.dataset.mailD;
  });

  async function renderFooter() {
    const el = document.querySelector("[data-footer-links]");
    const p = await Site.profile;
    if (el && p) {
      el.innerHTML = Site.profileLinks(p)
        .map((l) => `<a href="${Site.esc(l.href)}"${l.attrs || ' rel="me noopener" target="_blank"'}>${l.label}</a>`)
        .join("");
    }
    const upd = document.querySelector("[data-last-updated]");
    if (upd) {
      const d = new Date(document.lastModified);
      if (!isNaN(d)) upd.textContent = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    }
    const yr = document.querySelector("[data-year]");
    if (yr) yr.textContent = new Date().getFullYear();
  }

  // ---------- copy buttons ----------
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-copy]");
    if (!btn) return;
    const src = document.querySelector(btn.dataset.copy);
    if (!src) return;
    try {
      await navigator.clipboard.writeText(src.innerText.trim());
      const old = btn.innerHTML;
      btn.textContent = "Copied";
      setTimeout(() => (btn.innerHTML = old), 1600);
    } catch {}
  });

  document.addEventListener("DOMContentLoaded", () => {
    paintToggle();
    document.querySelectorAll("[data-tabs]").forEach(initTabs);
    renderFooter();
  });
})();
