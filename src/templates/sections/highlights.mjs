import { site } from "../../data/site.mjs";
import { esc } from "../../lib/render.mjs";

const HIGHLIGHTS = [
  { num: site.capacity.pro, suffix: "", label: "PRO GOLFERS", labelJa: "女子プロ40名" },
  { num: site.capacity.amateur, suffix: "", label: "AMATEURS", labelJa: "アマチュア120名" },
  { num: site.capacity.total, suffix: "", label: "PLAYERS", labelJa: "総勢160名" },
];

export function renderHighlights() {
  return `
<section class="section--highlights" id="highlights">
  <div class="highlights-band">
    <div class="highlights__grid">
      ${HIGHLIGHTS.map(
        (h, i) => `
      <div class="highlight-card reveal" data-reveal data-reveal-delay="${i + 1}">
        <p class="highlight-card__num">
          <span data-countup data-countup-to="${h.num}">0</span>${esc(h.suffix)}
        </p>
        <p class="highlight-card__label">${esc(h.label)}</p>
        <p class="highlight-card__labelja">${esc(h.labelJa)}</p>
      </div>`
      ).join("")}
    </div>
  </div>

  <p class="highlights__note">${esc(site.capacity.groupFormula)}／${esc(site.capacity.flightsPlanned)}組予定</p>
</section>`;
}
