/* SWING CAM — ゴルフ用モーションカメラ（ブラウザだけで動作）
 *
 *  - Camera   : カメラ映像を取得
 *  - Ring     : MediaRecorder を2本ずらして回し、常に「直前数秒」を保持
 *  - Detector : インパクト音 / 動き でショットを検知
 *  - Viewer   : 2画面同期リプレイ、コマ送り、スロー、線・角度・円・手書き
 *  - Net      : PeerJS(WebRTC) でカメラ→モニターへクリップを直接送信
 */
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const now = () => performance.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PEER_PREFIX = 'swingcam-v1-';
// 独自のシグナリングサーバーを使う場合は window.SWINGCAM_PEER_OPTS = {host, port, path, secure}
const peerOpts = () => window.SWINGCAM_PEER_OPTS || {};
const VIEW_LABEL = { back: '後方', front: '正面', solo: 'カメラ' };

/* ------------------------------------------------------------------ settings */
const DEFAULTS = { detect: 'soundmotion', sens: 5, pre: 3, post: 1.5, res: '720', fps: '60', autoSpeed: '0.25', localReplay: false };
const settings = (() => {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('swingcam') || '{}') }; } catch { return { ...DEFAULTS }; }
})();
function saveSettings() { try { localStorage.setItem('swingcam', JSON.stringify(settings)); } catch {} }

function bindSettings() {
  $$('[data-set]').forEach((el) => {
    const k = el.dataset.set;
    if (el.type === 'checkbox') el.checked = !!settings[k]; else el.value = settings[k];
    const out = $(`[data-out="${k}"]`);
    if (out) out.textContent = settings[k];
    el.addEventListener('input', () => {
      settings[k] = el.type === 'checkbox' ? el.checked : (el.type === 'range' ? Number(el.value) : el.value);
      if (out) out.textContent = settings[k];
      saveSettings();
    });
  });
}

let toastTimer;
function toast(msg, ms = 2500) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

function show(id) {
  $$('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
}

let wakeLock = null;
async function keepAwake() {
  try { wakeLock = await navigator.wakeLock?.request('screen'); } catch {}
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && wakeLock) keepAwake(); });

/* ------------------------------------------------------------------ camera */
async function openCamera() {
  const big = settings.res === '1080';
  const video = {
    facingMode: { ideal: 'environment' },
    width: { ideal: big ? 1920 : 1280 },
    height: { ideal: big ? 1080 : 720 },
    frameRate: { ideal: Number(settings.fps) },
  };
  const audio = { echoCancellation: false, noiseSuppression: false, autoGainControl: false };
  try {
    return await navigator.mediaDevices.getUserMedia({ video, audio });
  } catch (e) {
    if (e.name === 'NotAllowedError' || e.name === 'NotFoundError') {
      // マイクだけ拒否された場合に備えて映像のみで再試行
      try { const s = await navigator.mediaDevices.getUserMedia({ video }); toast('マイクが使えないため「動き」検知になります'); return s; } catch {}
    }
    throw e;
  }
}

/* ------------------------------------------------------------------ ring recorder */
function pickMime() {
  const list = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  return list.find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported?.(m)) || '';
}

class Ring {
  constructor(stream, seg = 10) {
    // 録画は映像トラックのみ（音声は不要・軽量化）
    this.stream = new MediaStream(stream.getVideoTracks());
    this.seg = seg * 1000;
    this.mime = pickMime();
    this.bitrate = settings.res === '1080' ? 8e6 : 5e6;
    this.slots = [{}, {}];
    this.running = false;
  }
  start() {
    this.running = true;
    this.startSlot(this.slots[0]);
    setTimeout(() => this.running && this.startSlot(this.slots[1]), this.seg / 2);
    this.timer = setInterval(() => this.housekeep(), 250);
  }
  stop() {
    this.running = false;
    clearInterval(this.timer);
    this.slots.forEach((s) => { try { s.rec?.state !== 'inactive' && s.rec?.stop(); } catch {} });
  }
  startSlot(slot) {
    const opts = { videoBitsPerSecond: this.bitrate };
    if (this.mime) opts.mimeType = this.mime;
    const rec = new MediaRecorder(this.stream, opts);
    slot.rec = rec; slot.chunks = []; slot.reserved = false; slot.startAt = now();
    rec.ondataavailable = (e) => { if (e.data && e.data.size) slot.chunks.push(e.data); };
    rec.onstart = () => { slot.startAt = now(); };
    rec.start(500);
    if (!this.mime) this.mime = rec.mimeType;
  }
  age(slot) { return slot.rec ? now() - slot.startAt : -1; }
  /** 使える過去映像の秒数 */
  bufferSeconds() { return Math.max(0, ...this.slots.map((s) => this.age(s))) / 1000; }
  housekeep() {
    if (!this.running) return;
    const [a, b] = this.slots;
    for (const [s, other] of [[a, b], [b, a]]) {
      if (!s.rec || s.reserved) continue;
      // もう一方が十分な過去映像を持っているときだけ回し直す
      if (this.age(s) > this.seg && (other.reserved || this.age(other) > (settings.pre + 1.5) * 1000 || this.age(s) > this.seg * 3)) {
        try { s.rec.ondataavailable = null; s.rec.stop(); } catch {}
        this.startSlot(s);
      }
    }
  }
  /** impactAt(performance.now基準)の前後を切り出す。Promise<{blob, mime, impactOffset}> */
  async capture(impactAt, pre, post) {
    const need = impactAt - pre * 1000 - 150;
    const free = this.slots.filter((s) => s.rec && !s.reserved);
    if (!free.length) return null;
    const ok = free.filter((s) => s.startAt <= need).sort((x, y) => y.startAt - x.startAt);
    const slot = ok[0] || free.sort((x, y) => x.startAt - y.startAt)[0];
    slot.reserved = true;
    const wait = impactAt + post * 1000 + 250 - now();
    if (wait > 0) await sleep(wait);
    const rec = slot.rec, startAt = slot.startAt, chunks = slot.chunks;
    const blob = await new Promise((res) => {
      rec.onstop = () => res(new Blob(chunks, { type: (rec.mimeType || this.mime || 'video/webm').split(';')[0] }));
      try { rec.requestData?.(); } catch {}
      rec.stop();
    });
    if (this.running) this.startSlot(slot); else slot.reserved = false;
    return { blob, mime: blob.type, impactOffset: Math.max(0, (impactAt - startAt) / 1000) };
  }
}

