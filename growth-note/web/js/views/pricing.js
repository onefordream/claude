import { api } from '../api.js';
import { html, mount, $, $$, onAction, toast, fmtDate, jstToday, celebrate } from '../ui.js';
import { icon } from '../icons.js';

const yen = (n) => `¥${n.toLocaleString('ja-JP')}`;

const ROWS = [
  ['記録（文章・写真・動画・音声）', '無制限', '無制限'],
  ['継続日数・バッジ・目標・検索', '✓', '✓'],
  ['教室・お店との連携', '✓', '✓'],
  ['ひとことフィードバック', '✓', '✓'],
  ['AIのふりかえり（記録ごと）', '3回まで体験', '毎回'],
  ['成長レベル・6つの指標', '—', '✓'],
  ['足りないものの分析・推移グラフ', '—', '✓'],
  ['AI自己分析', '—', '月8回'],
  ['ゴルフ：ラウンド記録・スコアカード', '✓', '✓'],
  ['ゴルフ：能力チャート・伸びしろ分析・AIコーチ', '—', '✓'],
  ['AIの週間ふりかえり', '—', '✓'],
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
      <span class="price-amount num">${yen(p.amount)}</span><span class="price-unit">/ ${interval === 'year' ? '年' : '月'}（税込）</span>
      ${interval === 'year' ? html`<p class="price-sub">月あたり ${yen(Math.round(p.amount / 12))} ・ ${p.note}</p>` : html`<p class="price-sub">いつでも解約できます</p>`}
    </div>`;
  };

  mount(root, html`
    <header class="page-head with-back">
      <a class="icon-btn" href="#/me" aria-label="戻る">${icon('chevronLeft', { size: 22 })}</a>
      <div><h1 class="page-title small">プロプラン</h1></div><span></span>
    </header>

    <section class="pricing-hero">
      ${fromText ? html`<p class="pill pill-wait">${fromText}</p>` : ''}
      <h2 class="pricing-title">記録を、成長の地図に。</h2>
      <p class="muted">AIがあなたの記録を読み解き、いまのレベルと足りないものをグラフで見せてくれます。</p>
      <ul class="pricing-points">
        <li>${icon('sparkles', { size: 18 })}<span><b>AIのふりかえり</b>記録するたびに、要約・気づき・次の一歩</span></li>
        <li>${icon('target', { size: 18 })}<span><b>成長レベルと6つの指標</b>継続力・振り返り力などをレーダーで</span></li>
        <li>${icon('bulb', { size: 18 })}<span><b>足りないものがわかる</b>伸びしろと、今週やることを具体的に</span></li>
        <li>${icon('user', { size: 18 })}<span><b>AI自己分析</b>強み・傾向・この1か月のテーマをまとめて</span></li>
      </ul>
    </section>

    ${isPro ? html`<section class="card pro-now">
        <p><b>プロプランをご利用中です</b></p>
        <a class="btn btn-soft btn-block" href="#/billing">プランとお支払いを見る</a>
      </section>`
    : html`<section class="card plan-card">
        <div class="interval-toggle" role="radiogroup" aria-label="お支払いの間隔">
          <button class="${interval === 'month' ? 'on' : ''}" data-action="interval" data-v="month" role="radio" aria-checked="false">月額</button>
          <button class="on" data-action="interval" data-v="year" role="radio" aria-checked="true">年額 <span class="save">2か月分おトク</span></button>
        </div>
        <div class="price-slot">${priceBox()}</div>
        <button class="btn btn-primary btn-block btn-lg" data-action="checkout">${billing.trialAvailable ? `${pricing.trialDays}日間無料で試す` : 'プロにする'}</button>
        <p class="hint center">${billing.trialAvailable ? `無料期間（〜${fmtDate(addDaysLocal(pricing.trialDays))}）中に解約すれば料金はかかりません。` : 'いつでも解約できます。'}</p>
        ${billing.mode === 'demo' ? html`<p class="demo-note">デモ決済モード：実際の請求は発生しません</p>` : ''}
        ${billing.mode === 'unavailable' ? html`<p class="demo-note">有料プランは準備中です</p>` : ''}
      </section>`}

    <section class="card">
      <h2 class="card-title small">フリーとプロのちがい</h2>
      <div class="compare-table" role="table">
        <div class="ct-row ct-head" role="row"><span role="columnheader"></span><span role="columnheader">フリー</span><span role="columnheader" class="pro-col">プロ</span></div>
        ${ROWS.map(([k, f, p]) => html`<div class="ct-row" role="row"><span role="cell">${k}</span><span role="cell" class="${f === '—' ? 'no' : ''}">${f}</span><span role="cell" class="pro-col">${p}</span></div>`)}
      </div>
    </section>

    <section class="card faq">
      <h2 class="card-title small">よくある質問</h2>
      ${FAQ.map(([q, a]) => html`<details><summary>${q}</summary><p>${a}</p></details>`)}
    </section>
  `);

  return onAction(root, {
    interval: (el) => {
      interval = el.dataset.v;
      $$('.interval-toggle button', root).forEach((b) => {
        b.classList.toggle('on', b.dataset.v === interval);
        b.setAttribute('aria-checked', String(b.dataset.v === interval));
      });
      mount($('.price-slot', root), priceBox());
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
      <a class="icon-btn" href="#/me" aria-label="戻る">${icon('chevronLeft', { size: 22 })}</a>
      <div><h1 class="page-title small">${success ? 'ようこそ、プロへ' : 'プランとお支払い'}</h1></div><span></span>
    </header>

    ${success && isPro ? html`<section class="celebrate">
      <div class="celebrate-burst">💎</div>
      <h2 class="celebrate-title">プロが使えるようになりました</h2>
      <p class="celebrate-sub">さっそく、あなたの成長を見てみましょう</p>
    </section>
    <a class="btn btn-primary btn-block btn-lg" href="#/growth">${icon('target', { size: 20 })}成長分析を見る</a>` : ''}
    ${success && !isPro ? html`<section class="card"><p>お支払いを確認しています。反映まで少し時間がかかることがあります。</p>
      <button class="btn btn-soft btn-block" data-action="reload">再読み込み</button></section>` : ''}

    <section class="card billing-card">
      <p class="eyebrow">現在のプラン</p>
      <p class="billing-plan">${st.label}</p>
      ${st.sub ? html`<p class="muted small">${st.sub}</p>` : ''}
      ${billing.mode === 'demo' && billing.provider === 'demo' ? html`<p class="demo-note">デモ決済の契約です（請求は発生していません）</p>` : ''}
      <div class="billing-actions">
        ${!isPro ? html`<a class="btn btn-primary btn-block" href="#/pricing">プロプランを見る</a>` : ''}
        ${isPro && billing.provider === 'stripe' ? html`<button class="btn btn-soft btn-block" data-action="portal">お支払い方法の変更・解約</button>` : ''}
        ${isPro && billing.provider === 'demo' && !billing.cancelAtPeriodEnd ? html`<button class="btn btn-ghost btn-block" data-action="demo-cancel">解約する（期間の終わりでフリーに戻る）</button>` : ''}
        ${isPro && billing.provider === 'demo' ? html`<button class="btn btn-ghost btn-sm danger" data-action="demo-cancel-now">今すぐフリーに戻す（デモ）</button>` : ''}
      </div>
    </section>
    <p class="hint center">フリーに戻っても、記録・写真・目標はそのまま残ります。</p>
  `);
  if (success && isPro) celebrate();

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
