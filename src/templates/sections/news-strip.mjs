import { news } from "../../data/news.mjs";
import { esc } from "../../lib/render.mjs";

function formatDate(iso) {
  const [y, m, d] = iso.split("-");
  return `${y}.${m}.${d}`;
}

export function renderNewsStrip() {
  const latest = [...news]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 3);

  if (latest.length === 0) return "";

  return `
<section class="news-strip" id="news" aria-label="最新のお知らせ">
  <div class="container news-strip__inner reveal" data-reveal>
    <p class="news-strip__label">NEWS</p>
    <ul class="news-strip__list">
      ${latest
        .map(
          (n) => `
      <li class="news-strip__item">
        <span class="news-strip__date">${esc(formatDate(n.date))}</span>
        <span class="news-strip__category">${esc(n.category)}</span>
        <span class="news-strip__title">${esc(n.title)}</span>
      </li>`
        )
        .join("")}
    </ul>
    <a href="/news/" class="news-strip__more">お知らせ一覧を見る &rarr;</a>
  </div>
</section>`;
}
