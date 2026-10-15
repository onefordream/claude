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
  <p class="heatmap-legend"><span>少ない</span><i class="hm l0"></i><i class="hm l1"></i><i class="hm l2"></i><i class="hm l3"></i><span>多い</span></p>`;
}

function weeklyBlock(review, canUse) {
  if (!canUse) {
    return html`<p class="muted">1週間の記録をAIがまとめ、来週のフォーカスを提案します。プロプランで使えます。</p>
      <a class="text-btn" href="#/pricing?from=weekly">プロプランを見る</a>`;
  }
  if (!review) return html`<p class="muted">この1週間の記録をAIがまとめます。</p>
    <button class="btn btn-secondary" data-action="weekly">今週のふりかえりを作成</button>`;
  if (review.status === 'pending') return html`<div class="skeleton-lines" aria-label="作成中"><i></i><i></i><i class="short"></i></div><p class="hint">まとめています</p>`;
  const d = review.data || {};
  return html`
    <p class="eyebrow">${review.period_start ? `${fmtDate(review.period_start)} – ${fmtDate(review.period_end)}` : ''}</p>
    <p class="ai-summary">${d.summary}</p>
    ${d.highlights?.length ? html`<h3 class="sub-title">よかったこと</h3><ul class="bullets">${d.highlights.map((t) => html`<li>${t}</li>`)}</ul>` : ''}
    ${d.patterns?.length ? html`<h3 class="sub-title">傾向</h3><ul class="bullets">${d.patterns.map((t) => html`<li>${t}</li>`)}</ul>` : ''}
    ${d.next_week_focus?.length ? html`<h3 class="sub-title">来週のフォーカス</h3><ol class="steps">${d.next_week_focus.map((t) => html`<li>${t}</li>`)}</ol>` : ''}
    ${d.encouragement ? html`<p class="ai-note">${d.encouragement}</p>` : ''}
    <button class="text-btn" data-action="weekly">最新の内容で作り直す</button>`;
}

const navRow = (href, title, sub, aside = '') => html`<a class="row" href="${href}">
  <span class="row-main"><span class="row-title">${title}</span>${sub ? html`<span class="row-sub">${sub}</span>` : ''}</span>${aside}${icon('caretRight', { size: 16 })}</a>`;

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
  // 実績は、獲得したものと次に届くもの2つだけを並べる
  const milestones = [...stats.badges.filter((b) => b.earned), ...stats.badges.filter((b) => !b.earned).slice(0, 2)];
  const aiLimit = me.plan.limits.aiEntryInsightsPerMonth;
  const storageLimit = me.plan.limits.storageMB * 1024 * 1024;

  const draw = () => mount(root, html`
    <header class="profile">
      <span class="avatar" aria-hidden="true">${[...me.user.displayName][0]}</span>
      <div class="profile-body">
        <h1 class="page-title page-title-sm">${me.user.displayName}</h1>
        <p class="page-sub">${stats.since ? `${fmtDate(stats.since, { weekday: false, year: true })}から記録` : 'まだ記録はありません'}　${me.plan.label}プラン</p>
      </div>
    </header>

    <div class="split">
      <div class="split-main">
        <section class="section">
          <h2 class="section-title">積み重ね</h2>
          <dl class="figures figures-3">
            <div><dt>記録</dt><dd>${fmtNum(stats.totals.entries)}</dd></div>
            <div><dt>記録した日</dt><dd>${fmtNum(stats.totals.activeDays)}</dd></div>
            <div><dt>最長連続</dt><dd>${fmtNum(stats.streak.best)}<small>日</small></dd></div>
            <div><dt>書いた文字</dt><dd>${fmtNum(stats.totals.chars)}</dd></div>
            <div><dt>写真・動画・音声</dt><dd>${fmtNum(stats.totals.image + stats.totals.video + stats.totals.audio)}</dd></div>
            <div><dt>達成した目標</dt><dd>${fmtNum(stats.totals.goalsDone)}</dd></div>
          </dl>
          <h3 class="sub-title">記録のカレンダー</h3>
          ${heatmap(stats.calendar)}
        </section>

        <section class="section">
          <div class="section-head"><h2 class="section-title">週間ふりかえり</h2>${canWeekly ? '' : html`<span class="tag">プロ</span>`}</div>
          <div class="weekly-body">${weeklyBlock(review, canWeekly)}</div>
        </section>

        <section class="section">
          <div class="section-head"><h2 class="section-title">実績</h2><span class="section-meta">${earned} / ${stats.badges.length}</span></div>
          <ul class="milestones">${milestones.map((b) => html`
            <li class="${b.earned ? 'earned' : ''}" title="${b.desc}">
              <span class="milestone-mark" aria-hidden="true"></span>
              <span class="milestone-title">${b.title}</span>
              <span class="milestone-desc">${b.desc}</span>
              <span class="visually-hidden">${b.earned ? '獲得済み' : '未獲得'}</span>
            </li>`)}</ul>
        </section>
      </div>

      <div class="split-side">
        <section class="section">
          <h2 class="section-title">分析</h2>
          <div class="list">
            ${navRow('#/growth', '成長分析', 'レベル・6つの指標・伸ばしたい指標', me.plan.id === 'pro' ? '' : html`<span class="tag">プロ</span>`)}
            ${navRow('#/golf', 'ゴルフ', 'ラウンドの記録・スコア分析・AIコーチ')}
          </div>
        </section>

        <section class="section">
          <h2 class="section-title">教室・お店</h2>
          ${links.length ? html`<div class="list">${links.map((l) => navRow(
            `#/links/${l.id}`,
            l.store.name,
            `${l.status === 'active' ? `連携中　共有 ${l.sharedCount}件` : '承認待ち'}${l.unreadComments ? `　新しいコメント ${l.unreadComments}件` : ''}`,
            l.status === 'pending' ? html`<span class="tag">承認待ち</span>` : l.unreadComments ? html`<span class="tag tag-accent">${l.unreadComments}</span>` : '',
          ))}</div>`
          : html`<p class="muted">通っている教室・お店と連携すると、記録を先生に見てもらい、コメントを受け取れます。</p>`}
          <a class="text-btn" href="#/links/new">${icon('plus', { size: 16 })}店舗IDで連携</a>
        </section>

        <section class="section">
          <div class="section-head"><h2 class="section-title">プランと利用状況</h2><a class="section-link" href="#/billing">お支払い</a></div>
          <div class="usage">
            ${me.plan.id === 'pro'
              ? html`<p class="usage-row"><span>今月のAIふりかえり</span><span class="num">${me.usage.aiEntryInsights} / ${aiLimit}回</span></p>
                ${progressBar(me.usage.aiEntryInsights / Math.max(1, aiLimit))}`
              : html`<p class="usage-row"><span>AIふりかえりの無料体験</span><span class="num">残り ${me.ai.trialLeft} / ${me.plan.limits.aiTrialCredits}回</span></p>
                ${progressBar(me.ai.trialLeft / Math.max(1, me.plan.limits.aiTrialCredits))}`}
            <p class="usage-row"><span>保存容量</span><span class="num">${fmtBytes(me.usage.storageBytes)} / ${fmtBytes(storageLimit)}</span></p>
            ${progressBar(me.usage.storageBytes / storageLimit)}
            <p class="usage-row"><span>取り組み中の目標</span><span class="num">${me.usage.activeGoals} / ${me.plan.limits.maxActiveGoals}</span></p>
          </div>
          ${me.ai.enabled ? '' : html`<p class="hint">AIは簡易モードで動作しています。管理者がAPIキーを設定すると、本格的な分析に切り替わります。</p>`}
          ${me.plan.id === 'free' ? html`<div class="upsell">
            <p class="upsell-title">プロプラン　月580円から${me.billing.trialAvailable ? '・7日間無料' : ''}</p>
            <p class="upsell-text">AIのふりかえり、成長レベルと6つの指標、伸ばしたい指標の分析、AI自己分析。</p>
            <a class="btn btn-primary" href="#/pricing">${upgradeLabel(me)}</a>
          </div>` : ''}
        </section>

        <section class="section">
          <h2 class="section-title">設定</h2>
          <form class="form settings" novalidate>
            <label class="field"><span class="field-label">ニックネーム</span>
              <input class="input" name="displayName" maxlength="30" value="${me.user.displayName}"></label>
            <label class="field"><span class="field-label">1週間に記録したい日数</span>
              <span class="select"><select class="input" name="weeklyTarget">${[1, 2, 3, 4, 5, 6, 7].map((n) => html`<option value="${n}" ${n === me.user.weeklyTarget ? 'selected' : ''}>${n}日</option>`)}</select></span></label>
            <button class="btn btn-secondary" type="submit">保存</button>
          </form>
          <p class="hint">${me.user.email}</p>
        </section>

        <section class="section">
          <h2 class="section-title">アカウント</h2>
          <details class="disclosure"><summary>パスワードを変更</summary>
            <form class="form pw-form" novalidate>
              <label class="field"><span class="field-label">現在のパスワード</span><input class="input" id="pw-current" name="current" type="password" autocomplete="current-password"></label>
              <label class="field"><span class="field-label">新しいパスワード（8文字以上）</span><input class="input" id="pw-new" name="password" type="password" minlength="8" autocomplete="new-password"></label>
              <button class="btn btn-secondary" type="submit">変更</button>
              <p class="hint">変更すると、ほかの端末ではログアウトされます。</p>
            </form>
          </details>
          <div class="list">
            <button class="row" data-action="export"><span class="row-main"><span class="row-title">データを書き出す</span><span class="row-sub">記録・目標・ゴルフのスコア・コメントを JSON で保存</span></span></button>
            ${navRow('#/store', '先生・スタッフの方', myStores.length ? `${myStores.map((x) => x.name).join('、')} を管理` : '店舗を登録して、生徒さんの記録を見る', myStores.some((x) => x.pendingMembers) ? html`<span class="tag">承認待ちあり</span>` : '')}
            ${me.isAdmin ? navRow('#/admin', '運営ダッシュボード', '売上・ユーザー・システムの状態') : ''}
          </div>
        </section>

        <nav class="footer-links" aria-label="規約">
          <a href="#/legal/terms">利用規約</a><a href="#/legal/privacy">プライバシーポリシー</a><a href="#/legal/tokushoho">特定商取引法に基づく表記</a>
        </nav>

        <div class="quiet-actions">
          <button class="text-btn" data-action="logout">ログアウト</button>
          <button class="text-btn text-btn-danger" data-action="delete-account">アカウントを削除</button>
        </div>
      </div>
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
