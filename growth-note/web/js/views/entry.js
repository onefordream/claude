import { api } from '../api.js';
import { html, mount, $, onAction, toast, fmtRelDate, fmtTime, moodLabel, confirmSheet, paywallCard } from '../ui.js';
import { icon } from '../icons.js';
import { takeCelebration } from './write.js';

function commentsBlock(comments) {
  if (!comments?.length) return '';
  return html`<section class="section">
    <div class="section-head"><h2 class="section-title">先生からのコメント</h2><span class="section-meta">${comments.length}件</span></div>
    <div class="list">${comments.map((c) => html`<div class="comment ${c.unread ? 'unread' : ''}">
      <p class="comment-meta"><b>${c.authorName || '先生'}</b>${c.storeName}　${fmtRelDate(c.createdAt.slice(0, 10))}${c.unread ? html`<span class="tag tag-accent">新着</span>` : ''}</p>
      <p>${c.body}</p></div>`)}</div>
  </section>`;
}

function shareBlock(entry, activeLinks) {
  if (!activeLinks.length) return '';
  const shared = new Set(entry.shares.map((x) => x.storeId));
  return html`<section class="section share-block">
    <h2 class="section-title">教室・お店への共有</h2>
    <div class="chips">${activeLinks.map((l) => html`<button class="chip ${shared.has(l.store.id) ? 'on' : ''}" data-action="share" data-id="${l.store.id}" aria-pressed="${shared.has(l.store.id)}">${l.store.name}</button>`)}</div>
    <p class="hint">${shared.size ? '選んだ店舗の先生がこの記録を見られます。もう一度押すと共有をやめます。' : '押すと、この記録を先生に共有できます。'}</p>
  </section>`;
}

const LOCKED_SAMPLE = html`<div class="locked-preview" aria-hidden="true">
  <p class="ai-summary">今日の取り組みでは、前回の課題を意識して練習の質が上がっています。</p>
  <h3 class="sub-title">気づき</h3><ul class="bullets"><li>同じ失敗の原因がはっきりしてきています。</li><li>続けている習慣が成果につながり始めています。</li></ul>
  <h3 class="sub-title">次の一歩</h3><ol class="steps"><li>次回はひとつだけ条件を変えて試してみる</li></ol>
</div>`;

export function insightBlock(insight, { me = null } = {}) {
  if (!insight) return '';
  const head = (extra = '') => html`<div class="section-head"><h2 class="section-title">AIのふりかえり</h2>${extra}</div>`;
  if (insight.status === 'pending') {
    return html`<section class="section ai-block pending">
      ${head(html`<span class="section-meta">作成中</span>`)}
      <div class="skeleton-lines" aria-label="AIがふりかえりを作成しています"><i></i><i></i><i class="short"></i></div>
    </section>`;
  }
  if (insight.status === 'failed') {
    return html`<section class="section ai-block">
      ${head()}
      <p class="muted">AIのふりかえりを作成できませんでした。</p>
      <button class="btn btn-secondary btn-sm" data-action="retry-insight">もう一度作成する</button>
    </section>`;
  }
  if (insight.locked) {
    const isPro = me?.plan?.id === 'pro';
    return html`<section class="section ai-block">
      ${head(isPro ? '' : html`<span class="tag">プロ</span>`)}
      ${insight.data?.encouragement ? html`<p class="ai-note">${insight.data.encouragement}</p>` : ''}
      ${isPro
        ? html`<p class="muted">この記録はまだAIでふりかえっていません。</p>
            <button class="btn btn-primary" data-action="retry-insight">AIでふりかえる</button>`
        : html`<div class="locked-wrap">
            ${LOCKED_SAMPLE}
            ${paywallCard(me, { title: 'AIが記録を読み解きます', text: '要約・気づき・次の一歩を、記録するたびにAIがまとめます。', reason: 'insight' })}
          </div>`}
    </section>`;
  }
  const d = insight.data || {};
  return html`<section class="section ai-block">
    ${head(insight.provider === 'local' ? html`<span class="section-meta">簡易モード</span>` : '')}
    <p class="ai-summary">${insight.summary}</p>
    ${d.insights?.length ? html`
      <h3 class="sub-title">気づき</h3>
      <ul class="bullets">${d.insights.map((t) => html`<li>${t}</li>`)}</ul>` : ''}
    ${d.next_actions?.length ? html`
      <h3 class="sub-title">次の一歩</h3>
      <ol class="steps">${d.next_actions.map((t) => html`<li>${t}</li>`)}</ol>` : ''}
    ${d.encouragement ? html`<p class="ai-note">${d.encouragement}</p>` : ''}
    ${d.tags?.length ? html`<div class="tags">${d.tags.map((t) => html`<span class="tag">${t}</span>`)}</div>` : ''}
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
        : html`<div class="gallery-item wide audio"><audio src="${m.url}" controls preload="metadata"></audio></div>`,
  )}</div>`;
}

