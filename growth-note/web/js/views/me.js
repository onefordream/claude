import { api } from '../api.js';
import { html, mount, $, onAction, toast, fmtNum, fmtBytes, fmtDate, progressBar, confirmSheet } from '../ui.js';
import { upgradeLabel } from '../ui.js';
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
      <div><strong>AIの週間ふりかえり</strong><p>1週間の記録をAIがまとめ、来週のフォーカスを提案します。プロプランで使えます。</p>
        <a class="link" href="#/pricing?from=weekly">プロプランを見る ${icon('chevronRight', { size: 14 })}</a></div>
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
  const [stats, weekly, linksRes, storesRes] = await Promise.all([api('/stats'), api('/insights/weekly'), api('/links'), api('/stores')]);
  const links = linksRes.links;
  const myStores = storesRes.stores;
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

    <a class="card staff-entry" href="#/golf">
      <span class="store-icon">⛳</span>
      <span class="link-row-main"><b>ゴルフ</b><span>ラウンドの記録・スコア分析・AIコーチ</span></span>
      ${icon('chevronRight', { size: 16 })}
    </a>

    <a class="card staff-entry growth-link" href="#/growth">
      <span class="store-icon">${icon('sparkles', { size: 20 })}</span>
      <span class="link-row-main"><b>成長分析</b><span>レベル・6つの指標・足りないもの${me.plan.id === 'pro' ? '' : '（プロ）'}</span></span>
      ${icon('chevronRight', { size: 16 })}
    </a>

    <section class="card">
      <div class="card-head"><h2 class="card-title">${icon('target', { size: 18 })}通っている教室・お店</h2></div>
      ${links.length ? html`<ul class="link-list">${links.map((l) => html`<li>
        <a class="link-row" href="#/links/${l.id}">
          <span class="store-icon">${[...l.store.name][0]}</span>
          <span class="link-row-main"><b>${l.store.name}</b>
            <span>${l.status === 'active' ? `連携中 ・ 共有 ${l.sharedCount}件` : '承認待ち'}${l.unreadComments ? ` ・ 新しいコメント ${l.unreadComments}件` : ''}</span></span>
          ${l.status === 'pending' ? html`<span class="pill pill-wait">承認待ち</span>` : l.unreadComments ? html`<span class="dot-badge">${l.unreadComments}</span>` : ''}
          ${icon('chevronRight', { size: 16 })}
        </a></li>`)}</ul>`
      : html`<p class="muted">レッスンに通っている教室・お店と連携すると、記録を先生に見てもらいコメントをもらえます。</p>`}
      <a class="btn btn-soft btn-block link-add" href="#/links/new">${icon('plus', { size: 18 })}店舗IDで連携する</a>
    </section>

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
      <div class="card-head"><h2 class="card-title small" style="margin:0">プランと利用状況</h2>
        <a class="link" href="#/billing">プランとお支払い ${icon('chevronRight', { size: 14 })}</a></div>
      <div class="usage">
        ${me.plan.id === 'pro'
          ? html`<div class="usage-row"><span>今月のAIふりかえり</span><span>${me.usage.aiEntryInsights} / ${aiLimit}回</span></div>
            ${progressBar(me.usage.aiEntryInsights / Math.max(1, aiLimit), { cls: 'progress-sm' })}`
          : html`<div class="usage-row"><span>AIふりかえりの無料体験</span><span>残り ${me.ai.trialLeft} / ${me.plan.limits.aiTrialCredits}回</span></div>
            ${progressBar(me.ai.trialLeft / Math.max(1, me.plan.limits.aiTrialCredits), { cls: 'progress-sm' })}`}
        <div class="usage-row"><span>保存容量</span><span>${fmtBytes(me.usage.storageBytes)} / ${fmtBytes(storageLimit)}</span></div>
        ${progressBar(me.usage.storageBytes / storageLimit, { cls: 'progress-sm' })}
        <div class="usage-row"><span>取り組み中の目標</span><span>${me.usage.activeGoals} / ${me.plan.limits.maxActiveGoals}</span></div>
      </div>
      ${me.ai.enabled ? '' : html`<p class="hint">いまはAIが簡易モードで動いています（管理者がAPIキーを設定すると本格的なAI分析になります）。</p>`}
      ${me.plan.id === 'free' ? html`<a class="upsell" href="#/pricing">
        <p><strong>プロプラン</strong> 月¥580〜${me.billing.trialAvailable ? '・7日間無料' : ''}</p>
        <ul><li>AIのふりかえり</li><li>成長レベルと6つの指標</li><li>足りないものの分析</li><li>AI自己分析</li></ul>
        <span class="btn btn-primary btn-block">${upgradeLabel(me)}</span>
      </a>` : ''}
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

    <section class="card">
      <h2 class="card-title small">アカウント</h2>
      <details class="pw-details"><summary>パスワードを変更する</summary>
        <form class="pw-form" novalidate>
          <label class="field"><span class="field-label">現在のパスワード</span><input class="input" id="pw-current" name="current" type="password" autocomplete="current-password"></label>
          <label class="field"><span class="field-label">新しいパスワード（8文字以上）</span><input class="input" id="pw-new" name="password" type="password" minlength="8" autocomplete="new-password"></label>
          <button class="btn btn-soft btn-block" type="submit">変更する</button>
          <p class="hint">変更すると、ほかの端末ではログアウトされます。</p>
        </form>
      </details>
      <button class="btn btn-ghost btn-block" data-action="export">${icon('book', { size: 18 })}データを書き出す（JSON）</button>
      <p class="hint">記録・目標・ゴルフのスコア・コメントをまとめて保存できます。</p>
    </section>

    <a class="card staff-entry" href="#/store">
      <span class="store-icon alt">${icon('user', { size: 20 })}</span>
      <span class="link-row-main"><b>先生・スタッフの方</b>
        <span>${myStores.length ? `${myStores.map((x) => x.name).join('、')} を管理` : '店舗を登録して、生徒さんの記録を見る'}</span></span>
      ${myStores.some((x) => x.pendingMembers) ? html`<span class="pill pill-wait">承認待ちあり</span>` : ''}
      ${icon('chevronRight', { size: 16 })}
    </a>

    ${me.isAdmin ? html`<a class="card staff-entry" href="#/admin">
      <span class="store-icon alt">${icon('gem', { size: 20 })}</span>
      <span class="link-row-main"><b>運営ダッシュボード</b><span>売上・ユーザー・システムの状態</span></span>
      ${icon('chevronRight', { size: 16 })}
    </a>` : ''}

    <nav class="legal-nav">
      <a href="#/legal/terms">利用規約</a><a href="#/legal/privacy">プライバシーポリシー</a><a href="#/legal/tokushoho">特定商取引法に基づく表記</a>
    </nav>

    <div class="account-actions">
      <button class="btn btn-ghost btn-block" data-action="logout">${icon('logout', { size: 18 })}ログアウト</button>
      <button class="btn btn-ghost btn-sm danger" data-action="delete-account">アカウントを削除</button>
    </div>
  `);

  const bindSettings = () => {
    $('form.pw-form', root).addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      try {
        await api('/me/password', { method: 'POST', body: { current: f.current.value, password: f.password.value } });
        f.reset();
        toast('パスワードを変更しました');
      } catch (err) {
        toast(err.message, { type: 'error' });
      }
    });
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
    export: async (el) => {
      el.classList.add('loading');
      try {
        const res = await fetch('/api/me/export', { credentials: 'same-origin' });
        if (!res.ok) throw new Error('書き出しに失敗しました');
        const url = URL.createObjectURL(await res.blob());
        const a = document.createElement('a');
        a.href = url;
        a.download = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') || '')?.[1] || 'growth-note.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (err) {
        toast(err.message, { type: 'error' });
      } finally {
        el.classList.remove('loading');
      }
    },
    'delete-account': async () => {
      const pw = await confirmSheet({
        title: 'アカウントを削除しますか？',
        message: 'すべての記録・写真・目標・ゴルフのスコアが完全に削除され、元に戻せません。プロプランをご利用中の場合は自動で解約されます（返金はありません）。オーナーの店舗は、ほかのスタッフに引き継がれます（いなければ削除されます）。必要なら先に「データを書き出す」で保存してください。続けるにはパスワードを入力してください。',
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
