import { CLUBS, clubById, SHAPES } from './clubs.js';
import { load, save, uid } from './store.js';
import { PASSES, passActive, grantPass, remainingText } from './pass.js';
import { sessionStats, shotMetrics, diagnose } from './coach.js';
import { lineChart, trajectoryChart } from './charts.js';
import { mountVideoMeasure } from './measure.js';

let state = load();
const persist = () => save(state);
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtDate = (t) => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()}`; };
const fmtDateLong = (t) => { const d = new Date(t); return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; };
const sign = (v, d = 0) => `${v > 0 ? '+' : v < 0 ? '−' : '±'}${Math.abs(v).toFixed(d)}`;

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast.h); toast.h = setTimeout(() => { t.hidden = true; }, 2600);
}

// ---------- サンプル ----------
const rnd = (m, s) => m + s * (Math.random() + Math.random() + Math.random() - 1.5) * 1.15;
function sampleShot(clubId, level = 0.4) {
  const c = clubById(clubId);
  const base = c.avgSpeed + (c.goodSpeed - c.avgSpeed) * level;
  const [lo, hi] = c.launch;
  const shapes = ['slice', 'fade', 'fade', 'straight', 'straight', 'draw', 'slice'];
  return {
    speed: +rnd(base, base * 0.03).toFixed(1),
    launch: +rnd(lo + (hi - lo) * 0.25 - 1, 1.8).toFixed(1),
    shape: shapes[Math.floor(Math.random() * shapes.length)],
    source: 'sample',
  };
}
function seedSamples() {
  const now = Date.now();
  const sessions = [];
  const plan = [['dr', 21, 0.15], ['i7', 19, 0.2], ['dr', 16, 0.25], ['dr', 12, 0.3], ['i7', 10, 0.3], ['dr', 7, 0.4], ['i7', 4, 0.42], ['dr', 2, 0.5]];
  plan.forEach(([club, daysAgo, lv]) => {
    sessions.push({ id: uid(), date: now - daysAgo * 86400000, club, kind: 'test', sample: true, shots: Array.from({ length: 5 }, () => sampleShot(club, lv)) });
  });
  return sessions;
}
const realSessions = () => state.sessions.filter((s) => !s.sample);
function ensureSamples() {
  if (!state.samplesCleared && !realSessions().length && !state.sessions.some((s) => s.sample)) {
    state.sessions = seedSamples();
    persist();
  }
}
const showingSamples = () => state.sessions.length > 0 && !realSessions().length;

// ---------- ルーティング ----------
const VIEWS = ['home', 'test', 'history', 'pass', 'result'];
function route() {
  const h = location.hash.replace('#', '') || 'home';
  const [name, id] = h.startsWith('r-') ? ['result', h.slice(2)] : [VIEWS.includes(h) ? h : 'home'];
  VIEWS.forEach((v) => { $(`#v-${v}`).hidden = v !== name; });
  document.querySelectorAll('.tabbar a').forEach((a) => a.setAttribute('aria-current', a.dataset.view === name || (name === 'result' && a.dataset.view === 'history') ? 'page' : 'false'));
  renderPassChip();
  if (name === 'home') renderHome();
  if (name === 'test') renderTestSetup();
  if (name === 'history') renderHistory();
  if (name === 'pass') renderPass();
  if (name === 'result') renderResult(id);
  window.scrollTo(0, 0);
}
const go = (h) => { if (location.hash === `#${h}`) route(); else location.hash = h; };

function renderPassChip() {
  const chip = $('#pass-chip');
  if (passActive(state)) { chip.textContent = `AIパス ${remainingText(state)}`; chip.dataset.on = '1'; }
  else { chip.textContent = 'AIパスを見る'; chip.dataset.on = '0'; }
}