/* ------------------------------------------------------------------ detector */
class Detector {
  constructor(stream, video, audioCtx, onShot) {
    this.video = video;
    this.onShot = onShot;
    this.lastShot = 0;
    this.hist = [];        // [t, motion]
    this.base = 0.01;
    this.sound = 0; this.motion = 0;
    this.swing = null;     // motion mode state
    if (audioCtx && stream.getAudioTracks().length) {
      const src = audioCtx.createMediaStreamSource(stream);
      const hp = audioCtx.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 1800; // 打球音の高い成分だけ見る（風・声を除外）
      this.an = audioCtx.createAnalyser();
      this.an.fftSize = 2048;
      src.connect(hp); hp.connect(this.an);
      this.buf = new Float32Array(this.an.fftSize);
    }
    this.cv = document.createElement('canvas');
    this.cv.width = 64; this.cv.height = 48;
    this.cx = this.cv.getContext('2d', { willReadFrequently: true });
    this.prev = null;
    this.alive = true;
    this.frame = 0;
    const loop = () => { if (!this.alive) return; this.tick(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  destroy() { this.alive = false; }
  get soundThr() { return 0.6 * Math.pow(0.68, settings.sens - 1); }   // 感度1:0.6 → 10:0.019
  get motionThr() { return 2 + (10 - settings.sens) * 1.3; }           // 感度1:13.7 → 10:2
  tick() {
    const t = now();
    // --- sound
    let spike = false;
    if (this.an) {
      this.an.getFloatTimeDomainData(this.buf);
      let p = 0;
      for (let i = 0; i < this.buf.length; i++) { const v = Math.abs(this.buf[i]); if (v > p) p = v; }
      this.sound = p;
      spike = p > this.soundThr && p > this.base * 5;
      if (!spike) this.base = Math.max(0.002, this.base * 0.97 + p * 0.03);
    }
    // --- motion（2フレームに1回）
    if ((this.frame++ & 1) === 0 && this.video.readyState >= 2) {
      this.cx.drawImage(this.video, 0, 0, 64, 48);
      const d = this.cx.getImageData(0, 0, 64, 48).data;
      const g = new Uint8Array(64 * 48);
      let diff = 0;
      for (let i = 0, j = 0; j < g.length; i += 4, j++) {
        g[j] = (d[i] * 3 + d[i + 1] * 4 + d[i + 2]) >> 3;
        if (this.prev) diff += Math.abs(g[j] - this.prev[j]);
      }
      this.prev = g;
      this.motion = diff / g.length;
      this.hist.push([t, this.motion]);
      while (this.hist.length && this.hist[0][0] < t - 3000) this.hist.shift();
    }
    // --- decision
    const cool = t - this.lastShot < 3000;
    const mode = settings.detect;
    if (cool || mode === 'manual') { this.swing = null; return; }
    if (mode === 'sound' && spike) return this.fire(t - 20);
    if (mode === 'soundmotion' && spike) {
      const m = Math.max(0, ...this.hist.filter(([ht]) => ht > t - 1200).map(([, v]) => v));
      if (m > this.motionThr * 0.6) return this.fire(t - 20);
    }
    if (mode === 'motion') {
      const thr = this.motionThr;
      if (this.motion > thr) {
        if (!this.swing) this.swing = { start: t, peak: this.motion, peakAt: t, quietSince: 0 };
        else if (this.motion > this.swing.peak) { this.swing.peak = this.motion; this.swing.peakAt = t; }
        this.swing.quietSince = 0;
      } else if (this.swing) {
        if (!this.swing.quietSince) this.swing.quietSince = t;
        if (t - this.swing.quietSince > 350) {
          const dur = this.swing.quietSince - this.swing.start;
          const peakAt = this.swing.peakAt;
          this.swing = null;
          if (dur > 120 && dur < 5000) this.fire(peakAt);
        }
      }
    }
  }
  fire(impactAt) {
    this.lastShot = now();
    this.onShot(impactAt);
  }
}

/* ------------------------------------------------------------------ video helpers */
function loadVideo(video, url) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => { if (done) return; done = true; video.onloadedmetadata = video.ondurationchange = video.onerror = null; resolve(); };
    video.muted = true; video.playsInline = true; video.preload = 'auto';
    video.onloadedmetadata = () => {
      if (!isFinite(video.duration)) {
        // MediaRecorder(webm) は長さが Infinity になるため末尾へシークして確定させる
        video.ondurationchange = () => { if (isFinite(video.duration)) { video.currentTime = 0; finish(); } };
        video.currentTime = 1e7;
      } else finish();
    };
    video.onerror = finish;
    setTimeout(finish, 4000);
    video.src = url;
    video.load();
  });
}

