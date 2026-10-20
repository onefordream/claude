window.DashboardView = {
  async render(container) {
    const data = await api.get('/api/dashboard');
    const stageMap = {};
    data.by_stage.forEach((r) => { stageMap[r.stage] = r.count; });
    const channelMap = {};
    data.by_channel_7d.forEach((r) => { channelMap[r.channel] = r.count; });

    container.innerHTML = `
      <div class="panel">
        <h2>全体サマリー</h2>
        <div class="grid-stats">
          <div class="stat-card"><div class="value">${data.total_prospects}</div><div class="label">登録店舗数</div></div>
          <div class="stat-card"><div class="value">${data.email_stats.sent || 0}</div><div class="label">メール送信済み</div></div>
          <div class="stat-card"><div class="value">${stageMap.replied || 0}</div><div class="label">返信あり</div></div>
          <div class="stat-card"><div class="value">${stageMap.won || 0}</div><div class="label">成約</div></div>
        </div>
      </div>

      <div class="panel">
        <h2>ステージ別件数</h2>
        <div class="grid-stats">
          ${Object.keys(STAGE_LABELS).map((s) => `
            <div class="stat-card">
              <div class="value">${stageMap[s] || 0}</div>
              <div class="label">${STAGE_LABELS[s]}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="panel">
        <h2>直近7日間のチャネル別アクション数</h2>
        <div class="grid-stats">
          ${Object.keys(CHANNEL_LABELS).map((c) => `
            <div class="stat-card">
              <div class="value">${channelMap[c] || 0}</div>
              <div class="label">${CHANNEL_LABELS[c]}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="panel">
        <h2>最近の活動</h2>
        ${data.recent_activities.length === 0 ? '<p class="muted">まだ活動記録がありません</p>' : `
          <table>
            <thead><tr><th>日時</th><th>店舗</th><th>チャネル</th><th>ステータス</th><th>内容</th></tr></thead>
            <tbody>
              ${data.recent_activities.map((a) => `
                <tr>
                  <td>${fmtDate(a.occurred_at)}</td>
                  <td>${escapeHtml(a.prospect_name)}</td>
                  <td>${CHANNEL_LABELS[a.channel] || a.channel}</td>
                  <td>${STATUS_LABELS[a.status] || a.status}</td>
                  <td class="pre-wrap">${escapeHtml((a.content || '').slice(0, 80))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>
    `;
  },
};
