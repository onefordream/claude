// ギャラリー用ライトボックス（複数グループ対応・キーボード/スワイプ対応）
export function initLightbox() {
  const groups = document.querySelectorAll("[data-lightbox-group]");
  if (!groups.length) return;

  let box = document.querySelector(".lightbox");
  if (!box) {
    box = document.createElement("div");
    box.className = "lightbox";
    box.hidden = true;
    box.innerHTML = `
      <button type="button" class="lightbox__close" data-lightbox-close aria-label="閉じる">&times;</button>
      <button type="button" class="lightbox__prev" data-lightbox-prev aria-label="前の写真">&#8249;</button>
      <img data-lightbox-img alt="" />
      <button type="button" class="lightbox__next" data-lightbox-next aria-label="次の写真">&#8250;</button>
    `;
    document.body.appendChild(box);
  }

  const imgEl = box.querySelector("[data-lightbox-img]");
  let currentImages = [];
  let currentIndex = 0;
  let touchStartX = null;

  function open(images, index) {
    currentImages = images;
    currentIndex = index;
    render();
    box.hidden = false;
    document.body.classList.add("nav-open");
  }

  function close() {
    box.hidden = true;
    document.body.classList.remove("nav-open");
  }

  function render() {
    const item = currentImages[currentIndex];
    if (!item) return;
    imgEl.src = item.src;
    imgEl.alt = item.alt;
  }

  function next() {
    currentIndex = (currentIndex + 1) % currentImages.length;
    render();
  }
  function prev() {
    currentIndex = (currentIndex - 1 + currentImages.length) % currentImages.length;
    render();
  }

  groups.forEach((group) => {
    const triggers = Array.from(group.querySelectorAll("[data-lightbox-trigger]"));
    const images = triggers.map((t) => {
      const img = t.querySelector("img");
      return { src: img.currentSrc || img.src, alt: img.alt };
    });
    triggers.forEach((trigger, i) => {
      trigger.addEventListener("click", () => open(images, i));
    });
  });

  box.querySelector("[data-lightbox-close]").addEventListener("click", close);
  box.querySelector("[data-lightbox-next]").addEventListener("click", next);
  box.querySelector("[data-lightbox-prev]").addEventListener("click", prev);
  box.addEventListener("click", (e) => {
    if (e.target === box) close();
  });

  document.addEventListener("keydown", (e) => {
    if (box.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
  });

  box.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  box.addEventListener("touchend", (e) => {
    if (touchStartX === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(diff) > 40) (diff < 0 ? next() : prev());
    touchStartX = null;
  }, { passive: true });
}
