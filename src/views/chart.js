import { escapeHtml } from './layout.js';

// Hand-rolled inline SVG charts (no chart library available in this
// dependency-free environment).

// Score trend for the last N completed rounds, normalized to 18-hole
// equivalents so 9H and 18H rounds plot on the same axis. `targetLine`, when
// given, draws a dotted horizontal line at that score (the top of the next
// score band) as a goal marker.
export function renderRoundTrendChart(recentRounds, targetLine) {
  const points = recentRounds
    .filter((r) => r.aggregate.totalScore !== null && r.round.holesPlayed)
    .map((r) => ({
      date: r.round.playDate,
      course: r.round.courseName,
      score: Math.round((r.aggregate.totalScore / r.round.holesPlayed) * 18 * 10) / 10,
    }));

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

  const scores = points.map((p) => p.score).concat(targetLine ? [targetLine] : []);
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

  const targetHtml =
    targetLine != null
      ? `<line x1="${padLeft}" y1="${yFor(targetLine).toFixed(1)}" x2="${width - padRight}" y2="${yFor(targetLine).toFixed(1)}" class="chart-target-line" />
         <text x="${width - padRight}" y="${(yFor(targetLine) - 4).toFixed(1)}" class="chart-axis-label" text-anchor="end">目標 ${targetLine}</text>`
      : '';

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(p.score).toFixed(1)}`).join(' ');

  const labelStride = Math.max(1, Math.ceil(points.length / 6));
  const xLabels = points
    .map((p, i) => {
      if (i % labelStride !== 0 && i !== points.length - 1) return '';
      const [, m, d] = p.date.split('-');
      return `<text x="${xFor(i).toFixed(1)}" y="${height - 8}" class="chart-axis-label" text-anchor="middle">${m}/${d}</text>`;
    })
    .join('');

  const dots = points
    .map((p, i) => {
      const x = xFor(i).toFixed(1);
      const y = yFor(p.score).toFixed(1);
      return `<circle cx="${x}" cy="${y}" r="5" class="chart-point"
        data-date="${escapeHtml(p.date)}" data-score="${p.score}" data-course="${escapeHtml(p.course)}" />`;
    })
    .join('');

  return `
    <p class="chart-caption">スコアは低いほど良いスコアです(18ホール換算)</p>
    <svg viewBox="0 0 ${width} ${height}" class="score-chart" role="img" aria-label="スコア推移グラフ">
      ${gridLines.join('')}
      ${targetHtml}
      ${xLabels}
      <path d="${pathD}" class="chart-line" />
      ${dots}
    </svg>
    <div class="chart-tooltip" id="chart-tooltip" hidden></div>
  `;
}

// Spider/radar chart for the 0-100 ability scores.
export function renderAbilityRadar(items) {
  const size = 280;
  const center = size / 2;
  const maxR = size / 2 - 44;
  const n = items.length;
  const angleFor = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;

  const ringLevels = [20, 40, 60, 80, 100];
  const rings = ringLevels
    .map((level) => {
      const r = (level / 100) * maxR;
      const pts = items.map((_, i) => {
        const a = angleFor(i);
        return `${(center + r * Math.cos(a)).toFixed(1)},${(center + r * Math.sin(a)).toFixed(1)}`;
      });
      return `<polygon points="${pts.join(' ')}" class="radar-ring" />`;
    })
    .join('');

  const axisLines = items
    .map((_, i) => {
      const a = angleFor(i);
      const x = center + maxR * Math.cos(a);
      const y = center + maxR * Math.sin(a);
      return `<line x1="${center}" y1="${center}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="radar-axis" />`;
    })
    .join('');

  const dataPts = items.map((item, i) => {
    const a = angleFor(i);
    const r = (clamp01(item.score) / 100) * maxR;
    return `${(center + r * Math.cos(a)).toFixed(1)},${(center + r * Math.sin(a)).toFixed(1)}`;
  });

  const labels = items
    .map((item, i) => {
      const a = angleFor(i);
      const lr = maxR + 22;
      const x = center + lr * Math.cos(a);
      const y = center + lr * Math.sin(a);
      const anchor = Math.cos(a) > 0.3 ? 'start' : Math.cos(a) < -0.3 ? 'end' : 'middle';
      return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" class="radar-label">${escapeHtml(item.label)}</text>`;
    })
    .join('');

  return `
    <svg viewBox="0 0 ${size} ${size}" class="ability-radar" role="img" aria-label="能力チャート">
      ${rings}
      ${axisLines}
      <polygon points="${dataPts.join(' ')}" class="radar-shape" />
      ${labels}
    </svg>
  `;
}

function clamp01(v) {
  return Math.max(0, Math.min(100, v));
}
