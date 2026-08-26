import { site } from "../../data/site.mjs";
import { esc } from "../../lib/render.mjs";

const TYPES = ["大会について", "エントリーについて", "スポンサー・協賛について", "その他"];

export function renderContact() {
  return `
<section class="section" id="contact">
  <div class="container contact__grid">
    <div class="contact__intro reveal" data-reveal>
      <p class="eyebrow">CONTACT</p>
      <h2 class="h2">お問い合わせ</h2>
      <p class="lead">大会に関するご質問・エントリーやスポンサーに関するお問い合わせは、お電話またはフォームよりお気軽にご連絡ください。</p>
      <a href="${esc(site.contact.phoneHref)}" class="contact__phone">
        <span class="contact__phone-label">電話でのお問い合わせ</span>
        <span class="contact__phone-num">${esc(site.contact.phone)}</span>
      </a>
    </div>

    <form id="contact-form" class="contact-form reveal" data-reveal data-reveal-delay="1" data-contact-form novalidate>
      <div class="form-row">
        <label for="contact-type">お問い合わせ種別<span class="req">必須</span></label>
        <select id="contact-type" name="type" data-contact-type required>
          ${TYPES.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join("")}
        </select>
      </div>

      <div class="form-row">
        <label for="contact-name">氏名<span class="req">必須</span></label>
        <input id="contact-name" name="name" type="text" autocomplete="name" required maxlength="100" />
        <p class="field-error" data-error-for="name"></p>
      </div>

      <div class="form-row">
        <label for="contact-email">メールアドレス<span class="req">必須</span></label>
        <input id="contact-email" name="email" type="email" autocomplete="email" required maxlength="200" />
        <p class="field-error" data-error-for="email"></p>
      </div>

      <div class="form-row">
        <label for="contact-phone">電話番号</label>
        <input id="contact-phone" name="phone" type="tel" autocomplete="tel" maxlength="20" />
      </div>

      <div class="form-row">
        <label for="contact-message">お問い合わせ内容<span class="req">必須</span></label>
        <textarea id="contact-message" name="message" rows="5" required maxlength="2000"></textarea>
        <p class="field-error" data-error-for="message"></p>
      </div>

      <button type="submit" class="btn btn--primary btn--block" data-submit-btn>
        <span data-btn-label>送信する</span>
      </button>
      <p class="form-status" role="status" aria-live="polite" data-form-status></p>
    </form>
  </div>
</section>`;
}
