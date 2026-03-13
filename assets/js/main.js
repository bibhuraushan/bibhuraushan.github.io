const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

function mobileNav() {
  const toggle = $(".nav-toggle");
  const links = $(".nav-links");
  if (!toggle || !links) return;

  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });

  $$(".nav-links a").forEach((link) => {
    link.addEventListener("click", () => {
      links.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

function theme() {
  const root = document.documentElement;
  const key = "theme";
  const saved = localStorage.getItem(key);

  if (saved === "light" || saved === "dark") {
    root.dataset.theme = saved;
  } else if (!root.dataset.theme) {
    root.dataset.theme = "dark";
  }

  const btn = $("#themeToggle");
  if (!btn) return;

  const icon = btn.querySelector(".theme-icon");
  const syncIcon = () => {
    if (icon) {
      icon.textContent = root.dataset.theme === "dark" ? "☀︎" : "☾";
    }
  };

  syncIcon();

  btn.addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
    localStorage.setItem(key, root.dataset.theme);
    syncIcon();
  });
}

function year() {
  const el = $("#year");
  if (el) el.textContent = String(new Date().getFullYear());
}

document.addEventListener("DOMContentLoaded", () => {
  mobileNav();
  theme();
  year();
});
