// 出場プロ一覧モーダルの開閉制御
export function initPlayerRoster() {
  const modal = document.querySelector("[data-roster-modal]");
  const openBtns = document.querySelectorAll("[data-roster-open]");
  if (!modal || !openBtns.length) return;

  openBtns.forEach((btn) => {
    btn.addEventListener("click", () => modal.showModal());
  });

  modal.addEventListener("click", (e) => {
    const rect = modal.getBoundingClientRect();
    const inDialog =
      rect.top <= e.clientY && e.clientY <= rect.top + rect.height && rect.left <= e.clientX && e.clientX <= rect.left + rect.width;
    if (!inDialog) modal.close();
  });
}