function seekVideo(v, time) {
  return new Promise((res) => {
    if (Math.abs(v.currentTime - time) < 0.001) return res();
    const done = () => { v.removeEventListener('seeked', done); res(); };
    v.addEventListener('seeked', done);
    v.currentTime = time;
    setTimeout(done, 600);
  });
}

/* ------------------------------------------------------------------ viewer */
const Viewer = {
  panes: [],
  t: 0, start: 0, end: 0,
  playing: false, loop: true, speed: 0.25,
  tool: 'none', color: '#ffd400',
  history: [],          // [{id, at, clips:[clip]}]
  currentId: null,
  onBack: null,

  init() {
    $('#v-back').onclick = () => { this.close(); this.onBack?.(); };
    $('#v-play').onclick = () => this.toggle();
    $$('[data-act]').forEach((b) => b.addEventListener('click', () => {
      const a = b.dataset.act;
      if (a === 'toggle') return;
      if (a === 'start') { this.pause(); this.seek(this.start); }
      if (a === 'impact') { this.pause(); this.seek(0); }
      if (a === 'back') this.step(-1);
      if (a === 'fwd') this.step(1);
    }));
    $$('#v-speeds button').forEach((b) => b.addEventListener('click', () => this.setSpeed(Number(b.dataset.s))));
    $('#v-loop').onclick = (e) => { this.loop = !this.loop; e.currentTarget.classList.toggle('on', this.loop); };
    $$('#v-tools button').forEach((b) => b.addEventListener('click', () => {
      this.tool = b.dataset.t;
      $$('#v-tools button').forEach((x) => x.classList.toggle('on', x === b));
      this.panes.forEach((p) => { p.canvas.style.pointerEvents = this.tool === 'none' ? 'none' : 'auto'; p.pending = null; this.draw(p); });
    }));
    $$('#v-colors button').forEach((b) => b.addEventListener('click', () => {
      this.color = b.dataset.c;
      $$('#v-colors button').forEach((x) => x.classList.toggle('on', x === b));
    }));
    $('#v-undo').onclick = () => { const p = this.lastEdited || this.panes[0]; if (p) { p.shapes.pop(); this.draw(p); } };
    $('#v-clear').onclick = () => this.panes.forEach((p) => { p.shapes = []; p.pending = null; this.draw(p); });
    const scrub = $('#v-scrub');
    scrub.addEventListener('input', () => { this.pause(); this.seek(Number(scrub.value)); });
    $('#v-history').onchange = (e) => this.openShot(e.target.value);
    $('#v-stage').addEventListener('click', (e) => { if (this.tool === 'none' && !e.target.closest('.label')) this.toggle(); });
    window.addEventListener('resize', () => this.panes.forEach((p) => this.draw(p)));
    document.addEventListener('keydown', (e) => {
      if ($('#viewer').hidden || e.target.matches('input, select')) return;
      if (e.key === ' ') { e.preventDefault(); this.toggle(); }
      if (e.key === 'ArrowLeft') this.step(-1);
      if (e.key === 'ArrowRight') this.step(1);
      if (e.key === 'Escape') $('#v-back').click();
    });
    this.setSpeed(Number(settings.autoSpeed));
    const loop = () => { this.frame(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  },

  /** 新しいクリップを履歴に追加（同じidなら同じショットとしてまとめる） */
  add(clip) {
    let shot = this.history.find((h) => h.id === clip.id);
    if (!shot) {
      shot = { id: clip.id, at: new Date(), clips: [] };
      this.history.unshift(shot);
      while (this.history.length > 30) this.history.pop().clips.forEach((c) => URL.revokeObjectURL(c.url));
    }
    shot.clips = shot.clips.filter((c) => c.view !== clip.view);
    shot.clips.push(clip);
    shot.clips.sort((a, b) => (a.view === 'back' ? -1 : 1) - (b.view === 'back' ? -1 : 1));
    this.renderHistory();
    return shot;
  },

  renderHistory() {
    const sel = $('#v-history');
    sel.innerHTML = this.history.map((h, i) => {
      const tm = h.at.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const views = h.clips.map((c) => VIEW_LABEL[c.view] || '').join('+');
      return `<option value="${h.id}">#${this.history.length - i}  ${tm}  ${views}</option>`;
    }).join('');
    if (this.currentId) sel.value = this.currentId;
  },

  async openShot(id, autoplay = true) {
    const shot = this.history.find((h) => h.id === id);
    if (!shot) return;
    this.currentId = id;
    $('#v-history').value = id;
    $('#viewer').hidden = false;
    this.pause();
    const stage = $('#v-stage');
    stage.innerHTML = '';
    stage.classList.toggle('two', shot.clips.length > 1);
    this.panes = shot.clips.map((clip) => this.makePane(clip, shot.clips.length > 1));
    this.panes.forEach((p) => stage.appendChild(p.el));
    const main = shot.clips[0];
    const dl = $('#v-dl');
    dl.href = main.url;
    dl.download = `swing_${shot.at.toISOString().replace(/[:.]/g, '-')}.${main.mime.includes('mp4') ? 'mp4' : 'webm'}`;
    await Promise.all(this.panes.map((p) => loadVideo(p.video, p.clip.url)));
    if (this.currentId !== id) return;
    this.computeRange();
    await this.seek(this.start);
    this.panes.forEach((p) => this.draw(p));
    if (autoplay) this.play();
  },

  close() { this.pause(); $('#viewer').hidden = true; },

  makePane(clip, two) {
    const el = document.createElement('div');
    el.className = 'pane';
    el.innerHTML = `<video playsinline muted preload="auto"></video><canvas></canvas>
      <div class="label"><b>${VIEW_LABEL[clip.view] || ''}</b>${two ? '<button data-n="-1">−1コマ</button><button data-n="1">＋1コマ</button>' : ''}</div>`;
    const p = { el, clip, video: $('video', el), canvas: $('canvas', el), shapes: [], pending: null, offset: 0 };
    p.canvas.style.pointerEvents = this.tool === 'none' ? 'none' : 'auto';
    // 2台の同期ズレを1コマ単位で補正
    $$('[data-n]', el).forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      p.offset += Number(b.dataset.n) / (clip.fps || 30);
      this.computeRange();
      this.seek(this.t);
      toast(`${VIEW_LABEL[clip.view]} の同期補正 ${(p.offset * 1000).toFixed(0)}ms`);
    }));
    this.bindDrawing(p);
    return p;
  },

  computeRange() {
    let s = -settings.pre, e = settings.post;
    for (const p of this.panes) {
      const base = p.clip.impactOffset + p.offset;
      s = Math.max(s, -base);
      if (isFinite(p.video.duration) && p.video.duration > 0) e = Math.min(e, p.video.duration - base - 0.05);
    }
    if (e <= s) { s = -settings.pre; e = settings.post; }
    this.start = s; this.end = e;
    const sc = $('#v-scrub');
    sc.min = s; sc.max = e;
    $('#v-impact').style.left = `${((0 - s) / (e - s)) * 100}%`;
  },

  vt(p, t) { return Math.max(0, p.clip.impactOffset + p.offset + t); },

  async seek(t) {
    this.t = Math.min(this.end, Math.max(this.start, t));
    await Promise.all(this.panes.map((p) => seekVideo(p.video, this.vt(p, this.t))));
    this.updateUI();
  },

  step(dir) {
    this.pause();
    const fps = this.panes[0]?.clip.fps || 30;
    this.seek(this.t + dir / fps);
  },

  setSpeed(s) {
    this.speed = s;
    $$('#v-speeds button').forEach((b) => b.classList.toggle('on', Number(b.dataset.s) === s));
    this.panes.forEach((p) => { p.video.playbackRate = s; });
  },

  play() {
    if (!this.panes.length) return;
    if (this.t >= this.end - 0.01) this.t = this.start;
    this.playing = true;
    this.panes.forEach((p) => {
      p.video.currentTime = this.vt(p, this.t);
      p.video.playbackRate = this.speed;
      p.video.play().catch(() => {});
    });
    this.updateUI();
  },
  pause() {
    this.playing = false;
    this.panes.forEach((p) => p.video.pause());
    this.updateUI();
  },
  toggle() { this.playing ? this.pause() : this.play(); },

  frame() {
    if (!this.playing || !this.panes.length) return;
    const m = this.panes[0];
    this.t = m.video.currentTime - m.clip.impactOffset - m.offset;
    if (this.t >= this.end || m.video.ended) {
      if (this.loop) { this.t = this.start; this.play(); } else { this.pause(); this.seek(this.end); }
      return;
    }
    for (const p of this.panes.slice(1)) {
      const target = this.vt(p, this.t);
      if (Math.abs(p.video.currentTime - target) > 0.06) p.video.currentTime = target;
    }
    this.updateUI();
  },

  updateUI() {
    $('#v-play').textContent = this.playing ? '❚❚' : '▶︎';
    $('#v-scrub').value = this.t;
    const ms = this.t;
    $('#v-time').textContent = `${ms >= 0 ? '+' : '−'}${Math.abs(ms).toFixed(3)}s`;
  },

  /* ---------- drawing ---------- */
  rect(p) {
    // object-fit: contain で表示されている映像の実領域
    const cw = p.canvas.clientWidth, ch = p.canvas.clientHeight;
    const vw = p.video.videoWidth || 16, vh = p.video.videoHeight || 9;
    const s = Math.min(cw / vw, ch / vh);
    const w = vw * s, h = vh * s;
    return { x: (cw - w) / 2, y: (ch - h) / 2, w, h };
  },
  toNorm(p, e) {
    const b = p.canvas.getBoundingClientRect(), r = this.rect(p);
    return { x: (e.clientX - b.left - r.x) / r.w, y: (e.clientY - b.top - r.y) / r.h };
  },
  bindDrawing(p) {
    const c = p.canvas;
    let drag = null;
    c.addEventListener('pointerdown', (e) => {
      if (this.tool === 'none') return;
      e.preventDefault(); e.stopPropagation();
      c.setPointerCapture(e.pointerId);
      this.pause();
      const pt = this.toNorm(p, e);
      this.lastEdited = p;
      if (this.tool === 'angle' && p.pending?.type === 'angle' && p.pending.stage === 2) {
        p.pending.c = pt; drag = p.pending; return this.draw(p);
      }
      if (this.tool === 'free') drag = { type: 'free', pts: [pt], color: this.color };
      else if (this.tool === 'circle') drag = { type: 'circle', a: pt, b: pt, color: this.color };
      else drag = { type: this.tool, a: pt, b: pt, color: this.color, stage: 1 };
      p.pending = drag;
      this.draw(p);
    });
    c.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const pt = this.toNorm(p, e);
      if (drag.type === 'free') drag.pts.push(pt);
      else if (drag.type === 'angle' && drag.stage === 2) drag.c = pt;
      else drag.b = pt;
      this.draw(p);
    });
    const up = () => {
      if (!drag) return;
      const d = drag; drag = null;
      if (d.type === 'angle' && d.stage === 1) {
        if (dist(p, d.a, d.b) < 6) { p.pending = null; return this.draw(p); }
        d.stage = 2; d.c = null; this.draw(p);
        toast('角度：もう1点をタップ（またはドラッグ）', 1800);
        return;
      }
      p.pending = null;
      const tiny = d.type === 'free' ? d.pts.length < 2 : dist(p, d.a, d.type === 'angle' ? d.c : d.b) < 4;
      if (!tiny) p.shapes.push(d);
      this.draw(p);
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    function dist(pp, a, b) {
      if (!a || !b) return 0;
      const r = Viewer.rect(pp);
      return Math.hypot((a.x - b.x) * r.w, (a.y - b.y) * r.h);
    }
  },
  draw(p) {
    const c = p.canvas, dpr = window.devicePixelRatio || 1;
    const cw = c.clientWidth, ch = c.clientHeight;
    if (c.width !== Math.round(cw * dpr) || c.height !== Math.round(ch * dpr)) { c.width = Math.round(cw * dpr); c.height = Math.round(ch * dpr); }
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, cw, ch);
    const r = this.rect(p);
    const P = (n) => [r.x + n.x * r.w, r.y + n.y * r.h];
    const lw = Math.max(2.5, r.w / 300);
    const label = (txt, x, y, color) => {
      g.font = `700 ${Math.max(14, r.w / 45)}px system-ui, sans-serif`;
      const w = g.measureText(txt).width + 12, h = Math.max(22, r.w / 32);
      g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(x, y - h + 4, w, h);
      g.fillStyle = color; g.fillText(txt, x + 6, y);
    };
    const shapes = p.pending ? [...p.shapes, p.pending] : p.shapes;
    for (const s of shapes) {
      g.strokeStyle = s.color; g.fillStyle = s.color; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round';
      if (s.type === 'line') {
        const [x1, y1] = P(s.a), [x2, y2] = P(s.b);
        g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
        dot(x1, y1); dot(x2, y2);
        const vw = p.video.videoWidth || 1, vh = p.video.videoHeight || 1;
        let deg = Math.abs(Math.atan2((s.b.y - s.a.y) * vh, (s.b.x - s.a.x) * vw) * 180 / Math.PI);
        if (deg > 90) deg = 180 - deg;
        if (Math.hypot(x2 - x1, y2 - y1) > 20) label(`${deg.toFixed(1)}°`, (x1 + x2) / 2 + 8, (y1 + y2) / 2 - 8, s.color);
      } else if (s.type === 'angle') {
        const [ax, ay] = P(s.a), [bx, by] = P(s.b);
        g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by);
        if (s.c) { const [cx, cy] = P(s.c); g.lineTo(cx, cy); }
        g.stroke();
        dot(ax, ay); dot(bx, by);
        if (s.c) {
          const [cx, cy] = P(s.c); dot(cx, cy);
          const a1 = Math.atan2(ay - by, ax - bx), a2 = Math.atan2(cy - by, cx - bx);
          let d = Math.abs(a1 - a2); if (d > Math.PI) d = 2 * Math.PI - d;
          const rad = Math.min(40, Math.hypot(ax - bx, ay - by) / 2, Math.hypot(cx - bx, cy - by) / 2);
          let s1 = a1, s2 = a2; if (((a2 - a1 + 2 * Math.PI) % (2 * Math.PI)) > Math.PI) [s1, s2] = [a2, a1];
          g.beginPath(); g.arc(bx, by, rad, s1, s2); g.stroke();
          label(`${(d * 180 / Math.PI).toFixed(1)}°`, bx + 10, by - 10, s.color);
        }
      } else if (s.type === 'circle') {
        const [x1, y1] = P(s.a), [x2, y2] = P(s.b);
        g.beginPath(); g.arc(x1, y1, Math.hypot(x2 - x1, y2 - y1), 0, Math.PI * 2); g.stroke();
        dot(x1, y1);
      } else if (s.type === 'free') {
        g.beginPath();
        s.pts.forEach((pt, i) => { const [x, y] = P(pt); i ? g.lineTo(x, y) : g.moveTo(x, y); });
        g.stroke();
      }
    }
    function dot(x, y) { g.beginPath(); g.arc(x, y, lw * 1.6, 0, Math.PI * 2); g.fill(); }
  },
};

