// 出場プロ 横スクロールスライダーの矢印ボタン制御
export function initPlayerSlider() {
  const track = document.querySelector("[data-player-track]");
  const prev = document.querySelector("[data-player-prev]");
  const next = document.querySelector("[data-player-next]");
  if (!track || !prev || !next) return;

  function step() {
    const card = track.querySelector(".player-card");
    if (!card) return track.clientWidth * 0.8;
    const style = getComputedStyle(track);
    const gap = parseFloat(style.columnGap || style.gap || "20");
    return card.getBoundingClientRect().width + gap;
  }

  prev.addEventListener("click", () => {
    track.scrollBy({ left: -step(), behavior: "smooth" });
  });
  next.addEventListener("click", () => {
    track.scrollBy({ left: step(), behavior: "smooth" });
  });
}
