import { api } from '../api.js';
import { html, mount, onAction, toast, progressBar, fmtNum, fmtDate } from '../ui.js';
import { icon } from '../icons.js';

export function paceLabel(g) {
  if (g.status === 'done') return html`<span class="status status-success">達成</span>`;
  if (g.pace === 'overdue') return html`<span class="status status-error">期限切れ</span>`;
  if (g.pace === 'behind') return html`<span class="status status-warning">遅れ気味</span>`;
  return html`<span class="status">順調</span>`;
}

function dueText(g) {
  if (g.status === 'done') return `${fmtDate(g.completedAt ? g.completedAt.slice(0, 10) : g.dueDate, { weekday: false })}に達成`;
  if (g.daysLeft < 0) return '期限を過ぎています';
  if (g.daysLeft === 0) return '今日が期限';
  return `期限まで${g.daysLeft}日`;
}

export function goalCard(g) {
  return html`<div class="goal-item ${g.status}">
    <a class="goal-item-link" href="#/goals/${g.id}">
      <span class="goal-item-head"><span class="goal-item-title">${g.title}</span>${paceLabel(g)}</span>
      ${progressBar(g.progress, { cls: g.status === 'done' ? '' : g.pace === 'behind' || g.pace === 'overdue' ? 'progress-warn' : '' })}
      <span class="goal-item-foot">
        <span class="num"><b>${fmtNum(g.currentValue)}</b> / ${fmtNum(g.targetValue)} ${g.unit}　${Math.round(g.progress * 100)}%</span>
        <span>${dueText(g)}</span>
      </span>
    </a>
    ${g.status === 'active' ? html`<button class="btn btn-secondary btn-sm quick-add" data-action="plus" data-id="${g.id}" aria-label="${g.title}に1${g.unit}加える">+1 ${g.unit}</button>` : ''}
  </div>`;
}

export async function render(root, _params, { state }) {
  let goals = (await api('/goals')).goals;
  const maxActive = state.me.plan.limits.maxActiveGoals;

  const draw = () => {
    const active = goals.filter((g) => g.status === 'active');
    const done = goals.filter((g) => g.status === 'done');
    mount(root, html`
      <header class="page-head">
        <div class="page-head-main">
          <h1 class="page-title">目標</h1>
          <p class="page-sub">取り組み中 ${active.length} / ${maxActive >= 50 ? '上限なし' : maxActive}</p>
        </div>
        ${active.length ? html`<a class="btn btn-primary btn-sm" href="#/goals/new">${icon('plus', { size: 16 })}目標を追加</a>` : ''}
      </header>

      ${active.length ? html`<div class="list">${active.map(goalCard)}</div>` : html`
        <div class="empty">
          <p>期限つきの目標を決めると、毎日の記録が進捗として残ります。</p>
          <a class="btn btn-primary" href="#/goals/new">目標を作成</a>
        </div>`}

      ${done.length ? html`<section class="section">
        <div class="section-head"><h2 class="section-title">達成した目標</h2><span class="section-meta">${done.length}件</span></div>
        <div class="list">${done.map(goalCard)}</div>
      </section>` : ''}
    `);
  };
  draw();

  return onAction(root, {
    plus: async (el) => {
      el.disabled = true;
      try {
        const res = await api(`/goals/${el.dataset.id}/progress`, { method: 'POST', body: { delta: 1 } });
        goals = goals.map((g) => (g.id === res.goal.id ? res.goal : g));
        draw();
        if (res.justCompleted) toast(`「${res.goal.title}」を達成しました`, { ms: 4000 });
        else if (navigator.vibrate) navigator.vibrate(10);
      } catch (err) {
        toast(err.message, { type: 'error' });
        el.disabled = false;
      }
    },
  });
}
