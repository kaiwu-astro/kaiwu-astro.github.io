'use strict';

const qs = (selector, root = document) => root.querySelector(selector);
const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const toggleClass = (element, className = "active") => {
  if (element) element.classList.toggle(className);
};

const themeToggle = qs("[data-theme-toggle]");
const systemTheme = window.matchMedia("(prefers-color-scheme: light)");

const currentTheme = () => document.documentElement.dataset.theme || (systemTheme.matches ? "light" : "dark");

const syncThemeToggle = () => {
  if (!themeToggle) return;
  const theme = currentTheme();
  themeToggle.setAttribute("aria-label", theme === "light" ? "Switch to dark theme" : "Switch to light theme");
  themeToggle.dataset.themeState = theme;
};

themeToggle?.addEventListener("click", () => {
  const nextTheme = currentTheme() === "light" ? "dark" : "light";
  document.documentElement.dataset.theme = nextTheme;
  try {
    localStorage.setItem("theme", nextTheme);
  } catch {
    // The visible theme can still change even if storage is unavailable.
  }
  syncThemeToggle();
});

systemTheme.addEventListener("change", syncThemeToggle);
syncThemeToggle();

const setIcon = (icon, name) => {
  const use = icon?.querySelector("use");
  if (use) use.setAttribute("href", `/assets/images/icons-v20260706.svg#icon-${name}`);
};

const sidebar = qs("[data-sidebar]");
const sidebarBtn = qs("[data-sidebar-btn]");
const sidebarChevron = qs(".sidebar-chevron", sidebarBtn);

sidebarBtn?.addEventListener("click", () => {
  toggleClass(sidebar);
  setIcon(sidebarChevron, sidebar?.classList.contains("active") ? "chevron-up" : "chevron-down");
});

const navLinks = qsa("[data-nav-link]");
const sections = qsa("[data-section]");

const activeSection = (id) => {
  navLinks.forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === `#${id}`);
  });
};

navLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    const targetId = link.getAttribute("href");
    const target = targetId ? qs(targetId) : null;
    if (!target) return;

    event.preventDefault();
    activeSection(target.id);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", targetId);
  });
});

if (sections.length && navLinks.length) {
  let updatePending = false;

  const syncActiveSection = () => {
    const activationLine = window.innerHeight * 0.35;
    const atPageEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
    let active = atPageEnd ? sections[sections.length - 1] : sections[0];

    if (!atPageEnd) {
      for (const section of sections) {
        if (section.getBoundingClientRect().top > activationLine) break;
        active = section;
      }
    }

    if (active?.id) {
      activeSection(active.id);
      if (window.location.hash !== `#${active.id}`) {
        history.replaceState(null, "", `#${active.id}`);
      }
    }
    updatePending = false;
  };

  const requestActiveSectionSync = () => {
    if (updatePending) return;
    updatePending = true;
    requestAnimationFrame(syncActiveSection);
  };

  window.addEventListener("scroll", requestActiveSectionSync, { passive: true });
  window.addEventListener("resize", requestActiveSectionSync);
  requestActiveSectionSync();
}

