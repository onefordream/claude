import { api } from '../api.js';
import { html, mount, $, onAction, toast, fmtNum, fmtBytes, fmtDate, progressBar, confirmSheet } from '../ui.js';
import { icon } from '../icons.js';

function heatmap(cal) {
  const level = (c) => (c === 0 ? 0 : c === 1 ? 1 : c === 2 ? 2 : 3);
  const cols = [];
  for (let w = 0; w < cal.weeks; w++) cols.push(cal.cells.slice(w * 7, w * 7 + 7));
  return html`<div class="heatmap" role="img" aria-label="直近${cal.weeks}週間の記録">
    <div class="heatmap-days"><span>月</span><span></span><span>水</span><span></span><span>金</span><span></span><span>日</span></div>
    <div class="heatmap-grid">${cols.map((col) => html`<div class="heatmap-col">${col.map((c) =>
      html`<span class="hm l${level(c.count)} ${c.isFuture ? 'future' : ''}" title="${fmtDate(c.date)}: ${c.count}件"></span>`)}</div>`)}</div>
  </div>
  <div class="heatmap-legend"><span>少ない</span><i class="hm l0"></i><i class="hm l1"></i><i class="hm l2"></i><i class="hm l3"></i><span>多い</span></div>`;
}

function weeklyBlock(review, canUse) {
  if (!canUse) {
    return html`<div class="locked">
      ${icon('lock', { size: 18 })}
      <div><strong>AIの週間ふりかえり</strong><p>1週間の記録をAIがまとめ、来週のフォーカスを提案します。プロプランで使えます。</p></div>
    </div>`;
  }
  if (!review) return html`<p class="muted">この1週間の記録をAIがまとめます。</p>
    <button class="btn btn-primary btn-block" data-action="weekly">${icon('sparkles', { size: 18 })}今週のふりかえりをつくる</button>`;
  if (review.status === 'pending') return html`<div class="skeleton-lines"><i></i><i></i><i class="short"></i></div><p class="hint">AIがまとめています…</p>`;
  const d = review.data || {};
  return html`
    <p class="eyebrow">${review.period_start ? `${fmtDate(review.period_start)} 〜 ${fmtDate(review.period_end)}` : ''}</p>
    <p class="ai-summary">${d.summary}</p>
    ${d.highlights?.length ? html`<h3 class="ai-h">よかったこと</h3><ul class="ai-list">${d.highlights.map((t) => html`<li>${t}</li>`)}</ul>` : ''}
    ${d.patterns?.length ? html`<h3 class="ai-h">見えてきた傾向</h3><ul class="ai-list">${d.patterns.map((t) => html`<li>${t}</li>`)}</ul>` : ''}
    ${d.next_week_focus?.length ? html`<h3 class="ai-h">来週のフォーカス</h3><ul class="ai-actions">${d.next_week_focus.map((t) => html`<li><span class="dot"></span>${t}</li>`)}</ul>` : ''}
    ${d.encouragement ? html`<p class="ai-cheer">${d.encouragement}</p>` : ''}
    <button class="btn btn-ghost btn-sm" data-action="weekly">${icon('refresh', { size: 16 })}最新の内容でつくり直す</button>`;
}

