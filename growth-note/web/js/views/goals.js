import { api } from '../api.js';
import { html, mount, onAction, toast, progressBar, fmtNum, fmtDate, celebrate } from '../ui.js';
import { icon } from '../icons.js';

export function paceLabel(g) {
  if (g.status === 'done') return html`<span class="pace done">${icon('check', { size: 13, stroke: 3 })}達成</span>`;
  if (g.pace === 'overdue') return html`<span class="pace over">期限切れ</span>`;
  if (g.pace === 'behind') return html`<span class="pace behind">少しペースアップ</span>`;
  return html`<span class="pace ok">順調</span>`;
}

export function goalCard(g) {
  return html`<article class="card goal-card ${g.status}">
    <a class="goal-card-link" href="#/goals/${g.id}">
      <div class="goal-card-head">
        <span class="goal-icon lg">${g.icon}</span>
        <div class="goal-card-title">
          <h3>${g.title}</h3>
          <p>${g.status === 'done' ? `${fmtDate(g.completedAt ? g.completedAt.slice(0, 10) : g.dueDate, { weekday: false })}に達成` : g.daysLeft < 0 ? '期限を過ぎています' : g.daysLeft === 0 ? '今日が期限' : `期限まであと${g.daysLeft}日`}</p>
        </div>
        ${paceLabel(g)}
      </div>
      <div class="goal-card-progress">
        ${progressBar(g.progress, { cls: g.status === 'done' ? 'progress-done' : g.pace === 'behind' || g.pace === 'overdue' ? 'progress-warn' : '' })}
        <div class="goal-card-nums"><strong>${fmtNum(g.currentValue)}</strong> / ${fmtNum(g.targetValue)} ${g.unit}<span>${Math.round(g.progress * 100)}%</span></div>
      </div>
    </a>
    ${g.status === 'active' ? html`<button class="quick-add" data-action="plus" data-id="${g.id}" aria-label="${g.title}に1${g.unit}加える">+1<small>${g.unit}</small></button>` : ''}
  </article>`;
}

export async function render(root, _params, { state }) {
  let goals = (await api('/goals')).goals;
  const maxActive = state.me.plan.limits.maxActiveGoals;

  const draw = () => {
    const active = goals.filter((g) => g.status === 'active');
    const done = goals.filter((g) => g.status === 'done');
    mount(root, html`
      <header class="page-head">
        <div>
          <p class="eyebrow">自分で決めた、なりたい姿</p>
          <h1 class="page-title">目標</h1>
        </div>
        <a class="btn btn-primary btn-sm" href="#/goals/new">${icon('plus', { size: 18, stroke: 2.4 })}追加</a>
      </header>

      ${active.length ? html`<div class="goal-list">${active.map(goalCard)}</div>` : html`
        <div class="empty card">
          <div class="empty-emoji">🎯</div>
          <p>期限つきの目標を決めると、<br>毎日の記録が「前進」として見えるようになります。</p>
          <a class="btn btn-primary" href="#/goals/new">最初の目標をつくる</a>
        </div>`}
      <p class="hint center">取り組み中 ${active.length} / ${maxActive >= 50 ? '∞' : maxActive}</p>

      ${done.length ? html`<h2 class="section-title">${icon('trophy', { size: 18 })}達成した目標</h2>
        <div class="goal-list">${done.map(goalCard)}</div>` : ''}
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
        if (res.justCompleted) {
          celebrate();
          toast(`「${res.goal.title}」達成！おめでとうございます 🎉`, { ms: 4000 });
        } else if (navigator.vibrate) navigator.vibrate(10);
      } catch (err) {
        toast(err.message, { type: 'error' });
        el.disabled = false;
      }
    },
  });
}
