import { specialMc } from "../../data/mc.mjs";
import { esc } from "../../lib/render.mjs";

export function renderSpecialMc() {
  return `
<section class="section section--mc" id="mc">
  <div class="container section--narrow">
    <div class="mc__card">
      <figure class="mc__photo reveal" data-reveal>
        <img src="${esc(specialMc.photo || "/images/placeholders/mc.svg")}" alt="SPECIAL_MC_IMAGE — ${esc(specialMc.name)}" loading="lazy" decoding="async" width="1254" height="1254" />
        <figcaption class="mc__badge">${esc(specialMc.roleJa)}</figcaption>
      </figure>

      <div class="mc__copy">
        <p class="eyebrow reveal" data-reveal>SPECIAL MC</p>
        <h3 class="h3 reveal" data-reveal data-reveal-delay="1">${esc(specialMc.name)}</h3>
        <div class="mc__bio reveal" data-reveal data-reveal-delay="2">
          ${specialMc.bio.map((line) => `<p>${esc(line)}</p>`).join("")}
        </div>
      </div>
    </div>
  </div>
</section>`;
}
