import { specialMc } from "../../data/mc.mjs";
import { esc } from "../../lib/render.mjs";

export function renderSpecialMc() {
  return `
<section class="section section--mc" id="mc">
  <div class="container mc__grid">
    <figure class="mc__photo reveal" data-reveal>
      <img src="${esc(specialMc.photo || "/images/placeholders/mc.svg")}" alt="SPECIAL_MC_IMAGE — ${esc(specialMc.name)}" loading="lazy" decoding="async" width="640" height="800" />
      <figcaption class="mc__badge">${esc(specialMc.roleJa)}</figcaption>
    </figure>

    <div class="mc__copy">
      <p class="eyebrow reveal" data-reveal>SPECIAL MC</p>
      <h2 class="h2 reveal" data-reveal data-reveal-delay="1">${esc(specialMc.name)}</h2>
      <div class="mc__bio reveal" data-reveal data-reveal-delay="2">
        ${specialMc.bio.map((line) => `<p>${esc(line)}</p>`).join("")}
      </div>
    </div>
  </div>
</section>`;
}
