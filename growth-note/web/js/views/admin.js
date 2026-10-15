import { api } from '../api.js';
import { html, mount, fmtNum } from '../ui.js';
import { icon } from '../icons.js';

// 運営者向けの数字（ADMIN_EMAILS に登録したアカウントだけが開ける）

const tile = (label, value, sub = '') => html`<div class="asset-tile"><strong>${value}</strong><span>${label}</span>${sub ? html`<span class="stat-sub">${sub}</span>` : ''}</div>`;

export async function render(root) {
  const s = await api('/admin/stats');
  const max = Math.max(1, ...s.users.signupsByDay.map((d) => d.count));
  const conv = s.users.total ? Math.round((s.billing.paying / s.users.total) * 1000) / 10 : 0;
  mount(root, html`
    <header class="page-head with-back">
      <a class="icon-btn" href="#/me" aria-label="戻る">${icon('chevronLeft', { size: 22 })}</a>
      <div><p class="eyebrow">${s.today} 時点</p><h1 class="page-title small">運営ダッシュボード</h1></div><span></span>
    </header>
    <section class="card">
      <h2 class="card-title small">売上</h2>
      <div class="asset-grid">
        ${tile('月の売上の目安（MRR）', `¥${fmtNum(s.billing.mrr)}`, 'Stripe の契約のみ')}
        ${tile('有料会員', fmtNum(s.billing.paying), `うち年額 ${s.billing.yearly}`)}
        ${tile('無料体験中', fmtNum(s.billing.trialing))}
        ${tile('有料になった率', `${conv}%`, '有料会員 ÷ 登録者')}
        ${tile('解約予定', fmtNum(s.billing.cancelScheduled))}
        ${tile('支払い失敗', fmtNum(s.billing.pastDue))}
      </div>
    </section>
    <section class="card">
      <h2 class="card-title small">ユーザー</h2>
      <div class="asset-grid">
        ${tile('登録者', fmtNum(s.users.total))}
        ${tile('7日の新規', fmtNum(s.users.new7d))}
        ${tile('30日の新規', fmtNum(s.users.new30d))}
        ${tile('7日に記録した人', fmtNum(s.users.active7d))}
        ${tile('30日に記録した人', fmtNum(s.users.active30d))}
        ${tile('7日の記録数', fmtNum(s.activity.entries7d))}
      </div>
      <h3 class="ai-h">直近14日の新規登録</h3>
      <div class="mini-bars" role="img" aria-label="直近14日の新規登録数">${s.users.signupsByDay.map((d) => html`
        <span class="mini-bar" title="${d.date}: ${d.count}人"><i style="height:${Math.max(2, (d.count / max) * 100)}%"></i><small>${d.date.slice(8)}</small></span>`)}</div>
    </section>
    <section class="card">
      <h2 class="card-title small">機能の利用</h2>
      <div class="asset-grid">
        ${tile('ゴルフのラウンド（30日）', fmtNum(s.activity.golfRounds30d))}
        ${tile('店舗', fmtNum(s.activity.stores))}
        ${tile('店舗との連携', fmtNum(s.activity.activeLinks))}
        ${tile(`AIふりかえり（${s.ai.month}）`, fmtNum(s.ai.entryInsights), `無料体験 累計 ${s.ai.trialInsights}`)}
        ${tile('AI自己分析', fmtNum(s.ai.selfAnalyses))}
        ${tile('ゴルフAIコーチ', fmtNum(s.ai.golfCoach))}
      </div>
    </section>
    <section class="card">
      <h2 class="card-title small">システム</h2>
      <ul class="sys-list">
        <li><span>AI</span><b class="${s.ai.enabled ? 'ok' : 'warn'}">${s.ai.enabled ? 'Claude API 接続中' : '簡易モード（APIキー未設定）'}</b></li>
        <li><span>決済</span><b class="${s.system.billingMode === 'stripe' ? 'ok' : 'warn'}">${{ stripe: 'Stripe', demo: 'デモ決済（請求なし）', unavailable: '未設定' }[s.system.billingMode]}</b></li>
        <li><span>メール送信</span><b class="${s.system.mailEnabled ? 'ok' : 'warn'}">${s.system.mailEnabled ? '設定済み' : '未設定（ログに出力）'}</b></li>
        <li><span>処理待ちのジョブ</span><b>${s.system.jobsQueued}</b></li>
        <li><span>24時間の失敗ジョブ</span><b class="${s.system.jobsFailed24h ? 'warn' : 'ok'}">${s.system.jobsFailed24h}</b></li>
      </ul>
    </section>`);
}
