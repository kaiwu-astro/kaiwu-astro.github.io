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

navLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    const targetId = link.getAttribute("href");
    const target = targetId ? qs(targetId) : null;
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", targetId);
  });
});

if (sections.length && navLinks.length) {
  const activeSection = (id) => {
    navLinks.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === `#${id}`);
    });
  };

  const observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (!visible?.target?.id) return;
    activeSection(visible.target.id);
    if (window.location.hash !== `#${visible.target.id}`) {
      history.replaceState(null, "", `#${visible.target.id}`);
    }
  }, {
    rootMargin: "-35% 0px -50% 0px",
    threshold: [0.05, 0.2, 0.5, 0.8]
  });

  sections.forEach((section) => observer.observe(section));
}

const select = qs("[data-select]");
const selectItems = qsa("[data-select-item]");
const selectValue = qs("[data-select-value]");
const filterButtons = qsa("[data-filter-btn]");
const filterItems = qsa("[data-filter-item]");

const filterScience = (selectedValue) => {
  filterItems.forEach((item) => {
    item.classList.toggle("active", selectedValue === "all" || selectedValue === item.dataset.category);
  });
};

select?.addEventListener("click", () => toggleClass(select));

selectItems.forEach((item) => {
  item.addEventListener("click", () => {
    const selectedValue = item.innerText.toLowerCase();
    if (selectValue) selectValue.innerText = item.innerText;
    select?.classList.remove("active");
    filterScience(selectedValue);
    filterButtons.forEach((button) => {
      button.classList.toggle("active", button.innerText.toLowerCase() === selectedValue);
    });
  });
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const selectedValue = button.innerText.toLowerCase();
    if (selectValue) selectValue.innerText = button.innerText;
    filterScience(selectedValue);
    filterButtons.forEach((candidate) => candidate.classList.toggle("active", candidate === button));
  });
});
