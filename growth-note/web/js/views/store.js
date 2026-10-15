import { api } from '../api.js';
import { html, mount, $, onAction, toast, fmtRelDate, fmtTime, moodLabel, confirmSheet } from '../ui.js';
import { icon } from '../icons.js';

// 先生・スタッフ側: 店舗の管理画面

async function copyText(text, el) {
  try {
    await navigator.clipboard.writeText(text);
    toast('コピーしました');
  } catch {
    // コピーできない環境では文字を選択状態にする
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    toast('選択しました。長押しでコピーできます');
  }
}

function inviteUrl(code) {
  return `${location.origin}/#/links/new?code=${code.replace('-', '')}`;
}

// ---------- 一覧（作成・スタッフ参加） ----------
async function renderList(root, { navigate }) {
  const { stores, categories } = await api('/stores');

  mount(root, html`
    <header class="page-head with-back">
      <a class="icon-btn" href="#/me" aria-label="戻る">${icon('caretLeft', { size: 20 })}</a>
      <div class="page-head-main"><p class="eyebrow">先生・スタッフの方へ</p><h1 class="page-title page-title-sm">店舗の管理</h1></div>
    </header>

    ${stores.length ? html`<div class="list">${stores.map((s) => html`
      <a class="row" href="#/store/${s.id}">
        <span class="row-main">
          <span class="row-title">${s.name}</span>
          <span class="row-sub">${s.category || '教室'}　メンバー ${s.activeMembers}人　${s.role === 'owner' ? 'オーナー' : 'スタッフ'}</span>
        </span>
        ${s.pendingMembers ? html`<span class="tag">承認待ち ${s.pendingMembers}</span>` : ''}
        ${icon('caretRight', { size: 16 })}
      </a>`)}</div>`
    : html`<p class="lead-line">教室・スクール・ジムなどの店舗を登録すると、店舗IDが発行されます。生徒さんがそのIDを入力すると、共有された記録を見てコメントできるようになります。</p>`}

    <form class="form section" id="create-form" novalidate>
      <h2 class="section-title">店舗を登録</h2>
      <label class="field"><span class="field-label">店舗名</span>
        <input class="input" id="store-name" name="name" maxlength="40" placeholder="例: みなとゴルフスクール 青山校"></label>
      <label class="field"><span class="field-label">ジャンル</span>
        <span class="select"><select class="input" id="store-category" name="category">${categories.map((c) => html`<option value="${c}">${c}</option>`)}</select></span></label>
      <label class="field"><span class="field-label">紹介文（任意）</span>
        <input class="input" id="store-desc" name="description" maxlength="200" placeholder="生徒さんが連携するときに表示されます"></label>
      <p class="form-error" role="alert" hidden></p>
      <button class="btn btn-primary" type="submit">登録して店舗IDを発行</button>
    </form>

    <form class="form section" id="join-form" novalidate>
      <h2 class="section-title">スタッフとして参加</h2>
      <p class="hint">店舗のオーナーから受け取ったスタッフ招待コードを入力してください。</p>
      <div class="inline-fields">
        <input class="input code-input" id="staff-code" name="code" placeholder="P3XR-7MNA" autocomplete="off" autocapitalize="characters" maxlength="12" aria-label="スタッフ招待コード">
        <button class="btn btn-secondary" type="submit">参加</button>
      </div>
    </form>
  `);

  $('#create-form', root).addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const err = $('.form-error', f);
    err.hidden = true;
    try {
      const res = await api('/stores', { method: 'POST', body: { name: f.name.value, category: f.category.value, description: f.description.value } });
      toast('店舗を登録しました');
      navigate(`/store/${res.store.id}`);
    } catch (ex) {
      err.textContent = ex.message;
      err.hidden = false;
    }
  });
  $('#join-form', root).addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const res = await api('/stores/join-staff', { method: 'POST', body: { code: e.target.code.value } });
      toast(`${res.store.name}にスタッフとして参加しました`);
      navigate(`/store/${res.store.id}`);
    } catch (ex) {
      toast(ex.message, { type: 'error' });
    }
  });
}

