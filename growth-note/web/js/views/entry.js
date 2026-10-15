import { api } from '../api.js';
import { html, mount, $, onAction, toast, fmtRelDate, fmtTime, moodEmoji, celebrate, confirmSheet, paywallCard } from '../ui.js';
import { icon } from '../icons.js';
import { takeCelebration } from './write.js';

function commentsBlock(comments) {
  if (!comments?.length) return '';
  return html`<section class="card teacher-card">
    <div class="card-head"><h2 class="card-title">${icon('user', { size: 18 })}先生からのコメント</h2></div>
    <div class="comments">${comments.map((c) => html`<div class="comment ${c.unread ? 'unread' : ''}">
      <div class="comment-head"><b>${c.authorName || '先生'}</b><span>${c.storeName} ・ ${fmtRelDate(c.createdAt.slice(0, 10))}</span>
        ${c.unread ? html`<span class="pill pill-sm">NEW</span>` : ''}</div>
      <p>${c.body}</p></div>`)}</div>
  </section>`;
}

function shareBlock(entry, activeLinks) {
  if (!activeLinks.length) return '';
  const shared = new Set(entry.shares.map((x) => x.storeId));
  return html`<section class="card share-block">
    <h2 class="card-title small">教室・お店への共有</h2>
    <div class="share-pick">${activeLinks.map((l) => html`<button class="chip share-chip ${shared.has(l.store.id) ? 'on' : ''}" data-action="share" data-id="${l.store.id}" aria-pressed="${shared.has(l.store.id)}">
      ${icon('check', { size: 14, stroke: 3 })}${l.store.name}</button>`)}</div>
    <p class="hint">${shared.size ? '選んだ店舗の先生がこの記録を見られます。タップで共有をやめられます。' : 'タップすると、この記録を先生に共有できます。'}</p>
  </section>`;
}

export function insightBlock(insight, { compact = false, me = null } = {}) {
  if (!insight) return '';
  if (insight.status === 'pending') {
    return html`<section class="card ai-card pending">
      <div class="card-head"><h2 class="card-title">${icon('sparkles', { size: 18 })}AIがふりかえり中…</h2></div>
      <div class="skeleton-lines"><i></i><i></i><i class="short"></i></div>
    </section>`;
  }
  if (insight.status === 'failed') {
    return html`<section class="card ai-card">
      <p class="muted">AIの分析を作成できませんでした。</p>
      <button class="btn btn-soft btn-sm" data-action="retry-insight">${icon('refresh', { size: 16 })}もう一度分析する</button>
    </section>`;
  }
  if (insight.locked) {
    const isPro = me?.plan?.id === 'pro';
    return html`<section class="card ai-card">
      <div class="card-head"><h2 class="card-title">${icon('sparkles', { size: 18 })}AIのふりかえり</h2>${isPro ? '' : html`<span class="plan-badge pro small">プロ</span>`}</div>
      ${insight.data?.encouragement ? html`<p class="ai-cheer">${insight.data.encouragement}</p>` : ''}
      ${isPro
        ? html`<p class="muted">この記録はまだAIでふりかえっていません。</p>
            <button class="btn btn-primary btn-block" data-action="retry-insight">${icon('sparkles', { size: 18 })}AIでふりかえる</button>`
        : html`<div class="locked-wrap small">
            <div class="locked-preview" aria-hidden="true">
              <p class="ai-summary">今日の取り組みでは、前回の課題を意識して練習の質が上がっています。</p>
              <h3 class="ai-h">気づき</h3><ul class="ai-list"><li>同じ失敗の原因がはっきりしてきています。</li><li>続けている習慣が成果につながり始めています。</li></ul>
              <h3 class="ai-h">次の一歩</h3><ul class="ai-actions"><li><span class="dot"></span>次回はひとつだけ条件を変えて試してみる</li></ul>
            </div>
            ${paywallCard(me, { title: 'AIが記録を読み解きます', text: '要約・気づき・次の一歩を、記録するたびにAIがまとめます。', reason: 'insight' })}
          </div>`}
    </section>`;
  }
  const d = insight.data || {};
  return html`<section class="card ai-card">
    <div class="card-head">
      <h2 class="card-title">${icon('sparkles', { size: 18 })}AIのふりかえり</h2>
      ${insight.provider === 'local' ? html`<span class="src-tag">簡易モード</span>` : ''}
    </div>
    ${d.encouragement ? html`<p class="ai-cheer">${d.encouragement}</p>` : ''}
    <p class="ai-summary">${insight.summary}</p>
    ${d.insights?.length ? html`
      <h3 class="ai-h">${icon('bulb', { size: 16 })}気づき</h3>
      <ul class="ai-list">${d.insights.map((t) => html`<li>${t}</li>`)}</ul>` : ''}
    ${d.next_actions?.length ? html`
      <h3 class="ai-h">${icon('arrowRight', { size: 16 })}次の一歩</h3>
      <ul class="ai-actions">${d.next_actions.map((t) => html`<li><span class="dot"></span>${t}</li>`)}</ul>` : ''}
    ${d.tags?.length && !compact ? html`<div class="tags">${d.tags.map((t) => html`<span class="tag"># ${t}</span>`)}</div>` : ''}
    ${insight.note ? html`<p class="hint">${insight.note}</p>` : ''}
  </section>`;
}