// ---------- ホーム ----------
function renderHome() {
  ensureSamples();
  const v = $('#v-home');
  const sessions = [...state.sessions].sort((a, b) => b.date - a.date);
  const last = sessions[0];
  const lastSt = last && sessionStats(last);
  const sameClub = last ? sessions.filter((s) => s.club === last.club).reverse() : [];

  v.innerHTML = `
    <section class="hero">
      <p class="eyebrow">TODAY'S CHECK</p>
      <h1>今日の診断</h1>
      <p class="lead">スロー動画で5球測るだけ。今の課題と、今日やるべき練習がわかります。</p>
      <button type="button" class="btn btn-primary btn-xl" id="start-test">診断をはじめる</button>
      <button type="button" class="btn btn-ghost" id="start-quick">1球だけ測る</button>
    </section>
    ${showingSamples() ? `<div class="notice"><b>サンプル表示中</b> 下の記録とグラフは見本データです。1回測定するとサンプルは消え、あなたの記録に置き換わります。</div>` : ''}
    ${last ? `
    <section class="card">
      <div class="card-head"><h2>前回の結果</h2><a class="link" href="#r-${last.id}">詳しく見る</a></div>
      <div class="kpis">
        <div class="kpi"><span class="kpi-label">総合スコア</span><span class="kpi-val">${lastSt.scores.total}</span></div>
        <div class="kpi"><span class="kpi-label">平均キャリー</span><span class="kpi-val">${lastSt.avgCarry.toFixed(0)}<small>yd</small></span></div>
        <div class="kpi"><span class="kpi-label">ボール初速</span><span class="kpi-val">${lastSt.avgSpeed.toFixed(1)}<small>m/s</small></span></div>
      </div>
      <p class="muted small">${fmtDateLong(last.date)} · ${lastSt.club.name} · ${lastSt.n}球</p>
    </section>
    <section class="card">
      <div class="card-head"><h2>${clubById(last.club).short} 平均キャリーの推移</h2><a class="link" href="#history">記録へ</a></div>
      <div class="chart-host" id="home-chart"></div>
    </section>` : ''}
    <section class="card how">
      <h2>撮り方</h2>
      <ol class="steps">
        <li>スマホを三脚などに固定し、<b>ボールの真横 2〜3m</b>から、飛球線と平行に構えます。</li>
        <li>カメラアプリの<b>スロー（240fps）</b>で撮影。明るい屋外ほど正確です。</li>
        <li>アプリで動画を選び、ボールを4回タップすると初速と打ち出し角が出ます。</li>
      </ol>
    </section>`;

  $('#start-test').onclick = () => { testCfg = { total: 5, kind: 'test' }; go('test'); };
  $('#start-quick').onclick = () => { testCfg = { total: 1, kind: 'quick' }; go('test'); };
  if (last) {
    lineChart($('#home-chart'), {
      points: sameClub.map((s) => ({ y: sessionStats(s).avgCarry, label: fmtDate(s.date) })),
      unit: 'yd', ariaLabel: '平均キャリーの推移',
    });
  }
}

// ---------- 測定フロー ----------
let testCfg = { total: 5, kind: 'test' };
let run = null; // { club, total, kind, shots: [], pending }

function renderTestSetup() {
  const v = $('#v-test');
  const lastClub = (state.sessions.filter((s) => !s.sample).sort((a, b) => b.date - a.date)[0] || {}).club || 'dr';
  v.innerHTML = `
    <section class="card">
      <p class="eyebrow">${testCfg.kind === 'quick' ? 'QUICK SHOT' : "TODAY'S CHECK"}</p>
      <h1 class="h1">${testCfg.kind === 'quick' ? '1球だけ測る' : '今日の診断'}</h1>
      <h2 class="label">クラブを選ぶ</h2>
      <div class="chips" role="radiogroup" aria-label="クラブ">
        ${CLUBS.map((c) => `<button type="button" class="chip" role="radio" aria-checked="${c.id === lastClub}" data-club="${c.id}"><b>${c.short}</b><span>${c.name}</span></button>`).join('')}
      </div>
      ${testCfg.kind === 'test' ? `
      <h2 class="label">球数</h2>
      <div class="seg" role="radiogroup" aria-label="球数">
        ${[3, 5, 10].map((n) => `<button type="button" class="seg-btn" role="radio" aria-checked="${n === testCfg.total}" data-n="${n}">${n}球</button>`).join('')}
      </div>` : ''}
      <button type="button" class="btn btn-primary btn-xl" id="begin">測定スタート</button>
    </section>`;
  let club = lastClub;
  v.querySelectorAll('.chip').forEach((b) => b.addEventListener('click', () => {
    club = b.dataset.club;
    v.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-checked', x === b));
  }));
  v.querySelectorAll('.seg-btn').forEach((b) => b.addEventListener('click', () => {
    testCfg.total = +b.dataset.n;
    v.querySelectorAll('.seg-btn').forEach((x) => x.setAttribute('aria-checked', x === b));
  }));
  $('#begin').onclick = () => {
    run = { club, total: testCfg.total, kind: testCfg.kind, shots: [], method: run?.method || 'video' };
    renderShot();
  };
}

