const selectAll = document.getElementById("select-all");
if (selectAll) {
  selectAll.addEventListener("change", (e) => {
    document.querySelectorAll('input[name="ids"]').forEach((cb) => { cb.checked = e.target.checked; });
  });
}

document.querySelectorAll("[data-select]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const mode = btn.getAttribute("data-select");
    document.querySelectorAll('input[name="ids"]').forEach((cb) => {
      if (mode === "all") cb.checked = true;
      else if (mode === "none") cb.checked = false;
      else cb.checked = cb.getAttribute("data-category") === mode;
    });
    if (selectAll) selectAll.checked = mode === "all";
  });
});
