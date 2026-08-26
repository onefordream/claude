import { renderDocument } from "../layout.mjs";
import { site } from "../../data/site.mjs";
import { governingRules, localRulesNote, ruleSections, rulesUpdatedAt } from "../../data/rules.mjs";
import { esc } from "../../lib/render.mjs";

export function renderRules() {
  const content = `
<section class="section section--rules">
  <div class="container section--narrow">
    <p class="eyebrow reveal" data-reveal>RULES</p>
    <h1 class="h1 reveal" data-reveal data-reveal-delay="1">競技規則</h1>
    <p class="lead reveal" data-reveal data-reveal-delay="2">${esc(site.nameJa)}</p>

    <div class="rules-governing reveal" data-reveal data-reveal-delay="3">
      <p class="rules-governing__title">適用規則</p>
      <ul>
        ${governingRules.map((r) => `<li>${esc(r)}</li>`).join("")}
      </ul>
      <p class="rules-governing__note">${esc(localRulesNote)}</p>
    </div>

    <div class="rules-sections">
      ${ruleSections
        .map(
          (s, i) => `
      <article class="rules-section reveal" data-reveal data-reveal-delay="${(i % 4) + 1}" id="rule-${esc(s.id)}">
        <h2 class="h3">${esc(s.title)}</h2>
        <ul>
          ${s.body.map((line) => `<li>${esc(line)}</li>`).join("")}
        </ul>
      </article>`
        )
        .join("")}
    </div>

    <p class="rules-updated">最終更新日：${esc(rulesUpdatedAt)}</p>
    <a href="/#entry" class="btn btn--primary">エントリーへ戻る</a>
  </div>
</section>`;

  return renderDocument({
    title: `競技規則｜${site.nameJa}`,
    description: `${site.nameJa}の競技規則・大会規約。`,
    path: "/rules/",
    bodyClass: "page-rules",
    content,
  });
}
