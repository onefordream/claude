import { firstTournamentGallery, firstTournamentFacts } from "../../data/gallery.mjs";
import { esc } from "../../lib/render.mjs";

const STATS = (f) => [
  { label: "開催日", value: f.dateLabel },
  { label: "会場", value: f.venue },
  { label: "女子プロ", value: `${f.pro}名` },
  { label: "アマチュア", value: `${f.amateur}名` },
  { label: "総勢", value: `${f.total}名` },
];

export function renderFirstTournament() {
  return `
<section class="section" id="first">
  <div class="container">
    <p class="eyebrow reveal" data-reveal>1st TOURNAMENT</p>
    <h2 class="h2 reveal" data-reveal data-reveal-delay="1">第1回大会</h2>

    <dl class="first-stats reveal" data-reveal data-reveal-delay="2">
      ${STATS(firstTournamentFacts)
        .map((s) => `<div class="first-stats__item"><dt>${esc(s.label)}</dt><dd>${esc(s.value)}</dd></div>`)
        .join("")}
    </dl>

    <ul class="masonry reveal" data-reveal data-reveal-delay="3" data-lightbox-group="first">
      ${firstTournamentGallery
        .map(
          (img, i) => `
      <li class="masonry__item">
        <button type="button" class="masonry__trigger" data-lightbox-trigger data-lightbox-index="${i}">
          <img src="${esc(img.src)}" alt="${esc(img.alt)}" loading="lazy" decoding="async" width="${img.width}" height="${img.height}" />
        </button>
      </li>`
        )
        .join("")}
    </ul>
  </div>
</section>`;
}
