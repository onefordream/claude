// ヘッダーのスクロール状態・モバイルナビ・モバイル固定CTAの表示制御
export function initNav() {
  const header = document.querySelector("[data-header]");
  const toggle = document.querySelector("[data-nav-toggle]");
  const mobileNav = document.querySelector("[data-nav-mobile]");
  const stickyCta = document.querySelector("[data-sticky-cta]");
  const entrySection = document.getElementById("entry");
  const footer = document.querySelector(".site-footer");

  if (header) {
    const onScroll = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 12);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  if (toggle && mobileNav) {
    const closeMenu = () => {
      toggle.setAttribute("aria-expanded", "false");
      mobileNav.hidden = true;
      document.body.classList.remove("nav-open");
    };
    const openMenu = () => {
      toggle.setAttribute("aria-expanded", "true");
      mobileNav.hidden = false;
      document.body.classList.add("nav-open");
    };
    toggle.addEventListener("click", () => {
      const isOpen = toggle.getAttribute("aria-expanded") === "true";
      isOpen ? closeMenu() : openMenu();
    });
    mobileNav.querySelectorAll("[data-nav-link]").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });
  }

  if (stickyCta && (entrySection || footer)) {
    const hideTargets = [entrySection, footer].filter(Boolean);
    const observer = new IntersectionObserver(
      (entries) => {
        const anyVisible = entries.some((e) => e.isIntersecting);
        stickyCta.classList.toggle("is-hidden", anyVisible);
      },
      { threshold: 0.15 }
    );
    hideTargets.forEach((el) => observer.observe(el));
  }
}
