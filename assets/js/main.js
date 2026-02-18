const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

function mobileNav() {
  const toggle = $(".nav-toggle");
  const links = $(".nav-links");
  if (!toggle || !links) return;

  toggle.addEventListener("click", () => {
    links.classList.toggle("open");
    toggle.setAttribute(
      "aria-expanded",
      String(links.classList.contains("open")),
    );
  });

  $$(".nav-links a").forEach((a) => {
    a.addEventListener("click", () => {
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
  }

  const btn = $("#themeToggle");
  if (!btn) return;

  const icon = btn.querySelector(".theme-icon");

  // Set correct icon on load
  const current = root.dataset.theme || "dark";
  if (icon) {
    icon.textContent = current === "dark" ? "☀︎" : "☾";
  }

  btn.addEventListener("click", () => {
    const next = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = next;
    localStorage.setItem(key, next);

    // Update icon after toggle
    if (icon) {
      icon.textContent = next === "dark" ? "☀︎" : "☾";
    }
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

// inside main.js when toggling theme
themeToggle.textContent = currentTheme === "dark" ? "☀︎" : "☾";

/* Mobile nav toggle */
(function () {
  const toggle = document.querySelector(".nav-toggle");
  const menu = document.querySelector(".nav-links");
  if (!toggle || !menu) return;

  toggle.addEventListener("click", () => {
    const open = menu.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  // close on link click
  menu.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      menu.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
})();