function mediaGallery(media) {
  if (!media.length) return '';
  return html`<div class="gallery">${media.map((m) =>
    m.kind === 'image'
      ? html`<a class="gallery-item" href="${m.url}" target="_blank" rel="noopener"><img src="${m.url}" alt="添付写真" loading="lazy"></a>`
      : m.kind === 'video'
        ? html`<div class="gallery-item wide"><video src="${m.url}" controls playsinline preload="metadata"></video></div>`
        : html`<div class="gallery-item wide audio">${icon('mic', { size: 20 })}<audio src="${m.url}" controls preload="metadata"></audio></div>`,
  )}</div>`;
}

function celebrationBlock(c) {
  if (!c) return '';
  const title = c.goalCompleted ? '目標達成、おめでとうございます！'
    : c.firstToday && c.streak > 1 ? `${c.streak}日連続！`
    : c.firstToday ? '今日の記録、完了！'
    : '記録しました';
  return html`<section class="celebrate">
    <div class="celebrate-burst">${c.goalCompleted ? c.goalCompleted.icon : c.firstToday ? '🔥' : '✏️'}</div>
    <h2 class="celebrate-title">${title}</h2>
    <p class="celebrate-sub">${c.goalCompleted ? `「${c.goalCompleted.title}」を達成しました`
      : `これまでに ${c.totalEntries}件 の記録が積み重なりました`}</p>
    ${c.newBadges?.length ? html`<div class="new-badges">${c.newBadges.map((b) => html`
      <div class="new-badge"><span class="badge-icon">${b.icon}</span><span><strong>${b.title}</strong><small>バッジを獲得</small></span></div>`)}</div>` : ''}
  </section>`;
}

