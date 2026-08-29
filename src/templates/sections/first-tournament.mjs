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

    <div class="first-video reveal" data-reveal data-reveal-delay="3">
      <p class="first-video__label">第1回大会の試合の様子</p>
      <div class="first-video__frame">
        <iframe
          src="https://www.youtube-nocookie.com/embed/tV_6rk86sVo"
          title="SHADOW LADIES PRO-AM TOURNAMENT 第1回大会の様子"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
      </div>
    </div>

    <ul class="masonry reveal" data-reveal data-reveal-delay="4" data-lightbox-group="first">
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
