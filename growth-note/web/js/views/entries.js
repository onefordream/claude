import { api } from '../api.js';
import { html, mount, $, onAction, fmtRelDate, moodEmoji, toast } from '../ui.js';
import { icon } from '../icons.js';

function entryCard(e) {
  const counts = { image: 0, video: 0, audio: 0 };
  e.media.forEach((m) => counts[m.kind]++);
  const firstImage = e.media.find((m) => m.kind === 'image');
  return html`<a class="card entry-row" href="#/entries/${e.id}">
    <div class="entry-row-main">
      <div class="entry-row-top">
        <span class="entry-row-date">${fmtRelDate(e.localDate)}</span>
        ${e.mood ? html`<span class="entry-row-mood">${moodEmoji(e.mood)}</span>` : ''}
        ${e.goal ? html`<span class="pill pill-sm">${e.goal.icon} ${e.goal.title}</span>` : ''}
      </div>
      <p class="entry-row-text">${e.body || (e.insight?.summary ?? '添付のみの記録')}</p>
      ${e.insight?.status === 'done' && e.insight.summary && e.body && !e.body.trim().startsWith(e.insight.summary.replace(/…$/, '')) ? html`
        <p class="entry-row-ai">${icon('sparkles', { size: 14 })}${e.insight.summary}</p>` : ''}
      <div class="entry-row-foot">
        ${counts.image ? html`<span>${icon('image', { size: 14 })}${counts.image}</span>` : ''}
        ${counts.video ? html`<span>${icon('video', { size: 14 })}${counts.video}</span>` : ''}
        ${counts.audio ? html`<span>${icon('mic', { size: 14 })}${counts.audio}</span>` : ''}
        ${(e.insight?.data?.tags || []).map((t) => html`<span class="tag tag-sm"># ${t}</span>`)}
      </div>
    </div>
    ${firstImage ? html`<img class="entry-row-thumb" src="${firstImage.url}" alt="" loading="lazy">` : ''}
  </a>`;
}

function monthLabel(ymd) {
  const [y, m] = ymd.split('-');
  return `${y}年${Number(m)}月`;
}

export async function render(root, { query }) {
  let q = query.get('q') || '';
  let items = [];
  let cursor = null;
  let loading = false;
  let reqSeq = 0;

  mount(root, html`
    <header class="page-head">
      <div>
        <p class="eyebrow">これまでの積み重ね</p>
        <h1 class="page-title">ふりかえり</h1>
      </div>
    </header>
    <div class="search">
      ${icon('search', { size: 18 })}
      <input class="search-input" type="search" placeholder="キーワードで記録を探す" value="${q}" enterkeyhint="search" aria-label="記録を検索">
    </div>
    <div class="entry-list"></div>
    <div class="list-more"></div>
  `);

  const listEl = $('.entry-list', root);
  const moreEl = $('.list-more', root);

  function draw() {
    if (!items.length) {
      mount(listEl, q
        ? html`<div class="empty"><div class="empty-emoji">🔍</div><p>「${q}」に一致する記録は見つかりませんでした</p></div>`
        : html`<div class="empty">
            <div class="empty-emoji">📖</div>
            <p>まだ記録がありません。<br>最初の1件を残してみましょう。</p>
            <a class="btn btn-primary" href="#/write">${icon('plus', { size: 18 })}記録する</a>
          </div>`);
      mount(moreEl, '');
      return;
    }
    let lastMonth = '';
    mount(listEl, items.map((e) => {
      const m = e.localDate.slice(0, 7);
      const head = m !== lastMonth ? html`<h2 class="month-head">${monthLabel(e.localDate)}</h2>` : '';
      lastMonth = m;
      return html`${head}${entryCard(e)}`;
    }));
    mount(moreEl, cursor ? html`<button class="btn btn-ghost btn-block" data-action="more">もっと見る</button>` : html`<p class="list-end">${q ? `${items.length}件見つかりました` : 'ここまでがすべての記録です 🌱'}</p>`);
  }

  async function load(reset) {
    const seq = ++reqSeq;
    loading = true;
    try {
      const params = new URLSearchParams({ limit: '20' });
      if (q) params.set('q', q);
      if (!reset && cursor) params.set('cursor', cursor);
      const res = await api(`/entries?${params}`);
      if (seq !== reqSeq) return;
      items = reset ? res.items : items.concat(res.items);
      cursor = res.nextCursor;
      draw();
    } catch (err) {
      toast(err.message, { type: 'error' });
    } finally {
      loading = false;
    }
  }

  await load(true);

  const input = $('.search-input', root);
  let t;
  input.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      q = input.value.trim();
      history.replaceState(null, '', q ? `#/entries?q=${encodeURIComponent(q)}` : '#/entries');
      load(true);
    }, 300);
  });

  const off = onAction(root, {
    more: () => !loading && load(false),
  });
  return () => {
    clearTimeout(t);
    off();
  };
}
