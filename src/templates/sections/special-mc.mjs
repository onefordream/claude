import { specialMc } from "../../data/mc.mjs";
import { esc } from "../../lib/render.mjs";

// MC_BANNER: 名前・肩書き・紹介文が文字入りで書き出された完成済みビジュアルを
// そのまま使用する。差し替える場合は /public/images/mc/special-mc-banner.webp
// を同じ比率の新しい画像で上書きするだけでよい（テンプレート側の変更は不要）。
const MC_BANNER = {
  src: "/images/mc/special-mc-banner.webp",
  width: 1536,
  height: 1024,
  alt: `スペシャルMC ${specialMc.name}（SHADOW IWAHASHI）。${specialMc.bio.join("")}`,
};

export function renderSpecialMc() {
  return `
<section class="section--mc" id="mc" aria-label="スペシャルMC">
  <h2 class="sr-only">スペシャルMC：${esc(specialMc.name)}</h2>
  <figure class="mc__banner reveal" data-reveal>
    <img src="${esc(MC_BANNER.src)}" alt="${esc(MC_BANNER.alt)}" width="${MC_BANNER.width}" height="${MC_BANNER.height}" loading="lazy" decoding="async" />
  </figure>
</section>`;
}
