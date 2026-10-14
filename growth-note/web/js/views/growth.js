import { api } from '../api.js';
import { html, mount, $, onAction, toast, progressBar, paywallCard, fmtDate } from '../ui.js';
import { icon } from '../icons.js';
import { radarChart, trendChart, axisBars, SAMPLE_AXES, SAMPLE_TREND } from '../charts.js';

function levelCard(level, overall, overallPrev, rank) {
  const diff = overall - overallPrev;
  return html`<section class="card level-card">
    <div class="level-badge"><span>Lv.</span><strong class="num">${level.level}</strong></div>
    <div class="level-main">
      <p class="eyebrow">成長レベル</p>
      ${progressBar(level.progress, { cls: 'progress-accent' })}
      <p class="muted small">次のレベルまで ${level.next - level.xp} XP</p>
    </div>
    <div class="score-box">
      <span class="score-num num">${overall}</span>
      <span class="score-rank rank-${rank.key}">${rank.label}</span>
      <span class="score-diff ${diff > 0 ? 'up' : diff < 0 ? 'down' : ''}">4週間前より ${diff > 0 ? `+${diff}` : diff === 0 ? '±0' : diff}</span>
    </div>
  </section>`;
}

function chartsBlock(axes, trend) {
  return html`
    <section class="card">
      <div class="card-head"><h2 class="card-title">${icon('target', { size: 18 })}6つの指標</h2>
        <span class="chart-key"><i class="k-now"></i>今 <i class="k-prev"></i>4週間前</span></div>
      <div class="radar-wrap">${radarChart(axes)}</div>
      ${axisBars(axes)}
    </section>
    <section class="card">
      <div class="card-head"><h2 class="card-title">${icon('sparkles', { size: 18 })}総合スコアの推移</h2></div>
      ${trendChart(trend)}
      <p class="hint">各週の時点で、直近4週間の記録から計算しています。</p>
    </section>`;
}

function gapsBlock(gaps, strengths) {
  return html`<section class="card">
    <div class="card-head"><h2 class="card-title">${icon('bulb', { size: 18 })}いま足りないもの</h2></div>
    <div class="gap-list">${gaps.map((g) => html`<article class="gap">
      <div class="gap-top"><b>${g.label}</b><span class="num">${g.score}点</span></div>
      <p>${g.advice}</p>
      <p class="gap-action">${icon('arrowRight', { size: 14 })}${g.action}</p>
    </article>`)}</div>
    <p class="strengths">強み：${strengths.map((s) => html`<span class="pill">${s.label} ${s.score}</span>`)}</p>
  </section>`;
}

function analysisBlock(a) {
  if (!a.latest) {
    return html`<p class="muted">記録と6つの指標をもとに、AIがあなたの強み・足りないもの・次にやることをまとめます。</p>
      <button class="btn btn-primary btn-block" data-action="analyze">${icon('sparkles', { size: 18 })}AIに自己分析してもらう</button>
      <p class="hint">今月あと${a.remaining}回</p>`;
  }
  if (a.latest.status === 'pending') return html`<div class="skeleton-lines"><i></i><i></i><i class="short"></i></div><p class="hint">AIが分析しています…</p>`;
  const d = a.latest.data || {};
  return html`
    <p class="eyebrow">${fmtDate(a.latest.created_at.slice(0, 10))}の分析</p>
    <p class="ai-summary">${d.summary}</p>
    ${d.strengths?.length ? html`<h3 class="ai-h">強み</h3><ul class="ai-list">${d.strengths.map((t) => html`<li>${t}</li>`)}</ul>` : ''}
    ${d.gaps?.length ? html`<h3 class="ai-h">足りないもの・伸びしろ</h3><ul class="ai-list">${d.gaps.map((t) => html`<li>${t}</li>`)}</ul>` : ''}
    ${d.patterns?.length ? html`<h3 class="ai-h">見えてきた傾向</h3><ul class="ai-list">${d.patterns.map((t) => html`<li>${t}</li>`)}</ul>` : ''}
    ${d.actions?.length ? html`<h3 class="ai-h">次の1〜2週間でやること</h3><ul class="ai-actions">${d.actions.map((t) => html`<li><span class="dot"></span>${t}</li>`)}</ul>` : ''}
    ${d.focus ? html`<p class="ai-cheer">${d.focus}</p>` : ''}
    ${a.latest.provider === 'local' ? html`<p class="hint">簡易モードの分析です</p>` : ''}
    <button class="btn btn-ghost btn-sm" data-action="analyze" ${a.remaining ? '' : 'disabled'}>${icon('refresh', { size: 16 })}最新の記録で分析し直す（今月あと${a.remaining}回）</button>`;
}

export async function render(root, _params, { state }) {
  let g = await api('/growth');
  const me = state.me;
  let pollTimer = null;

  const head = html`<header class="page-head">
    <div><p class="eyebrow">記録から見える、いまの自分</p><h1 class="page-title">成長分析</h1></div>
    ${g.locked ? '' : html`<span class="plan-badge pro small">プロ</span>`}
  </header>`;

  if (!g.ready) {
    mount(root, html`${head}
      <section class="card empty">
        <div class="empty-emoji">🌱</div>
        <p>あと<b>${g.needEntries}件</b>記録すると、あなたの成長レベルと6つの指標が計算できるようになります。</p>
        <a class="btn btn-primary" href="#/write">${icon('plus', { size: 18 })}記録する</a>
      </section>`);
    return;
  }

  if (g.locked) {
    // 無料プラン: 見本データをぼかして見せる（本人の数値はサーバーから届いていない）
    mount(root, html`${head}
      <section class="card teaser-card">
        <p class="teaser-lead">あなたのいちばんの強みは</p>
        <p class="teaser-strength">「${g.teaser.topStrength}」</p>
        <p class="muted small">ほかの指標・レベル・足りないものはプロで見られます</p>
      </section>
      <div class="locked-wrap">
        <div class="locked-preview" aria-hidden="true">
          ${levelCard({ level: 12, progress: 0.6, next: 3900, xp: 3700 }, 65, 58, { key: 'steady', label: '安定' })}
          ${chartsBlock(SAMPLE_AXES, SAMPLE_TREND)}
        </div>
        ${paywallCard(me, { title: 'あなたの成長を、グラフで見る', text: '成長レベル、6つの指標、4週間前との比較、足りないもの、AIによる自己分析が見られます。', reason: 'growth' })}
      </div>`);
    return;
  }

  const draw = () => {
    mount(root, html`${head}
      ${levelCard(g.level, g.overall, g.overallPrev, g.rank)}
      ${chartsBlock(g.axes, g.trend)}
      ${gapsBlock(g.gaps, g.strengths)}
      <section class="card ai-card">
        <div class="card-head"><h2 class="card-title">${icon('sparkles', { size: 18 })}AI自己分析</h2></div>
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
