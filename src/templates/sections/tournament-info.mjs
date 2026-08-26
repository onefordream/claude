import { site } from "../../data/site.mjs";
import { esc } from "../../lib/render.mjs";

const ROWS = [
  ["大会名", site.nameJa],
  ["開催日", site.eventDateLabelJa],
  ["会場", site.venue.name],
  ["主催", site.organizer.name],
  ["参加規模", `女子プロ${site.capacity.pro}名／アマチュア${site.capacity.amateur}名／総勢${site.capacity.total}名`],
  ["組み合わせ", site.capacity.groupFormula],
  ["アマチュア参加料金", `${site.amateurFee.amount.toLocaleString()}円（${site.amateurFee.includes.join("・")}を含む）`],
  ["お支払い", site.amateurFee.payment],
  ["ドレスコード", site.dressCode],
  ["エントリー締切", `${site.entry.deadlineLabelJa}（定員になり次第、通常エントリー終了）`],
];

export function renderTournamentInfo() {
  return `
<section class="section section--alt" id="info">
  <div class="container">
    <p class="eyebrow reveal" data-reveal>TOURNAMENT INFO</p>
    <h2 class="h2 reveal" data-reveal data-reveal-delay="1">大会概要</h2>

    <div class="info-table reveal" data-reveal data-reveal-delay="2">
      ${ROWS.map(
        ([label, value]) => `
      <div class="info-table__row">
        <dt>${esc(label)}</dt>
        <dd>${esc(value)}</dd>
      </div>`
      ).join("")}
    </div>

    <div class="info-links reveal" data-reveal data-reveal-delay="3">
      <a href="/rules/" class="btn btn--secondary">競技規則を見る</a>
      <a href="#faq" class="btn btn--ghost">キャンセル規定について</a>
    </div>
  </div>
</section>`;
}
