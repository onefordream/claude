import { site } from "../../data/site.mjs";
import { proWinnerAmountLabel } from "../../data/prizes.mjs";
import { esc } from "../../lib/render.mjs";
import { ARROW_ICON, PIN_ICON, laurelIcon } from "../../lib/icons.mjs";

// HERO_IMAGE: 実写(または許諾済みAI生成)の女子プロゴルファー写真に差し替える前提の
// プレースホルダー。/public/images/hero-main.jpg 等を用意し、下記 src を書き換えるだけでよい。
const HERO_IMAGE = { src: "/images/placeholders/hero-bg.svg", alt: "HERO_IMAGE — 女子プロゴルファー写真（差し替え予定）" };

export function renderHero() {
  return `
<section class="hero" id="hero" aria-label="${esc(site.nameJa)}">
  <div class="hero__photo-bg" aria-hidden="true">
    <img src="${esc(HERO_IMAGE.src)}" alt="${esc(HERO_IMAGE.alt)}" loading="eager" decoding="async" width="1600" height="1000" />
    <div class="hero__scrim"></div>
  </div>

  <div class="hero__vertical" aria-hidden="true"><span>PLAY</span><span>DREAM</span><span>INSPIRE</span></div>

  <div class="container hero__inner">
    <div class="hero__content">
      <p class="hero__edition reveal reveal--mask" data-hero-reveal data-reveal-delay="0">${esc(site.editionNumber)}nd</p>

      <h1 class="hero__title">
        <span class="hero__title-line-wrap"><span class="hero__title-line reveal reveal--mask" data-hero-reveal data-reveal-delay="1">SHADOW</span></span>
        <span class="hero__title-line-wrap"><span class="hero__title-line hero__title-line--accent reveal reveal--mask" data-hero-reveal data-reveal-delay="2">LADIES</span></span>
      </h1>

      <p class="hero__subtitle reveal reveal--mask" data-hero-reveal data-reveal-delay="3">PRO-AM TOURNAMENT</p>

      <p class="hero__tagline reveal" data-hero-reveal data-reveal-delay="4">${esc(site.tagline)}。</p>

      <div class="hero__facts reveal" data-hero-reveal data-reveal-delay="5">
        <p class="hero__date"><strong>2026.12.03</strong> <span>THU</span></p>
        <p class="hero__venue">${PIN_ICON}${esc(site.venue.name)}</p>
      </div>

      <div class="hero__badge reveal" data-hero-reveal data-reveal-delay="6">
        ${laurelIcon("hero__badge-laurel")}
        <span class="hero__badge-text">
          <span class="hero__badge-label">プロの部 優勝賞金</span>
          <span class="hero__badge-amount">${esc(proWinnerAmountLabel)}</span>
        </span>
      </div>

      <div class="hero__cta reveal" data-hero-reveal data-reveal-delay="7">
        <a href="#entry" class="btn btn--primary btn--lg btn--arrow">エントリーはこちら<span class="btn__arrow">${ARROW_ICON}</span></a>
      </div>
    </div>
  </div>

  <a href="#about" class="hero__scroll" aria-label="次のセクションへスクロール">
    <span class="hero__scroll-line" aria-hidden="true"></span>
    SCROLL
  </a>
</section>`;
}
