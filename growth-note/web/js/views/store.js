import { api } from '../api.js';
import { html, mount, $, onAction, toast, fmtRelDate, fmtTime, moodEmoji, confirmSheet } from '../ui.js';
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
      <a class="icon-btn" href="#/me" aria-label="戻る">${icon('chevronLeft', { size: 22 })}</a>
      <div><p class="eyebrow">先生・スタッフの方へ</p><h1 class="page-title small">店舗の管理</h1></div>
      <span></span>
    </header>

    ${stores.length ? html`<div class="store-list">${stores.map((s) => html`
      <a class="card store-row" href="#/store/${s.id}">
        <div class="store-row-main">
          <span class="store-badge">${s.category || '教室'}</span>
          <h2 class="store-name">${s.name}</h2>
          <p class="muted small">メンバー ${s.activeMembers}人 ・ ${s.role === 'owner' ? 'オーナー' : 'スタッフ'}</p>
        </div>
        ${s.pendingMembers ? html`<span class="pill pill-wait">承認待ち ${s.pendingMembers}</span>` : ''}
        ${icon('chevronRight', { size: 18 })}
      </a>`)}</div>`
    : html`<section class="card link-intro">
        <div class="link-intro-icon">${icon('user', { size: 28 })}</div>
        <p>教室・スクール・ジムなどの店舗を登録すると、<b>店舗ID</b>が発行されます。生徒さんがそのIDを入力すると、共有された記録を見てコメントできるようになります。</p>
      </section>`}

    <form class="card" id="create-form" novalidate>
      <h2 class="card-title small">店舗を登録する</h2>
      <label class="field"><span class="field-label">店舗名</span>
        <input class="input" id="store-name" name="name" maxlength="40" placeholder="例: みなとゴルフスクール 青山校"></label>
      <label class="field"><span class="field-label">ジャンル</span>
        <select class="input" id="store-category" name="category">${categories.map((c) => html`<option value="${c}">${c}</option>`)}</select></label>
      <label class="field"><span class="field-label">紹介文（任意）</span>
        <input class="input" id="store-desc" name="description" maxlength="200" placeholder="生徒さんが連携するときに表示されます"></label>
      <p class="form-error" role="alert" hidden></p>
      <button class="btn btn-primary btn-block" type="submit">登録して店舗IDを発行</button>
    </form>

    <form class="card" id="join-form" novalidate>
      <h2 class="card-title small">スタッフとして参加する</h2>
      <p class="muted small">店舗のオーナーから受け取った「スタッフ招待コード」を入力してください。</p>
      <div class="inline-form">
        <input class="input code-input" id="staff-code" name="code" placeholder="例: P3XR-7MNA" autocomplete="off" autocapitalize="characters" maxlength="12">
        <button class="btn btn-soft" type="submit">参加</button>
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
  return html`<article class="card feed-card" data-entry="${e.id}">
    <div class="feed-head">
      <span class="avatar sm">${[...e.member.name][0]}</span>
      <div class="feed-who"><b>${e.member.name}</b><span>${fmtRelDate(e.localDate)} ・ ${fmtTime(e.createdAt)}</span></div>
      ${e.mood ? html`<span class="entry-mood">${moodEmoji(e.mood)}</span>` : ''}
    </div>
    ${e.body ? html`<p class="entry-body">${e.body}</p>` : ''}
    ${e.media.length ? html`<div class="gallery">${e.media.map((m) =>
      m.kind === 'image' ? html`<a class="gallery-item" href="${m.url}" target="_blank" rel="noopener"><img src="${m.url}" alt="添付写真" loading="lazy"></a>`
      : m.kind === 'video' ? html`<div class="gallery-item wide"><video src="${m.url}" controls playsinline preload="metadata"></video></div>`
      : html`<div class="gallery-item wide audio">${icon('mic', { size: 20 })}<audio src="${m.url}" controls preload="metadata"></audio></div>`)}</div>` : ''}
    <div class="comments">
      ${e.comments.map((c) => html`<div class="comment">
        <div class="comment-head"><b>${c.authorName || 'スタッフ'}</b><span>${fmtRelDate(c.createdAt.slice(0, 10))}</span>
          ${c.mine ? html`<button class="link small-link" data-action="del-comment" data-id="${c.id}">削除</button>` : ''}</div>
        <p>${c.body}</p></div>`)}
      <form class="comment-form" data-entry="${e.id}">
        <textarea class="input" name="body" rows="2" maxlength="1000" placeholder="${e.member.name}さんにコメントする" aria-label="コメント"></textarea>
        <button class="btn btn-primary btn-sm" type="submit">送る</button>
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
      <a class="icon-btn" href="#/store" aria-label="店舗一覧へ">${icon('chevronLeft', { size: 22 })}</a>
      <div><p class="eyebrow">${store.category || '教室'}</p><h1 class="page-title small">${store.name}</h1></div>
      <span></span>
    </header>

    <section class="card code-card">
      <div>
        <p class="code-label">店舗ID</p>
        <p class="code-big num" id="store-code-text">${store.code}</p>
        <p class="muted small">生徒さんにこのIDを伝えてください。アプリの「マイページ → 教室・お店と連携」から入力できます。</p>
      </div>
      <div class="code-actions">
        <button class="btn btn-soft btn-sm" data-action="copy-code">IDをコピー</button>
        <button class="btn btn-ghost btn-sm" data-action="copy-url">招待リンクをコピー</button>
      </div>
    </section>

    <nav class="tabs" aria-label="店舗のメニュー">
      <a class="tab-link ${tab === 'feed' ? 'on' : ''}" href="#/store/${id}?tab=feed">共有された記録</a>
      <a class="tab-link ${tab === 'members' ? 'on' : ''}" href="#/store/${id}?tab=members">メンバー${store.pendingMembers ? html` <span class="dot-badge">${store.pendingMembers}</span>` : ''}</a>
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
      ${memberFilter ? html`<div class="filter-bar"><span>${feedItems[0]?.member.name ?? 'このメンバー'}さんの記録</span><a class="link" href="#/store/${id}?tab=feed">すべて表示</a></div>` : ''}
      ${feedItems.length ? html`<div class="feed">${feedItems.map(feedCard)}</div>`
        : html`<div class="empty card"><div class="empty-emoji">📒</div><p>まだ共有された記録はありません。<br>生徒さんが記録を共有すると、ここに表示されます。</p></div>`}
      ${cursor ? html`<button class="btn btn-ghost btn-block" data-action="more">もっと見る</button>` : ''}`);
  }

  async function loadMembers() {
    const { members } = await api(`/stores/${id}/members`);
    const pending = members.filter((m) => m.status === 'pending');
    const active = members.filter((m) => m.status === 'active');
    mount(body, html`
      ${pending.length ? html`<section class="card">
        <h2 class="card-title small">承認待ち ${pending.length}人</h2>
        <ul class="member-list">${pending.map((m) => html`<li class="member">
          <span class="avatar sm">${[...m.name][0]}</span>
          <div class="member-main"><b>${m.name}</b><span>${fmtRelDate(m.requestedAt.slice(0, 10))}に申請</span></div>
          <div class="member-actions">
            <button class="btn btn-primary btn-sm" data-action="approve" data-id="${m.linkId}">承認</button>
            <button class="btn btn-ghost btn-sm" data-action="reject" data-id="${m.linkId}">見送る</button>
          </div></li>`)}</ul>
      </section>` : ''}
      <section class="card">
        <h2 class="card-title small">連携中のメンバー ${active.length}人 <span class="muted small">/ 上限 ${store.plan.limits.maxMembers}人</span></h2>
        ${active.length ? html`<ul class="member-list">${active.map((m) => html`<li class="member">
          <span class="avatar sm">${[...m.name][0]}</span>
          <div class="member-main"><b>${m.name}</b>
            <span>${m.streak ? html`<span class="streak-mini">${icon('flame', { size: 13 })}${m.streak}日</span> ・ ` : ''}共有 ${m.sharedCount}件${m.lastSharedDate ? ` ・ 最終 ${fmtRelDate(m.lastSharedDate)}` : ''}</span></div>
          <div class="member-actions">
            <a class="btn btn-soft btn-sm" href="#/store/${id}?tab=feed&member=${m.linkId}">記録</a>
            <button class="icon-btn small" data-action="remove-member" data-id="${m.linkId}" data-name="${m.name}" aria-label="${m.name}さんの連携を外す">${icon('x', { size: 16 })}</button>
          </div></li>`)}</ul>`
        : html`<p class="muted">まだメンバーはいません。上の店舗IDを生徒さんに伝えましょう。</p>`}
        <p class="hint">継続日数は、生徒さんが共有した記録だけから数えています。</p>
      </section>`);
  }

  function loadSettings() {
    mount(body, html`
      ${isOwner ? html`<form class="card" id="store-settings" novalidate>
        <h2 class="card-title small">店舗の情報</h2>
        <label class="field"><span class="field-label">店舗名</span><input class="input" id="set-name" name="name" maxlength="40" value="${store.name}"></label>
        <label class="field"><span class="field-label">ジャンル</span><select class="input" id="set-category" name="category">
          ${categories.map((c) => html`<option value="${c}" ${c === store.category ? 'selected' : ''}>${c}</option>`)}</select></label>
        <label class="field"><span class="field-label">紹介文</span><input class="input" id="set-desc" name="description" maxlength="200" value="${store.description}"></label>
        <label class="toggle"><input type="checkbox" id="set-approval" name="requireApproval" ${store.requireApproval ? 'checked' : ''}>
          <span><b>連携を承認制にする</b><span class="muted small">オフにすると、店舗IDを入力した人がすぐ連携されます</span></span></label>
        <button class="btn btn-primary btn-block" type="submit">保存する</button>
      </form>` : html`<section class="card"><p class="muted">店舗の設定はオーナーが変更できます。</p></section>`}

      <section class="card">
        <h2 class="card-title small">スタッフ</h2>
        <ul class="member-list">${staff.map((s) => html`<li class="member">
          <span class="avatar sm">${[...s.name][0]}</span>
          <div class="member-main"><b>${s.name}${s.isMe ? '（あなた）' : ''}</b><span>${s.role === 'owner' ? 'オーナー' : 'スタッフ'}</span></div>
          ${isOwner && s.role !== 'owner' ? html`<button class="icon-btn small" data-action="remove-staff" data-id="${s.id}" data-name="${s.name}" aria-label="${s.name}さんを外す">${icon('x', { size: 16 })}</button>` : ''}
        </li>`)}</ul>
        ${isOwner ? html`<div class="staff-code">
          <p class="muted small">スタッフ招待コード（先生・スタッフにだけ伝えてください）</p>
          <p class="code-mid num" id="staff-code-text">${store.staffCode}</p>
          <div class="code-actions">
            <button class="btn btn-soft btn-sm" data-action="copy-staff">コピー</button>
            <button class="btn btn-ghost btn-sm" data-action="regen" data-type="staff">作り直す</button>
          </div></div>` : ''}
      </section>

      ${isOwner ? html`<section class="card">
        <h2 class="card-title small">店舗IDを作り直す</h2>
        <p class="muted small">店舗IDが意図しない人に広まったときに使います。すでに連携しているメンバーはそのまま残ります。</p>
        <button class="btn btn-ghost btn-sm danger" data-action="regen" data-type="member">店舗IDを作り直す</button>
      </section>` : ''}

      <section class="card">
        <h2 class="card-title small">プラン</h2>
        <p>${store.plan.label}プラン ・ メンバー${store.plan.limits.maxMembers}人まで ・ スタッフ${store.plan.limits.maxStaff}人まで</p>
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
      const card = form.closest('.feed-card');
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
