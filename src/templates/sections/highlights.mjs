import { site } from "../../data/site.mjs";
import { esc } from "../../lib/render.mjs";

const HIGHLIGHTS = [
  { num: site.capacity.pro, suffix: "", label: "PRO GOLFERS", labelJa: "女子プロ40名" },
  { num: site.capacity.amateur, suffix: "", label: "AMATEURS", labelJa: "アマチュア120名" },
  { num: site.capacity.total, suffix: "", label: "PLAYERS", labelJa: "総勢160名" },
  { num: 18, suffix: "", label: "HOLES", labelJa: "女子プロと夢の18ホール" },
];

export function renderHighlights() {
  return `
<section class="section section--highlights" id="highlights">
  <div class="container">
    <p class="eyebrow eyebrow--light reveal" data-reveal>EVENT HIGHLIGHTS</p>
    <h2 class="h2 h2--light reveal" data-reveal data-reveal-delay="1">大会の規模</h2>

    <div class="highlights__grid">
      ${HIGHLIGHTS.map(
        (h, i) => `
      <div class="highlight-card reveal" data-reveal data-reveal-delay="${i + 2}">
        <p class="highlight-card__num">
          <span data-countup data-countup-to="${h.num}">0</span>${esc(h.suffix)}
        </p>
        <p class="highlight-card__label">${esc(h.label)}</p>
        <p class="highlight-card__labelja">${esc(h.labelJa)}</p>
      </div>`
      ).join("")}
    </div>

    <p class="highlights__note reveal" data-reveal data-reveal-delay="6">${esc(site.capacity.groupFormula)}／${esc(site.capacity.flightsPlanned)}組予定</p>
  </div>
</section>`;
}
