import { site } from "../../data/site.mjs";
import { esc } from "../../lib/render.mjs";

function capacityBadge(category, label, cap) {
  const text = cap.full ? "定員に達しました｜キャンセル待ち受付中" : `残り${cap.remaining}名`;
  return `
      <div class="capacity-badge ${cap.full ? "capacity-badge--full" : ""}" data-capacity="${category}">
        <span class="capacity-badge__label">${esc(label)}</span>
        <span class="capacity-badge__value" data-capacity-text>${esc(text)}</span>
      </div>`;
}

export function renderEntry({ capacity }) {
  const { pro, amateur, deadlinePassed } = capacity;

  return `
<section class="section section--entry" id="entry">
  <div class="container">
    <p class="eyebrow reveal" data-reveal>ENTRY</p>
    <h2 class="h2 reveal" data-reveal data-reveal-delay="1">エントリー</h2>
    <p class="lead reveal" data-reveal data-reveal-delay="2">
      申込締切：${esc(site.entry.deadlineLabelJa)}／${esc(site.entry.note)}
    </p>

    <div class="capacity-badges reveal" data-reveal data-reveal-delay="3" data-capacity-root>
      ${capacityBadge("pro", "プロ", pro)}
      ${capacityBadge("amateur", "アマチュア", amateur)}
    </div>

    <div class="entry-panel reveal" data-reveal data-reveal-delay="4">
      <div class="entry-tabs" role="tablist" aria-label="参加区分の選択" data-category-tabs>
        <button type="button" class="entry-tab is-active" role="tab" aria-selected="true" data-category-tab="amateur">アマチュア</button>
        <button type="button" class="entry-tab" role="tab" aria-selected="false" data-category-tab="pro">プロ</button>
      </div>

      <form id="entry-form" class="entry-form" data-entry-form novalidate data-deadline-passed="${deadlinePassed}">
        <input type="hidden" name="category" value="amateur" data-category-input />

        <div class="form-row">
          <label for="entry-name">氏名<span class="req">必須</span></label>
          <input id="entry-name" name="name" type="text" autocomplete="name" required maxlength="100" />
          <p class="field-error" data-error-for="name"></p>
        </div>

        <div class="form-row">
          <label for="entry-kana">フリガナ<span class="req">必須</span></label>
          <input id="entry-kana" name="kana" type="text" autocomplete="off" required maxlength="100" />
          <p class="field-error" data-error-for="kana"></p>
        </div>

        <div class="form-row">
          <label for="entry-email">メールアドレス<span class="req">必須</span></label>
          <input id="entry-email" name="email" type="email" autocomplete="email" required maxlength="200" />
          <p class="field-error" data-error-for="email"></p>
        </div>

        <div class="form-row">
          <label for="entry-phone">電話番号<span class="req">必須</span></label>
          <input id="entry-phone" name="phone" type="tel" autocomplete="tel" required maxlength="20" placeholder="090-1234-5678" />
          <p class="field-error" data-error-for="phone"></p>
        </div>

        <div class="form-row">
          <label for="entry-companion">同伴希望・その他ご要望</label>
          <textarea id="entry-companion" name="companion" rows="3" maxlength="500" placeholder="同伴を希望される方のお名前や、その他ご要望をご記入ください（1名でのご参加も可能です）"></textarea>
        </div>

        <div class="entry-fee" data-fee-block>
          <p class="entry-fee__title">参加料金：${esc(site.amateurFee.amountLabel)}／${esc(site.amateurFee.unit)}</p>
          <ul class="entry-fee__list">
            ${site.amateurFee.includes.map((i) => `<li>${esc(i)}</li>`).join("")}
          </ul>
          <p class="entry-fee__payment">${esc(site.amateurFee.payment)}</p>
        </div>

        <details class="cancel-policy">
          <summary>キャンセル規定を確認する</summary>
          <table class="cancel-policy__table">
            <thead><tr><th>タイミング</th><th>キャンセル料</th></tr></thead>
            <tbody>
              ${site.cancelPolicy
                .map((c) => `<tr><td>${esc(c.period)}</td><td>${esc(c.rate)}</td></tr>`)
                .join("")}
            </tbody>
          </table>
          <p class="cancel-policy__link"><a href="/rules/">競技規則・大会規約はこちら</a></p>
        </details>

        <div class="form-row form-row--checkbox">
          <input id="entry-agree" name="agreed" type="checkbox" required />
          <label for="entry-agree">キャンセル規定および大会規約に同意します<span class="req">必須</span></label>
          <p class="field-error" data-error-for="agreed"></p>
        </div>

        <button type="submit" class="btn btn--primary btn--block btn--lg" data-submit-btn>
          <span data-btn-label>エントリーを送信する</span>
        </button>
        <p class="form-status" role="status" aria-live="polite" data-form-status></p>
      </form>

      <div class="entry-result" data-entry-result hidden tabindex="-1"></div>
    </div>
  </div>
</section>`;
}
