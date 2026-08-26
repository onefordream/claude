import { players, playerCapacity } from "../../data/players.mjs";
import { esc } from "../../lib/render.mjs";

function playerCard(p) {
  if (p.status === "comingSoon") {
    return `
    <li class="player-card player-card--soon" role="listitem">
      <div class="player-card__photo player-card__photo--soon" aria-hidden="true">
        <span>COMING<br />SOON</span>
      </div>
      <p class="player-card__name player-card__name--soon">発表をお待ちください</p>
    </li>`;
  }

  return `
    <li class="player-card" role="listitem">
      <button type="button" class="player-card__trigger" data-player-trigger data-player-id="${esc(p.id)}" aria-haspopup="dialog">
        <span class="player-card__photo">
          <img src="${esc(p.photo || "/images/placeholders/player.svg")}" alt="PRO_PLAYER_IMAGE — ${esc(p.name)}" loading="lazy" decoding="async" width="400" height="500" />
        </span>
        <span class="player-card__body">
          <span class="player-card__name">${esc(p.name)}</span>
          ${p.affiliation ? `<span class="player-card__affiliation">${esc(p.affiliation)}</span>` : ""}
          <span class="player-card__more">詳細を見る</span>
        </span>
      </button>
    </li>`;
}

export function renderPlayers() {
  const announced = players.filter((p) => p.status === "announced").length;

  return `
<section class="section section--players" id="players">
  <div class="container">
    <p class="eyebrow eyebrow--light reveal" data-reveal>PLAYERS</p>
    <h2 class="h2 h2--light reveal" data-reveal data-reveal-delay="1">出場プロ</h2>
    <p class="lead lead--light reveal" data-reveal data-reveal-delay="2">女子プロ${esc(playerCapacity)}名が集結。（発表済み ${announced}名）</p>
  </div>

  <div class="player-slider reveal" data-reveal data-reveal-delay="3">
    <ul class="player-slider__track" data-player-track role="list">
      ${players.map((p) => playerCard(p)).join("")}
    </ul>
  </div>

  <div class="container player-slider__controls">
    <button type="button" class="player-slider__arrow" data-player-prev aria-label="前の選手を見る">&#8249;</button>
    <button type="button" class="player-slider__arrow" data-player-next aria-label="次の選手を見る">&#8250;</button>
  </div>

  <dialog class="player-modal" id="player-modal" data-player-modal aria-labelledby="player-modal-name">
    <form method="dialog" class="player-modal__close-form">
      <button type="submit" class="player-modal__close" aria-label="閉じる">&times;</button>
    </form>
    <div class="player-modal__content" data-player-modal-content></div>
  </dialog>

  <script type="application/json" id="players-data">${JSON.stringify(
    players
      .filter((p) => p.status === "announced")
      .map((p) => ({
        id: p.id,
        name: p.name,
        nameKana: p.nameKana || "",
        affiliation: p.affiliation || "",
        instagram: p.instagram || "",
        profile: p.profile || "",
        achievements: p.achievements || [],
        photo: p.photo || "/images/placeholders/player.svg",
      }))
  )}</script>
</section>`;
}
