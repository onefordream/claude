import { site } from "../../data/site.mjs";
import { esc } from "../../lib/render.mjs";

export function renderAbout() {
  return `
<section class="section section--about" id="about">
  <div class="container about__grid">
    <div class="about__copy">
      <p class="about__watermark" aria-hidden="true">About</p>
      <p class="eyebrow reveal" data-reveal>ABOUT</p>
      <h2 class="h2 reveal" data-reveal data-reveal-delay="1">${esc(site.tagline)}</h2>
      <p class="lead reveal" data-reveal data-reveal-delay="2">
        女子プロとアマチュアが同じ組を回り、ともに18ホールを楽しむ特別なプロアマトーナメント。
        競技としての緊張感だけでなく、女子プロとの交流やゴルフそのものの楽しさ、
        非日常のエンターテインメント体験をお届けします。
      </p>
      <p class="body reveal" data-reveal data-reveal-delay="3">
        初心者から上級者まで、ゴルフ経験を問わずご参加いただけます。
        「本格的な大会」と「特別な一日」——その両方を叶える舞台です。
      </p>
      <a href="#info" class="btn btn--ghost reveal" data-reveal data-reveal-delay="4">詳しく見る</a>
    </div>

    <div class="about__media" data-reveal data-reveal-delay="2" data-parallax data-parallax-speed="0.05">
      <figure class="about__photo about__photo--main about__photo--wide">
        <img src="/images/about/about-1.jpg" alt="第1回大会に参加した女子プロ・アマチュア・スタッフの集合写真" loading="lazy" decoding="async" width="1567" height="1045" />
      </figure>
      <figure class="about__photo about__photo--accent">
        <img src="/images/placeholders/about-3.svg" alt="VENUE_IMAGE（差し替え予定）" loading="lazy" decoding="async" width="280" height="280" />
      </figure>
    </div>
  </div>
</section>`;
}
