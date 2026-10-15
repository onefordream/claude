import { api } from '../api.js';
import { html, mount, $, onAction, toast, progressBar, paywallCard, fmtDate } from '../ui.js';
import { radarChart, trendChart, axisBars, SAMPLE_AXES, SAMPLE_TREND } from '../charts.js';

const signed = (n) => (n > 0 ? `+${n}` : n === 0 ? '±0' : `${n}`);

function levelBlock(level, overall, overallPrev, rank) {
  const diff = overall - overallPrev;
  return html`<section class="section">
    <dl class="stat-row stat-row-lg">
      <div><dt>総合スコア</dt><dd>${overall}<small>点</small></dd></div>
      <div><dt>4週間前から</dt><dd class="${diff > 0 ? 'text-success' : diff < 0 ? 'text-error' : ''}">${signed(diff)}</dd></div>
      <div><dt>レベル</dt><dd>${level.level}</dd></div>
    </dl>
    ${progressBar(level.progress)}
    <p class="hint">評価「${rank.label}」　次のレベルまで ${level.next - level.xp} XP</p>
  </section>`;
}

function chartsBlock(axes, trend) {
  return html`
    <section class="section">
      <div class="section-head"><h2 class="section-title">6つの指標</h2>
        <span class="chart-key"><i class="k-now"></i>現在<i class="k-prev"></i>4週間前</span></div>
      <div class="chart-split">
        <div class="radar-wrap">${radarChart(axes)}</div>
        ${axisBars(axes)}
      </div>
    </section>
    <section class="section">
      <div class="section-head"><h2 class="section-title">総合スコアの推移</h2></div>
      ${trendChart(trend)}
      <p class="hint">各週の時点で、直近4週間の記録から計算しています。</p>
    </section>`;
}

function gapsBlock(gaps, strengths) {
  return html`<section class="section">
    <div class="section-head"><h2 class="section-title">伸ばしたい指標</h2></div>
    <div class="list">${gaps.map((g) => html`<article class="gap">
      <p class="gap-head"><b>${g.label}</b><span class="num">${g.score}点</span></p>
      <p>${g.advice}</p>
      <p class="gap-action">${g.action}</p>
    </article>`)}</div>
    <p class="hint">強み：${strengths.map((s) => `${s.label} ${s.score}`).join('、')}</p>
  </section>`;
}

function analysisBlock(a) {
  if (!a.latest) {
    return html`<p class="muted">記録と6つの指標をもとに、AIが強み・課題・次にやることをまとめます。</p>
      <button class="btn btn-primary" data-action="analyze">AIに自己分析を依頼</button>
      <p class="hint">今月あと${a.remaining}回</p>`;
  }
  if (a.latest.status === 'pending') return html`<div class="skeleton-lines" aria-label="分析中"><i></i><i></i><i class="short"></i></div><p class="hint">分析しています</p>`;
  const d = a.latest.data || {};
  return html`
    <p class="eyebrow">${fmtDate(a.latest.created_at.slice(0, 10))}の分析</p>
    <p class="ai-summary">${d.summary}</p>
    ${d.strengths?.length ? html`<h3 class="sub-title">強み</h3><ul class="bullets">${d.strengths.map((t) => html`<li>${t}</li>`)}</ul>` : ''}
    ${d.gaps?.length ? html`<h3 class="sub-title">課題・伸びしろ</h3><ul class="bullets">${d.gaps.map((t) => html`<li>${t}</li>`)}</ul>` : ''}
    ${d.patterns?.length ? html`<h3 class="sub-title">傾向</h3><ul class="bullets">${d.patterns.map((t) => html`<li>${t}</li>`)}</ul>` : ''}
    ${d.actions?.length ? html`<h3 class="sub-title">次の1〜2週間でやること</h3><ol class="steps">${d.actions.map((t) => html`<li>${t}</li>`)}</ol>` : ''}
    ${d.focus ? html`<p class="ai-note">${d.focus}</p>` : ''}
    ${a.latest.provider === 'local' ? html`<p class="hint">簡易モードの分析です</p>` : ''}
    <button class="text-btn" data-action="analyze" ${a.remaining ? '' : 'disabled'}>最新の記録で分析し直す（今月あと${a.remaining}回）</button>`;
}

export async function render(root, _params, { state }) {
  let g = await api('/growth');
  const me = state.me;
  let pollTimer = null;

  const head = html`<header class="page-head">
    <div class="page-head-main"><h1 class="page-title">成長分析</h1><p class="page-sub">記録から計算した、いまの状態</p></div>
  </header>`;

  if (!g.ready) {
    mount(root, html`${head}
      <div class="empty">
        <p>あと${g.needEntries}件の記録で、成長レベルと6つの指標を計算できます。</p>
        <a class="btn btn-primary" href="#/write">記録を追加</a>
      </div>`);
    return;
  }

  if (g.locked) {
    // 無料プラン: 見本データをぼかして見せる（本人の数値はサーバーから届いていない）
    mount(root, html`${head}
      <section class="section">
        <p class="section-label">いちばんの強み</p>
        <p class="lead-value">${g.teaser.topStrength}</p>
        <p class="hint">ほかの指標・レベル・伸ばしたい指標はプロで見られます。</p>
      </section>
      <div class="locked-wrap">
        <div class="locked-preview" aria-hidden="true">
          ${levelBlock({ level: 12, progress: 0.6, next: 3900, xp: 3700 }, 65, 58, { key: 'steady', label: '安定' })}
          ${chartsBlock(SAMPLE_AXES, SAMPLE_TREND)}
        </div>
        ${paywallCard(me, { title: '成長の推移をグラフで見る', text: '成長レベル、6つの指標、4週間前との比較、伸ばしたい指標、AIによる自己分析が見られます。', reason: 'growth' })}
      </div>`);
    return;
  }

  const draw = () => {
    mount(root, html`${head}
      ${levelBlock(g.level, g.overall, g.overallPrev, g.rank)}
      ${chartsBlock(g.axes, g.trend)}
      ${gapsBlock(g.gaps, g.strengths)}
      <section class="section ai-block">
        <div class="section-head"><h2 class="section-title">AI自己分析</h2></div>
        <div class="analysis-body">${analysisBlock(g.analysis)}</div>
      </section>`);
  };
  draw();

  const poll = async () => {
    g = await api('/growth');
    if (g.analysis.latest?.status === 'pending') pollTimer = setTimeout(poll, 2000);
    else mount($('.analysis-body', root), analysisBlock(g.analysis));
  };
  if (g.analysis.latest?.status === 'pending') pollTimer = setTimeout(poll, 2000);

  const off = onAction(root, {
    analyze: async () => {
      try {
        const res = await api('/growth/analysis', { method: 'POST', body: {} });
        g.analysis = { ...res.analysis, latest: { status: 'pending' } };
        mount($('.analysis-body', root), analysisBlock(g.analysis));
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
