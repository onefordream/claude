import { api } from '../api.js';
import { html, mount, $, onAction, toast, fmtRelDate, paywallCard } from '../ui.js';
import { icon } from '../icons.js';
import { radarChart, golfTrendChart, axisBars, SAMPLE_GOLF_AXES, SAMPLE_GOLF_TREND } from '../charts.js';

// ゴルフのトップ: ラウンド一覧（無料）と分析（プロ）

const toParText = (v) => (v == null ? '' : v > 0 ? `+${v}` : v === 0 ? '±0' : `${v}`);
const TARGET_SCORE = { '70s': 79, '80s': 89, '90s': 99, '100s': null };

function roundsTab(rounds) {
  if (!rounds.length) {
    return html`<div class="empty">
      <p>ラウンドを記録すると、スコアの推移と弱点を分析できます。</p>
      <a class="btn btn-primary" href="#/golf/new">ラウンドを記録</a></div>`;
  }
  return html`<div class="list">${rounds.map((r) => html`
    <a class="row round-row" href="#/golf/rounds/${r.id}">
      <span class="row-value row-value-lead">${r.score ?? '—'}<small>${r.status === 'done' ? toParText(r.toPar) : '入力中'}</small></span>
      <span class="row-main">
        <span class="row-title">${r.courseName}</span>
        <span class="row-sub">${fmtRelDate(r.playedOn)}${r.holesCount === 9 ? '　9H' : ''}${r.status !== 'done' ? `　${r.holesPlayed} / ${r.holesCount}H 入力済み` : ''}</span>
        ${r.status === 'done' ? html`<span class="row-sub num">${[r.putts != null && `パット ${r.putts}`, r.fwPct != null && `FW ${r.fwPct}%`, r.girPct != null && `パーオン ${r.girPct}%`, r.ob ? `OB ${r.ob}` : null].filter(Boolean).join('　')}</span>` : ''}
      </span>
      ${icon('caretRight', { size: 16 })}
    </a>`)}</div>`;
}

function potentialBars(p) {
  if (!p.items.length) return html`<p class="muted">どの項目も${p.target.label}の水準に届いています。</p>`;
  const max = Math.max(...p.items.map((i) => i.strokes));
  const total = Math.round(p.items.reduce((s, i) => s + i.strokes, 0) * 10) / 10;
  return html`
    <p class="lead-line">${p.target.label}の水準に近づけると、1ラウンドで約 <b class="num">${total}</b> 打縮まる見込みです。</p>
    <ul class="pot-list">${p.items.map((i, idx) => html`<li>
      <p class="pot-head"><b>${i.label}</b><span class="num">−${i.strokes}打</span></p>
      <span class="meter"><i style="--w:${Math.max(6, (i.strokes / max) * 100)}%"></i></span>
      <p class="pot-detail num">${i.from}${i.unit} から ${i.to}${i.unit} へ</p>
      ${idx === 0 ? html`<p class="pot-tip">${i.tip}</p>` : ''}
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
  return html`<table class="data-table">
    <thead><tr><th scope="col">項目</th><th scope="col">あなた</th><th scope="col">${target.label}の目安</th></tr></thead>
    <tbody>${rows.map(([label, v, t, unit, lowerBetter]) => {
      const good = t == null ? null : lowerBetter ? v <= t : v >= t;
      return html`<tr><th scope="row">${label}</th>
        <td class="${good === null ? '' : good ? 'text-success' : 'text-error'}">${v}${unit}</td>
        <td class="muted">${t == null ? '—' : `${t}${unit}`}</td></tr>`;
    })}</tbody>
  </table>`;
}

function coachBlock(c) {
  if (!c.latest) {
    return html`<p class="muted">直近のラウンドをもとに、AIコーチが弱点と、優先する練習を提案します。</p>
      <button class="btn btn-primary" data-action="coach">AIコーチに分析を依頼</button>
      <p class="hint">今月あと${c.remaining}回</p>`;
  }
  if (c.latest.status === 'pending') return html`<div class="skeleton-lines" aria-label="分析中"><i></i><i></i><i class="short"></i></div><p class="hint">分析しています</p>`;
  if (c.latest.status === 'failed') return html`<p class="muted">分析できませんでした。</p><button class="btn btn-secondary btn-sm" data-action="coach">もう一度</button>`;
  const d = c.latest.data || {};
  return html`
    <p class="ai-summary">${d.summary}</p>
    ${d.priorities?.length ? html`<h3 class="sub-title">優先して取り組むこと</h3>
      <ol class="steps">${d.priorities.map((p) => html`<li>
        <p class="prio-head"><b>${p.area}</b><span class="tag">${p.expected_gain}</span></p>
        <p class="muted">${p.why}</p>
        <p class="prio-drill">${p.drill}</p></li>`)}</ol>` : ''}
    ${d.strengths?.length ? html`<h3 class="sub-title">強み</h3><ul class="bullets">${d.strengths.map((t) => html`<li>${t}</li>`)}</ul>` : ''}
    ${d.weaknesses?.length ? html`<h3 class="sub-title">弱点</h3><ul class="bullets">${d.weaknesses.map((t) => html`<li>${t}</li>`)}</ul>` : ''}
    ${d.next_round_plan?.length ? html`<h3 class="sub-title">次のラウンドで意識すること</h3><ol class="steps">${d.next_round_plan.map((t) => html`<li>${t}</li>`)}</ol>` : ''}
    ${c.latest.provider === 'local' ? html`<p class="hint">簡易モードの分析です</p>` : ''}
    <button class="text-btn" data-action="coach" ${c.remaining ? '' : 'disabled'}>最新のラウンドで分析し直す（今月あと${c.remaining}回）</button>`;
}

