import { faq } from "../../data/faq.mjs";
import { esc } from "../../lib/render.mjs";

export function renderFaq() {
  return `
<section class="section" id="faq">
  <div class="container section--narrow">
    <p class="eyebrow reveal" data-reveal>FAQ</p>
    <h2 class="h2 reveal" data-reveal data-reveal-delay="1">よくある質問</h2>

    <div class="faq-list reveal" data-reveal data-reveal-delay="2">
      ${faq
        .map(
          (item, i) => `
      <details class="faq-item" ${i === 0 ? "open" : ""}>
        <summary class="faq-item__q"><span>Q</span>${esc(item.q)}</summary>
        <div class="faq-item__a"><span>A</span><p>${esc(item.a)}</p></div>
      </details>`
        )
        .join("")}
    </div>
  </div>
</section>`;
}
