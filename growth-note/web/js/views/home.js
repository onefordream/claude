import { api } from '../api.js';
import { html, mount, fmtDate, progressBar, fmtNum, onAction, jstToday } from '../ui.js';
import { icon } from '../icons.js';

const STEP_KEY = 'gn:step-done';

function stepDone(today, text) {
  try {
    const v = JSON.parse(localStorage.getItem(STEP_KEY) || 'null');
    return v?.date === today && v?.text === text;
  } catch {
    return false;
  }
}
function setStepDone(today, text, done) {
  try {
    if (done) localStorage.setItem(STEP_KEY, JSON.stringify({ date: today, text }));
    else localStorage.removeItem(STEP_KEY);
  } catch {
    /* noop */
  }
}

function streakMessage(h) {
  const s = h.streak.current;
  if (h.recordedToday) {
    if (s >= 30) return 'すごい積み重ね。もう立派な習慣です';
    if (s >= 7) return '1週間以上つづいています。いい流れ！';
    if (s >= 2) return '今日も記録できました。この調子で';
    return '今日の記録、完了です。明日も一言残しましょう';
  }
  if (s > 0) return `今日記録すると ${s + 1}日連続 になります`;
  return h.totals.entries ? '今日の一言から、また始めましょう' : '最初の記録から、成長の物語がはじまります';
}

export async function render(root, _params, { navigate }) {
  const h = await api('/home');
  const today = h.today || jstToday();
  const s = h.streak;

  const view = () => html`
    <header class="page-head home-head">
      <div>
        <p class="eyebrow">${fmtDate(today)}</p>
        <h1 class="page-title">${h.greeting}、${h.displayName}さん</h1>
      </div>
    </header>

    <section class="card streak-card ${h.recordedToday ? 'is-done' : ''}">
      <div class="streak-top">
        <div class="streak-flame ${s.current > 0 ? 'lit' : ''}">${icon('flame', { size: 34, stroke: 2 })}</div>
        <div class="streak-main">
          <div class="streak-num"><strong>${s.current}</strong><span>日連続</span></div>
          <p class="streak-msg">${streakMessage(h)}</p>
        </div>
        ${s.best > 1 ? html`<div class="streak-best"><span>最長</span><strong>${s.best}</strong><span>日</span></div>` : ''}
      </div>
      <div class="week">
        ${h.week.days.map((d) => html`
          <div class="week-day ${d.count ? 'on' : ''} ${d.isToday ? 'today' : ''} ${d.isFuture ? 'future' : ''}">
            <span class="week-label">${d.label}</span>
            <span class="week-dot">${d.count ? icon('check', { size: 14, stroke: 3 }) : ''}</span>
          </div>`)}
      </div>
      <div class="week-foot">
        <span>今週 <strong>${h.week.activeDays}</strong> / ${h.week.target}日</span>
        ${progressBar(h.week.activeDays / h.week.target, { cls: 'progress-sm progress-accent' })}
        ${h.week.achieved ? html`<span class="pill pill-accent">目標達成 🎉</span>` : ''}
      </div>
    </section>

    ${h.recordedToday
      ? html`
        <section class="card today-card done">
          <div class="today-check">${icon('check', { size: 26, stroke: 3 })}</div>
          <div class="today-body">
            <p class="today-title">今日の記録、完了！</p>
            <p class="today-sub">今日 ${h.todayCount}件 ・ 何度でも書けます</p>
          </div>
          <a class="btn btn-soft btn-sm" href="#/write">もう1件</a>
        </section>`
      : html`
        <a class="card today-card cta" href="#/write">
          <div class="today-body">
            <p class="today-label">${icon('sparkles', { size: 16 })} 今日の問いかけ</p>
            <p class="today-prompt">${h.prompt}</p>
          </div>
          <span class="cta-btn">${icon('plus', { size: 20, stroke: 2.6 })}今日の記録をつける</span>
        </a>`}

    <section class="card step-card ${stepDone(today, h.todayStep.text) ? 'checked' : ''}">
      <div class="card-head">
        <h2 class="card-title">${icon('bulb', { size: 18 })}今日の一歩</h2>
        <span class="src-tag">${h.todayStep.source === 'ai' ? 'AIの提案' : h.todayStep.source === 'goal' ? '目標から' : 'ヒント'}</span>
      </div>
      <button class="step" data-action="toggle-step" aria-pressed="${stepDone(today, h.todayStep.text)}">
        <span class="step-box">${icon('check', { size: 16, stroke: 3 })}</span>
        <span class="step-text">${h.todayStep.text}</span>
      </button>
    </section>

    <section class="card">
      <div class="card-head">
        <h2 class="card-title">${icon('target', { size: 18 })}目標の進みぐあい</h2>
        <a class="link" href="#/goals">すべて ${icon('chevronRight', { size: 14 })}</a>
      </div>
      ${h.goals.length
        ? html`<div class="goal-mini-list">${h.goals.map((g) => html`
            <a class="goal-mini" href="#/goals/${g.id}">
              <span class="goal-icon">${g.icon}</span>
              <div class="goal-mini-body">
                <div class="goal-mini-top">
                  <span class="goal-mini-title">${g.title}</span>
                  <span class="goal-mini-num">${fmtNum(g.currentValue)}/${fmtNum(g.targetValue)}${g.unit}</span>
                </div>
                ${progressBar(g.progress, { cls: g.pace === 'behind' ? 'progress-warn' : '' })}
                <span class="goal-mini-due ${g.daysLeft < 0 ? 'over' : ''}">${g.daysLeft < 0 ? '期限を過ぎています' : g.daysLeft === 0 ? '今日が期限' : `あと${g.daysLeft}日`}</span>
              </div>
            </a>`)}</div>`
        : html`<a class="empty-inline" href="#/goals/new">${icon('plus', { size: 18 })}目標を決めると、進みぐあいがここに表示されます</a>`}
    </section>

    ${h.latestInsight ? html`
      <a class="card insight-card" href="#/entries/${h.latestInsight.entryId}">
        <div class="card-head">
          <h2 class="card-title">${icon('sparkles', { size: 18 })}最近の気づき</h2>
          ${icon('chevronRight', { size: 16 })}
        </div>
        <p class="insight-summary">${h.latestInsight.summary}</p>
        ${h.latestInsight.data?.insights?.[0] ? html`<p class="insight-point">${h.latestInsight.data.insights[0]}</p>` : ''}
      </a>` : ''}

    <section class="asset-strip">
      <div class="asset"><strong>${fmtNum(h.totals.entries)}</strong><span>記録</span></div>
      <div class="asset"><strong>${fmtNum(h.totals.activeDays)}</strong><span>記録した日</span></div>
      <div class="asset"><strong>${fmtNum(h.totals.media)}</strong><span>写真・動画</span></div>
      <div class="asset"><strong>${fmtNum(h.totals.goalsDone)}</strong><span>達成した目標</span></div>
    </section>`;

  mount(root, view());

  return onAction(root, {
    'toggle-step': (el) => {
      const done = !stepDone(today, h.todayStep.text);
      setStepDone(today, h.todayStep.text, done);
      el.closest('.step-card').classList.toggle('checked', done);
      el.setAttribute('aria-pressed', String(done));
      if (done && navigator.vibrate) navigator.vibrate(12);
    },
  });
}