function renderShot() {
  const v = $('#v-test');
  const c = clubById(run.club);
  const i = run.shots.length;
  v.innerHTML = `
    <section class="card">
      <div class="card-head">
        <h1 class="h1">${run.total > 1 ? `${i + 1}球目 <small>/ ${run.total}</small>` : '1球測定'}</h1>
        <span class="pill">${c.short}</span>
      </div>
      ${run.total > 1 ? `<div class="dots">${Array.from({ length: run.total }, (_, k) => `<span class="${k < i ? 'done' : k === i ? 'now' : ''}"></span>`).join('')}</div>` : ''}
      <div class="seg" role="tablist" aria-label="測定方法">
        <button type="button" class="seg-btn" role="tab" data-m="video" aria-selected="${run.method === 'video'}">動画で測る</button>
        <button type="button" class="seg-btn" role="tab" data-m="manual" aria-selected="${run.method === 'manual'}">数値を入力</button>
        <button type="button" class="seg-btn" role="tab" data-m="sample" aria-selected="${run.method === 'sample'}">サンプル</button>
      </div>
      <div id="method-area"></div>
      <div id="shot-preview"></div>
      <div class="row-end">
        ${i > 0 && run.kind === 'test' && i >= 3 ? `<button type="button" class="btn btn-ghost" id="finish-early">ここで終了して診断</button>` : ''}
        <button type="button" class="link" id="cancel-run">中止</button>
      </div>
    </section>`;
  v.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', () => { run.method = b.dataset.m; renderShot(); }));
  $('#cancel-run').onclick = () => { run = null; go('home'); };
  const fe = $('#finish-early');
  if (fe) fe.onclick = finishRun;

  const area = $('#method-area');
  if (run.method === 'video') {
    mountVideoMeasure(area, (r) => showPreview(r));
  } else if (run.method === 'manual') {
    area.innerHTML = `
      <p class="muted small">レンジの計測器などの数値をそのまま記録できます。</p>
      <form id="manual-form" class="form-grid">
        <label class="field" for="mf-speed"><span>ボール初速 (m/s)</span><input id="mf-speed" type="number" inputmode="decimal" step="0.1" min="10" max="90" required></label>
        <label class="field" for="mf-launch"><span>打ち出し角 (°)</span><input id="mf-launch" type="number" inputmode="decimal" step="0.1" min="-5" max="60" required></label>
        <label class="field" for="mf-spin"><span>スピン (rpm・任意)</span><input id="mf-spin" type="number" inputmode="numeric" step="10" min="0" max="15000" placeholder="${c.spin}"></label>
        <button class="btn btn-primary" type="submit">この数値で計算</button>
      </form>`;
    $('#manual-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const spin = +$('#mf-spin').value;
      showPreview({ speed: +$('#mf-speed').value, launch: +$('#mf-launch').value, spin: spin || undefined, source: 'manual' });
    });
  } else {
    area.innerHTML = `<p class="muted small">動画がなくても流れを試せるよう、平均的なアマチュアの数値をランダムに作ります。</p>
      <button type="button" class="btn btn-primary" id="gen-sample">サンプルの1球を打つ</button>`;
    $('#gen-sample').onclick = () => { const s = sampleShot(run.club); showPreview({ ...s, shape: undefined, sampleShape: s.shape }); };
  }
}

