import { api } from '../api.js';
import { html, mount, $, onAction, toast, fmtRelDate, paywallCard } from '../ui.js';
import { icon } from '../icons.js';
import { radarChart, golfTrendChart, axisBars, SAMPLE_GOLF_AXES, SAMPLE_GOLF_TREND } from '../charts.js';

// ゴルフのトップ: ラウンド一覧（無料）と分析（プロ）

const toParText = (v) => (v == null ? '' : v > 0 ? `+${v}` : v === 0 ? '±0' : `${v}`);
const TARGET_SCORE = { '70s': 79, '80s': 89, '90s': 99, '100s': null };

function roundsTab(rounds) {
  if (!rounds.length) {
    return html`<div class="empty card"><div class="empty-emoji">⛳</div>
      <p>ラウンドを記録すると、スコアの推移や弱点の分析ができるようになります。</p>
      <a class="btn btn-primary" href="#/golf/new">${icon('plus', { size: 18 })}最初のラウンドを記録</a></div>`;
  }
  return html`<div class="round-list">${rounds.map((r) => html`
    <a class="card round-row" href="#/golf/rounds/${r.id}">
      <div class="round-score ${r.status === 'done' ? '' : 'wip'}"><b class="num">${r.score ?? '—'}</b><span>${r.status === 'done' ? toParText(r.toPar) : '入力中'}</span></div>
      <div class="round-main">
        <b>${r.courseName}</b>
        <span>${fmtRelDate(r.playedOn)}${r.holesCount === 9 ? ' ・ 9H' : ''}${r.status !== 'done' ? ` ・ ${r.holesPlayed}/${r.holesCount}H 入力済み` : ''}</span>
        ${r.status === 'done' ? html`<span class="round-stats">${[r.putts != null && `パット${r.putts}`, r.fwPct != null && `FW${r.fwPct}%`, r.girPct != null && `パーオン${r.girPct}%`, r.ob ? `OB${r.ob}` : null].filter(Boolean).join(' ・ ')}</span>` : ''}
      </div>
      ${icon('chevronRight', { size: 16 })}
    </a>`)}</div>`;
}

function potentialBars(p) {
  if (!p.items.length) return html`<p class="muted">どの項目も${p.target.label}の水準に届いています。すばらしい！</p>`;
  const max = Math.max(...p.items.map((i) => i.strokes));
  const total = Math.round(p.items.reduce((s, i) => s + i.strokes, 0) * 10) / 10;
  return html`
    <p class="pot-lead">${p.target.label}の水準に近づけると、<b>1ラウンド 約${total}打</b> 縮まる見込み</p>
    <ul class="pot-list">${p.items.map((i, idx) => html`<li class="${idx === 0 ? 'top' : ''}">
      <div class="pot-head"><b>${i.label}</b><span class="num">−${i.strokes}打</span></div>
      <div class="pot-track"><i style="width:${Math.max(6, (i.strokes / max) * 100)}%"></i></div>
      <p class="pot-detail">${i.from}${i.unit} → 目標 ${i.to}${i.unit}</p>
      ${idx === 0 ? html`<p class="pot-tip">${icon('bulb', { size: 14 })}${i.tip}</p>` : ''}
    </li>`)}</ul>
    <p class="hint">目安です。項目どうしに重なりがあるため、合計はおおよその値です。</p>`;
}

function compareTable(agg, target) {
  const rows = [
    ['平均スコア（18H）', agg.score18, null, ''],
    ['パット数', agg.putts18, target.putts, '', true],
    ['FWキープ率', agg.fwPct, target.fw, '%'],
    ['パーオン率', agg.girPct, target.gir, '%'],
    ['寄せワン率', agg.scramblePct, target.scramble, '%'],
    ['サンドセーブ率', agg.sandPct, target.sand, '%'],
    ['OB', agg.ob18, target.ob, '回', true],
    ['ダボ以上の割合', agg.doublePlusPct, target.doublePlus, '%', true],
  ].filter((r) => r[1] != null);
  return html`<div class="cmp-table" role="table">
    <div class="cmp-tr cmp-th" role="row"><span role="columnheader">項目</span><span role="columnheader">あなた</span><span role="columnheader">${target.label}の目安</span></div>
    ${rows.map(([label, v, t, unit, lowerBetter]) => {
      const good = t == null ? null : lowerBetter ? v <= t : v >= t;
      return html`<div class="cmp-tr" role="row"><span role="cell">${label}</span>
        <span role="cell" class="num ${good === null ? '' : good ? 'good' : 'bad'}">${v}${unit}</span>
        <span role="cell" class="num muted">${t == null ? '—' : `${t}${unit}`}</span></div>`;
    })}
  </div>`;
}

