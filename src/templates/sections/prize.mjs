import { proFormat, proPrizes, proWinnerAmountLabel, amateurFormat, amateurPrizes, participationGift } from "../../data/prizes.mjs";
import { esc } from "../../lib/render.mjs";
import { laurelIcon } from "../../lib/icons.mjs";

function prizeRow(p) {
  return `
      <li class="prize-row ${p.featured ? "prize-row--featured" : ""}">
        <span class="prize-row__rank">${esc(p.rank)}位</span>
        <span class="prize-row__amount">${esc(p.label)}</span>
      </li>`;
}

export function renderPrize() {
  return `
<section class="section section--prize" id="prize">
  <div class="container">
    <p class="eyebrow reveal" data-reveal>PRIZE</p>
    <h2 class="h2 reveal" data-reveal data-reveal-delay="1">賞金・賞品</h2>

    <div class="prize-cards">
      <div class="prize-card prize-card--pro reveal" data-reveal data-reveal-delay="2">
        <p class="prize-card__title">PRIZE</p>
        <p class="prize-card__subtitle">賞金・賞品</p>
        <span class="prize-card__badge">${esc(proFormat.title)}（${esc(proFormat.competition)}）</span>
        <div class="prize-card__hero">
          ${laurelIcon("prize-card__laurel")}
          <span class="prize-card__hero-text">
            <span class="prize-card__hero-label">優勝賞金</span>
            <span class="prize-card__hero-amount">${esc(proWinnerAmountLabel)}</span>
          </span>
        </div>
        <details class="prize-card__details">
          <summary>全順位の賞金を見る</summary>
          <ul class="prize-list">${proPrizes.map(prizeRow).join("")}</ul>
        </details>
      </div>

      <div class="prize-card prize-card--amateur reveal" data-reveal data-reveal-delay="3">
        <p class="prize-card__title prize-card__title--rose">AMATEUR PRIZE</p>
        <p class="prize-card__subtitle">アマチュア入賞</p>
        <span class="prize-card__badge prize-card__badge--green">${esc(amateurFormat.title)}（${esc(amateurFormat.competition)}）</span>
        <p class="prize-card__voucher">入賞は現金ではなく金券</p>
        <ul class="prize-list prize-list--compact">${amateurPrizes.map(prizeRow).join("")}</ul>
        <p class="prize-card__note">${esc(amateurFormat.teamNote)}</p>
      </div>

      <div class="prize-card prize-card--gift reveal" data-reveal data-reveal-delay="4">
        <p class="prize-card__title prize-card__title--gold">SPECIAL GIFT</p>
        <p class="prize-card__subtitle">参加者特典</p>
        <div class="prize-card__gift-media">
          <img src="${esc(participationGift.photo || "/images/placeholders/gift.svg")}" alt="参加賞：${esc(participationGift.name)}（差し替え予定）" loading="lazy" decoding="async" width="320" height="320" />
        </div>
        <p class="prize-card__gift-name">${esc(participationGift.name)}</p>
        <p class="prize-card__gift-desc">${esc(participationGift.description)}</p>
      </div>
    </div>
  </div>
</section>`;
}