/* ------------------------------------------------------------------ camera session */
const Cam = {
  stream: null, ring: null, det: null, audioCtx: null, fps: 30,
  role: 'solo', view: 'solo', net: null, lastShotId: null,

  async start(role, view) {
    this.role = role; this.view = view;
    // iOS: AudioContext はタップ直後に作る必要がある
    try { this.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); this.audioCtx.resume(); } catch {}
    let stream;
    try { stream = await openCamera(); } catch (e) {
      alert('カメラを起動できませんでした。\nブラウザのカメラ・マイク許可を確認してください。\n\n' + (e.message || e.name));
      return false;
    }
    if (!window.MediaRecorder) { alert('このブラウザは録画（MediaRecorder）に対応していません。Chrome または iOS 14.5 以降の Safari をお使いください。'); return false; }
    this.stream = stream;
    const vt = stream.getVideoTracks()[0];
    this.fps = Math.round(vt.getSettings().frameRate || Number(settings.fps) || 30);
    if (!stream.getAudioTracks().length && settings.detect.startsWith('sound')) settings.detect = 'motion';
    const live = $('#live');
    live.srcObject = stream;
    live.play().catch(() => {});
    show('cam');
    $('#cam-role').textContent = role === 'solo' ? '1台モード' : `${VIEW_LABEL[view]}カメラ`;
    $('#cam-net').hidden = role === 'solo';
    $('#cam-detect').value = settings.detect;
    $('#cam-sens').value = settings.sens;
    this.ring = new Ring(stream);
    this.ring.start();
    this.det = new Detector(stream, live, this.audioCtx, (t) => this.onShot(t));
    keepAwake();
    this.hud = setInterval(() => this.updateHud(), 100);
    return true;
  },

  stop() {
    clearInterval(this.hud);
    this.det?.destroy(); this.ring?.stop();
    this.stream?.getTracks().forEach((t) => t.stop());
    try { this.audioCtx?.close(); } catch {}
    this.net?.close();
    this.stream = this.ring = this.det = this.net = null;
    document.body.classList.remove('pip');
    Viewer.close();
    try { wakeLock?.release(); } catch {} wakeLock = null;
  },

  updateHud() {
    const d = this.det; if (!d) return;
    const sMax = 0.7, mMax = 20;
    const sf = $('#m-sound'), mf = $('#m-motion');
    sf.style.width = `${Math.min(100, (d.sound / sMax) * 100)}%`;
    sf.classList.toggle('hot', d.sound > d.soundThr);
    $('#t-sound').style.left = `${Math.min(100, (d.soundThr / sMax) * 100)}%`;
    mf.style.width = `${Math.min(100, (d.motion / mMax) * 100)}%`;
    mf.classList.toggle('hot', d.motion > d.motionThr);
    $('#t-motion').style.left = `${Math.min(100, (d.motionThr / mMax) * 100)}%`;
    const buf = this.ring.bufferSeconds();
    const b = $('#cam-buf');
    const ready = buf >= settings.pre;
    b.textContent = ready ? `● 待機中 ${this.fps}fps` : `準備中… ${buf.toFixed(1)}s`;
    b.className = 'chip ' + (ready ? 'ok' : '');
  },

  flash() {
    const f = $('#flash');
    f.classList.add('show');
    setTimeout(() => f.classList.remove('show'), 500);
    try { navigator.vibrate?.(80); } catch {}
  },

  /** このカメラがショットを検知した */
  onShot(impactAt) {
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    if (this.net) this.net.sendTrigger(id, impactAt);
    this.capture(id, impactAt);
  },

  async capture(id, impactAt) {
    if (!this.ring) return;
    if (id === this.lastShotId) return;
    this.lastShotId = id;
    if (this.det) this.det.lastShot = now();
    this.flash();
    const res = await this.ring.capture(impactAt, settings.pre, settings.post);
    if (!res || !res.blob.size) { toast('録画バッファが足りませんでした'); return; }
    const clip = { id, view: this.view, fps: this.fps, ...res, url: URL.createObjectURL(res.blob) };
    if (this.net) {
      this.net.sendClip(clip);
    }
    const shot = Viewer.add(clip);
    $('#cam-last').hidden = false;
    if (this.role === 'solo' || settings.localReplay) this.openReplay(shot.id);
  },

  openReplay(id) {
    document.body.classList.add('pip');
    Viewer.onBack = () => document.body.classList.remove('pip');
    $('#v-back').textContent = '◀ ライブ';
    $('#v-capture').hidden = true;
    Viewer.openShot(id);
  },
};

