import { sponsorRanks } from "../../data/sponsors.mjs";
import { esc } from "../../lib/render.mjs";

function sponsorTile(sponsor, rankId) {
  const inner = `
      <span class="sponsor-tile__logo sponsor-tile__logo--${esc(rankId)}">
        <img src="${esc(sponsor.logo || "/images/placeholders/sponsor-logo.svg")}" alt="SPONSOR_LOGO — ${esc(sponsor.name)}" loading="lazy" decoding="async" width="240" height="120" />
      </span>
      <span class="sponsor-tile__name">${esc(sponsor.name)}</span>`;

  return sponsor.url
    ? `<li class="sponsor-tile"><a href="${esc(sponsor.url)}" target="_blank" rel="noopener noreferrer">${inner}</a></li>`
    : `<li class="sponsor-tile"><span class="sponsor-tile__static">${inner}</span></li>`;
}

function rankBlock(rank) {
  const hasSponsors = rank.sponsors.length > 0;
  return `
    <div class="sponsor-rank sponsor-rank--${esc(rank.id)} reveal" data-reveal>
      <p class="sponsor-rank__label">${esc(rank.label)}</p>
      ${
        hasSponsors
          ? `<ul class="sponsor-rank__grid">${rank.sponsors.map((s) => sponsorTile(s, rank.id)).join("")}</ul>`
          : `<p class="sponsor-rank__empty">募集中</p>`
      }
    </div>`;
}

export function renderSponsors() {
  return `
<section class="section section--alt" id="sponsors">
  <div class="container">
    <p class="eyebrow reveal" data-reveal>SPONSORS</p>
    <h2 class="h2 reveal" data-reveal data-reveal-delay="1">スポンサー企業</h2>

    <div class="sponsor-ranks">
      ${sponsorRanks.map(rankBlock).join("")}
    </div>

    <div class="sponsor-cta reveal" data-reveal>
      <p class="sponsor-cta__title">スポンサー・協賛企業募集中</p>
      <p class="sponsor-cta__desc">第2回 SHADOW LADIES PRO-AM TOURNAMENT を共に盛り上げていただけるスポンサー・協賛企業様を募集しております。</p>
      <a href="#contact" class="btn btn--secondary" data-contact-topic="sponsor">スポンサーについて問い合わせる</a>
    </div>
  </div>
</section>`;
}
