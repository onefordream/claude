import { api } from '../api.js';
import { html, mount, $, onAction, fmtRelDate, moodLabel, toast } from '../ui.js';
import { icon } from '../icons.js';

const WD = ['日', '月', '火', '水', '木', '金', '土'];
function dayNote(ymd) {
  const rel = fmtRelDate(ymd);
  if (rel === '今日' || rel === '昨日') return rel;
  const [y, m, d] = ymd.split('-').map(Number);
  return WD[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

function entryRow(e) {
  const counts = { image: 0, video: 0, audio: 0 };
  e.media.forEach((m) => counts[m.kind]++);
  const firstImage = e.media.find((m) => m.kind === 'image');
  const mediaText = [counts.image && `写真${counts.image}`, counts.video && `動画${counts.video}`, counts.audio && `音声${counts.audio}`].filter(Boolean).join('・');
  const meta = [
    e.mood ? moodLabel(e.mood) : null,
    e.goal ? e.goal.title : null,
    mediaText || null,
    e.shares?.length ? `${e.shares.map((x) => x.storeName).join('・')}に共有` : null,
  ].filter(Boolean);
  return html`<a class="entry-row" href="#/entries/${e.id}">
    <span class="entry-row-date"><b>${Number(e.localDate.slice(8))}</b><small>${dayNote(e.localDate)}</small></span>
    <span class="entry-row-main">
      <span class="entry-row-text">${e.body || (e.insight?.summary ?? '添付のみの記録')}</span>
      ${e.insight?.status === 'done' && e.insight.summary && e.body && !e.body.trim().startsWith(e.insight.summary.replace(/…$/, '')) ? html`
        <span class="entry-row-ai">AI　${e.insight.summary}</span>` : ''}
      ${meta.length || e.comments?.length ? html`<span class="entry-row-meta">${meta.join('　')}${e.comments?.length ? html`<span class="tag tag-accent">コメント ${e.comments.length}</span>` : ''}</span>` : ''}
    </span>
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
      <div class="page-head-main">
        <h1 class="page-title">記録</h1>
      </div>
      <a class="text-btn" href="#/growth">成長分析</a>
    </header>
    <div class="search">
      ${icon('search', { size: 16 })}
      <input class="search-input" type="search" placeholder="キーワードで探す" value="${q}" enterkeyhint="search" aria-label="記録を検索">
    </div>
    <div class="entry-list"></div>
    <div class="list-more"></div>
  `);

  const listEl = $('.entry-list', root);
  const moreEl = $('.list-more', root);

  function draw() {
    if (!items.length) {
      mount(listEl, q
        ? html`<div class="empty"><p>「${q}」に一致する記録はありません。</p></div>`
        : html`<div class="empty">
            <p>まだ記録がありません。</p>
            <a class="btn btn-primary" href="#/write">記録を追加</a>
          </div>`);
      mount(moreEl, '');
      return;
    }
    // 月ごとにまとめる
    const groups = [];
    for (const e of items) {
      const m = e.localDate.slice(0, 7);
      if (!groups.length || groups[groups.length - 1].m !== m) groups.push({ m, items: [] });
      groups[groups.length - 1].items.push(e);
    }
    mount(listEl, groups.map((g) => html`<section class="month">
      <h2 class="month-head">${monthLabel(g.m)}</h2>
      <div class="list">${g.items.map(entryRow)}</div>
    </section>`));
    mount(moreEl, cursor ? html`<button class="btn btn-secondary btn-block" data-action="more">さらに読み込む</button>` : html`<p class="list-end">${q ? `${items.length}件` : 'すべての記録を表示しました'}</p>`);
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