/* ------------------------------------------------------------------ networking */
function ensurePeer() {
  if (!window.Peer) { alert('通信ライブラリを読み込めませんでした。インターネット接続を確認してください。'); return false; }
  return true;
}

class CameraNet {
  constructor(code, view, onCapture, onStatus) {
    this.code = code; this.view = view; this.onCapture = onCapture; this.onStatus = onStatus;
    this.closed = false;
    this.peer = new Peer(peerOpts());
    this.peer.on('open', () => this.connect());
    this.peer.on('error', (e) => {
      if (e.type === 'peer-unavailable') this.onStatus('ng', 'モニターが見つかりません（コード確認）');
      else this.onStatus('ng', `通信エラー: ${e.type}`);
      this.retry();
    });
    this.peer.on('disconnected', () => { if (!this.closed) try { this.peer.reconnect(); } catch {} });
  }
  connect() {
    if (this.closed) return;
    this.onStatus('', '接続中…');
    const conn = this.peer.connect(PEER_PREFIX + this.code, { reliable: true, serialization: 'binary', metadata: { view: this.view } });
    this.conn = conn;
    conn.on('open', () => { this.onStatus('ok', 'モニター接続中'); });
    conn.on('data', (m) => this.onData(m));
    conn.on('close', () => { if (this.conn === conn) { this.conn = null; this.onStatus('ng', '切断 — 再接続します'); this.retry(); } });
    conn.on('error', () => {});
  }
  retry() {
    if (this.closed || this.retrying) return;
    this.retrying = true;
    setTimeout(() => { this.retrying = false; if (!this.conn?.open && !this.closed) { if (this.peer.disconnected) try { this.peer.reconnect(); } catch {} else this.connect(); } }, 3000);
  }
  onData(m) {
    if (!m || typeof m !== 'object') return;
    if (m.t === 'ping') this.conn?.send({ t: 'pong', s: m.s });
    if (m.t === 'config') {
      settings.pre = m.pre; settings.post = m.post; saveSettings();
    }
    if (m.t === 'capture') this.onCapture(m.id, now() - m.ago);
  }
  sendTrigger(id, impactAt) {
    if (this.conn?.open) this.conn.send({ t: 'trigger', id, ago: now() - impactAt });
  }
  async sendClip(clip) {
    if (!this.conn?.open) { toast('モニター未接続のため送信できませんでした'); return; }
    this.onStatus('', '送信中…');
    const data = await clip.blob.arrayBuffer();
    this.conn.send({ t: 'clip', id: clip.id, view: clip.view, fps: clip.fps, mime: clip.mime, impactOffset: clip.impactOffset, data });
    setTimeout(() => this.conn?.open && this.onStatus('ok', 'モニター接続中'), 1500);
  }
  close() { this.closed = true; try { this.peer.destroy(); } catch {} }
}

