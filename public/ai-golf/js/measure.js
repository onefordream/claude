// 動画から1球を測る（タップ方式）
// 1. ボールの左端・右端をタップ → ピクセルとメートルの換算（ボール直径 42.67mm）
// 2. インパクト直後のコマでボール中心をタップ
// 3. 数コマ進めてボール中心をタップ → 移動距離と経過時間から初速・打ち出し角
import { BALL_DIAMETER_M } from './physics.js';

export const VIDEO_MODES = [
  { id: 'slo240', label: 'iPhone/Android スロー 240fps', slow: 8, step: 1 / 30 },
  { id: 'slo120', label: 'スロー 120fps', slow: 4, step: 1 / 30 },
  { id: 'hs240', label: 'ハイスピード保存（等速再生 240fps）', slow: 1, step: 1 / 240 },
];

const STEPS = [
  { id: 'calA', text: 'アドレス時のボールの<b>左端</b>をタップ', short: '左端' },
  { id: 'calB', text: '同じボールの<b>右端</b>をタップ', short: '右端' },
  { id: 'p1', text: 'コマ送りで<b>ボールが動き出した最初のコマ</b>にして、ボールの中心をタップ', short: '1点目' },
  { id: 'p2', text: '<b>3〜6コマ先</b>に進めて、ボールの中心をタップ', short: '2点目' },
];

export function computeShot({ calA, calB, p1, p2, slow }) {
  const pxPerM = Math.hypot(calB.x - calA.x, calB.y - calA.y) / BALL_DIAMETER_M;
  const dt = (p2.t - p1.t) / slow;
  if (!(pxPerM > 0)) return { error: 'ボールの左端と右端を別々の位置でタップしてください。' };
  if (!(dt > 0)) return { error: '2点目は1点目より後のコマでタップしてください。' };
  const dx = Math.abs(p2.x - p1.x);
  const dy = p1.y - p2.y; // 画面の上方向を正
  const dist = Math.hypot(dx, dy) / pxPerM;
  const speed = dist / dt;
  const launch = (Math.atan2(dy, dx) * 180) / Math.PI;
  const warn = [];
  if (speed < 15 || speed > 85) warn.push('初速が想定範囲外です。動画モード（スロー倍率）とタップ位置を確認してください。');
  if (launch < -3 || launch > 50) warn.push('打ち出し角が想定範囲外です。スマホが傾いていないか確認してください。');
  return { speed, launch, warn };
}

/**
 * 計測UIをマウントする
 * @param {HTMLElement} root
 * @param {(result:{speed:number,launch:number,source:string})=>void} onResult
 */
