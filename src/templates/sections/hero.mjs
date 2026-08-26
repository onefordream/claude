import { site } from "../../data/site.mjs";
import { proWinnerAmountLabel } from "../../data/prizes.mjs";
import { esc } from "../../lib/render.mjs";
import { ARROW_ICON } from "../../lib/icons.mjs";

// HERO_IMAGE: タイトル文字入りで書き出された完成済みのビジュアルをそのまま使用する。
// 差し替える場合は /public/images/hero/hero-main.png を同じ比率の新しい画像で
// 上書きするだけでよい（テンプレート側の変更は不要）。
const HERO_IMAGE = {
  src: "/images/hero/hero-main.png",
  width: 1536,
  height: 1024,
  alt: "白いゴルフウェアの女子プロゴルファーが、桜の花びらが舞う晴れやかなゴルフコースでスイングのフィニッシュを決めている写真",
};

export function renderHero() {
  return `
<section class="hero" id="hero" aria-label="${esc(site.nameJa)}">
  <h1 class="sr-only">${esc(site.nameJa)}｜${esc(site.tagline)}</h1>
  <p class="sr-only">${esc(site.eventDateLabelJa)}／${esc(site.venue.name)}／プロの部優勝賞金${esc(proWinnerAmountLabel)}</p>

  <figure class="hero__poster reveal" data-hero-reveal data-reveal-delay="0">
    <img src="${esc(HERO_IMAGE.src)}" alt="${esc(HERO_IMAGE.alt)}" width="${HERO_IMAGE.width}" height="${HERO_IMAGE.height}" loading="eager" decoding="async" fetchpriority="high" />
  </figure>

  <div class="container hero__actions reveal" data-hero-reveal data-reveal-delay="1">
    <a href="#entry" class="btn btn--primary btn--lg btn--arrow">エントリーはこちら<span class="btn__arrow">${ARROW_ICON}</span></a>
  </div>

  <a href="#about" class="hero__scroll" aria-label="次のセクションへスクロール">
    <span class="hero__scroll-line" aria-hidden="true"></span>
    SCROLL
  </a>
</section>`;
}
