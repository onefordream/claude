import { site } from "../../data/site.mjs";
import { esc } from "../../lib/render.mjs";

// HERO_IMAGE: 複数の女子プロ写真を差し替え可能な3枚構成。
// 実写真が届いたら /public/images/hero/*.jpg に置き換え、下記 src を変更するだけでよい。
const HERO_IMAGES = [
  { src: "/images/placeholders/hero-1.svg", alt: "HERO_IMAGE — 出場プロ写真（差し替え予定）", cls: "hero__photo hero__photo--a" },
  { src: "/images/placeholders/hero-2.svg", alt: "HERO_IMAGE — 出場プロ写真（差し替え予定）", cls: "hero__photo hero__photo--b" },
  { src: "/images/placeholders/hero-3.svg", alt: "HERO_IMAGE — 出場プロ写真（差し替え予定）", cls: "hero__photo hero__photo--c" },
];

export function renderHero() {
  return `
<section class="hero" id="hero" aria-label="${esc(site.nameJa)}">
  <div class="hero__bg" aria-hidden="true">
    <div class="hero__gradient"></div>
    <div class="hero__glow hero__glow--1"></div>
    <div class="hero__glow hero__glow--2"></div>
    <div class="hero__pattern"></div>
  </div>

  <div class="hero__photos" aria-hidden="false" data-parallax-group>
    ${HERO_IMAGES.map(
      (img, i) => `
    <figure class="${img.cls}" data-parallax data-parallax-speed="${0.06 + i * 0.03}">
      <img src="${esc(img.src)}" alt="${esc(img.alt)}" loading="eager" decoding="async" width="640" height="800" />
    </figure>`
    ).join("")}
  </div>

  <div class="container hero__content">
    <p class="hero__edition reveal" data-reveal>${esc(site.editionLabel)} / ${esc(site.editionNumber)}nd</p>

    <h1 class="hero__title reveal" data-reveal data-reveal-delay="1">
      <span class="hero__title-en">SHADOW LADIES</span>
      <span class="hero__title-en hero__title-en--accent">PRO-AM TOURNAMENT</span>
    </h1>

    <p class="hero__tagline reveal" data-reveal data-reveal-delay="2">${esc(site.tagline)}</p>

    <dl class="hero__facts reveal" data-reveal data-reveal-delay="3">
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

    <div class="hero__cta reveal" data-reveal data-reveal-delay="4">
      <a href="#entry" class="btn btn--primary btn--lg">エントリーはこちら</a>
      <a href="#about" class="btn btn--ghost-light btn--lg">大会について見る</a>
    </div>
  </div>

  <a href="#about" class="hero__scroll" aria-label="次のセクションへスクロール">
    <span class="hero__scroll-line" aria-hidden="true"></span>
    SCROLL
  </a>
</section>`;
}
