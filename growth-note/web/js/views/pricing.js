import { api } from '../api.js';
import { html, mount, $, $$, onAction, toast, fmtDate, jstToday } from '../ui.js';
import { icon } from '../icons.js';

const yen = (n) => `¥${n.toLocaleString('ja-JP')}`;

const ROWS = [
  ['記録（文章・写真・動画・音声）', '無制限', '無制限'],
  ['継続日数・実績・目標・検索', 'あり', 'あり'],
  ['教室・お店との連携', 'あり', 'あり'],
  ['ひとことフィードバック', 'あり', 'あり'],
  ['AIのふりかえり（記録ごと）', '3回まで体験', '毎回'],
  ['成長レベル・6つの指標', '—', 'あり'],
  ['伸ばしたい指標の分析・推移グラフ', '—', 'あり'],
  ['AI自己分析', '—', '月8回'],
  ['ゴルフ：ラウンド記録・スコアカード', 'あり', 'あり'],
  ['ゴルフ：能力チャート・伸びしろ分析・AIコーチ', '—', 'あり'],
  ['AIの週間ふりかえり', '—', 'あり'],
  ['同時に持てる目標', '3つ', '無制限'],
  ['保存容量', '1GB', '20GB'],
];

const FAQ = [
  ['無料に戻したら、記録は消えますか？', '消えません。記録・写真・目標はずっと見られます。見られなくなるのはAIの分析やグラフなどプロの機能だけです。'],
  ['無料期間が終わるとどうなりますか？', '自動で有料プランに切り替わります。無料期間中に解約すれば、料金は一切かかりません。'],
  ['いつでも解約できますか？', 'はい。マイページの「プランとお支払い」からいつでも解約できます。解約後も、支払い済みの期間の終わりまではプロを使えます。'],
  ['支払い方法は？', 'クレジットカード（Stripe による安全な決済）です。'],
];

