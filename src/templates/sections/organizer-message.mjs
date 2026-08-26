import { organizerMessage } from "../../data/organizer.mjs";
import { esc } from "../../lib/render.mjs";

export function renderOrganizerMessage() {
  return `
<section class="section section--organizer" id="organizer">
  <div class="container organizer__grid">
    <figure class="organizer__photo reveal" data-reveal>
      <img src="${esc(organizerMessage.photo || "/images/placeholders/organizer.svg")}" alt="ORGANIZER_IMAGE — ${esc(organizerMessage.name)}" loading="lazy" decoding="async" width="480" height="480" />
    </figure>
    <div class="organizer__copy reveal" data-reveal data-reveal-delay="1">
      <p class="eyebrow">MESSAGE</p>
      <h2 class="h2">主催者メッセージ</h2>
      <div class="organizer__body">
        ${organizerMessage.message.map((line) => `<p>${esc(line)}</p>`).join("")}
      </div>
      <p class="organizer__sign">${esc(organizerMessage.company)}　${esc(organizerMessage.title)}　${esc(organizerMessage.name)}</p>
    </div>
  </div>
</section>`;
}
