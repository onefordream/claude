import { api } from '../api.js';
import { html, mount, $, $$, onAction, toast, confirmSheet } from '../ui.js';
import { icon } from '../icons.js';

// 生徒側: 通っている教室・お店と連携する

const SHARE_OPTIONS = [
  { v: 'selected', title: '選んだ記録だけ共有', desc: '記録を書くときに、共有するかどうかを毎回選べます（おすすめ）' },
  { v: 'all', title: 'これからの記録をすべて共有', desc: '新しく書く記録が自動で共有されます。あとから個別に外せます' },
];

function shareOptions(current) {
  return html`<div class="radio-cards" role="radiogroup" aria-label="共有のしかた">
    ${SHARE_OPTIONS.map((o) => html`
      <label class="radio-card ${current === o.v ? 'on' : ''}">
        <input type="radio" name="shareMode" value="${o.v}" ${current === o.v ? 'checked' : ''}>
        <span class="radio-dot"></span>
        <span class="radio-body"><b>${o.title}</b><span>${o.desc}</span></span>
      </label>`)}
  </div>`;
}

const CONSENT = html`<div class="consent">
  <div><p class="consent-h">${icon('check', { size: 16, stroke: 2.6 })}店舗に見えるもの</p>
    <ul><li>あなたが共有した記録（本文・写真・動画・音声・気分）</li><li>ニックネーム</li><li>共有した記録から数えた継続日数</li></ul></div>
  <div><p class="consent-h no">${icon('lock', { size: 16 })}店舗に見えないもの</p>
    <ul><li>共有していない記録</li><li>AIのふりかえり・目標</li><li>メールアドレス</li></ul></div>
  <p class="consent-foot">連携はいつでも解除できます。解除すると、その時点から店舗は記録を見られなくなります。</p>
</div>`;

function bindRadio(root, onChange) {
  $$('input[name=shareMode]', root).forEach((r) => r.addEventListener('change', () => {
    $$('.radio-card', root).forEach((c) => c.classList.toggle('on', $('input', c).checked));
    onChange?.(r.value);
  }));
}

async function renderNew(root, query, { navigate }) {
  let store = null;
  let shareMode = 'selected';

  const draw = () => mount(root, html`
    <header class="page-head with-back">
      <a class="icon-btn" href="#/me" aria-label="戻る">${icon('chevronLeft', { size: 22 })}</a>
      <div><h1 class="page-title small">教室・お店と連携</h1></div>
      <span></span>
    </header>

    ${!store ? html`
      <section class="card link-intro">
        <div class="link-intro-icon">${icon('target', { size: 28 })}</div>
        <p>レッスンに通っている教室・お店から案内された<b>店舗ID</b>を入力すると、記録を先生に見てもらえるようになります。</p>
      </section>
      <form class="card" id="lookup-form" novalidate>
        <label class="field">
          <span class="field-label">店舗ID</span>
          <input class="input code-input" id="store-code" name="code" placeholder="例: K7QM-4XPA" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="12" value="${query.get('code') || ''}">
        </label>
        <p class="form-error" role="alert" hidden></p>
        <button class="btn btn-primary btn-block btn-lg" type="submit">確認する</button>
      </form>`
    : html`
      <section class="card store-preview">
        <span class="store-badge">${(store.category || '教室')}</span>
        <h2 class="store-name">${store.name}</h2>
        ${store.description ? html`<p class="muted">${store.description}</p>` : ''}
        ${store.requireApproval ? html`<p class="hint">この店舗は承認制です。先生が承認すると連携が始まります。</p>` : ''}
        <button class="link small-link" data-action="change">別の店舗IDを入力する</button>
      </section>
      <section class="card">
        <h2 class="card-title small">共有のしかた</h2>
        ${shareOptions(shareMode)}
      </section>
      <section class="card">${CONSENT}</section>
      <button class="btn btn-primary btn-block btn-lg" data-action="link">${icon('check', { size: 20, stroke: 2.6 })}この店舗と連携する</button>`}
  `);

  draw();

  async function lookup(code) {
    const err = $('.form-error', root);
    const btn = $('#lookup-form button[type=submit]', root);
    err.hidden = true;
    btn.classList.add('loading');
    try {
      const res = await api(`/stores/lookup?code=${encodeURIComponent(code)}`);
      if (res.existing) {
        toast(res.existing.status === 'active' ? 'この店舗とはすでに連携しています' : 'この店舗の承認を待っています');
        return navigate(`/links/${res.existing.id}`, { replace: true });
      }
      store = { ...res.store, code };
      draw();
      bindRadio(root, (v) => { shareMode = v; });
    } catch (e) {
      err.textContent = e.message;
      err.hidden = false;
    } finally {
      btn?.classList.remove('loading');
    }
  }

  function bindForm() {
    const form = $('#lookup-form', root);
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const code = form.code.value.trim();
      if (!code) return form.code.focus();
      lookup(code);
    });
    if (!query.get('code')) setTimeout(() => form.code.focus({ preventScroll: true }), 150);
  }
  bindForm();
  if (query.get('code')) lookup(query.get('code'));

  return onAction(root, {
    change: () => {
      store = null;
      draw();
      bindForm();
    },
    link: async (el) => {
      el.classList.add('loading');
      try {
        const res = await api('/links', { method: 'POST', body: { code: store.code, shareMode } });
        toast(res.link.status === 'active' ? `${store.name}と連携しました` : '連携を申請しました。承認をお待ちください', { ms: 3500 });
        navigate(`/links/${res.link.id}`, { replace: true });
      } catch (e) {
        toast(e.message, { type: 'error' });
      } finally {
        el.classList.remove('loading');
      }
    },
  });
}