function coachBlock(c) {
  if (!c.latest) {
    return html`<p class="muted">直近のラウンドのデータをもとに、AIコーチが弱点と、スコアアップのために優先する練習を提案します。</p>
      <button class="btn btn-primary btn-block" data-action="coach">${icon('sparkles', { size: 18 })}AIコーチに分析してもらう</button>
      <p class="hint">今月あと${c.remaining}回</p>`;
  }
  if (c.latest.status === 'pending') return html`<div class="skeleton-lines"><i></i><i></i><i class="short"></i></div><p class="hint">AIコーチが分析しています…</p>`;
  if (c.latest.status === 'failed') return html`<p class="muted">分析できませんでした。</p><button class="btn btn-soft btn-sm" data-action="coach">もう一度</button>`;
  const d = c.latest.data || {};
  return html`
    <p class="ai-summary">${d.summary}</p>
    ${d.priorities?.length ? html`<h3 class="ai-h">優先して取り組むこと</h3>
      <ol class="prio-list">${d.priorities.map((p) => html`<li>
        <div class="prio-head"><b>${p.area}</b><span class="pill pill-sm">${p.expected_gain}</span></div>
        <p class="muted small">${p.why}</p>
        <p class="prio-drill">${icon('arrowRight', { size: 14 })}${p.drill}</p></li>`)}</ol>` : ''}
    ${d.strengths?.length ? html`<h3 class="ai-h">強み</h3><ul class="ai-list">${d.strengths.map((t) => html`<li>${t}</li>`)}</ul>` : ''}
    ${d.weaknesses?.length ? html`<h3 class="ai-h">弱点</h3><ul class="ai-list">${d.weaknesses.map((t) => html`<li>${t}</li>`)}</ul>` : ''}
    ${d.next_round_plan?.length ? html`<h3 class="ai-h">次のラウンドで意識すること</h3><ul class="ai-actions">${d.next_round_plan.map((t) => html`<li><span class="dot"></span>${t}</li>`)}</ul>` : ''}
    ${c.latest.provider === 'local' ? html`<p class="hint">簡易モードの分析です</p>` : ''}
    <button class="btn btn-ghost btn-sm" data-action="coach" ${c.remaining ? '' : 'disabled'}>${icon('refresh', { size: 16 })}最新のラウンドで分析し直す（今月あと${c.remaining}回）</button>`;
}

