// 出場プロ カード → 詳細モーダル
export function initPlayerModal() {
  const modal = document.querySelector("[data-player-modal]");
  const contentEl = document.querySelector("[data-player-modal-content]");
  const dataScript = document.getElementById("players-data");
  if (!modal || !contentEl || !dataScript) return;

  let players = [];
  try {
    players = JSON.parse(dataScript.textContent);
  } catch {
    players = [];
  }
  const byId = new Map(players.map((p) => [p.id, p]));

  document.querySelectorAll("[data-player-trigger]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const player = byId.get(btn.getAttribute("data-player-id"));
      if (!player) return;
      contentEl.innerHTML = renderPlayerDetail(player);
      modal.showModal();
    });
  });

  modal.addEventListener("click", (e) => {
    const rect = modal.getBoundingClientRect();
    const inDialog =
      rect.top <= e.clientY && e.clientY <= rect.top + rect.height && rect.left <= e.clientX && e.clientX <= rect.left + rect.width;
    if (!inDialog) modal.close();
  });
}

function esc(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function renderPlayerDetail(p) {
  return `
    <img class="player-modal__photo" src="${esc(p.photo)}" alt="PRO_PLAYER_IMAGE — ${esc(p.name)}" loading="lazy" />
    <div class="player-modal__body">
      <p class="player-modal__name" id="player-modal-name">${esc(p.name)}</p>
      ${p.nameKana ? `<p class="player-modal__kana">${esc(p.nameKana)}</p>` : ""}
      ${p.affiliation ? `<span class="player-modal__affiliation">${esc(p.affiliation)}</span>` : ""}
      ${p.profile ? `<p class="player-modal__profile">${esc(p.profile)}</p>` : ""}
      ${
        p.achievements && p.achievements.length
          ? `<ul class="player-modal__achievements">${p.achievements.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>`
          : ""
      }
      ${
        p.instagram
          ? `<a class="player-modal__sns" href="${esc(p.instagram)}" target="_blank" rel="noopener noreferrer">Instagram を見る</a>`
          : ""
      }
    </div>`;
}
