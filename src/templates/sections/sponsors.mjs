import { sponsors } from "../../data/sponsors.mjs";
import { esc } from "../../lib/render.mjs";

function sponsorTile(sponsor) {
  const inner = `
      <span class="sponsor-tile__logo">
        <img src="${esc(sponsor.logo || "/images/placeholders/sponsor-logo.svg")}" alt="SPONSOR_LOGO — ${esc(sponsor.name)}" loading="lazy" decoding="async" width="240" height="120" />
      </span>
      <span class="sponsor-tile__name">${esc(sponsor.name)}</span>`;

  return sponsor.url
    ? `<li class="sponsor-tile"><a href="${esc(sponsor.url)}" target="_blank" rel="noopener noreferrer">${inner}</a></li>`
    : `<li class="sponsor-tile"><span class="sponsor-tile__static">${inner}</span></li>`;
}

export function renderSponsors() {
  const hasSponsors = sponsors.length > 0;

  return `
<section class="section section--alt" id="sponsors">
  <div class="container">
    <p class="eyebrow reveal" data-reveal>SPONSORS</p>
    <h2 class="h2 reveal" data-reveal data-reveal-delay="1">スポンサー企業</h2>

    ${
      hasSponsors
        ? `<ul class="sponsor-grid reveal" data-reveal data-reveal-delay="2">${sponsors.map(sponsorTile).join("")}</ul>`
        : `<p class="sponsor-grid__empty reveal" data-reveal data-reveal-delay="2">募集中</p>`
    }

    <div class="sponsor-cta reveal" data-reveal>
      <p class="sponsor-cta__title">スポンサー・協賛企業募集中</p>
      <p class="sponsor-cta__desc">第2回 SHADOW LADIES PRO-AM TOURNAMENT を共に盛り上げていただけるスポンサー・協賛企業様を募集しております。</p>
      <a href="#contact" class="btn btn--secondary" data-contact-topic="sponsor">スポンサーについて問い合わせる</a>
    </div>
  </div>
</section>`;
}