const Mon = {
  peer: null, conns: new Map(), code: null,

  start(code) {
    if (!ensurePeer()) return;
    show('mon');
    keepAwake();
    this.code = code || String(Math.floor(1000 + Math.random() * 9000));
    $('#mon-code').textContent = this.code;
    this.drawQR();
    this.peer = new Peer(PEER_PREFIX + this.code, peerOpts());
    this.peer.on('open', () => this.status('準備完了 — カメラの接続を待っています'));
    this.peer.on('error', (e) => {
      if (e.type === 'unavailable-id') { this.peer.destroy(); this.start(); return; }
      this.status(`通信エラー: ${e.type}`);
    });
    this.peer.on('disconnected', () => { try { this.peer.reconnect(); } catch {} });
    this.peer.on('connection', (conn) => this.accept(conn));
    this.ping = setInterval(() => this.conns.forEach((c) => c.open && c.send({ t: 'ping', s: now() })), 2000);
  },

  stop() {
    clearInterval(this.ping);
    try { this.peer?.destroy(); } catch {}
    this.peer = null; this.conns.clear();
    Viewer.close();
  },

  status(s) { $('#mon-status').textContent = s; },

  drawQR() {
    const box = $('#mon-qr');
    box.innerHTML = '';
    if (!window.qrcode) return;
    const url = `${location.origin}${location.pathname}?join=${this.code}`;
    const q = qrcode(0, 'M'); q.addData(url); q.make();
    box.innerHTML = q.createImgTag(6, 8);
  },

  accept(conn) {
    conn.rtt = 60;
    conn.on('open', () => {
      this.conns.set(conn.peer, conn);
      conn.send({ t: 'config', pre: settings.pre, post: settings.post });
      this.renderCams();
      toast(`${VIEW_LABEL[conn.metadata?.view] || 'カメラ'}が接続しました`);
    });
    conn.on('data', (m) => this.onData(conn, m));
    conn.on('close', () => { this.conns.delete(conn.peer); this.renderCams(); });
    conn.on('error', () => {});
  },

  renderCams() {
    const ul = $('#mon-cams');
    const list = [...this.conns.values()];
    ul.innerHTML = list.length ? list.map((c) => `<li>● ${VIEW_LABEL[c.metadata?.view] || 'カメラ'}</li>`).join('') : '<li class="empty">カメラ未接続</li>';
  },

  onData(conn, m) {
    if (!m || typeof m !== 'object') return;
    if (m.t === 'pong') { conn.rtt = conn.rtt * 0.6 + (now() - m.s) * 0.4; return; }
    if (m.t === 'trigger') {
      // 検知したカメラ以外にも「同じ瞬間を保存」を指示
      const impact = now() - m.ago - conn.rtt / 2;
      this.broadcast(m.id, impact, conn);
      toast('ショット検知 — 受信中…', 1500);
    }
    if (m.t === 'clip') {
      const blob = new Blob([m.data], { type: m.mime });
      const clip = { id: m.id, view: m.view, fps: m.fps, mime: m.mime, impactOffset: m.impactOffset, blob, url: URL.createObjectURL(blob) };
      const shot = Viewer.add(clip);
      $('#mon-last').hidden = false;
      // 最新ショットを表示（2台目が届いたら2画面に更新）
      if (shot === Viewer.history[0]) this.openReplay(shot.id);
    }
  },

  broadcast(id, impact, except) {
    this.conns.forEach((c) => {
      if (c === except || !c.open) return;
      c.send({ t: 'capture', id, ago: now() - impact + c.rtt / 2 });
    });
  },

  manual() {
    if (!this.conns.size) { toast('カメラが接続されていません'); return; }
    const id = `${Date.now().toString(36)}m`;
    // 押した瞬間を「インパクト後」の終わりとみなす
    this.broadcast(id, now() - settings.post * 1000, null);
    toast('全カメラで保存中…', 1500);
  },

  openReplay(id) {
    Viewer.onBack = null;
    $('#v-back').textContent = '◀ 戻る';
    $('#v-capture').hidden = false;
    return Viewer.openShot(id);
  },
};

