import { site } from "../../data/site.mjs";
import { esc } from "../../lib/render.mjs";

// HERO_IMAGE: 実写(または許諾済みAI生成)の女子プロゴルファー写真に差し替える前提の
// プレースホルダー。/public/images/hero-main.jpg 等を用意し、下記 src を書き換えるだけでよい。
const HERO_IMAGE = { src: "/images/placeholders/hero-portrait.svg", alt: "HERO_IMAGE — 女子プロゴルファー写真（差し替え予定）" };

export function renderHero() {
  return `
<section class="hero" id="hero" aria-label="${esc(site.nameJa)}">
  <div class="hero__bg" aria-hidden="true">
    <div class="hero__wash"></div>
  </div>

  <div class="container hero__grid">
    <figure class="hero__photo reveal" data-hero-reveal data-reveal-delay="1">
      <img src="${esc(HERO_IMAGE.src)}" alt="${esc(HERO_IMAGE.alt)}" loading="eager" decoding="async" width="760" height="950" />
    </figure>

    <div class="hero__content">
      <p class="hero__edition reveal reveal--mask" data-hero-reveal data-reveal-delay="0">${esc(site.editionNumber)}nd</p>

      <h1 class="hero__title">
        <span class="hero__title-line-wrap"><span class="hero__title-line reveal reveal--mask" data-hero-reveal data-reveal-delay="1">SHADOW</span></span>
        <span class="hero__title-line-wrap"><span class="hero__title-line reveal reveal--mask" data-hero-reveal data-reveal-delay="2">LADIES</span></span>
      </h1>

      <p class="hero__subtitle reveal reveal--mask" data-hero-reveal data-reveal-delay="3">PRO-AM TOURNAMENT</p>

      <p class="hero__tagline reveal" data-hero-reveal data-reveal-delay="4">${esc(site.tagline)}</p>

      <dl class="hero__facts reveal" data-hero-reveal data-reveal-delay="5">
        <div class="hero__fact">
          <dt>DATE</dt>
          <dd>${esc(site.eventDateLabelShort)}</dd>
        </div>
        <div class="hero__fact-divider" aria-hidden="true"></div>
        <div class="hero__fact">
          <dt>VENUE</dt>
          <dd>${esc(site.venue.name)}</dd>
        </div>
      </dl>

      <div class="hero__cta reveal" data-hero-reveal data-reveal-delay="6">
        <a href="#entry" class="btn btn--primary btn--lg">エントリーはこちら</a>
      </div>
    </div>
  </div>

  <a href="#about" class="hero__scroll" aria-label="次のセクションへスクロール">
    <span class="hero__scroll-line" aria-hidden="true"></span>
    SCROLL
  </a>
</section>`;
}
