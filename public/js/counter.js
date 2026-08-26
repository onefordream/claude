// 数字のカウントアップ演出（EVENT HIGHLIGHTS 等）
const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function initCounters() {
  const items = document.querySelectorAll("[data-countup]");
  if (!items.length) return;

  if (REDUCED_MOTION) {
    items.forEach((el) => {
      el.textContent = el.getAttribute("data-countup-to");
    });
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateCount(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.6 }
  );

  items.forEach((el) => observer.observe(el));
}

function animateCount(el) {
  const to = parseInt(el.getAttribute("data-countup-to"), 10) || 0;
  const duration = 1200;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * to).toString();
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