function showPreview(r) {
  const m = shotMetrics(r, run.club);
  run.pending = { speed: +r.speed.toFixed(1), launch: +r.launch.toFixed(1), spin: r.spin, source: r.source, shape: r.sampleShape || null };
  const box = $('#shot-preview');
  box.innerHTML = `
    <div class="preview">
      <div class="kpis">
        <div class="kpi"><span class="kpi-label">ボール初速</span><span class="kpi-val">${r.speed.toFixed(1)}<small>m/s</small></span></div>
        <div class="kpi"><span class="kpi-label">打ち出し角</span><span class="kpi-val">${r.launch.toFixed(1)}<small>°</small></span></div>
        <div class="kpi"><span class="kpi-label">推定キャリー</span><span class="kpi-val">${m.carry.toFixed(0)}<small>yd</small></span></div>
      </div>
      <p class="muted small">推定ヘッドスピード ${m.headSpeed.toFixed(1)}m/s ・ 最高到達点 ${m.apex.toFixed(0)}yd ・ スピン${r.spin ? '' : '推定'} ${m.spin}rpm</p>
      ${(r.warn || []).map((w) => `<p class="warn">${esc(w)}</p>`).join('')}
      <div class="chart-host" id="pv-traj"></div>
      <h2 class="label">球筋は？（目で見た印象でOK）</h2>
      <div class="chips chips-shape" role="radiogroup" aria-label="球筋">
        ${SHAPES.map((s) => `<button type="button" class="chip chip-sm" role="radio" aria-checked="${run.pending.shape === s.id}" data-shape="${s.id}">${s.label}</button>`).join('')}
      </div>
      <div class="row-end">
        <button type="button" class="btn btn-ghost" id="redo">やり直す</button>
        <button type="button" class="btn btn-primary" id="keep">${run.shots.length + 1 >= run.total ? (run.kind === 'test' ? '記録して診断へ' : '記録する') : '記録して次の球へ'}</button>
      </div>
    </div>`;
  trajectoryChart($('#pv-traj'), [{ path: m.path.map(([x, y]) => [x * 1.09361, y * 1.09361]), highlight: true }]);
  box.querySelectorAll('[data-shape]').forEach((b) => b.addEventListener('click', () => {
    run.pending.shape = b.dataset.shape;
    box.querySelectorAll('[data-shape]').forEach((x) => x.setAttribute('aria-checked', x === b));
  }));
  $('#redo').onclick = () => { run.pending = null; renderShot(); };
  $('#keep').onclick = () => {
    run.shots.push(run.pending); run.pending = null;
    if (run.shots.length >= run.total) finishRun(); else renderShot();
  };
  box.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function finishRun() {
  if (!run || !run.shots.length) return;
  // 初めての本番記録でサンプルを消す
  if (showingSamples()) state.sessions = [];
  const session = { id: uid(), date: Date.now(), club: run.club, kind: run.kind, shots: run.shots };
  if (passActive(state)) session.aiUnlocked = true;
  state.sessions.push(session);
  persist();
  run = null;
  go(`r-${session.id}`);
}

// ---------- 結果 ----------
function scoreBar(label, v) {
  if (v == null) return `<div class="bar"><span>${label}</span><div class="bar-track"><i style="width:0"></i></div><b class="muted">—</b></div>`;
  return `<div class="bar"><span>${label}</span><div class="bar-track"><i style="width:${v}%"></i></div><b>${v}</b></div>`;
}

function renderResult(id) {
  const v = $('#v-result');
  const session = state.sessions.find((s) => s.id === id);
  if (!session) { v.innerHTML = `<section class="card"><p>記録が見つかりませんでした。</p><a class="btn btn-ghost" href="#history">記録一覧へ</a></section>`; return; }
  if (passActive(state) && !session.aiUnlocked) { session.aiUnlocked = true; persist(); }
  const st = sessionStats(session);
  const [lo, hi] = st.club.launch;
  const unlocked = !!session.aiUnlocked || !!session.sample; // サンプルは見本としてAI診断を表示

  v.innerHTML = `
    <section class="card result-head">
      <p class="eyebrow">${session.sample ? 'SAMPLE · ' : ''}${fmtDateLong(session.date)}</p>
      <div class="score-row">
        <div class="score"><span class="score-num">${st.scores.total}</span><span class="score-label">総合スコア</span></div>
        <div class="bars">
          ${scoreBar('パワー', st.scores.power)}
          ${scoreBar('打ち出し', st.scores.launch)}
          ${scoreBar('安定性', st.scores.consistency)}
          ${scoreBar('方向性', st.scores.direction)}
        </div>
      </div>
      <p class="muted small">${st.club.name} · ${st.n}球${session.sample ? ' · サンプルデータ' : ''}</p>
    </section>

    <section class="card">
      <h2>測定結果</h2>
      <div class="kpis kpis-4">
        <div class="kpi"><span class="kpi-label">平均キャリー</span><span class="kpi-val">${st.avgCarry.toFixed(0)}<small>yd</small></span><span class="kpi-sub">最大 ${st.maxCarry.toFixed(0)}yd</span></div>
        <div class="kpi"><span class="kpi-label">ボール初速</span><span class="kpi-val">${st.avgSpeed.toFixed(1)}<small>m/s</small></span><span class="kpi-sub">最大 ${st.maxSpeed.toFixed(1)}</span></div>
        <div class="kpi"><span class="kpi-label">打ち出し角</span><span class="kpi-val">${st.avgLaunch.toFixed(1)}<small>°</small></span><span class="kpi-sub">目標 ${lo}〜${hi}°</span></div>
        <div class="kpi"><span class="kpi-label">推定HS</span><span class="kpi-val">${st.headSpeed.toFixed(1)}<small>m/s</small></span><span class="kpi-sub">ミート率${st.club.smash}換算</span></div>
      </div>
      <div class="chart-host" id="res-traj"></div>
      <div class="table-wrap">
        <table class="shots">
          <thead><tr><th>#</th><th>初速</th><th>打出</th><th>キャリー</th><th>球筋</th></tr></thead>
          <tbody>${session.shots.map((s, k) => `<tr><td>${k + 1}</td><td>${s.speed.toFixed(1)}</td><td>${s.launch.toFixed(1)}°</td><td>${st.metrics[k].carry.toFixed(0)}yd</td><td>${s.shape ? SHAPES.find((x) => x.id === s.shape).label : '—'}</td></tr>`).join('')}</tbody>
        </table>
      </div>
    </section>

    <section class="ai ${unlocked ? '' : 'locked'}" id="ai-block">
      <div class="ai-head"><p class="eyebrow">AI COACH</p><h2>AIコーチの診断</h2></div>
      <div id="ai-body"></div>
    </section>

    <div class="row-end">
      ${!session.sample ? `<button type="button" class="link danger" id="del-session">この記録を削除</button>` : ''}
      <a class="btn btn-ghost" href="#history">記録一覧</a>
      <button type="button" class="btn btn-primary" id="again">もう一度測る</button>
    </div>
    <div id="del-confirm"></div>`;

  trajectoryChart($('#res-traj'), st.metrics.map((m, k) => ({
    path: m.path.map(([x, y]) => [x * 1.09361, y * 1.09361]),
    highlight: m.carry === st.maxCarry && k === st.metrics.findIndex((q) => q.carry === st.maxCarry),
  })));
  $('#again').onclick = () => { testCfg = { total: session.kind === 'quick' ? 1 : Math.max(3, session.shots.length), kind: session.kind || 'test' }; go('test'); };
  const del = $('#del-session');
  if (del) del.onclick = () => {
    $('#del-confirm').innerHTML = `<div class="notice">この記録を削除しますか？元に戻せません。 <button type="button" class="btn btn-ghost" id="del-no">やめる</button> <button type="button" class="btn btn-danger" id="del-yes">削除する</button></div>`;
    $('#del-no').onclick = () => { $('#del-confirm').innerHTML = ''; };
    $('#del-yes').onclick = () => { state.sessions = state.sessions.filter((s) => s.id !== id); persist(); toast('削除しました'); go('history'); };
  };

  if (unlocked) renderAI(session);
  else renderAILocked(session);
}

function renderAILocked(session) {
  const body = $('#ai-body');
  const trial = !state.trialUsed;
  body.innerHTML = `
    <div class="ai-teaser" aria-hidden="true">
      <div class="teaser-line w80"></div><div class="teaser-line w60"></div><div class="teaser-line w90"></div><div class="teaser-line w50"></div>
    </div>
    <div class="ai-lock">
      <p class="ai-lock-title">この結果から、AIコーチが次の3つを出します</p>
      <ul class="checks">
        <li>今いちばん直すべき課題と、その理由</li>
        <li>今日やる練習メニュー（回数つき）</li>
        <li>伸び代：あと何ヤード伸びるか、目標の数値</li>
      </ul>
      ${trial ? `<button type="button" class="btn btn-primary btn-xl" id="use-trial">初回無料で診断する</button>` : ''}
      <a class="btn ${trial ? 'btn-ghost' : 'btn-primary btn-xl'}" href="#pass">AIパスを見る（1日 ¥160〜）</a>
      <p class="muted small">自動更新なしの買い切り。使いたい日だけ購入できます。</p>
    </div>`;
  const t = $('#use-trial');
  if (t) t.onclick = () => {
    state.trialUsed = true; session.aiUnlocked = true; persist();
    $('#ai-block').classList.remove('locked');
    renderAI(session);
  };
}

function renderAI(session) {
  const d = diagnose(session, state.sessions);
  const { potential: p, theme, issues, menu, growth: g } = d;
  const sevLabel = { 3: ['high', '優先度 高'], 2: ['mid', '優先度 中'], 1: ['low', '優先度 低'] };
  const maxGain = Math.max(1, ...p.steps.map((s) => s.gain));
  $('#ai-body').innerHTML = `
    <div class="theme">
      <span class="pill pill-accent">今日のテーマ</span>
      <h3>${esc(theme.title)}</h3>
      <p>${esc(theme.text)}</p>
    </div>

    <div class="potential">
      <div class="pot-head">
        <div><span class="kpi-label">あなたの伸び代</span><span class="pot-num">+${p.total.toFixed(0)}<small>yd</small></span></div>
        <p class="pot-range">${p.now.toFixed(0)}yd → <b>${p.best.toFixed(0)}yd</b></p>
      </div>
      <ul class="pot-steps">
        ${p.steps.map((s) => `
          <li>
            <div class="pot-label"><span>${s.label}</span><b>+${s.gain.toFixed(0)}yd</b></div>
            <div class="pot-track"><i style="width:${Math.max(3, (s.gain / maxGain) * 100)}%"></i></div>
            <span class="muted small">目標 ${s.target}</span>
          </li>`).join('')}
      </ul>
      <p class="muted small">今日の初速・打ち出し角と標準スピンから弾道計算した推定値です。ヘッドスピード+2m/sは、3か月ほどの継続練習を想定しています。</p>
    </div>

    ${issues.length ? `
    <h3 class="sub">見つかった課題</h3>
    <ul class="issues">
      ${issues.map((it) => `<li class="issue sev-${sevLabel[it.severity][0]}"><div class="issue-top"><b>${esc(it.title)}</b><span class="sev">${sevLabel[it.severity][1]}</span></div><p>${esc(it.detail)}</p></li>`).join('')}
    </ul>` : ''}

    <h3 class="sub">今日の練習メニュー</h3>
    <ol class="menu">
      ${menu.map((m) => `<li><div class="menu-top"><b>${esc(m.title)}</b><span class="reps">${esc(m.reps)}</span></div><p>${esc(m.how)}</p></li>`).join('')}
    </ol>
    <p class="muted small">練習後にもう一度「今日の診断」をすると、変化が記録に残ります。</p>

    ${g ? `<h3 class="sub">前回（${fmtDate(g.prevDate)}）からの変化</h3>
    <div class="growth">
      <div class="deltas">
        <span class="${g.dCarry >= 0 ? 'up' : 'down'}">キャリー ${sign(g.dCarry)}yd</span>
        <span class="${g.dSpeed >= 0 ? 'up' : 'down'}">初速 ${sign(g.dSpeed, 1)}m/s</span>
        <span class="${g.dCons >= 0 ? 'up' : 'down'}">安定性 ${sign(g.dCons)}</span>
      </div>
      <p>${esc(g.text)}</p>
    </div>` : ''}`;
}

// ---------- 記録 ----------
let histClub = null;
let histMetric = 'carry';
const METRICS = {
  carry: { label: '平均キャリー', unit: 'yd', digits: 0, get: (st) => st.avgCarry },
  speed: { label: 'ボール初速', unit: 'm/s', digits: 1, get: (st) => st.avgSpeed },
  launch: { label: '打ち出し角', unit: '°', digits: 1, get: (st) => st.avgLaunch, band: (c) => c.launch, bandLabel: '目標レンジ' },
  hs: { label: '推定HS', unit: 'm/s', digits: 1, get: (st) => st.headSpeed },
  total: { label: '総合スコア', unit: '', digits: 0, get: (st) => st.scores.total },
  cons: { label: '安定性', unit: '', digits: 0, get: (st) => st.scores.consistency },
};

function renderHistory() {
  ensureSamples();
  const v = $('#v-history');
  const clubs = CLUBS.filter((c) => state.sessions.some((s) => s.club === c.id));
  if (!histClub || !clubs.some((c) => c.id === histClub)) histClub = clubs[0]?.id;
  const list = state.sessions.filter((s) => s.club === histClub).sort((a, b) => a.date - b.date);
  const stats = list.map((s) => ({ s, st: sessionStats(s) }));
  const M = METRICS[histMetric];
  const first = stats[0], last = stats[stats.length - 1];

  v.innerHTML = `
    <section class="card">
      <p class="eyebrow">PROGRESS</p>
      <h1 class="h1">成長の記録</h1>
      ${showingSamples() ? `<div class="notice"><b>サンプル表示中</b> 測定するとあなたの記録に置き換わります。</div>` : ''}
      <div class="chips chips-row" role="radiogroup" aria-label="クラブ">
        ${clubs.map((c) => `<button type="button" class="chip chip-sm" role="radio" aria-checked="${c.id === histClub}" data-hc="${c.id}">${c.short}</button>`).join('')}
      </div>
      <div class="seg seg-scroll" role="tablist" aria-label="指標">
        ${Object.entries(METRICS).map(([k, m]) => `<button type="button" class="seg-btn" role="tab" aria-selected="${k === histMetric}" data-hm="${k}">${m.label}</button>`).join('')}
      </div>
      ${stats.length > 1 ? `<p class="trend">はじめ（${fmtDate(first.s.date)}）から <b class="${M.get(last.st) - M.get(first.st) >= 0 ? 'up' : 'down'}">${sign(M.get(last.st) - M.get(first.st), M.digits)}${M.unit}</b></p>` : ''}
      <div class="chart-host" id="hist-chart"></div>
      ${stats.length === 1 ? '<p class="muted small">同じクラブで2回以上測ると、推移が線でつながります。</p>' : ''}
    </section>
    <section class="card">
      <h2>測定一覧</h2>
      <ul class="sessions">
        ${[...stats].reverse().map(({ s, st }) => `
          <li><a href="#r-${s.id}">
            <span class="s-date">${fmtDate(s.date)}</span>
            <span class="s-main"><b>${st.avgCarry.toFixed(0)}yd</b><span class="muted small">初速 ${st.avgSpeed.toFixed(1)} · 打出 ${st.avgLaunch.toFixed(1)}° · ${st.n}球</span></span>
            <span class="s-score">${st.scores.total}</span>
            ${s.aiUnlocked ? '<span class="pill pill-accent">AI</span>' : ''}
          </a></li>`).join('')}
      </ul>
      <div class="row-end">
        <button type="button" class="link danger" id="wipe">${showingSamples() ? 'サンプルを消す' : 'すべての記録を削除'}</button>
      </div>
      <div id="wipe-confirm"></div>
    </section>`;

  v.querySelectorAll('[data-hc]').forEach((b) => b.addEventListener('click', () => { histClub = b.dataset.hc; renderHistory(); }));
  v.querySelectorAll('[data-hm]').forEach((b) => b.addEventListener('click', () => { histMetric = b.dataset.hm; renderHistory(); }));
  const c = clubById(histClub);
  lineChart($('#hist-chart'), {
    points: stats.map(({ s, st }) => ({ y: M.get(st), label: fmtDate(s.date), tip: `${fmtDate(s.date)} · ${st.n}球` })),
    unit: M.unit, digits: M.digits, band: M.band ? M.band(c) : null, bandLabel: M.bandLabel, ariaLabel: `${c.short} ${M.label}の推移`,
  });
  $('#wipe').onclick = () => {
    $('#wipe-confirm').innerHTML = `<div class="notice">${showingSamples() ? 'サンプルを消しますか？' : 'すべての記録を削除します。元に戻せません。'} <button type="button" class="btn btn-ghost" id="wipe-no">やめる</button> <button type="button" class="btn btn-danger" id="wipe-yes">削除する</button></div>`;
    $('#wipe-no').onclick = () => { $('#wipe-confirm').innerHTML = ''; };
    $('#wipe-yes').onclick = () => {
      state.sessions = [];
      state.samplesCleared = true;
      persist(); toast('削除しました'); go('home');
    };
  };
}

// ---------- AIパス ----------
function renderPass() {
  const v = $('#v-pass');
  const active = passActive(state);
  v.innerHTML = `
    <section class="card">
      <p class="eyebrow">AI PASS</p>
      <h1 class="h1">AIパス</h1>
      <p class="lead">測定と記録はずっと無料。AIコーチは<b>使いたい日だけ</b>パスを買って使えます。自動更新はありません。</p>
      ${active ? `<div class="notice ok"><b>利用中</b> ${remainingText(state)}（${fmtDateLong(state.pass.until)}まで）</div>` : ''}
      <div class="passes">
        ${PASSES.map((p) => `
          <div class="pass ${p.best ? 'pass-best' : ''}">
            ${p.best ? '<span class="pill pill-accent">いちばんお得</span>' : ''}
            <h2>${p.label}</h2>
            <p class="price">¥${p.price.toLocaleString()}</p>
            <p class="muted small">1日あたり ¥${Math.round(p.price / p.days)} · ${p.note}</p>
            <button type="button" class="btn ${p.best ? 'btn-primary' : 'btn-ghost'}" data-buy="${p.id}">${active ? '期間を延長' : '購入する'}</button>
          </div>`).join('')}
      </div>
      <div id="buy-confirm"></div>
    </section>
    <section class="card">
      <h2>無料とAIパスの違い</h2>
      <div class="table-wrap">
      <table class="compare">
        <thead><tr><th></th><th>無料</th><th>AIパス</th></tr></thead>
        <tbody>
          <tr><td>初速・打ち出し角・キャリー</td><td>✓</td><td>✓</td></tr>
          <tr><td>総合スコア・記録・グラフ</td><td>✓</td><td>✓</td></tr>
          <tr><td>課題の診断と理由</td><td>初回のみ</td><td>✓</td></tr>
          <tr><td>今日の練習メニュー</td><td>初回のみ</td><td>✓</td></tr>
          <tr><td>伸び代と目標数値</td><td>初回のみ</td><td>✓</td></tr>
          <tr><td>前回からの変化の解説</td><td>—</td><td>✓</td></tr>
        </tbody>
      </table>
      </div>
      <p class="muted small">パス期間中に診断した結果は、期間が終わっても見返せます。</p>
    </section>`;
  v.querySelectorAll('[data-buy]').forEach((b) => b.addEventListener('click', () => {
    const p = PASSES.find((x) => x.id === b.dataset.buy);
    $('#buy-confirm').innerHTML = `
      <div class="notice">
        <p><b>${p.label}（¥${p.price}）を購入しますか？</b></p>
        <p class="muted small">これは試作版です。実際の決済は行われず、この端末にパスが付与されます。</p>
        <div class="row-end"><button type="button" class="btn btn-ghost" id="buy-no">やめる</button><button type="button" class="btn btn-primary" id="buy-yes">購入する</button></div>
      </div>`;
    $('#buy-no').onclick = () => { $('#buy-confirm').innerHTML = ''; };
    $('#buy-yes').onclick = () => { grantPass(state, p.id); persist(); toast(`${p.label}を有効にしました`); renderPass(); renderPassChip(); };
  }));
}

// ---------- 起動 ----------
window.addEventListener('hashchange', route);
$('#pass-chip').addEventListener('click', () => go('pass'));
route();
