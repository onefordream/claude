window.CampaignsView = (() => {
  let container;
  const selected = new Set();

  async function render(c) {
    container = c;
    selected.clear();
    const [templatesData, prospectsData, campaignsData, settingsData] = await Promise.all([
      api.get('/api/templates?channel=email'),
      api.get('/api/prospects'),
      api.get('/api/campaigns'),
      api.get('/api/settings'),
    ]);

    container.innerHTML = `
      <div class="panel">
        <h2>営業メール一括送信</h2>
        ${!settingsData.configured ? '<p class="help-text" style="color:var(--amber);">SMTP設定が未完了です。「設定」画面でメール送信情報を入力してください。</p>' : ''}
        <div class="form-row"><label>キャンペーン名</label><input id="c-name" placeholder="例: 2026年11月 大阪エリア初回アプローチ" /></div>
        <div class="form-row"><label>使用するメールテンプレート</label>
          <select id="c-template">
            <option value="">選択してください</option>
            ${templatesData.templates.map((t) => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('')}
          </select>
        </div>
        <p class="help-text">下のリストから送信先を選択してください（メールアドレスが登録済みの店舗のみ送信されます）。</p>
        <div class="toolbar">
          <button class="secondary" id="btn-select-all">全選択</button>
          <button class="secondary" id="btn-select-none">選択解除</button>
          <span class="muted" id="selected-count">選択: 0件</span>
        </div>
        <table>
          <thead><tr><th></th><th>店舗名</th><th>ステージ</th><th>メール</th></tr></thead>
          <tbody>
            ${prospectsData.prospects.map((p) => `
              <tr>
                <td><input type="checkbox" class="pick" value="${p.id}" ${p.email ? '' : 'disabled'} /></td>
                <td>${escapeHtml(p.name)}</td>
                <td><span class="badge ${p.stage}">${STAGE_LABELS[p.stage]}</span></td>
                <td>${p.email ? escapeHtml(p.email) : '<span class="muted">未登録</span>'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="margin-top:12px;">
          <button class="primary" id="btn-send">送信する</button>
        </div>
      </div>

      <div class="panel">
        <h2>送信履歴</h2>
        ${campaignsData.campaigns.length === 0 ? '<p class="muted">まだ送信履歴がありません</p>' : `
          <table>
            <thead><tr><th>キャンペーン名</th><th>送信日</th><th>成功</th><th>失敗</th></tr></thead>
            <tbody>
              ${campaignsData.campaigns.map((c) => `
                <tr><td>${escapeHtml(c.name)}</td><td>${fmtDate(c.created_at)}</td><td>${c.stats.sent || 0}</td><td>${c.stats.failed || 0}</td></tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>
    `;

    const checkboxes = container.querySelectorAll('.pick');
    function updateCount() {
      container.querySelector('#selected-count').textContent = `選択: ${container.querySelectorAll('.pick:checked').length}件`;
    }
    checkboxes.forEach((cb) => cb.addEventListener('change', updateCount));
    container.querySelector('#btn-select-all').addEventListener('click', () => {
      checkboxes.forEach((cb) => { if (!cb.disabled) cb.checked = true; });
      updateCount();
    });
    container.querySelector('#btn-select-none').addEventListener('click', () => {
      checkboxes.forEach((cb) => { cb.checked = false; });
      updateCount();
    });

    container.querySelector('#btn-send').addEventListener('click', async () => {
      const name = container.querySelector('#c-name').value.trim();
      const templateId = container.querySelector('#c-template').value;
      const ids = [...container.querySelectorAll('.pick:checked')].map((cb) => Number(cb.value));
      if (!name) return toast('キャンペーン名を入力してください', true);
      if (!templateId) return toast('テンプレートを選択してください', true);
      if (ids.length === 0) return toast('送信先を1件以上選択してください', true);
      if (!confirm(`${ids.length}件に送信します。よろしいですか？`)) return;

      const btn = container.querySelector('#btn-send');
      btn.disabled = true;
      btn.textContent = '送信中...';
      try {
        const result = await api.post('/api/campaigns', { name, template_id: Number(templateId), prospect_ids: ids });
        const sentCount = result.results.filter((r) => r.status === 'sent').length;
        const failedCount = result.results.length - sentCount;
        toast(`送信完了: 成功${sentCount}件 / 失敗${failedCount}件`);
        await render(container);
      } catch (e) {
        toast(e.message, true);
        btn.disabled = false;
        btn.textContent = '送信する';
      }
    });
  }

  return { render };
})();
