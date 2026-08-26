import { renderDocument } from "../layout.mjs";

export function renderNotFound() {
  return renderDocument({
    title: "ページが見つかりません",
    description: "お探しのページは見つかりませんでした。",
    path: "/404",
    content: `
<section class="section section--narrow container" style="padding-top:8rem;padding-bottom:8rem;text-align:center;">
  <p class="eyebrow">404</p>
  <h1 class="h1">ページが見つかりません</h1>
  <p class="lead">お探しのページは移動または削除された可能性があります。</p>
  <a href="/" class="btn btn--primary">トップページへ戻る</a>
</section>`,
  });
}
