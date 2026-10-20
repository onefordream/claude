window.ProspectsView = (() => {
  const state = {
    filter: { stage: '', q: '' },
    list: [],
    selectedId: null,
    container: null,
  };

  async function render(container) {
    state.container = container;
    container.innerHTML = `
      <div class="panel">
        <div class="flex-between">
          <h2>店舗 / リサーチリスト</h2>
          <div>
            <button class="secondary" id="btn-new">+ 新規追加</button>
            <a class="secondary" id="btn-export" href="/api/prospects/export" style="text-decoration:none; padding:7px 14px; display:inline-block; border:1px solid var(--border); border-radius:6px; color:var(--text);">CSVエクスポート</a>
            <button class="secondary" id="btn-import-toggle">CSVインポート</button>
          </div>
        </div>
        <div id="import-box" style="display:none; margin-top:12px;">
          <p class="help-text">列: name(必須),prefecture,city,address,phone,email,website,instagram,source,stage,owner,tags,notes。1行目はヘッダー行。</p>
          <textarea id="import-text" rows="6" style="width:100%;" placeholder="name,prefecture,city,address,phone,email,website,instagram,source,stage,owner,tags,notes"></textarea>
          <div style="margin-top:8px;"><button class="primary" id="btn-import-submit">インポート実行</button></div>
        </div>
        <div class="toolbar" style="margin-top:12px;">
          <input type="text" id="search-q" placeholder="店舗名・地域で検索" value="${escapeHtml(state.filter.q)}" />
          <select id="filter-stage">
            <option value="">全ステージ</option>
            ${Object.keys(STAGE_LABELS).map((s) => `<option value="${s}" ${state.filter.stage === s ? 'selected' : ''}>${STAGE_LABELS[s]}</option>`).join('')}
          </select>
        </div>
        <div id="list-box"><p class="muted">読み込み中...</p></div>
      </div>
      <div id="form-box"></div>
      <div id="detail-box"></div>
    `;

    container.querySelector('#btn-new').addEventListener('click', () => showForm());
    container.querySelector('#btn-import-toggle').addEventListener('click', () => {
      const box = container.querySelector('#import-box');
      box.style.display = box.style.display === 'none' ? 'block' : 'none';
    });
    container.querySelector('#btn-import-submit').addEventListener('click', doImport);
    container.querySelector('#search-q').addEventListener('input', (e) => {
      state.filter.q = e.target.value;
      debounceLoad();
    });
    container.querySelector('#filter-stage').addEventListener('change', (e) => {
      state.filter.stage = e.target.value;
      loadList();
    });

    await loadList();
    if (state.selectedId) await openDetail(state.selectedId);
  }

  let debounceTimer;
  function debounceLoad() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(loadList, 300);
  }

  async function loadList() {
    const params = new URLSearchParams();
    if (state.filter.stage) params.set('stage', state.filter.stage);
    if (state.filter.q) params.set('q', state.filter.q);
    const data = await api.get(`/api/prospects?${params.toString()}`);
    state.list = data.prospects;
    const box = state.container.querySelector('#list-box');
    if (state.list.length === 0) {
      box.innerHTML = '<p class="muted">該当する店舗がありません</p>';
      return;
    }
    box.innerHTML = `
      <table>
        <thead><tr><th>店舗名</th><th>地域</th><th>ステージ</th><th>電話</th><th>メール</th><th>Instagram</th><th>更新日</th></tr></thead>
        <tbody>
          ${state.list.map((p) => `
            <tr data-id="${p.id}" style="cursor:pointer;">
              <td>${escapeHtml(p.name)}</td>
              <td>${escapeHtml(p.prefecture)} ${escapeHtml(p.city)}</td>
              <td><span class="badge ${p.stage}">${STAGE_LABELS[p.stage] || p.stage}</span></td>
              <td>${escapeHtml(p.phone)}</td>
              <td>${escapeHtml(p.email)}</td>
              <td>${escapeHtml(p.instagram)}</td>
              <td>${fmtDate(p.updated_at)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    box.querySelectorAll('tr[data-id]').forEach((tr) => {
      tr.addEventListener('click', () => openDetail(Number(tr.dataset.id)));
    });
  }

  async function doImport() {
    const text = state.container.querySelector('#import-text').value;
    if (!text.trim()) return;
    try {
      const result = await api.request('POST', '/api/prospects/import', text);
      toast(`インポート完了: ${result.imported}件 (スキップ ${result.skipped}件)`);
      state.container.querySelector('#import-text').value = '';
      await loadList();
    } catch (e) {
      toast(e.message, true);
    }
  }

  function showForm(existing) {
    const box = state.container.querySelector('#form-box');
    const p = existing || { name: '', prefecture: '', city: '', address: '', phone: '', email: '', website: '', instagram: '', source: '', stage: 'research', owner: '', tags: '', notes: '' };
    box.innerHTML = `
      <div class="panel">
        <h2>${existing ? '店舗情報を編集' : '新規店舗を追加'}</h2>
        <div class="form-grid">
          ${field('name', '店舗名*', p.name)}
          ${field('prefecture', '都道府県', p.prefecture)}
          ${field('city', '市区町村', p.city)}
          ${field('address', '住所', p.address)}
          ${field('phone', '電話番号', p.phone)}
          ${field('email', 'メールアドレス', p.email)}
          ${field('website', 'Webサイト', p.website)}
          ${field('instagram', 'Instagram', p.instagram)}
          ${field('source', '出典/経路', p.source)}
          ${field('owner', '担当者', p.owner)}
          ${field('tags', 'タグ', p.tags)}
        </div>
        <div class="form-row">
          <label>ステージ</label>
          <select id="f-stage">
            ${Object.keys(STAGE_LABELS).map((s) => `<option value="${s}" ${p.stage === s ? 'selected' : ''}>${STAGE_LABELS[s]}</option>`).join('')}
          </select>
        </div>
        <div class="form-row"><label>メモ</label><textarea id="f-notes" rows="3">${escapeHtml(p.notes)}</textarea></div>
        <button class="primary" id="btn-save">${existing ? '更新' : '追加'}</button>
        <button class="secondary" id="btn-cancel">キャンセル</button>
      </div>
    `;
    function field(id, label, value) {
      return `<div class="form-row"><label>${label}</label><input id="f-${id}" value="${escapeHtml(value)}" /></div>`;
    }
    box.querySelector('#btn-cancel').addEventListener('click', () => { box.innerHTML = ''; });
    box.querySelector('#btn-save').addEventListener('click', async () => {
      const payload = {
        name: box.querySelector('#f-name').value.trim(),
        prefecture: box.querySelector('#f-prefecture').value.trim(),
        city: box.querySelector('#f-city').value.trim(),
        address: box.querySelector('#f-address').value.trim(),
        phone: box.querySelector('#f-phone').value.trim(),
        email: box.querySelector('#f-email').value.trim(),
        website: box.querySelector('#f-website').value.trim(),
        instagram: box.querySelector('#f-instagram').value.trim(),
        source: box.querySelector('#f-source').value.trim(),
        owner: box.querySelector('#f-owner').value.trim(),
        tags: box.querySelector('#f-tags').value.trim(),
        stage: box.querySelector('#f-stage').value,
        notes: box.querySelector('#f-notes').value.trim(),
      };
      if (!payload.name) { toast('店舗名は必須です', true); return; }
      try {
        if (existing) {
          await api.put(`/api/prospects/${existing.id}`, payload);
          toast('更新しました');
        } else {
          await api.post('/api/prospects', payload);
          toast('追加しました');
        }
        box.innerHTML = '';
        await loadList();
      } catch (e) {
        toast(e.message, true);
      }
    });
  }

  async function openDetail(id) {
    state.selectedId = id;
    const data = await api.get(`/api/prospects/${id}`);
    const box = state.container.querySelector('#detail-box');
    const p = data.prospect;
    const templates = await api.get('/api/templates');

    box.innerHTML = `
      <div class="panel detail-panel">
        <div class="flex-between">
          <h2>${escapeHtml(p.name)} <span class="badge ${p.stage}">${STAGE_LABELS[p.stage]}</span></h2>
          <div>
            <button class="secondary" id="btn-edit">編集</button>
            <button class="danger" id="btn-delete">削除</button>
            <button class="secondary" id="btn-close">閉じる</button>
          </div>
        </div>
        <p class="muted">${escapeHtml(p.prefecture)} ${escapeHtml(p.city)} ${escapeHtml(p.address)} / ${escapeHtml(p.phone)} / ${escapeHtml(p.email)} / ${escapeHtml(p.instagram)}</p>
        ${p.notes ? `<p class="pre-wrap">${escapeHtml(p.notes)}</p>` : ''}

        <h2 style="margin-top:16px;">DM文面を作成（Instagram DM / DM 共通・手動送信）</h2>
        <div class="toolbar">
          <select id="dm-template">
            <option value="">テンプレートを選択</option>
            ${templates.templates.filter((t) => t.channel !== 'email').map((t) => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('')}
          </select>
          <button class="secondary" id="btn-dm-render">文面を生成</button>
        </div>
        <div id="dm-output"></div>

        <h2 style="margin-top:16px;">活動を記録</h2>
        <div class="form-grid">
          <div class="form-row"><label>チャネル</label>
            <select id="act-channel">
              ${Object.keys(CHANNEL_LABELS).map((c) => `<option value="${c}">${CHANNEL_LABELS[c]}</option>`).join('')}
            </select>
          </div>
          <div class="form-row"><label>方向</label>
            <select id="act-direction"><option value="outbound">送信(自分→相手)</option><option value="inbound">受信(相手→自分)</option></select>
          </div>
          <div class="form-row"><label>結果</label>
            <select id="act-status">
              ${Object.keys(STATUS_LABELS).map((s) => `<option value="${s}">${STATUS_LABELS[s]}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row"><label>内容/メモ</label><textarea id="act-content" rows="2"></textarea></div>
        <button class="primary" id="btn-act-save">記録する</button>

        <h2 style="margin-top:16px;">活動履歴</h2>
        ${data.activities.length === 0 ? '<p class="muted">まだ活動記録がありません</p>' : data.activities.map((a) => `
          <div class="timeline-item">
            <strong>${CHANNEL_LABELS[a.channel] || a.channel}</strong>
            / ${a.direction === 'inbound' ? '受信' : '送信'}
            / ${STATUS_LABELS[a.status] || a.status}
            <span class="muted">(${fmtDate(a.occurred_at)})</span>
            ${a.content ? `<div class="pre-wrap muted">${escapeHtml(a.content).slice(0, 300)}</div>` : ''}
          </div>
        `).join('')}

        ${data.emailSends.length > 0 ? `
          <h2 style="margin-top:16px;">メール送信履歴</h2>
          <table>
            <thead><tr><th>件名</th><th>状態</th><th>送信日時</th></tr></thead>
            <tbody>
              ${data.emailSends.map((e) => `<tr><td>${escapeHtml(e.subject)}</td><td>${e.status}</td><td>${fmtDate(e.sent_at)}</td></tr>`).join('')}
            </tbody>
          </table>
        ` : ''}
      </div>
    `;

    box.querySelector('#btn-close').addEventListener('click', () => { state.selectedId = null; box.innerHTML = ''; });
    box.querySelector('#btn-edit').addEventListener('click', () => showForm(p));
    box.querySelector('#btn-delete').addEventListener('click', async () => {
      if (!confirm(`${p.name} を削除しますか？`)) return;
      await api.del(`/api/prospects/${id}`);
      toast('削除しました');
      state.selectedId = null;
      box.innerHTML = '';
      await loadList();
    });

    box.querySelector('#btn-dm-render').addEventListener('click', async () => {
      const templateId = box.querySelector('#dm-template').value;
      if (!templateId) { toast('テンプレートを選択してください', true); return; }
      const rendered = await api.post(`/api/prospects/${id}/render-dm`, { template_id: Number(templateId) });
      const out = box.querySelector('#dm-output');
      out.innerHTML = `
        <div class="panel" style="background:#f8fafc;">
          <div class="pre-wrap" id="dm-text">${escapeHtml(rendered.body)}</div>
          <div style="margin-top:8px; display:flex; gap:8px;">
            <button class="secondary" id="btn-dm-copy">コピー</button>
            ${p.instagram ? `<a class="secondary" style="text-decoration:none; padding:7px 14px; border:1px solid var(--border); border-radius:6px;" href="https://www.instagram.com/${encodeURIComponent(p.instagram.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, ''))}/" target="_blank" rel="noopener noreferrer">Instagramで開く</a>` : ''}
            <button class="primary" id="btn-dm-mark-sent">コピーして送信済みにする</button>
          </div>
          <p class="help-text">このテキストをコピーしてInstagram/DMアプリに貼り付け、手動で送信してください。自動送信は行いません。</p>
        </div>
      `;
      out.querySelector('#btn-dm-copy').addEventListener('click', () => {
        navigator.clipboard.writeText(rendered.body).then(() => toast('コピーしました'));
      });
      out.querySelector('#btn-dm-mark-sent').addEventListener('click', async () => {
        navigator.clipboard.writeText(rendered.body).catch(() => {});
        await api.post(`/api/prospects/${id}/activities`, {
          channel: 'instagram_dm', direction: 'outbound', status: 'sent', content: rendered.body,
        });
        toast('コピーして活動履歴に記録しました');
        await openDetail(id);
      });
    });

    box.querySelector('#btn-act-save').addEventListener('click', async () => {
      const payload = {
        channel: box.querySelector('#act-channel').value,
        direction: box.querySelector('#act-direction').value,
        status: box.querySelector('#act-status').value,
        content: box.querySelector('#act-content').value.trim(),
      };
      try {
        await api.post(`/api/prospects/${id}/activities`, payload);
        toast('記録しました');
        await openDetail(id);
      } catch (e) {
        toast(e.message, true);
      }
    });
  }

  return { render };
})();
