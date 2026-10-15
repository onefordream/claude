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

/** ゴルフ: 入力中のラウンドがあれば続きへ、記録があれば最近の成績 */
function golfRow(golf) {
  if (!golf || !golf.rounds.length) return '';
  const wip = golf.rounds.find((r) => r.status !== 'done');
  if (wip) {
    return html`<a class="row" href="#/golf/rounds/${wip.id}">
      <span class="row-main"><span class="row-title">ゴルフ</span>
        <span class="row-sub">${wip.courseName}を入力中　${wip.holesPlayed} / ${wip.holesCount}ホール</span></span>
      <span class="row-aside">続きから</span>${icon('caretRight', { size: 16 })}</a>`;
  }
  const last = golf.rounds[0];
  return html`<a class="row" href="#/golf">
    <span class="row-main"><span class="row-title">ゴルフ</span>
      <span class="row-sub">前回 ${last.courseName}　平均 ${golf.summary.average ?? '—'}　ベスト ${golf.summary.best ?? '—'}</span></span>
    <span class="row-value">${last.score}</span>${icon('caretRight', { size: 16 })}</a>`;
}

/** 成長分析への入口。無料の人には強みの名前だけ見せて、続きはプロで */
function growthRow(g) {
  if (!g) return '';
  if (!g.ready) {
    return html`<a class="row" href="#/growth">
      <span class="row-main"><span class="row-title">成長分析</span>
        <span class="row-sub">あと${g.needEntries}件の記録で、レベルと6つの指標を計算します</span></span>${icon('caretRight', { size: 16 })}</a>`;
  }
  if (g.locked) {
    return html`<a class="row" href="#/growth">
      <span class="row-main"><span class="row-title">成長分析</span>
        <span class="row-sub">いちばんの強みは「${g.teaser.topStrength}」。指標の詳細はプロで見られます</span></span>
      <span class="tag">プロ</span>${icon('caretRight', { size: 16 })}</a>`;
  }
  return html`<a class="row" href="#/growth">
    <span class="row-main"><span class="row-title">成長分析</span>
      <span class="row-sub">レベル ${g.level.level}　伸ばしたい指標は「${g.gaps[0].label}」</span>
      ${progressBar(g.level.progress)}</span>
    <span class="row-value">${g.overall}<small>点</small></span>${icon('caretRight', { size: 16 })}</a>`;
}

function streakNote(h) {
  const s = h.streak.current;
  if (h.recordedToday) return `今日の記録 ${h.todayCount}件`;
  if (s > 0) return `今日記録すると${s + 1}日連続になります`;
  return h.totals.entries ? '今日はまだ記録がありません' : '最初の記録を追加すると、ここに連続日数が表示されます';
}

const dueText = (g) => (g.daysLeft < 0 ? '期限切れ' : g.daysLeft === 0 ? '今日まで' : `あと${g.daysLeft}日`);

