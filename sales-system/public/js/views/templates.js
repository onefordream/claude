window.TemplatesView = (() => {
  let container;

  async function render(c) {
    container = c;
    container.innerHTML = `
      <div class="panel">
        <div class="flex-between">
          <h2>テンプレート</h2>
          <button class="secondary" id="btn-new">+ 新規テンプレート</button>
        </div>
        <p class="help-text">本文には {{name}} {{prefecture}} {{city}} {{address}} {{phone}} {{email}} {{website}} {{instagram}} {{owner}} が使えます（店舗情報に自動で差し替わります）。</p>
        <div id="list-box"><p class="muted">読み込み中...</p></div>
      </div>
      <div id="form-box"></div>
    `;
    container.querySelector('#btn-new').addEventListener('click', () => showForm());
    await loadList();
  }

  async function loadList() {
    const data = await api.get('/api/templates');
    const box = container.querySelector('#list-box');
    if (data.templates.length === 0) {
      box.innerHTML = '<p class="muted">テンプレートがありません</p>';
      return;
    }
    const channelLabel = { email: 'メール', dm: 'DM', instagram_dm: 'Instagram DM' };
    box.innerHTML = `
      <table>
        <thead><tr><th>チャネル</th><th>名前</th><th>件名</th><th></th></tr></thead>
        <tbody>
          ${data.templates.map((t) => `
            <tr>
              <td>${channelLabel[t.channel] || t.channel}</td>
              <td>${escapeHtml(t.name)}</td>
              <td>${escapeHtml(t.subject || '')}</td>
              <td>
                <button class="secondary" data-edit="${t.id}">編集</button>
                <button class="danger" data-del="${t.id}">削除</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    box.querySelectorAll('[data-edit]').forEach((btn) => btn.addEventListener('click', () => {
      const t = data.templates.find((x) => x.id === Number(btn.dataset.edit));
      showForm(t);
    }));
    box.querySelectorAll('[data-del]').forEach((btn) => btn.addEventListener('click', async () => {
      if (!confirm('このテンプレートを削除しますか？')) return;
      await api.del(`/api/templates/${btn.dataset.del}`);
      toast('削除しました');
      await loadList();
    }));
  }

  function showForm(existing) {
    const box = container.querySelector('#form-box');
    const t = existing || { channel: 'email', name: '', subject: '', body: '' };
    box.innerHTML = `
      <div class="panel">
        <h2>${existing ? 'テンプレートを編集' : '新規テンプレート'}</h2>
        <div class="form-row"><label>チャネル</label>
          <select id="f-channel" ${existing ? 'disabled' : ''}>
            <option value="email" ${t.channel === 'email' ? 'selected' : ''}>メール</option>
            <option value="dm" ${t.channel === 'dm' ? 'selected' : ''}>DM</option>
            <option value="instagram_dm" ${t.channel === 'instagram_dm' ? 'selected' : ''}>Instagram DM</option>
          </select>
        </div>
        <div class="form-row"><label>テンプレート名</label><input id="f-name" value="${escapeHtml(t.name)}" /></div>
        <div class="form-row"><label>件名（メールのみ）</label><input id="f-subject" value="${escapeHtml(t.subject || '')}" /></div>
        <div class="form-row"><label>本文</label><textarea id="f-body" rows="8">${escapeHtml(t.body || '')}</textarea></div>
        <button class="primary" id="btn-save">${existing ? '更新' : '作成'}</button>
        <button class="secondary" id="btn-cancel">キャンセル</button>
      </div>
    `;
    box.querySelector('#btn-cancel').addEventListener('click', () => { box.innerHTML = ''; });
    box.querySelector('#btn-save').addEventListener('click', async () => {
      const payload = {
        channel: box.querySelector('#f-channel').value,
        name: box.querySelector('#f-name').value.trim(),
        subject: box.querySelector('#f-subject').value.trim(),
        body: box.querySelector('#f-body').value,
      };
      if (!payload.name || !payload.body) { toast('名前と本文は必須です', true); return; }
      try {
        if (existing) await api.put(`/api/templates/${existing.id}`, payload);
        else await api.post('/api/templates', payload);
        toast(existing ? '更新しました' : '作成しました');
        box.innerHTML = '';
        await loadList();
      } catch (e) {
        toast(e.message, true);
      }
    });
  }

  return { render };
})();
