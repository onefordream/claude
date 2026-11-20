const selectAll = document.getElementById("select-all");
if (selectAll) {
  selectAll.addEventListener("change", (e) => {
    document.querySelectorAll('input[name="ids"]').forEach((cb) => {
      const row = cb.closest("tr");
      if (row && row.hidden) return; // 検索で絞り込み中は非表示の行を対象外にする
      cb.checked = e.target.checked;
    });
  });
}

document.querySelectorAll("[data-select]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const mode = btn.getAttribute("data-select");
    document.querySelectorAll('input[name="ids"]').forEach((cb) => {
      const row = cb.closest("tr");
      if (row && row.hidden) return; // 検索で絞り込み中は非表示の行を対象外にする
      if (mode === "all") cb.checked = true;
      else if (mode === "none") cb.checked = false;
      else cb.checked = cb.getAttribute("data-category") === mode;
    });
    if (selectAll) selectAll.checked = mode === "all";
  });
});

const searchInput = document.getElementById("entry-search");
const searchCount = document.getElementById("entry-search-count");
if (searchInput) {
  const rows = document.querySelectorAll("table tbody tr");
  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim().toLowerCase();
    let visible = 0;
    rows.forEach((row) => {
      const match = !q || row.textContent.toLowerCase().includes(q);
      row.hidden = !match;
      if (match) visible += 1;
    });
    if (searchCount) searchCount.textContent = q ? `${visible}件 / 全${rows.length}件` : "";
  });
}
