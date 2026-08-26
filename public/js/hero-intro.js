// HERO読み込み時のシーケンシャル演出（2nd → SHADOW → LADIES → PRO-AM TOURNAMENT → …）
//
// HEROは常に初期表示エリア内にあるため、スクロール検知（IntersectionObserver）
// ではなくページ読み込みをトリガーにする。clip-pathで完全に隠した要素は
// ブラウザによっては交差率が常に0と判定されIntersectionObserverが発火しない
// ため、あえてこの専用ロジックに分離している。
export function initHeroIntro() {
  const items = document.querySelectorAll("[data-hero-reveal]");
  if (!items.length) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  items.forEach((el) => {
    const delay = el.getAttribute("data-reveal-delay");
    if (delay) el.style.setProperty("--reveal-delay", delay);
  });

  if (reducedMotion) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  // 2フレーム待ってから発火することで、初期状態が確実に描画されてから
  // トランジションが開始されるようにする（描画前に即座にクラスを付けると
  // ブラウザがトランジションをスキップすることがある）。
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      items.forEach((el) => el.classList.add("is-visible"));
    });
  });
}