/* ------------------------------------------------------------------ wiring */
function init() {
  bindSettings();
  Viewer.init();

  let joinView = 'back';
  $$('#join-view button').forEach((b) => b.addEventListener('click', () => {
    joinView = b.dataset.v;
    $$('#join-view button').forEach((x) => x.classList.toggle('on', x === b));
  }));

  $$('[data-go]').forEach((b) => b.addEventListener('click', async () => {
    const go = b.dataset.go;
    if (go === 'solo') await Cam.start('solo', 'solo');
    if (go === 'join') { $('#join-form').hidden = false; $('#join-code').focus(); }
    if (go === 'monitor') Mon.start();
  }));

  $('#join-go').addEventListener('click', async () => {
    const code = $('#join-code').value.trim();
    if (!/^\d{4}$/.test(code)) { toast('4桁のコードを入力してください'); return; }
    if (!ensurePeer()) return;
    const ok = await Cam.start('camera', joinView);
    if (!ok) return;
    const chip = $('#cam-net');
    Cam.net = new CameraNet(code, joinView,
      (id, impactAt) => Cam.capture(id, impactAt),
      (cls, text) => { chip.className = 'chip ' + cls; chip.textContent = text; });
  });

  $('#cam-exit').onclick = () => { Cam.stop(); show('home'); };
  $('#cam-manual').onclick = () => {
    // 押した瞬間 = インパクト後の終わり
    const impactAt = now() - settings.post * 1000;
    const id = `${Date.now().toString(36)}m`;
    if (Cam.net) Cam.net.sendTrigger(id, impactAt);
    Cam.capture(id, impactAt);
  };
  $('#cam-last').onclick = () => Viewer.history[0] && Cam.openReplay(Viewer.history[0].id);
  $('#cam-detect').onchange = (e) => { settings.detect = e.target.value; saveSettings(); $('[data-set="detect"]').value = settings.detect; };
  $('#cam-sens').oninput = (e) => { settings.sens = Number(e.target.value); saveSettings(); };
  $('#cam').addEventListener('click', () => { if (document.body.classList.contains('pip')) $('#v-back').click(); });

  $('#mon-exit').onclick = () => { Mon.stop(); show('home'); };
  $('#mon-fs').onclick = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.());
  $('#mon-manual').onclick = () => Mon.manual();
  $('#v-capture').onclick = () => Mon.manual();
  $('#mon-last').onclick = () => Viewer.history[0] && Mon.openReplay(Viewer.history[0].id);

  // QRコードから開いた場合
  const join = new URLSearchParams(location.search).get('join');
  if (join) {
    $('#join-form').hidden = false;
    $('#join-code').value = join;
  }

  if (!window.isSecureContext) toast('カメラを使うには https で開いてください', 6000);
}

init();