async function renderDetail(root, id, { navigate }) {
  let link = (await api(`/links/${id}`)).link;

  const draw = () => mount(root, html`
    <header class="page-head with-back">
      <a class="icon-btn" href="#/me" aria-label="戻る">${icon('chevronLeft', { size: 22 })}</a>
      <div><h1 class="page-title small">連携中の教室・お店</h1></div>
      <span></span>
    </header>
    <section class="card store-preview">
      <span class="store-badge">${link.store.category || '教室'}</span>
      <h2 class="store-name">${link.store.name}</h2>
      ${link.store.description ? html`<p class="muted">${link.store.description}</p>` : ''}
      <div class="link-status">
        ${link.status === 'active'
          ? html`<span class="pill">${icon('check', { size: 14, stroke: 3 })}連携中</span><span class="muted small">共有した記録 ${link.sharedCount ?? 0}件</span>`
          : html`<span class="pill pill-wait">承認待ち</span><span class="muted small">先生が承認すると共有できるようになります</span>`}
      </div>
    </section>
    <section class="card">
      <h2 class="card-title small">共有のしかた</h2>
      ${shareOptions(link.shareMode)}
    </section>
    <section class="card">${CONSENT}</section>
    <div class="danger-zone">
      <button class="btn btn-ghost btn-sm danger" data-action="unlink">${link.status === 'active' ? '連携を解除する' : '申請を取り消す'}</button>
    </div>
  `);
  draw();
  bindRadio(root, async (v) => {
    try {
      link = (await api(`/links/${id}`, { method: 'PATCH', body: { shareMode: v } })).link;
      toast('共有のしかたを変更しました');
    } catch (e) {
      toast(e.message, { type: 'error' });
    }
  });

  return onAction(root, {
    unlink: async () => {
      const ok = await confirmSheet({
        title: `${link.store.name}との連携を解除しますか？`,
        message: '解除すると、店舗はあなたの記録を見られなくなります。記録そのものは消えません。',
        ok: '解除する',
        danger: true,
      });
      if (!ok) return;
      await api(`/links/${id}`, { method: 'DELETE' });
      toast('連携を解除しました');
      navigate('/me', { replace: true });
    },
  });
}

export async function render(root, { id, query }, ctx) {
  return id ? renderDetail(root, id, ctx) : renderNew(root, query, ctx);
}