export async function render(root, _params, { state, navigate, refreshMe }) {
  const [stats, weekly] = await Promise.all([api('/stats'), api('/insights/weekly')]);
  await refreshMe();
  const me = state.me;
  let review = weekly.review;
  let pollTimer = null;

  const canWeekly = me.plan.features.weeklyReview;
  const earned = stats.badges.filter((b) => b.earned).length;
  const aiLimit = me.plan.limits.aiEntryInsightsPerMonth;
  const storageLimit = me.plan.limits.storageMB * 1024 * 1024;

  const draw = () => mount(root, html`
    <header class="profile">
      <div class="avatar">${[...me.user.displayName][0]}</div>
      <div class="profile-body">
        <h1 class="profile-name">${me.user.displayName}</h1>
        <p class="profile-sub">${stats.since ? `${fmtDate(stats.since, { weekday: false, year: true })}から記録中` : 'これから記録をはじめましょう'}</p>
      </div>
      <span class="plan-badge ${me.plan.id}">${me.plan.id === 'pro' ? html`${icon('gem', { size: 14 })}` : ''}${me.plan.label}</span>
    </header>

    <section class="card">
      <div class="card-head"><h2 class="card-title">${icon('gem', { size: 18 })}成長の資産</h2></div>
      <div class="asset-grid">
        <div class="asset-tile"><strong>${fmtNum(stats.totals.entries)}</strong><span>記録</span></div>
        <div class="asset-tile"><strong>${fmtNum(stats.totals.activeDays)}</strong><span>記録した日</span></div>
        <div class="asset-tile accent"><strong>${fmtNum(stats.streak.best)}</strong><span>最長連続日数</span></div>
        <div class="asset-tile"><strong>${fmtNum(stats.totals.chars)}</strong><span>書いた文字</span></div>
        <div class="asset-tile"><strong>${fmtNum(stats.totals.image + stats.totals.video + stats.totals.audio)}</strong><span>写真・動画・音声</span></div>
        <div class="asset-tile"><strong>${fmtNum(stats.totals.goalsDone)}</strong><span>達成した目標</span></div>
      </div>
      <h3 class="ai-h">${icon('calendar', { size: 16 })}記録のカレンダー</h3>
      ${heatmap(stats.calendar)}
    </section>

    <section class="card">
      <div class="card-head"><h2 class="card-title">${icon('sparkles', { size: 18 })}週間ふりかえり</h2>${canWeekly ? '' : html`<span class="plan-badge pro small">プロ</span>`}</div>
      <div class="weekly-body">${weeklyBlock(review, canWeekly)}</div>
    </section>

    <section class="card">
      <div class="card-head"><h2 class="card-title">${icon('trophy', { size: 18 })}バッジ</h2><span class="muted small">${earned} / ${stats.badges.length}</span></div>
      <div class="badge-grid">${stats.badges.map((b) => html`
        <div class="badge ${b.earned ? 'earned' : ''}" title="${b.desc}">
          <span class="badge-icon">${b.earned ? b.icon : '🔒'}</span>
          <span class="badge-title">${b.title}</span>
        </div>`)}</div>
    </section>

    <section class="card">
      <h2 class="card-title small">プランと利用状況</h2>
      <div class="usage">
        <div class="usage-row"><span>今月のAI分析</span><span>${me.usage.aiEntryInsights} / ${aiLimit}回</span></div>
        ${progressBar(me.usage.aiEntryInsights / aiLimit, { cls: 'progress-sm' })}
        <div class="usage-row"><span>保存容量</span><span>${fmtBytes(me.usage.storageBytes)} / ${fmtBytes(storageLimit)}</span></div>
        ${progressBar(me.usage.storageBytes / storageLimit, { cls: 'progress-sm' })}
        <div class="usage-row"><span>取り組み中の目標</span><span>${me.usage.activeGoals} / ${me.plan.limits.maxActiveGoals}</span></div>
      </div>
      ${me.ai.enabled ? '' : html`<p class="hint">いまはAIが簡易モードで動いています（管理者がAPIキーを設定すると本格的なAI分析になります）。</p>`}
      ${me.plan.id === 'free' ? html`<div class="upsell">
        <p><strong>プロプラン</strong>（準備中）</p>
        <ul><li>AI分析 月${600}回</li><li>AIの週間ふりかえり</li><li>目標の数が無制限</li><li>保存容量 20GB</li></ul>
      </div>` : ''}
    </section>

    <section class="card">
      <h2 class="card-title small">設定</h2>
      <form class="settings" novalidate>
        <label class="field"><span class="field-label">ニックネーム</span>
          <input class="input" name="displayName" maxlength="30" value="${me.user.displayName}"></label>
        <label class="field"><span class="field-label">1週間に記録したい日数</span>
          <select class="input" name="weeklyTarget">${[1, 2, 3, 4, 5, 6, 7].map((n) => html`<option value="${n}" ${n === me.user.weeklyTarget ? 'selected' : ''}>${n}日</option>`)}</select></label>
        <button class="btn btn-soft btn-block" type="submit">保存する</button>
      </form>
      <p class="muted small">${me.user.email}</p>
    </section>

    <div class="account-actions">
      <button class="btn btn-ghost btn-block" data-action="logout">${icon('logout', { size: 18 })}ログアウト</button>
      <button class="btn btn-ghost btn-sm danger" data-action="delete-account">アカウントを削除</button>
    </div>
  `);

  const bindSettings = () => {
    $('form.settings', root).addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        state.me = await api('/me', { method: 'PATCH', body: { displayName: e.target.displayName.value, weeklyTarget: Number(e.target.weeklyTarget.value) } });
        toast('保存しました');
      } catch (err) {
        toast(err.message, { type: 'error' });
      }
    });
  };
  draw();
  bindSettings();

  const pollWeekly = async () => {
    try {
      review = (await api('/insights/weekly')).review;
      if (review?.status === 'pending') pollTimer = setTimeout(pollWeekly, 2000);
      else mount($('.weekly-body', root), weeklyBlock(review, canWeekly));
    } catch {
      pollTimer = setTimeout(pollWeekly, 4000);
    }
  };
  if (review?.status === 'pending') pollTimer = setTimeout(pollWeekly, 2000);

  const off = onAction(root, {
    weekly: async () => {
      try {
        review = (await api('/insights/weekly', { method: 'POST', body: {} })).review;
        mount($('.weekly-body', root), weeklyBlock(review, canWeekly));
        pollTimer = setTimeout(pollWeekly, 2000);
      } catch (err) {
        toast(err.message, { type: 'error' });
      }
    },
    logout: async () => {
      await api('/auth/logout', { method: 'POST', body: {} }).catch(() => {});
      state.me = null;
      navigate('/login', { replace: true });
    },
    'delete-account': async () => {
      const pw = await confirmSheet({
        title: 'アカウントを削除しますか？',
        message: 'すべての記録・写真・目標が完全に削除され、元に戻せません。続けるにはパスワードを入力してください。',
        ok: '削除する',
        danger: true,
        input: { type: 'password', placeholder: 'パスワード', autocomplete: 'current-password' },
      });
      if (!pw) return;
      try {
        await api('/me/delete', { method: 'POST', body: { password: pw } });
        state.me = null;
        toast('アカウントを削除しました');
        navigate('/signup', { replace: true });
      } catch (err) {
        toast(err.message, { type: 'error' });
      }
    },
  });

  return () => {
    clearTimeout(pollTimer);
    off();
  };
}
