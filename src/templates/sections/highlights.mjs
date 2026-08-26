import { site } from "../../data/site.mjs";
import { esc } from "../../lib/render.mjs";

const HIGHLIGHTS = [
  { num: site.capacity.pro, suffix: "", label: "PRO GOLFERS", labelJa: "女子プロ40名" },
  { num: site.capacity.amateur, suffix: "", label: "AMATEURS", labelJa: "アマチュア120名" },
  { num: site.capacity.total, suffix: "", label: "PLAYERS", labelJa: "総勢160名" },
  { num: 18, suffix: "", label: "HOLES", labelJa: "女子プロと夢の18ホール" },
];

const ARROW_ICON = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M8 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

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

    <a href="#entry" class="highlights__entry reveal" data-reveal data-reveal-delay="5">
      <span class="highlights__entry-label">ENTRY${ARROW_ICON}</span>
      <span class="highlights__entry-sub">エントリーはこちら</span>
    </a>
  </div>

  <p class="highlights__note">${esc(site.capacity.groupFormula)}／${esc(site.capacity.flightsPlanned)}組予定</p>
</section>`;
}