// ---------- 店舗の詳細（記録・メンバー・設定） ----------
function feedCard(e) {
  return html`<article class="feed-item" data-entry="${e.id}">
    <div class="feed-head">
      <span class="avatar avatar-sm" aria-hidden="true">${[...e.member.name][0]}</span>
      <p class="feed-who"><b>${e.member.name}</b><span>${fmtRelDate(e.localDate)}　${fmtTime(e.createdAt)}${e.mood ? `　気分 ${moodLabel(e.mood)}` : ''}</span></p>
    </div>
    ${e.golf ? html`<div class="row row-boxed"><span class="row-value row-value-lead">${e.golf.score}<small>${e.golf.toPar > 0 ? `+${e.golf.toPar}` : e.golf.toPar}</small></span>
      <span class="row-main"><span class="row-title">${e.golf.course}</span><span class="row-sub num">${[e.golf.putts != null && `パット ${e.golf.putts}`, e.golf.fwPct != null && `FW ${e.golf.fwPct}%`, e.golf.girPct != null && `パーオン ${e.golf.girPct}%`, e.golf.ob != null && `OB ${e.golf.ob}`].filter(Boolean).join('　')}</span></span></div>` : ''}
    ${e.body ? html`<p class="entry-body">${e.body}</p>` : ''}
    ${e.media.length ? html`<div class="gallery">${e.media.map((m) =>
      m.kind === 'image' ? html`<a class="gallery-item" href="${m.url}" target="_blank" rel="noopener"><img src="${m.url}" alt="添付写真" loading="lazy"></a>`
      : m.kind === 'video' ? html`<div class="gallery-item wide"><video src="${m.url}" controls playsinline preload="metadata"></video></div>`
      : html`<div class="gallery-item wide audio"><audio src="${m.url}" controls preload="metadata"></audio></div>`)}</div>` : ''}
    <div class="feed-comments">
      ${e.comments.map((c) => html`<div class="comment">
        <p class="comment-meta"><b>${c.authorName || 'スタッフ'}</b>${fmtRelDate(c.createdAt.slice(0, 10))}
          ${c.mine ? html`<button class="text-btn text-btn-sm" data-action="del-comment" data-id="${c.id}">削除</button>` : ''}</p>
        <p>${c.body}</p></div>`)}
      <form class="comment-form" data-entry="${e.id}">
        <textarea class="input" name="body" rows="2" maxlength="1000" placeholder="${e.member.name}さんにコメント" aria-label="コメント"></textarea>
        <button class="btn btn-secondary btn-sm" type="submit">送信</button>
      </form>
    </div>
  </article>`;
}

