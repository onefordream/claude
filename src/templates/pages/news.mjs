import { renderDocument } from "../layout.mjs";
import { site } from "../../data/site.mjs";
import { news } from "../../data/news.mjs";
import { esc } from "../../lib/render.mjs";

function formatDate(iso) {
  const [y, m, d] = iso.split("-");
  return `${y}.${m}.${d}`;
}

export function renderNews() {
  const sorted = [...news].sort((a, b) => (a.date < b.date ? 1 : -1));

  const content = `
<section class="section section--news-list">
  <div class="container section--narrow">
    <p class="eyebrow reveal" data-reveal>NEWS</p>
    <h1 class="h1 reveal" data-reveal data-reveal-delay="1">お知らせ</h1>

    <ul class="news-list reveal" data-reveal data-reveal-delay="2">
      ${sorted
        .map(
          (n) => `
      <li class="news-list__item">
        <div class="news-list__meta">
          <span class="news-list__date">${esc(formatDate(n.date))}</span>
          <span class="news-list__category">${esc(n.category)}</span>
        </div>
        <p class="news-list__title">${esc(n.title)}</p>
        ${n.body ? `<p class="news-list__body">${esc(n.body)}</p>` : ""}
      </li>`
        )
        .join("")}
    </ul>

    <a href="/" class="btn btn--secondary">トップページへ戻る</a>
  </div>
</section>`;

  return renderDocument({
    title: `NEWS｜${site.nameJa}`,
    description: `${site.nameJa}の最新のお知らせ一覧。`,
    path: "/news/",
    bodyClass: "page-news",
    content,
  });
}
