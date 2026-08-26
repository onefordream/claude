import { site } from "../../data/site.mjs";
import { esc } from "../../lib/render.mjs";

export function renderAccess() {
  return `
<section class="section section--alt" id="access">
  <div class="container access__grid">
    <div class="access__copy reveal" data-reveal>
      <p class="eyebrow">ACCESS</p>
      <h2 class="h2">アクセス</h2>

      <dl class="access__facts">
        <div><dt>会場</dt><dd>${esc(site.venue.name)}</dd></div>
        <div><dt>住所</dt><dd>${site.venue.address ? esc(site.venue.address) : esc(site.venue.addressNote)}</dd></div>
      </dl>

      ${
        site.venue.mapUrl
          ? `<a href="${esc(site.venue.mapUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn--secondary">Google Mapsで見る</a>`
          : `<p class="access__map-pending">Google Mapsへのリンクは確定次第掲載いたします。</p>`
      }

      <p class="access__note">正確な所在地・車でのアクセス情報は確認の上、追ってこちらに掲載いたします。</p>
    </div>

    <figure class="access__photo reveal" data-reveal data-reveal-delay="1">
      <img src="/images/placeholders/venue.svg" alt="VENUE_IMAGE — ${esc(site.venue.name)}（差し替え予定）" loading="lazy" decoding="async" width="640" height="480" />
    </figure>
  </div>
</section>`;
}
