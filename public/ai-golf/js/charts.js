// 軽量SVGチャート（ライブラリ不要）。色はすべてCSS変数から取る。
const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
};

function niceTicks(min, max, count = 4) {
  const span = max - min || 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || raw;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(6));
  return { lo, hi, ticks };
}

/**
 * 推移グラフ（1系列）
 * @param {HTMLElement} host
 * @param {{points:Array<{x:number,y:number,label:string}>, unit:string, digits?:number, band?:[number,number], bandLabel?:string}} opt
 */
export function lineChart(host, opt) {
  host.innerHTML = '';
  const { points, unit, digits = 0, band } = opt;
  const W = 340, H = 190, L = 40, Rr = 14, T = 14, B = 26;
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': opt.ariaLabel || '推移グラフ' }, host);
  if (!points.length) return;

  const ys = points.map((p) => p.y).concat(band ? band : []);
  let min = Math.min(...ys), max = Math.max(...ys);
  if (max - min < 1e-6) { min -= 1; max += 1; }
  const pad = (max - min) * 0.15;
  const { lo, hi, ticks } = niceTicks(min - pad, max + pad);
  const n = points.length;
  const sx = (i) => (n === 1 ? (L + W - Rr) / 2 : L + (i * (W - L - Rr)) / (n - 1));
  const sy = (v) => T + ((hi - v) * (H - T - B)) / (hi - lo);

  // 目標レンジ
  if (band) {
    el('rect', { x: L, y: sy(band[1]), width: W - L - Rr, height: Math.max(1, sy(band[0]) - sy(band[1])), class: 'c-band' }, svg);
    const t = el('text', { x: W - Rr - 4, y: sy(band[1]) + 11, class: 'c-band-label', 'text-anchor': 'end' }, svg);
    t.textContent = opt.bandLabel || '目標';
  }
  // グリッド
  ticks.forEach((v) => {
    if (v < lo || v > hi) return;
    el('line', { x1: L, x2: W - Rr, y1: sy(v), y2: sy(v), class: 'c-grid' }, svg);
    const t = el('text', { x: L - 6, y: sy(v) + 3.5, class: 'c-tick', 'text-anchor': 'end' }, svg);
    t.textContent = v.toFixed(Math.abs(v) < 10 && digits ? 1 : 0);
  });
  // X ラベル（最初と最後、間引き）
  const every = Math.max(1, Math.ceil(n / 5));
  points.forEach((p, i) => {
    if (i % every && i !== n - 1) return;
    const t = el('text', { x: sx(i), y: H - 8, class: 'c-tick', 'text-anchor': n === 1 ? 'middle' : i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle' }, svg);
    t.textContent = p.label;
  });

  // エリア + 線
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${sx(i).toFixed(1)},${sy(p.y).toFixed(1)}`).join('');
  if (n > 1) {
    el('path', { d: `${d}L${sx(n - 1)},${H - B}L${sx(0)},${H - B}Z`, class: 'c-area' }, svg);
    el('path', { d, class: 'c-line' }, svg);
  }
  points.forEach((p, i) => {
    el('circle', { cx: sx(i), cy: sy(p.y), r: i === n - 1 ? 5 : 3.5, class: i === n - 1 ? 'c-dot c-dot-last' : 'c-dot' }, svg);
  });
  // 最新値ラベル
  const last = points[n - 1];
  const lt = el('text', { x: sx(n - 1) - 8, y: sy(last.y) - 10, class: 'c-value', 'text-anchor': 'end' }, svg);
  lt.textContent = `${last.y.toFixed(digits)}${unit}`;

  // ホバー / タップ
  const cross = el('line', { y1: T, y2: H - B, class: 'c-cross', visibility: 'hidden' }, svg);
  const tip = document.createElement('div');
  tip.className = 'c-tip';
  tip.hidden = true;
  host.appendChild(tip);
  const hit = el('rect', { x: L, y: 0, width: W - L - Rr, height: H, fill: 'transparent' }, svg);
  const show = (ev) => {
    const r = svg.getBoundingClientRect();
    const x = ((ev.clientX - r.left) / r.width) * W;
    let best = 0;
    points.forEach((_, i) => { if (Math.abs(sx(i) - x) < Math.abs(sx(best) - x)) best = i; });
    const p = points[best];
    cross.setAttribute('x1', sx(best)); cross.setAttribute('x2', sx(best));
    cross.setAttribute('visibility', 'visible');
    tip.hidden = false;
    tip.innerHTML = `<b>${p.y.toFixed(digits)}${unit}</b><span>${p.tip || p.label}</span>`;
    const px = (sx(best) / W) * r.width;
    tip.style.left = `${Math.min(Math.max(px, 50), r.width - 50)}px`;
    tip.style.top = `${(sy(p.y) / H) * r.height}px`;
  };
  hit.addEventListener('pointermove', show);
  hit.addEventListener('pointerdown', show);
  hit.addEventListener('pointerleave', () => { tip.hidden = true; cross.setAttribute('visibility', 'hidden'); });
}

/**
 * 弾道（横から見た軌跡）。paths: [{path:[[x,y]...], highlight:boolean}]、単位はヤード
 */
export function trajectoryChart(host, paths, opt = {}) {
  host.innerHTML = '';
  const W = 340, H = 150, L = 30, Rr = 12, T = 12, B = 22;
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': '弾道' }, host);
  const maxX = Math.max(50, ...paths.flatMap((p) => p.path.map((q) => q[0])));
  const maxY = Math.max(10, ...paths.flatMap((p) => p.path.map((q) => q[1])));
  const { hi: xHi, ticks: xt } = niceTicks(0, maxX * 1.05, 4);
  const { hi: yHi, ticks: yt } = niceTicks(0, maxY * 1.25, 2);
  const sx = (v) => L + (v / xHi) * (W - L - Rr);
  const sy = (v) => H - B - (v / yHi) * (H - T - B);
  yt.forEach((v) => {
    el('line', { x1: L, x2: W - Rr, y1: sy(v), y2: sy(v), class: 'c-grid' }, svg);
    const t = el('text', { x: L - 5, y: sy(v) + 3.5, class: 'c-tick', 'text-anchor': 'end' }, svg);
    t.textContent = v;
  });
  xt.forEach((v) => {
    const t = el('text', { x: sx(v), y: H - 6, class: 'c-tick', 'text-anchor': v === 0 ? 'start' : 'middle' }, svg);
    t.textContent = v === 0 ? '0' : `${v}${opt.unit || 'yd'}`;
  });
  el('line', { x1: L, x2: W - Rr, y1: sy(0), y2: sy(0), class: 'c-ground' }, svg);
  paths.forEach((p) => {
    const d = p.path.map((q, i) => `${i ? 'L' : 'M'}${sx(q[0]).toFixed(1)},${sy(q[1]).toFixed(1)}`).join('');
    el('path', { d, class: p.highlight ? 'c-traj c-traj-hi' : 'c-traj' }, svg);
    const end = p.path[p.path.length - 1];
    if (p.highlight) el('circle', { cx: sx(end[0]), cy: sy(0), r: 4, class: 'c-dot c-dot-last' }, svg);
  });
}
