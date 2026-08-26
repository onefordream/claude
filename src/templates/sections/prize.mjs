import { proFormat, proPrizes, amateurFormat, amateurPrizes, participationGift } from "../../data/prizes.mjs";
import { esc } from "../../lib/render.mjs";

function prizeRow(p) {
  return `
      <li class="prize-row ${p.featured ? "prize-row--featured" : ""}">
        <span class="prize-row__rank">${esc(p.rank)}位</span>
        <span class="prize-row__amount">${esc(p.label)}</span>
      </li>`;
}

export function renderPrize() {
  const featuredPro = proPrizes.find((p) => p.featured);

  return `
<section class="section section--prize" id="prize">
  <div class="container">
    <p class="eyebrow reveal" data-reveal>PRIZE</p>
    <h2 class="h2 reveal" data-reveal data-reveal-delay="1">賞金・賞品</h2>

    <div class="prize-featured reveal" data-reveal data-reveal-delay="2">
      <p class="prize-featured__label">プロの部 優勝賞金</p>
      <p class="prize-featured__amount">${esc(featuredPro.label)}</p>
    </div>

    <div class="prize-grid">
      <div class="prize-panel prize-panel--pro reveal" data-reveal data-reveal-delay="3">
        <div class="prize-panel__head">
          <p class="prize-panel__title">${esc(proFormat.title)}</p>
          <p class="prize-panel__format">${esc(proFormat.competition)}</p>
          <p class="prize-panel__kind">賞金</p>
        </div>
        <ul class="prize-list">
          ${proPrizes.map(prizeRow).join("")}
        </ul>
      </div>

      <div class="prize-panel prize-panel--amateur reveal" data-reveal data-reveal-delay="4">
        <div class="prize-panel__head">
          <p class="prize-panel__title">${esc(amateurFormat.title)}</p>
          <p class="prize-panel__format">${esc(amateurFormat.competition)}／${esc(amateurFormat.handicap)}</p>
          <p class="prize-panel__kind prize-panel__kind--voucher">入賞は現金ではなく金券</p>
        </div>
        <ul class="prize-list">
          ${amateurPrizes.map(prizeRow).join("")}
        </ul>
        <p class="prize-panel__note">${esc(amateurFormat.teamNote)}</p>
      </div>
    </div>

    <div class="gift-card reveal" data-reveal data-reveal-delay="5">
      <div class="gift-card__media">
        <img src="${esc(participationGift.photo || "/images/placeholders/gift.svg")}" alt="参加賞：${esc(participationGift.name)}（差し替え予定）" loading="lazy" decoding="async" width="480" height="480" />
      </div>
      <div class="gift-card__body">
        <p class="eyebrow">参加賞</p>
        <p class="gift-card__title">${esc(participationGift.name)}</p>
        <p class="gift-card__desc">${esc(participationGift.description)}</p>
      </div>
    </div>
  </div>
</section>`;
}