// ---------- 料金ページ ----------
async function renderPricing(root, query, { state, refreshMe }) {
  await refreshMe();
  const { billing, pricing } = await api('/billing');
  const isPro = state.me.plan.id === 'pro';
  let interval = 'year';
  const from = query.get('from');
  const fromText = { golf: 'ゴルフのスコア分析はプロの機能です', growth: '成長分析はプロの機能です', insight: 'AIのふりかえりはプロの機能です', weekly: '週間ふりかえりはプロの機能です', analysis: 'AI自己分析はプロの機能です' }[from];

  const priceBox = () => {
    const p = pricing[interval];
    return html`<div class="price">
      <p class="metric"><span class="metric-value">${yen(p.amount)}</span><span class="metric-unit">/ ${interval === 'year' ? '年' : '月'}（税込）</span></p>
      ${interval === 'year' ? html`<p class="hint">月あたり ${yen(Math.round(p.amount / 12))}　${p.note}</p>` : html`<p class="hint">いつでも解約できます</p>`}
    </div>`;
  };

  // 特定商取引法の「最終確認画面」で示す内容（料金・支払時期・自動更新・解約方法）
  const confirmRows = () => {
    const p = pricing[interval];
    const per = interval === 'year' ? '1年' : '1か月';
    const trialEnd = fmtDate(addDaysLocal(pricing.trialDays), { year: true });
    return html`
      <div><dt>料金</dt><dd>${yen(p.amount)} / ${interval === 'year' ? '年' : '月'}（税込）</dd></div>
      <div><dt>お支払い</dt><dd>${billing.trialAvailable ? `無料体験の終了日（${trialEnd}）に初回の料金を請求します` : 'お申し込み時に請求します'}</dd></div>
      <div><dt>更新</dt><dd>解約するまで${per}ごとに自動で更新し、そのつど請求します</dd></div>
      <div><dt>解約</dt><dd>マイページの「プランとお支払い」からいつでも。${billing.trialAvailable ? '無料体験中に解約すれば料金はかかりません。' : ''}支払い済みの期間は使えます（返金はありません）</dd></div>`;
  };

  mount(root, html`
    <header class="page-head with-back">
      <a class="icon-btn" href="#/me" aria-label="戻る">${icon('caretLeft', { size: 20 })}</a>
      <div class="page-head-main"><p class="eyebrow">プロプラン</p><h1 class="page-title">記録を、<br>成長の地図に。</h1></div>
    </header>

    ${fromText ? html`<p class="notice notice-text">${fromText}</p>` : ''}
    <section class="section">
      <p class="lead-line">AIが記録を読み解き、いまのレベルと伸ばしたい指標をグラフで示します。</p>
      <dl class="def-list">
        <div><dt>AIのふりかえり</dt><dd>記録するたびに、要約・気づき・次の一歩</dd></div>
        <div><dt>成長レベルと6つの指標</dt><dd>継続力・振り返り力などをレーダーチャートで</dd></div>
        <div><dt>伸ばしたい指標</dt><dd>伸びしろと、今週やることを具体的に</dd></div>
        <div><dt>AI自己分析</dt><dd>強み・傾向・この1か月のテーマをまとめて</dd></div>
      </dl>
    </section>

    ${isPro ? html`<section class="section">
        <p class="notice-title">プロプランを利用中です</p>
        <a class="btn btn-secondary" href="#/billing">プランとお支払い</a>
      </section>`
    : html`<section class="section plan-box">
        <div class="seg" role="radiogroup" aria-label="お支払いの間隔">
          <button class="${interval === 'month' ? 'on' : ''}" data-action="interval" data-v="month" role="radio" aria-checked="false">月額</button>
          <button class="on" data-action="interval" data-v="year" role="radio" aria-checked="true">年額</button>
        </div>
        <div class="price-slot">${priceBox()}</div>
        <button class="btn btn-primary btn-block btn-lg" data-action="checkout">${billing.trialAvailable ? `${pricing.trialDays}日間無料で試す` : 'プロにする'}</button>
        <div class="final-confirm" aria-label="お申し込み内容の確認">
          <p class="sub-title">お申し込み内容</p>
          <dl class="kv price-slot-terms">${confirmRows()}</dl>
          <p class="hint">「${billing.trialAvailable ? `${pricing.trialDays}日間無料で試す` : 'プロにする'}」を押すと、決済ページ（Stripe）に移ります。お申し込みにより<a href="#/legal/terms">利用規約</a>に同意したものとみなします。<a href="#/legal/tokushoho">特定商取引法に基づく表記</a></p>
        </div>
        ${billing.mode === 'demo' ? html`<p class="hint">デモ決済モードです。実際の請求は発生しません。</p>` : ''}
        ${billing.mode === 'unavailable' ? html`<p class="hint">有料プランは準備中です。</p>` : ''}
      </section>`}

    <section class="section">
      <h2 class="section-title">フリーとプロの違い</h2>
      <table class="data-table compare">
        <thead><tr><th scope="col"><span class="visually-hidden">機能</span></th><th scope="col">フリー</th><th scope="col">プロ</th></tr></thead>
        <tbody>${ROWS.map(([k, f, p]) => html`<tr><th scope="row">${k}</th><td class="${f === '—' ? 'muted' : ''}">${f}</td><td>${p}</td></tr>`)}</tbody>
      </table>
    </section>

    <section class="section">
      <h2 class="section-title">よくある質問</h2>
      <div class="faq">${FAQ.map(([q, a]) => html`<details class="disclosure"><summary>${q}</summary><p>${a}</p></details>`)}</div>
    </section>
  `);

  return onAction(root, {
    interval: (el) => {
      interval = el.dataset.v;
      $$('.plan-box .seg button', root).forEach((b) => {
        b.classList.toggle('on', b.dataset.v === interval);
        b.setAttribute('aria-checked', String(b.dataset.v === interval));
      });
      mount($('.price-slot', root), priceBox());
      mount($('.price-slot-terms', root), confirmRows());
    },
    checkout: async (el) => {
      el.classList.add('loading');
      try {
        const res = await api('/billing/checkout', { method: 'POST', body: { interval } });
        // Stripe の決済ページ（別サイト）へ移動。デモ決済ならアプリ内の完了画面へ
        location.href = res.url;
      } catch (err) {
        toast(err.message, { type: 'error' });
        el.classList.remove('loading');
      }
    },
  });
}

