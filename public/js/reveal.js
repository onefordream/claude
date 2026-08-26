// スクロール連動のフェードイン／スライドアップ演出 + パララックス
const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function initReveal() {
  const items = document.querySelectorAll("[data-reveal]");
  if (!items.length) return;

  if (REDUCED_MOTION) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  items.forEach((el) => {
    const delay = el.getAttribute("data-reveal-delay");
    if (delay) el.style.setProperty("--reveal-delay", delay);
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
  );

  items.forEach((el) => observer.observe(el));
}

export function initParallax() {
  if (REDUCED_MOTION) return;
  const els = document.querySelectorAll("[data-parallax]");
  if (!els.length) return;

  // モバイルでは負荷を抑えるため無効化
  const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const isNarrow = window.innerWidth < 760;
  if (isCoarsePointer || isNarrow) return;

  let ticking = false;

  function update() {
    const scrollY = window.scrollY;
    els.forEach((el) => {
      const speed = parseFloat(el.getAttribute("data-parallax-speed") || "0.08");
      el.style.transform = `translate3d(0, ${scrollY * speed * -1}px, 0)`;
    });
    ticking = false;
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    },
    { passive: true }
  );
}