export async function render(root, { id, query }, { navigate, state }) {
  const isNew = query.get('new') === '1';
  const celebration = isNew ? takeCelebration() : null;
  let [entry, activeLinks] = await Promise.all([
    api(`/entries/${id}`).then((r) => r.entry),
    api('/links').then((r) => r.links.filter((l) => l.status === 'active')).catch(() => []),
  ]);
  let pollTimer = null;
  let stopped = false;

  const draw = () => {
    mount(root, html`
      <header class="page-head with-back">
        <a class="icon-btn" href="#/entries" aria-label="一覧へ">${icon('chevronLeft', { size: 22 })}</a>
        <div>
          <p class="eyebrow">${fmtRelDate(entry.localDate)} ・ ${fmtTime(entry.createdAt)}</p>
          <h1 class="page-title small">記録</h1>
        </div>
        <button class="icon-btn" data-action="delete" aria-label="削除">${icon('trash', { size: 20 })}</button>
      </header>

      ${celebrationBlock(celebration)}

      <article class="card entry-card">
        <div class="entry-meta">
          ${entry.mood ? html`<span class="entry-mood" title="気分">${moodEmoji(entry.mood)}</span>` : ''}
          ${entry.goal ? html`<a class="pill" href="#/goals/${entry.goal.id}">${entry.goal.icon} ${entry.goal.title}</a>` : ''}
        </div>
        ${entry.golf ? html`<a class="golf-entry" href="#/golf/rounds/${entry.golf.roundId}">
          <span class="golf-entry-score"><b class="num">${entry.golf.score}</b><small>${entry.golf.toPar > 0 ? `+${entry.golf.toPar}` : entry.golf.toPar === 0 ? '±0' : entry.golf.toPar}</small></span>
          <span class="golf-entry-main"><b>⛳ ${entry.golf.course}</b><span>スコアカードを見る</span></span>${icon('chevronRight', { size: 16 })}</a>` : ''}
        ${entry.body ? html`<p class="entry-body">${entry.body}</p>` : ''}
        ${mediaGallery(entry.media)}
      </article>

      ${commentsBlock(entry.comments)}

      ${insightBlock(entry.insight, { me: state.me })}

      ${shareBlock(entry, activeLinks)}

      ${isNew ? html`<div class="after-actions">
        <a class="btn btn-primary btn-block btn-lg" href="#/">ホームへ</a>
        <a class="btn btn-ghost btn-block" href="#/write">もう1件記録する</a>
      </div>` : ''}
    `);
  };
  draw();
  if (celebration && (celebration.firstToday || celebration.goalCompleted || celebration.newBadges?.length)) celebrate();

  // AI の結果が出るまでポーリング（最大 90 秒）
  const started = Date.now();
  const poll = async () => {
    if (stopped || entry.insight?.status !== 'pending') return;
    if (Date.now() - started > 90_000) return;
    try {
      entry = (await api(`/entries/${id}`)).entry;
      if (!stopped && entry.insight?.status !== 'pending') {
        const scrollY = window.scrollY;
        draw();
        window.scrollTo(0, scrollY);
        $('.ai-card', root)?.classList.add('reveal');
        return;
      }
    } catch {
      /* 一時的な通信エラーは無視して次回再試行 */
    }
    pollTimer = setTimeout(poll, 1800);
  };
  pollTimer = setTimeout(poll, 1200);

  const off = onAction(root, {
    delete: async () => {
      const ok = await confirmSheet({ title: 'この記録を削除しますか？', message: '添付した写真や動画も削除され、元に戻せません。', ok: '削除する', danger: true });
      if (!ok) return;
      try {
        await api(`/entries/${id}`, { method: 'DELETE' });
        toast('削除しました');
        navigate('/entries', { replace: true });
      } catch (err) {
        toast(err.message, { type: 'error' });
      }
    },
    share: async (el) => {
      const ids = new Set(entry.shares.map((x) => x.storeId));
      if (ids.has(el.dataset.id)) ids.delete(el.dataset.id);
      else ids.add(el.dataset.id);
      try {
        entry = (await api(`/entries/${id}/shares`, { method: 'PUT', body: { storeIds: [...ids] } })).entry;
        const box = $('.share-block', root);
        const tmp = document.createElement('div');
        mount(tmp, shareBlock(entry, activeLinks));
        box.replaceWith(tmp.firstElementChild);
        toast(ids.has(el.dataset.id) ? '共有しました' : '共有をやめました');
      } catch (err) {
        toast(err.message, { type: 'error' });
      }
    },
    'retry-insight': async () => {
      try {
        entry = (await api(`/entries/${id}/insight`, { method: 'POST', body: {} })).entry;
        draw();
        pollTimer = setTimeout(poll, 1200);
      } catch (err) {
        toast(err.message, { type: 'error' });
      }
    },
  });

  return () => {
    stopped = true;
    clearTimeout(pollTimer);
    off();
  };
}