async function renderStore(root, id, query, { navigate }) {
  let { store, staff, categories } = await api(`/stores/${id}`);
  const tab = ['feed', 'members', 'settings'].includes(query.get('tab')) ? query.get('tab') : 'feed';
  const memberFilter = query.get('member');
  const isOwner = store.role === 'owner';

  mount(root, html`
    <header class="page-head with-back">
      <a class="icon-btn" href="#/store" aria-label="店舗一覧へ">${icon('caretLeft', { size: 20 })}</a>
      <div class="page-head-main"><p class="eyebrow">${store.category || '教室'}</p><h1 class="page-title page-title-sm">${store.name}</h1></div>
    </header>

    <section class="section code-block">
      <p class="section-label">店舗ID</p>
      <p class="code-big num" id="store-code-text">${store.code}</p>
      <p class="hint">生徒さんにこのIDを伝えてください。アプリの「マイページ ＞ 教室・お店」から入力できます。</p>
      <div class="btn-row">
        <button class="btn btn-secondary btn-sm" data-action="copy-code">IDをコピー</button>
        <button class="text-btn" data-action="copy-url">招待リンクをコピー</button>
      </div>
    </section>

    <nav class="tabs" aria-label="店舗のメニュー">
      <a class="tab-link ${tab === 'feed' ? 'on' : ''}" href="#/store/${id}?tab=feed">共有された記録</a>
      <a class="tab-link ${tab === 'members' ? 'on' : ''}" href="#/store/${id}?tab=members">メンバー${store.pendingMembers ? html`<span class="tag tag-accent">${store.pendingMembers}</span>` : ''}</a>
      <a class="tab-link ${tab === 'settings' ? 'on' : ''}" href="#/store/${id}?tab=settings">設定</a>
    </nav>
    <div class="tab-body"></div>
  `);

  const body = $('.tab-body', root);
  let feedItems = [];
  let cursor = null;

  async function loadFeed(reset) {
    const params = new URLSearchParams();
    if (!reset && cursor) params.set('cursor', cursor);
    if (memberFilter) params.set('member', memberFilter);
    const res = await api(`/stores/${id}/feed?${params}`);
    feedItems = reset ? res.items : feedItems.concat(res.items);
    cursor = res.nextCursor;
    mount(body, html`
      ${memberFilter ? html`<div class="filter-bar"><span>${feedItems[0]?.member.name ?? 'このメンバー'}さんの記録</span><a class="text-btn" href="#/store/${id}?tab=feed">すべて表示</a></div>` : ''}
      ${feedItems.length ? html`<div class="feed">${feedItems.map(feedCard)}</div>`
        : html`<div class="empty"><p>まだ共有された記録はありません。生徒さんが記録を共有すると、ここに表示されます。</p></div>`}
      ${cursor ? html`<button class="btn btn-secondary btn-block" data-action="more">さらに読み込む</button>` : ''}`);
  }

  async function loadMembers() {
    const { members } = await api(`/stores/${id}/members`);
    const pending = members.filter((m) => m.status === 'pending');
    const active = members.filter((m) => m.status === 'active');
    mount(body, html`
      ${pending.length ? html`<section class="section">
        <div class="section-head"><h2 class="section-title">承認待ち</h2><span class="section-meta">${pending.length}人</span></div>
        <ul class="list">${pending.map((m) => html`<li class="row member">
          <span class="avatar avatar-sm" aria-hidden="true">${[...m.name][0]}</span>
          <span class="row-main"><span class="row-title">${m.name}</span><span class="row-sub">${fmtRelDate(m.requestedAt.slice(0, 10))}に申請</span></span>
          <span class="row-actions">
            <button class="btn btn-secondary btn-sm" data-action="approve" data-id="${m.linkId}">承認</button>
            <button class="text-btn" data-action="reject" data-id="${m.linkId}">見送る</button>
          </span></li>`)}</ul>
      </section>` : ''}
      <section class="section">
        <div class="section-head"><h2 class="section-title">連携中のメンバー</h2><span class="section-meta">${active.length} / ${store.plan.limits.maxMembers}人</span></div>
        ${active.length ? html`<ul class="list">${active.map((m) => html`<li class="row member">
          <span class="avatar avatar-sm" aria-hidden="true">${[...m.name][0]}</span>
          <span class="row-main"><span class="row-title">${m.name}</span>
            <span class="row-sub">${m.streak ? `${m.streak}日連続　` : ''}共有 ${m.sharedCount}件${m.lastSharedDate ? `　最終 ${fmtRelDate(m.lastSharedDate)}` : ''}</span></span>
          <span class="row-actions">
            <a class="btn btn-secondary btn-sm" href="#/store/${id}?tab=feed&member=${m.linkId}">記録</a>
            <button class="icon-btn" data-action="remove-member" data-id="${m.linkId}" data-name="${m.name}" aria-label="${m.name}さんの連携を外す">${icon('x', { size: 16 })}</button>
          </span></li>`)}</ul>`
        : html`<p class="muted">まだメンバーはいません。店舗IDを生徒さんに伝えてください。</p>`}
        <p class="hint">継続日数は、生徒さんが共有した記録だけから数えています。</p>
      </section>`);
  }

  function loadSettings() {
    mount(body, html`
      ${isOwner ? html`<form class="form section" id="store-settings" novalidate>
        <h2 class="section-title">店舗の情報</h2>
        <label class="field"><span class="field-label">店舗名</span><input class="input" id="set-name" name="name" maxlength="40" value="${store.name}"></label>
        <label class="field"><span class="field-label">ジャンル</span><span class="select"><select class="input" id="set-category" name="category">
          ${categories.map((c) => html`<option value="${c}" ${c === store.category ? 'selected' : ''}>${c}</option>`)}</select></span></label>
        <label class="field"><span class="field-label">紹介文</span><input class="input" id="set-desc" name="description" maxlength="200" value="${store.description}"></label>
        <label class="check-field"><input type="checkbox" id="set-approval" name="requireApproval" ${store.requireApproval ? 'checked' : ''}>
          <span><b>連携を承認制にする</b><span class="hint">オフにすると、店舗IDを入力した人がすぐに連携されます。</span></span></label>
        <button class="btn btn-primary" type="submit">保存</button>
      </form>` : html`<section class="section"><p class="muted">店舗の設定はオーナーが変更できます。</p></section>`}

      <section class="section">
        <h2 class="section-title">スタッフ</h2>
        <ul class="list">${staff.map((s) => html`<li class="row member">
          <span class="avatar avatar-sm" aria-hidden="true">${[...s.name][0]}</span>
          <span class="row-main"><span class="row-title">${s.name}${s.isMe ? '（あなた）' : ''}</span><span class="row-sub">${s.role === 'owner' ? 'オーナー' : 'スタッフ'}</span></span>
          ${isOwner && s.role !== 'owner' ? html`<button class="icon-btn" data-action="remove-staff" data-id="${s.id}" data-name="${s.name}" aria-label="${s.name}さんを外す">${icon('x', { size: 16 })}</button>` : ''}
        </li>`)}</ul>
        ${isOwner ? html`<div class="code-block">
          <p class="section-label">スタッフ招待コード</p>
          <p class="code-mid num" id="staff-code-text">${store.staffCode}</p>
          <p class="hint">先生・スタッフにだけ伝えてください。</p>
          <div class="btn-row">
            <button class="btn btn-secondary btn-sm" data-action="copy-staff">コピー</button>
            <button class="text-btn" data-action="regen" data-type="staff">作り直す</button>
          </div></div>` : ''}
      </section>

      ${isOwner ? html`<section class="section">
        <h2 class="section-title">店舗IDを作り直す</h2>
        <p class="hint">店舗IDが意図しない人に広まったときに使います。すでに連携しているメンバーはそのまま残ります。</p>
        <button class="text-btn text-btn-danger" data-action="regen" data-type="member">店舗IDを作り直す</button>
      </section>` : ''}

      <section class="section">
        <h2 class="section-title">プラン</h2>
        <p class="muted">${store.plan.label}プラン　メンバー${store.plan.limits.maxMembers}人まで　スタッフ${store.plan.limits.maxStaff}人まで</p>
      </section>`);

    $('#store-settings', root)?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      try {
        store = { ...store, ...(await api(`/stores/${id}`, { method: 'PATCH', body: {
          name: f.name.value, category: f.category.value, description: f.description.value, requireApproval: f.requireApproval.checked,
        } })).store };
        toast('保存しました');
      } catch (ex) {
        toast(ex.message, { type: 'error' });
      }
    });
  }

  if (tab === 'feed') await loadFeed(true);
  else if (tab === 'members') await loadMembers();
  else loadSettings();

  // コメント送信（記録タブ）
  const onSubmit = async (e) => {
    const form = e.target.closest('.comment-form');
    if (!form) return;
    e.preventDefault();
    const text = form.body.value.trim();
    if (!text) return;
    const btn = $('button[type=submit]', form);
    btn.classList.add('loading');
    try {
      const res = await api(`/stores/${id}/entries/${form.dataset.entry}/comments`, { method: 'POST', body: { body: text } });
      feedItems = feedItems.map((x) => (x.id === res.entry.id ? res.entry : x));
      const card = form.closest('.feed-item');
      const tmp = document.createElement('div');
      mount(tmp, feedCard(res.entry));
      card.replaceWith(tmp.firstElementChild);
      toast('コメントを送りました');
    } catch (ex) {
      toast(ex.message, { type: 'error' });
      btn.classList.remove('loading');
    }
  };
  root.addEventListener('submit', onSubmit);

  const off = onAction(root, {
    'copy-code': () => copyText(store.code, $('#store-code-text', root)),
    'copy-url': () => copyText(inviteUrl(store.code), $('#store-code-text', root)),
    'copy-staff': () => copyText(store.staffCode, $('#staff-code-text', root)),
    more: () => loadFeed(false),
    approve: async (el) => {
      try {
        await api(`/stores/${id}/members/${el.dataset.id}/approve`, { method: 'POST', body: {} });
        toast('承認しました');
        loadMembers();
      } catch (ex) {
        toast(ex.message, { type: 'error' });
      }
    },
    reject: async (el) => {
      await api(`/stores/${id}/members/${el.dataset.id}/reject`, { method: 'POST', body: {} });
      loadMembers();
    },
    'remove-member': async (el) => {
      const ok = await confirmSheet({ title: `${el.dataset.name}さんの連携を外しますか？`, message: 'この生徒さんの記録は見られなくなります。生徒さんの記録そのものは消えません。', ok: '外す', danger: true });
      if (!ok) return;
      await api(`/stores/${id}/members/${el.dataset.id}`, { method: 'DELETE' });
      loadMembers();
    },
    'remove-staff': async (el) => {
      const ok = await confirmSheet({ title: `${el.dataset.name}さんをスタッフから外しますか？`, ok: '外す', danger: true });
      if (!ok) return;
      await api(`/stores/${id}/staff/${el.dataset.id}`, { method: 'DELETE' });
      ({ store, staff } = await api(`/stores/${id}`));
      loadSettings();
    },
    regen: async (el) => {
      const staffType = el.dataset.type === 'staff';
      const ok = await confirmSheet({
        title: staffType ? 'スタッフ招待コードを作り直しますか？' : '店舗IDを作り直しますか？',
        message: staffType ? '古いコードは使えなくなります。' : '古い店舗IDは使えなくなります。生徒さんへの案内も新しいIDに差し替えてください。',
        ok: '作り直す',
        danger: !staffType,
      });
      if (!ok) return;
      store = { ...store, ...(await api(`/stores/${id}/regenerate-code`, { method: 'POST', body: { type: el.dataset.type } })).store };
      navigate(`/store/${id}?tab=settings`, { replace: true });
    },
    'del-comment': async (el) => {
      await api(`/stores/${id}/comments/${el.dataset.id}`, { method: 'DELETE' });
      loadFeed(true);
    },
  });
  return () => {
    off();
    root.removeEventListener('submit', onSubmit);
  };
}

export async function render(root, { id, query }, ctx) {
  return id ? renderStore(root, id, query, ctx) : renderList(root, ctx);
}