export function mountVideoMeasure(root, onResult, modeId = 'slo240') {
  root.innerHTML = `
    <div class="vm">
      <div class="vm-row">
        <label class="field grow" for="vm-mode"><span>動画の種類</span>
          <select id="vm-mode">${VIDEO_MODES.map((m) => `<option value="${m.id}" ${m.id === modeId ? 'selected' : ''}>${m.label}</option>`).join('')}</select>
        </label>
      </div>
      <label class="btn btn-primary vm-pick" for="vm-file">スロー動画を選ぶ
        <input id="vm-file" type="file" accept="video/*" hidden>
      </label>
      <div class="vm-stage" hidden>
        <p class="vm-step" aria-live="polite"></p>
        <div class="vm-canvas-wrap">
          <canvas class="vm-canvas"></canvas>
          <canvas class="vm-loupe" width="132" height="132" hidden></canvas>
        </div>
        <div class="vm-controls">
          <button type="button" class="btn btn-ghost vm-b5" aria-label="5コマ戻る">«</button>
          <button type="button" class="btn btn-ghost vm-b1" aria-label="1コマ戻る">‹</button>
          <input type="range" class="vm-seek" id="vm-seek" min="0" max="1000" value="0" aria-label="再生位置">
          <button type="button" class="btn btn-ghost vm-f1" aria-label="1コマ進む">›</button>
          <button type="button" class="btn btn-ghost vm-f5" aria-label="5コマ進む">»</button>
        </div>
        <div class="vm-meta"><span class="vm-time">0.000s</span><span class="vm-marks"></span><button type="button" class="link vm-undo">1つ戻す</button></div>
      </div>
      <video class="vm-video" playsinline muted preload="auto" hidden></video>
    </div>`;

  const $ = (s) => root.querySelector(s);
  const video = $('.vm-video');
  const canvas = $('.vm-canvas');
  const ctx = canvas.getContext('2d');
  const loupe = $('.vm-loupe');
  const lctx = loupe.getContext('2d');
  const seek = $('.vm-seek');
  let mode = VIDEO_MODES.find((m) => m.id === modeId) || VIDEO_MODES[0];
  const marks = {};
  let stepIdx = 0;
  let seeking = Promise.resolve();

  $('#vm-mode').addEventListener('change', (e) => { mode = VIDEO_MODES.find((m) => m.id === e.target.value); });

  const updateStep = () => {
    const s = STEPS[stepIdx];
    $('.vm-step').innerHTML = s ? `<span class="pill">${stepIdx + 1}/4</span> ${s.text}` : '';
    $('.vm-marks').textContent = STEPS.slice(0, stepIdx).map((x) => `${x.short}✓`).join(' ');
  };

  const draw = () => {
    if (!video.videoWidth) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const r = Math.max(4, canvas.width / 120);
    ctx.lineWidth = Math.max(2, canvas.width / 400);
    Object.entries(marks).forEach(([k, m]) => {
      const same = k.startsWith('cal') || Math.abs(m.t - video.currentTime) < 1e-4;
      ctx.strokeStyle = k.startsWith('cal') ? '#FFD23F' : same ? '#3DFFB0' : 'rgba(61,255,176,.55)';
      ctx.beginPath(); ctx.arc(m.x, m.y, r, 0, Math.PI * 2); ctx.stroke();
    });
    if (marks.p1 && marks.p2) {
      ctx.strokeStyle = '#3DFFB0';
      ctx.beginPath(); ctx.moveTo(marks.p1.x, marks.p1.y); ctx.lineTo(marks.p2.x, marks.p2.y); ctx.stroke();
    }
    $('.vm-time').textContent = `${video.currentTime.toFixed(3)}s（実時間 ${(video.currentTime / mode.slow).toFixed(4)}s）`;
  };

  const seekTo = (t) => {
    seeking = seeking.then(() => new Promise((res) => {
      const target = Math.max(0, Math.min(video.duration || 0, t));
      if (Math.abs(video.currentTime - target) < 1e-6) { draw(); res(); return; }
      const done = () => { video.removeEventListener('seeked', done); draw(); res(); };
      video.addEventListener('seeked', done);
      video.currentTime = target;
      setTimeout(done, 800); // seeked が来ない端末向けの保険
    }));
    return seeking;
  };

  $('#vm-file').addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    video.src = URL.createObjectURL(f);
    await new Promise((res) => { video.onloadeddata = res; video.onerror = res; video.load(); });
    if (!video.videoWidth) {
      $('.vm-step').textContent = 'この動画は読み込めませんでした。別の動画を選んでください。';
      $('.vm-stage').hidden = false;
      return;
    }
    try { await video.play(); video.pause(); } catch { /* iOSで最初のフレームを出すため */ }
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    Object.keys(marks).forEach((k) => delete marks[k]);
    stepIdx = 0;
    $('.vm-stage').hidden = false;
    $('.vm-pick').firstChild.textContent = '別の動画を選ぶ';
    updateStep();
    await seekTo(0);
  });

  seek.addEventListener('input', () => seekTo((seek.value / 1000) * (video.duration || 0)));
  const step = (n) => () => seekTo(video.currentTime + n * mode.step).then(() => { seek.value = (video.currentTime / (video.duration || 1)) * 1000; });
  $('.vm-b5').addEventListener('click', step(-5));
  $('.vm-b1').addEventListener('click', step(-1));
  $('.vm-f1').addEventListener('click', step(1));
  $('.vm-f5').addEventListener('click', step(5));
  $('.vm-undo').addEventListener('click', () => {
    if (!stepIdx) return;
    stepIdx--; delete marks[STEPS[stepIdx].id]; updateStep(); draw();
  });

  // ルーペ付きタップ
  const toVideo = (ev) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((ev.clientX - r.left) / r.width) * canvas.width, y: ((ev.clientY - r.top) / r.height) * canvas.height };
  };
  const showLoupe = (p) => {
    loupe.hidden = false;
    const zoom = 4, size = loupe.width / zoom;
    lctx.imageSmoothingEnabled = false;
    lctx.clearRect(0, 0, loupe.width, loupe.height);
    lctx.drawImage(canvas, p.x - size / 2, p.y - size / 2, size, size, 0, 0, loupe.width, loupe.height);
    lctx.strokeStyle = '#FF3B6B'; lctx.lineWidth = 1.5;
    const c = loupe.width / 2;
    lctx.beginPath(); lctx.moveTo(c, c - 14); lctx.lineTo(c, c + 14); lctx.moveTo(c - 14, c); lctx.lineTo(c + 14, c); lctx.stroke();
  };
  let active = false;
  canvas.addEventListener('pointerdown', (ev) => { if (stepIdx >= STEPS.length) return; active = true; canvas.setPointerCapture(ev.pointerId); showLoupe(toVideo(ev)); });
  canvas.addEventListener('pointermove', (ev) => { if (active) showLoupe(toVideo(ev)); });
  canvas.addEventListener('pointercancel', () => { active = false; loupe.hidden = true; });
  canvas.addEventListener('pointerup', (ev) => {
    if (!active) return;
    active = false; loupe.hidden = true;
    const p = toVideo(ev);
    const s = STEPS[stepIdx];
    marks[s.id] = { ...p, t: video.currentTime };
    stepIdx++;
    updateStep(); draw();
    if (stepIdx === STEPS.length) {
      const r = computeShot({ ...marks, slow: mode.slow });
      if (r.error) {
        $('.vm-step').textContent = r.error;
        stepIdx = 2; delete marks.p1; delete marks.p2; draw();
        return;
      }
      onResult({ speed: r.speed, launch: r.launch, warn: r.warn, source: 'video' });
    }
  });

  return { reset() { Object.keys(marks).forEach((k) => delete marks[k]); stepIdx = 0; updateStep(); draw(); } };
}
