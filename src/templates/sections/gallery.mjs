import { currentTournamentGallery } from "../../data/gallery.mjs";
import { esc } from "../../lib/render.mjs";

export function renderGallery() {
  const hasPhotos = currentTournamentGallery.length > 0;

  return `
<section class="section section--alt" id="gallery">
  <div class="container">
    <p class="eyebrow reveal" data-reveal>GALLERY</p>
    <h2 class="h2 reveal" data-reveal data-reveal-delay="1">ギャラリー</h2>

    ${
      hasPhotos
        ? `
    <ul class="masonry reveal" data-reveal data-reveal-delay="2" data-lightbox-group="current">
      ${currentTournamentGallery
        .map(
          (img, i) => `
      <li class="masonry__item">
        <button type="button" class="masonry__trigger" data-lightbox-trigger data-lightbox-index="${i}">
          <img src="${esc(img.src)}" alt="${esc(img.alt)}" loading="lazy" decoding="async" width="600" height="450" />
        </button>
      </li>`
        )
        .join("")}
    </ul>`
        : `
    <div class="gallery-empty reveal" data-reveal data-reveal-delay="2">
      <p class="gallery-empty__rule" aria-hidden="true"></p>
      <p class="gallery-empty__title">大会終了後、オフィシャルフォトを公開予定</p>
      <p class="gallery-empty__desc">大会当日はカメラマンによる撮影を予定しています。終了後、随時こちらのギャラリーに公開いたします。</p>
    </div>`
    }
  </div>
</section>`;
}