export async function render(root, _params, { state }) {
  const [h, g, golf] = await Promise.all([api('/home'), api('/growth').catch(() => null), api('/golf/rounds').catch(() => null)]);
  const me = state.me;
  const today = h.today || jstToday();
  const s = h.streak;
  const sourceLabel = { ai: 'AIの提案', goal: '目標から' }[h.todayStep.source] || 'ヒント';

  const view = () => html`
    <header class="page-head">
      <div class="page-head-main">
        <p class="eyebrow">${fmtDate(today)}</p>
        <h1 class="page-title page-title-sm">${h.greeting}、${h.displayName}さん</h1>
      </div>
    </header>

    ${me.termsOutdated ? html`<section class="notice">
      <p class="notice-title">利用規約とプライバシーポリシーを改定しました</p>
      <p class="notice-text"><a href="#/legal/terms">利用規約</a>と<a href="#/legal/privacy">プライバシーポリシー</a>をご確認のうえ、同意をお願いします。</p>
      <button class="btn btn-secondary btn-sm" data-action="accept-terms">同意する</button>
    </section>` : ''}

    <div class="split">
      <div class="split-main">
        <section class="section streak">
          <div class="metric metric-xl">
            <span class="metric-value">${s.current}</span><span class="metric-unit">日連続</span>
          </div>
          <p class="streak-note">${streakNote(h)}</p>
          <dl class="stat-row">
            <div><dt>最長</dt><dd>${s.best}<small>日</small></dd></div>
            <div><dt>今週</dt><dd>${h.week.activeDays}<small>/ ${h.week.target}日</small></dd></div>
            <div><dt>記録した日</dt><dd>${fmtNum(h.totals.activeDays)}<small>日</small></dd></div>
          </dl>
          <ol class="week" aria-label="今週の記録">
            ${h.week.days.map((d) => html`<li class="week-day ${d.count ? 'on' : ''} ${d.isToday ? 'today' : ''} ${d.isFuture ? 'future' : ''}">
              <span class="week-dot" aria-hidden="true"></span><span class="week-label">${d.label}</span>
              <span class="visually-hidden">${d.count ? '記録あり' : '記録なし'}</span></li>`)}
          </ol>
          ${h.week.achieved ? html`<p class="hint">今週の目標日数に届きました。</p>` : ''}
        </section>

        <section class="section">
          ${h.recordedToday
            ? html`<div class="today-done">
                <p class="section-label">今日</p>
                <p class="today-done-text">記録済み ${h.todayCount}件</p>
                <a class="btn btn-secondary" href="#/write">${icon('plus', { size: 16 })}もう1件追加</a>
              </div>`
            : html`<p class="section-label">今日の問い</p>
              <p class="prompt">${h.prompt}</p>
              <a class="btn btn-primary btn-lg" href="#/write">${icon('plus', { size: 20 })}記録を追加</a>`}
        </section>

        <section class="section">
          <div class="section-head"><h2 class="section-title">今日の一歩</h2><span class="section-meta">${sourceLabel}</span></div>
          <button class="check-row ${stepDone(today, h.todayStep.text) ? 'checked' : ''}" data-action="toggle-step" aria-pressed="${stepDone(today, h.todayStep.text)}">
            <span class="check-box">${icon('check', { size: 16 })}</span>
            <span class="check-text">${h.todayStep.text}</span>
          </button>
        </section>

        ${h.storeComments?.length ? html`
          <section class="section">
            <div class="section-head"><h2 class="section-title">先生からのコメント</h2><span class="section-meta">${h.storeComments.length}件</span></div>
            <div class="list">${h.storeComments.map((c) => html`
              <a class="comment unread" href="#/entries/${c.entryId}">
                <p class="comment-meta"><b>${c.authorName || '先生'}</b>${c.storeName}</p>
                <p class="clamp2">${c.body}</p></a>`)}</div>
          </section>` : ''}

        ${h.latestInsight ? html`
          <section class="section">
            <div class="section-head"><h2 class="section-title">最近の気づき</h2><a class="section-link" href="#/entries/${h.latestInsight.entryId}">記録を開く</a></div>
            <blockquote class="quote">
              <p>${h.latestInsight.summary}</p>
              ${h.latestInsight.data?.insights?.[0] ? html`<p class="quote-sub">${h.latestInsight.data.insights[0]}</p>` : ''}
            </blockquote>
          </section>` : ''}
      </div>

      <div class="split-side">
        <section class="section">
          <div class="section-head"><h2 class="section-title">目標</h2><a class="section-link" href="#/goals">すべて</a></div>
          ${h.goals.length
            ? html`<div class="list">${h.goals.map((goal) => html`
                <a class="row goal-row" href="#/goals/${goal.id}">
                  <span class="row-main">
                    <span class="row-title">${goal.title}</span>
                    ${progressBar(goal.progress, { cls: goal.pace === 'behind' ? 'progress-warn' : '' })}
                    <span class="row-sub"><span class="num">${fmtNum(goal.currentValue)} / ${fmtNum(goal.targetValue)}${goal.unit}</span><span class="${goal.daysLeft < 0 ? 'text-error' : ''}">${dueText(goal)}</span></span>
                  </span>
                </a>`)}</div>`
            : html`<div class="empty-inline"><p>目標を決めると、進み具合がここに表示されます。</p><a class="text-btn" href="#/goals/new">目標を作成</a></div>`}
        </section>

        ${g || golf?.rounds?.length ? html`<section class="section">
          <div class="section-head"><h2 class="section-title">分析</h2></div>
          <div class="list">${growthRow(g)}${golfRow(golf)}</div>
        </section>` : ''}

        <section class="section">
          <div class="section-head"><h2 class="section-title">これまで</h2></div>
          <dl class="figures">
            <div><dt>記録</dt><dd>${fmtNum(h.totals.entries)}</dd></div>
            <div><dt>記録した日</dt><dd>${fmtNum(h.totals.activeDays)}</dd></div>
            <div><dt>写真・動画</dt><dd>${fmtNum(h.totals.media)}</dd></div>
            <div><dt>達成した目標</dt><dd>${fmtNum(h.totals.goalsDone)}</dd></div>
          </dl>
        </section>
      </div>
    </div>`;

  mount(root, view());

  return onAction(root, {
    'accept-terms': async (el) => {
      state.me = await api('/me/accept-terms', { method: 'POST', body: {} });
      el.closest('.notice').remove();
    },
    'toggle-step': (el) => {
      const done = !stepDone(today, h.todayStep.text);
      setStepDone(today, h.todayStep.text, done);
      el.classList.toggle('checked', done);
      el.setAttribute('aria-pressed', String(done));
      if (done && navigator.vibrate) navigator.vibrate(12);
    },
  });
}