function analysisTab(a, me) {
  if (!a.ready) {
    return html`<div class="empty card"><div class="empty-emoji">📊</div>
      <p>ラウンドを最後まで記録すると、パター・方向性・アプローチなどの能力と、スコアアップの伸びしろが分析できます。</p>
      <a class="btn btn-primary" href="#/golf/new">ラウンドを記録</a></div>`;
  }
  if (a.locked) {
    return html`
      ${a.teaser.topArea ? html`<section class="card teaser-card">
        <p class="teaser-lead">スコアアップの伸びしろが一番大きいのは</p>
        <p class="teaser-strength">「${a.teaser.topArea}」</p>
        <p class="muted small">何打縮められるか・能力のグラフ・AIコーチの練習メニューはプロで見られます</p>
      </section>` : ''}
      <div class="locked-wrap">
        <div class="locked-preview" aria-hidden="true">
          <section class="card"><h2 class="card-title">スコアの推移</h2>${golfTrendChart(SAMPLE_GOLF_TREND, { target: 89 })}</section>
          <section class="card"><h2 class="card-title">能力チャート</h2><div class="radar-wrap">${radarChart(SAMPLE_GOLF_AXES, { showPrev: false })}</div></section>
        </div>
        ${paywallCard(me, { title: '何を直せばスコアが縮むか、データで見る', text: 'パター・方向性・アプローチ・OBなどの能力チャート、1ラウンドで縮められる打数、AIコーチの練習メニューが見られます。', reason: 'golf' })}
      </div>`;
  }
  const target = a.potentials.target;
  return html`
    <section class="card golf-hero">
      <div><p class="eyebrow">直近${a.agg.rounds}ラウンドの平均（18H換算）</p>
        <p class="golf-avg"><span class="num">${a.agg.score18}</span><span class="pill">${a.potentials.current.label}</span></p></div>
      ${a.agg.best ? html`<div class="golf-best"><span>ベスト</span><b class="num">${a.agg.best}</b></div>` : ''}
    </section>
    <section class="card">
      <div class="card-head"><h2 class="card-title">${icon('sparkles', { size: 18 })}スコアの推移</h2></div>
      ${golfTrendChart(a.trend, { target: TARGET_SCORE[target.key] })}
      <p class="hint">点線は目標（${target.label}）。9ホールのラウンドは18ホールに換算しています。</p>
    </section>
    <section class="card">
      <div class="card-head"><h2 class="card-title">${icon('target', { size: 18 })}能力チャート</h2></div>
      <div class="radar-wrap">${radarChart(a.axes, { showPrev: false })}</div>
      ${axisBars(a.axes.map((x) => ({ label: x.label, score: x.score })))}
      <p class="hint">100以上の水準を20、70台の水準を90として点数にしています。</p>
    </section>
    <section class="card pot-card">
      <div class="card-head"><h2 class="card-title">${icon('bulb', { size: 18 })}スコアアップの伸びしろ</h2></div>
      ${potentialBars(a.potentials)}
    </section>
    <section class="card">
      <h2 class="card-title small">目標の水準との比較</h2>
      ${compareTable(a.agg, target)}
      ${a.agg.missLeft + a.agg.missRight > 0 ? html`<p class="hint">ティーショットのミス：左 ${a.agg.missLeft}回 ・ 右 ${a.agg.missRight}回</p>` : ''}
    </section>
    <section class="card ai-card">
      <div class="card-head"><h2 class="card-title">${icon('sparkles', { size: 18 })}AIコーチ</h2></div>
      <div class="coach-body">${coachBlock(a.coach)}</div>
    </section>`;
}

export async function render(root, { query }, { state }) {
  const tab = query.get('tab') === 'analysis' ? 'analysis' : 'rounds';
  const [list, analysis] = await Promise.all([api('/golf/rounds'), api('/golf/analysis')]);
  let a = analysis;
  let pollTimer = null;
  const wip = list.rounds.find((r) => r.status !== 'done');

  mount(root, html`
    <header class="page-head">
      <div><p class="eyebrow">ラウンドの記録とスコア分析</p><h1 class="page-title">ゴルフ</h1></div>
      <a class="btn btn-primary btn-sm" href="#/golf/new">${icon('plus', { size: 18, stroke: 2.4 })}ラウンド</a>
    </header>
    ${wip ? html`<a class="card wip-banner" href="#/golf/rounds/${wip.id}">
      <span>⛳</span><div><b>${wip.courseName} を入力中</b><span>${wip.holesPlayed}/${wip.holesCount}ホール ・ タップで続きから</span></div>${icon('chevronRight', { size: 16 })}</a>` : ''}
    <section class="golf-summary">
      <div class="asset"><strong>${list.summary.rounds}</strong><span>ラウンド</span></div>
      <div class="asset"><strong>${list.summary.average ?? '—'}</strong><span>平均（直近10）</span></div>
      <div class="asset"><strong>${list.summary.best ?? '—'}</strong><span>ベスト</span></div>
    </section>
    <nav class="tabs" aria-label="ゴルフのメニュー">
      <a class="tab-link ${tab === 'rounds' ? 'on' : ''}" href="#/golf">ラウンド</a>
      <a class="tab-link ${tab === 'analysis' ? 'on' : ''}" href="#/golf?tab=analysis">分析${a.locked ? ' 🔒' : ''}</a>
    </nav>
    <div class="tab-body">${tab === 'rounds' ? roundsTab(list.rounds) : analysisTab(a, state.me)}</div>
  `);

  const poll = async () => {
    a = await api('/golf/analysis');
    if (a.coach?.latest?.status === 'pending') pollTimer = setTimeout(poll, 2000);
    else if ($('.coach-body', root)) mount($('.coach-body', root), coachBlock(a.coach));
  };
  if (a.coach?.latest?.status === 'pending') pollTimer = setTimeout(poll, 2000);

  const off = onAction(root, {
    coach: async () => {
      try {
        const res = await api('/golf/coach', { method: 'POST', body: {} });
        a.coach = { ...res.coach, latest: { status: 'pending' } };
        mount($('.coach-body', root), coachBlock(a.coach));
        pollTimer = setTimeout(poll, 1500);
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
