const views = {
  dashboard: window.DashboardView,
  prospects: window.ProspectsView,
  templates: window.TemplatesView,
  campaigns: window.CampaignsView,
  settings: window.SettingsView,
};

async function showView(name) {
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === name);
  });
  const app = document.getElementById('app');
  app.innerHTML = '<p class="muted">読み込み中...</p>';
  try {
    await views[name].render(app);
  } catch (e) {
    app.innerHTML = `<div class="panel">読み込みに失敗しました: ${escapeHtml(e.message)}</div>`;
  }
}

document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => showView(btn.dataset.view));
});

showView('dashboard');