function analysisTab(a, me) {
  if (!a.ready) {
    return html`<div class="empty">
      <p>ラウンドを最後まで記録すると、パター・方向性・アプローチなどの能力と、スコアの伸びしろを分析できます。</p>
      <a class="btn btn-primary" href="#/golf/new">ラウンドを記録</a></div>`;
  }
  if (a.locked) {
    return html`
      ${a.teaser.topArea ? html`<section class="section">
        <p class="section-label">伸びしろがいちばん大きい項目</p>
        <p class="lead-value">${a.teaser.topArea}</p>
        <p class="hint">縮められる打数・能力のグラフ・AIコーチの練習メニューはプロで見られます。</p>
      </section>` : ''}
      <div class="locked-wrap">
        <div class="locked-preview" aria-hidden="true">
          <section class="section"><h2 class="section-title">スコアの推移</h2>${golfTrendChart(SAMPLE_GOLF_TREND, { target: 89 })}</section>
          <section class="section"><h2 class="section-title">能力チャート</h2><div class="radar-wrap">${radarChart(SAMPLE_GOLF_AXES, { showPrev: false })}</div></section>
        </div>
        ${paywallCard(me, { title: 'スコアが縮む項目をデータで見る', text: 'パター・方向性・アプローチ・OBなどの能力チャート、1ラウンドで縮められる打数、AIコーチの練習メニューが見られます。', reason: 'golf' })}
      </div>`;
  }
  const target = a.potentials.target;
  return html`
    <section class="section">
      <dl class="stat-row stat-row-lg">
        <div><dt>平均（直近${a.agg.rounds}R・18H換算）</dt><dd>${a.agg.score18}</dd></div>
        ${a.agg.best ? html`<div><dt>ベスト</dt><dd>${a.agg.best}</dd></div>` : ''}
        <div><dt>スコア帯</dt><dd class="dd-text">${a.potentials.current.label}</dd></div>
      </dl>
    </section>
    <section class="section">
      <div class="section-head"><h2 class="section-title">スコアの推移</h2></div>
      ${golfTrendChart(a.trend, { target: TARGET_SCORE[target.key] })}
      <p class="hint">点線は目標（${target.label}）。9ホールのラウンドは18ホールに換算しています。</p>
    </section>
    <section class="section">
      <div class="section-head"><h2 class="section-title">能力チャート</h2></div>
      <div class="chart-split">
        <div class="radar-wrap">${radarChart(a.axes, { showPrev: false })}</div>
        ${axisBars(a.axes.map((x) => ({ label: x.label, score: x.score })))}
      </div>
      <p class="hint">100以上の水準を20、70台の水準を90として点数にしています。</p>
    </section>
    <section class="section">
      <div class="section-head"><h2 class="section-title">スコアの伸びしろ</h2></div>
      ${potentialBars(a.potentials)}
    </section>
    <section class="section">
      <div class="section-head"><h2 class="section-title">目標の水準との比較</h2></div>
      ${compareTable(a.agg, target)}
      ${a.agg.missLeft + a.agg.missRight > 0 ? html`<p class="hint">ティーショットのミス：左 ${a.agg.missLeft}回　右 ${a.agg.missRight}回</p>` : ''}
    </section>
    <section class="section ai-block">
      <div class="section-head"><h2 class="section-title">AIコーチ</h2></div>
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
    <header class="page-head with-back">
      <a class="icon-btn" href="#/" aria-label="戻る">${icon('caretLeft', { size: 20 })}</a>
      <div class="page-head-main"><h1 class="page-title">ゴルフ</h1></div>
      ${list.rounds.length ? html`<a class="btn ${tab === 'rounds' ? 'btn-primary' : 'btn-secondary'} btn-sm" href="#/golf/new">${icon('plus', { size: 16 })}ラウンド</a>` : ''}
    </header>
    ${wip ? html`<a class="notice notice-link" href="#/golf/rounds/${wip.id}">
      <span><span class="notice-title">${wip.courseName}を入力中</span><span class="notice-text">${wip.holesPlayed} / ${wip.holesCount}ホール　続きから入力</span></span>${icon('caretRight', { size: 16 })}</a>` : ''}
    <dl class="figures figures-3">
      <div><dt>ラウンド</dt><dd>${list.summary.rounds}</dd></div>
      <div><dt>平均（直近10）</dt><dd>${list.summary.average ?? '—'}</dd></div>
      <div><dt>ベスト</dt><dd>${list.summary.best ?? '—'}</dd></div>
    </dl>
    <nav class="tabs" aria-label="ゴルフのメニュー">
      <a class="tab-link ${tab === 'rounds' ? 'on' : ''}" href="#/golf" ${tab === 'rounds' ? html`aria-current="page"` : ''}>ラウンド</a>
      <a class="tab-link ${tab === 'analysis' ? 'on' : ''}" href="#/golf?tab=analysis" ${tab === 'analysis' ? html`aria-current="page"` : ''}>分析${a.locked ? html`<span class="tag">プロ</span>` : ''}</a>
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