function addDaysLocal(n) {
  const [y, m, d] = jstToday().split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

// ---------- プランとお支払い ----------
function statusText(b) {
  if (b.plan !== 'pro' || !['active', 'trialing', 'past_due'].includes(b.status)) return { label: 'フリープラン', sub: '' };
  const end = b.currentPeriodEnd ? fmtDate(b.currentPeriodEnd.slice(0, 10), { year: true }) : '';
  if (b.cancelAtPeriodEnd) return { label: 'プロ（解約予定）', sub: `${end}まで使えます。その後フリーに戻ります` };
  if (b.status === 'trialing') return { label: 'プロ（無料体験中）', sub: `${b.trialEnd ? fmtDate(b.trialEnd.slice(0, 10), { year: true }) : end}に無料期間が終わり、有料に切り替わります` };
  if (b.status === 'past_due') return { label: 'プロ（お支払い確認中）', sub: 'カードの決済に失敗しました。お支払い方法を確認してください' };
  return { label: 'プロ', sub: `次回の更新日：${end}（${b.interval === 'year' ? '年額' : '月額'}）` };
}

async function renderBilling(root, success, { state, refreshMe, navigate }) {
  await refreshMe();
  const { billing } = await api('/billing');
  const st = statusText(billing);
  const isPro = state.me.plan.id === 'pro';

  mount(root, html`
    <header class="page-head with-back">
      <a class="icon-btn" href="#/me" aria-label="戻る">${icon('caretLeft', { size: 20 })}</a>
      <div class="page-head-main"><h1 class="page-title page-title-sm">プランとお支払い</h1></div>
    </header>

    ${success && isPro ? html`<section class="confirm" role="status">
      <p class="confirm-title">${icon('check', { size: 16 })}プロプランが有効になりました</p>
      <p class="confirm-facts">成長分析・AIのふりかえり・ゴルフ分析が使えます。</p>
      <a class="btn btn-primary" href="#/growth">成長分析を開く</a>
    </section>` : ''}
    ${success && !isPro ? html`<section class="notice"><p class="notice-text">お支払いを確認しています。反映まで少し時間がかかることがあります。</p>
      <button class="btn btn-secondary btn-sm" data-action="reload">再読み込み</button></section>` : ''}

    <section class="section">
      <p class="section-label">現在のプラン</p>
      <p class="lead-value">${st.label}</p>
      ${st.sub ? html`<p class="hint">${st.sub}</p>` : ''}
      ${billing.mode === 'demo' && billing.provider === 'demo' ? html`<p class="hint">デモ決済の契約です。請求は発生していません。</p>` : ''}
      <div class="btn-stack">
        ${!isPro ? html`<a class="btn ${success ? 'btn-secondary' : 'btn-primary'}" href="#/pricing">プロプランを見る</a>` : ''}
        ${isPro && billing.provider === 'stripe' ? html`<button class="btn btn-secondary" data-action="portal">お支払い方法の変更・解約</button>` : ''}
        ${isPro && billing.provider === 'demo' && !billing.cancelAtPeriodEnd ? html`<button class="btn btn-secondary" data-action="demo-cancel">解約する（期間の終わりにフリーへ）</button>` : ''}
        ${isPro && billing.provider === 'demo' ? html`<button class="text-btn text-btn-danger" data-action="demo-cancel-now">今すぐフリーに戻す（デモ）</button>` : ''}
      </div>
    </section>
    <p class="hint">フリーに戻っても、記録・写真・目標はそのまま残ります。</p>
  `);

  return onAction(root, {
    portal: async (el) => {
      el.classList.add('loading');
      try {
        location.href = (await api('/billing/portal', { method: 'POST', body: {} })).url;
      } catch (err) {
        toast(err.message, { type: 'error' });
        el.classList.remove('loading');
      }
    },
    'demo-cancel': async () => {
      await api('/billing/demo/cancel', { method: 'POST', body: {} });
      toast('解約を受け付けました');
      navigate('/billing', { replace: true });
    },
    'demo-cancel-now': async () => {
      await api('/billing/demo/cancel', { method: 'POST', body: { immediately: true } });
      toast('フリープランに戻りました');
      navigate('/billing', { replace: true });
    },
    reload: () => navigate('/billing/success', { replace: true }),
  });
}

export async function render(root, { page, query }, ctx) {
  if (page === 'pricing') return renderPricing(root, query, ctx);
  return renderBilling(root, page === 'success', ctx);
}