/** 保存直後の確認表示。演出はせず、積み重ねの数字だけを示す */
function confirmationBlock(c) {
  if (!c) return '';
  const title = c.goalCompleted ? `「${c.goalCompleted.title}」を達成しました` : '記録しました';
  const facts = [
    c.firstToday && c.streak > 1 ? `${c.streak}日連続` : null,
    `累計 ${c.totalEntries}件`,
  ].filter(Boolean);
  return html`<section class="confirm" role="status">
    <p class="confirm-title">${icon('check', { size: 16 })}${title}</p>
    <p class="confirm-facts">${facts.join('　')}</p>
    ${c.newBadges?.length ? html`<p class="confirm-facts">新しい実績：${c.newBadges.map((b) => b.title).join('、')}</p>` : ''}
  </section>`;
}

const toParText = (v) => (v > 0 ? `+${v}` : v === 0 ? '±0' : `${v}`);

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
        <a class="icon-btn" href="#/entries" aria-label="一覧へ戻る">${icon('caretLeft', { size: 20 })}</a>
        <div class="page-head-main">
          <p class="eyebrow">${fmtRelDate(entry.localDate)}　${fmtTime(entry.createdAt)}</p>
          <h1 class="page-title page-title-sm">記録</h1>
        </div>
        <button class="icon-btn" data-action="delete" aria-label="この記録を削除">${icon('trash', { size: 20 })}</button>
      </header>

      ${confirmationBlock(celebration)}

      <article class="entry">
        ${entry.mood || entry.goal ? html`<p class="entry-meta">
          ${entry.mood ? html`<span>気分　${moodLabel(entry.mood)}</span>` : ''}
          ${entry.goal ? html`<a href="#/goals/${entry.goal.id}">目標　${entry.goal.title}</a>` : ''}
        </p>` : ''}
        ${entry.golf ? html`<a class="row row-boxed" href="#/golf/rounds/${entry.golf.roundId}">
          <span class="row-value row-value-lead">${entry.golf.score}<small>${toParText(entry.golf.toPar)}</small></span>
          <span class="row-main"><span class="row-title">${entry.golf.course}</span><span class="row-sub">スコアカードを見る</span></span>${icon('caretRight', { size: 16 })}</a>` : ''}
        ${entry.body ? html`<p class="entry-body">${entry.body}</p>` : ''}
        ${mediaGallery(entry.media)}
      </article>

      ${commentsBlock(entry.comments)}

      ${insightBlock(entry.insight, { me: state.me })}

      ${shareBlock(entry, activeLinks)}

      ${isNew ? html`<div class="form-foot">
        <a class="btn btn-secondary btn-block" href="#/">今日の画面へ</a>
        <a class="text-btn" href="#/write">もう1件追加</a>
      </div>` : ''}
    `);
  };
  draw();

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
        $('.ai-block', root)?.classList.add('reveal');
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
