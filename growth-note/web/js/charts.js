import { html, raw, esc } from './ui.js';

// 成長分析のチャート（インライン SVG）。色はすべて CSS 変数から取り、ライト・ダーク両方で読めるようにする。

const r1 = (n) => Math.round(n * 10) / 10;

/**
 * レーダーチャート（6軸）。current は塗り＋線、prev（4週間前）は点線で比較する。
 * @param {{label:string, score:number, prev?:number}[]} axes
 */
export function radarChart(axes, { showPrev = true, size = 400 } = {}) {
  const cx = size / 2;
  const cy = 150;
  const R = 100;
  const n = axes.length;
  const pt = (i, v) => {
    const a = (-90 + (360 / n) * i) * (Math.PI / 180);
    return [cx + Math.cos(a) * R * (v / 100), cy + Math.sin(a) * R * (v / 100)];
  };
  const poly = (vals) => vals.map((v, i) => pt(i, v).map(r1).join(',')).join(' ');
  const rings = [25, 50, 75, 100].map((v) => `<polygon points="${poly(axes.map(() => v))}" class="ch-grid" fill="none"/>`).join('');
  const spokes = axes.map((_, i) => { const [x, y] = pt(i, 100); return `<line x1="${cx}" y1="${cy}" x2="${r1(x)}" y2="${r1(y)}" class="ch-grid"/>`; }).join('');
  const labels = axes.map((a, i) => {
    const [x, y] = pt(i, 124);
    const anchor = Math.abs(x - cx) < 4 ? 'middle' : x > cx ? 'start' : 'end';
    return `<text x="${r1(x)}" y="${r1(y + 4)}" text-anchor="${anchor}" class="ch-label">${esc(a.label)}</text>
            <text x="${r1(x)}" y="${r1(y + 19)}" text-anchor="${anchor}" class="ch-value">${a.score}</text>`;
  }).join('');
  const hasPrev = showPrev && axes.every((a) => typeof a.prev === 'number');
  const prevPoly = hasPrev ? `<polygon points="${poly(axes.map((a) => a.prev))}" class="ch-prev" fill="none"/>` : '';
  const dots = axes.map((a, i) => {
    const [x, y] = pt(i, a.score);
    return `<g><circle cx="${r1(x)}" cy="${r1(y)}" r="5" class="ch-dot"/><circle cx="${r1(x)}" cy="${r1(y)}" r="14" fill="transparent"><title>${esc(a.label)} ${a.score}点${hasPrev ? `（4週間前 ${a.prev}点）` : ''}</title></circle></g>`;
  }).join('');
  return raw(`<svg class="chart radar" viewBox="0 0 ${size} 300" role="img" aria-label="${esc(axes.map((a) => `${a.label}${a.score}点`).join('、'))}">
    ${rings}${spokes}${prevPoly}
    <polygon points="${poly(axes.map((a) => a.score))}" class="ch-area"/>
    ${dots}${labels}
  </svg>`);
}

/** 推移（週ごとの総合スコア）。終点を強調し、値は終点だけに直接ラベルを付ける */
export function trendChart(points) {
  const W = 320;
  const H = 150;
  const L = 28;
  const Rm = 30;
  const T = 14;
  const B = 26;
  const x = (i) => L + ((W - L - Rm) * i) / Math.max(1, points.length - 1);
  const y = (v) => T + (H - T - B) * (1 - v / 100);
  const line = points.map((p, i) => `${r1(x(i))},${r1(y(p.score))}`).join(' ');
  const area = `${r1(x(0))},${y(0)} ${line} ${r1(x(points.length - 1))},${y(0)}`;
  const last = points[points.length - 1];
  const grid = [0, 50, 100].map((v) => `<line x1="${L}" x2="${W - Rm}" y1="${r1(y(v))}" y2="${r1(y(v))}" class="ch-grid"/><text x="${L - 6}" y="${r1(y(v) + 4)}" text-anchor="end" class="ch-axis">${v}</text>`).join('');
  const hits = points.map((p, i) => `<circle cx="${r1(x(i))}" cy="${r1(y(p.score))}" r="12" fill="transparent"><title>${esc(p.end.slice(5).replace('-', '/'))}までの4週間: ${p.score}点</title></circle>`).join('');
  return raw(`<svg class="chart trend" viewBox="0 0 ${W} ${H}" role="img" aria-label="総合スコアの推移。${points[0].score}点から${last.score}点">
    ${grid}
    <polygon points="${area}" class="ch-fill"/>
    <polyline points="${line}" class="ch-line" fill="none"/>
    <circle cx="${r1(x(points.length - 1))}" cy="${r1(y(last.score))}" r="5" class="ch-dot"/>
    <text x="${r1(x(points.length - 1) + 8)}" y="${r1(y(last.score) + 4)}" class="ch-end">${last.score}</text>
    <text x="${L}" y="${H - 6}" class="ch-axis">8週前</text>
    <text x="${W - Rm}" y="${H - 6}" text-anchor="end" class="ch-axis">今週</text>
    ${hits}
  </svg>`);
}

/** 各軸の点数を横棒で（チャートの数値を表でも読めるようにする） */
export function axisBars(axes) {
  return html`<ul class="axis-bars">${axes.map((a) => {
    const diff = typeof a.prev === 'number' ? a.score - a.prev : null;
    return html`<li>
      <span class="axis-name">${a.label}</span>
      <span class="axis-track"><i style="width:${a.score}%"></i></span>
      <span class="axis-score">${a.score}</span>
      ${diff === null ? '' : html`<span class="axis-diff ${diff > 0 ? 'up' : diff < 0 ? 'down' : ''}">${diff > 0 ? `+${diff}` : diff === 0 ? '±0' : diff}</span>`}
    </li>`;
  })}</ul>`;
}

/** ぼかし表示用の見本データ（本人のデータではない） */
export const SAMPLE_AXES = [
  { label: '継続力', score: 72, prev: 58 },
  { label: '行動量', score: 64, prev: 55 },
  { label: '振り返り力', score: 81, prev: 70 },
  { label: '目標推進力', score: 45, prev: 40 },
  { label: '挑戦・改善', score: 58, prev: 61 },
  { label: 'コンディション', score: 69, prev: 66 },
];
export const SAMPLE_TREND = [42, 45, 44, 51, 55, 58, 61, 65].map((score, i) => ({ end: `2026-01-${String(i + 1).padStart(2, '0')}`, score }));
