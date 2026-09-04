import { escapeHtml } from './layout.js';

// Hand-rolled inline SVG line chart (no chart library available in this
// dependency-free environment). Single series, so no legend is needed —
// the heading names it.
export function renderScoreChart(rounds) {
  const points = rounds
    .filter((r) => r.score !== null && r.score !== undefined)
    .slice()
    .sort((a, b) => (a.round_date < b.round_date ? -1 : a.round_date > b.round_date ? 1 : 0));

  if (points.length < 2) {
    return `<p class="muted">スコアが2件以上記録されるとグラフが表示されます。</p>`;
  }

  const width = 680;
  const height = 220;
  const padTop = 20;
  const padBottom = 32;
  const padLeft = 40;
  const padRight = 16;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const scores = points.map((p) => p.score);
  const rawMin = Math.min(...scores);
  const rawMax = Math.max(...scores);
  const span = Math.max(rawMax - rawMin, 10);
  const yMin = Math.floor((rawMin - span * 0.15) / 5) * 5;
  const yMax = Math.ceil((rawMax + span * 0.15) / 5) * 5;

  const xFor = (i) => padLeft + (points.length === 1 ? plotW / 2 : (plotW * i) / (points.length - 1));
  const yFor = (score) => padTop + plotH - ((score - yMin) / (yMax - yMin)) * plotH;

  const gridCount = 4;
  const gridLines = [];
  for (let i = 0; i <= gridCount; i++) {
    const value = yMin + ((yMax - yMin) * i) / gridCount;
    const y = yFor(value);
    gridLines.push(
      `<line x1="${padLeft}" y1="${y.toFixed(1)}" x2="${width - padRight}" y2="${y.toFixed(1)}" class="chart-grid" />` +
        `<text x="${padLeft - 8}" y="${(y + 4).toFixed(1)}" class="chart-axis-label" text-anchor="end">${Math.round(value)}</text>`
    );
  }

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(p.score).toFixed(1)}`)
    .join(' ');

  // Show at most ~6 x-axis date labels so they don't overlap on long histories.
  const labelStride = Math.max(1, Math.ceil(points.length / 6));
  const xLabels = points
    .map((p, i) => {
      if (i % labelStride !== 0 && i !== points.length - 1) return '';
      const [, m, d] = p.round_date.split('-');
      return `<text x="${xFor(i).toFixed(1)}" y="${height - 8}" class="chart-axis-label" text-anchor="middle">${m}/${d}</text>`;
    })
    .join('');

  const dots = points
    .map((p, i) => {
      const x = xFor(i).toFixed(1);
      const y = yFor(p.score).toFixed(1);
      return `<circle cx="${x}" cy="${y}" r="5" class="chart-point"
        data-date="${escapeHtml(p.round_date)}" data-score="${p.score}" data-course="${escapeHtml(p.course_name)}" />`;
    })
    .join('');

  return `
    <p class="chart-caption">スコアは低いほど良いスコアです</p>
    <svg viewBox="0 0 ${width} ${height}" class="score-chart" role="img" aria-label="スコア推移グラフ">
      ${gridLines.join('')}
      ${xLabels}
      <path d="${pathD}" class="chart-line" />
      ${dots}
    </svg>
    <div class="chart-tooltip" id="chart-tooltip" hidden></div>
  `;
}
