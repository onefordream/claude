import { api, uploadFile } from '../api.js';
import { html, mount, $, $$, onAction, toast, jstToday, fmtDate, MOODS, celebrate, confirmSheet } from '../ui.js';
import { icon } from '../icons.js';

// ゴルフのラウンド記録: 開始設定 → ホールごとの入力（または合計だけ）→ 終了 → スコアカード

const RESULT = [
  { d: -2, key: 'eagle', label: 'イーグル' },
  { d: -1, key: 'birdie', label: 'バーディ' },
  { d: 0, key: 'par', label: 'パー' },
  { d: 1, key: 'bogey', label: 'ボギー' },
  { d: 2, key: 'double', label: 'ダボ' },
  { d: 3, key: 'triple', label: 'トリプル' },
];
export function resultKey(score, par) {
  const d = score - par;
  if (d <= -2) return 'eagle';
  if (d >= 3) return 'triple';
  return RESULT.find((r) => r.d === d).key;
}
function resultLabel(score, par) {
  if (score === 1) return 'ホールインワン';
  const d = score - par;
  if (d <= -2) return d === -2 ? 'イーグル' : 'アルバトロス';
  if (d >= 3) return `+${d}`;
  return RESULT.find((r) => r.d === d).label;
}
const toParText = (v) => (v == null ? '' : v > 0 ? `+${v}` : v === 0 ? '±0' : `${v}`);

// ---------- 開始設定 ----------
async function renderNew(root, { navigate }) {
  const { courses, defaultPars } = await api('/golf/courses');
  const st = { holes: 18, mode: 'hole', pars: [...defaultPars], playedOn: jstToday(), courseName: courses[0]?.name || '' };
  if (courses[0]) st.pars = courses[0].pars.length === 18 ? [...courses[0].pars] : [...defaultPars];

  const parsGrid = () => html`
    <div class="par-grid">${st.pars.slice(0, st.holes).map((p, i) => html`
      <button type="button" class="par-chip p${p}" data-action="par" data-i="${i}" aria-label="${i + 1}番 パー${p}">
        <span>${i + 1}</span><b>${p}</b></button>`)}</div>
    <p class="hint">タップでパーを 3→4→5 と切り替えます。合計パー ${st.pars.slice(0, st.holes).reduce((a, b) => a + b, 0)}</p>`;

  mount(root, html`
    <header class="page-head with-back">
      <a class="icon-btn" href="#/golf" aria-label="戻る">${icon('chevronLeft', { size: 22 })}</a>
      <div><h1 class="page-title small">ラウンドを記録</h1></div><span></span>
    </header>
    <form class="card" id="golf-new" novalidate>
      <label class="field"><span class="field-label">コース</span>
        <input class="input" id="g-course" name="course" maxlength="60" list="g-courses" placeholder="例: 青山カントリークラブ" value="${st.courseName}" autocomplete="off">
        <datalist id="g-courses">${courses.map((c) => html`<option value="${c.name}">`)}</datalist>
      </label>
      <div class="field-row">
        <label class="field"><span class="field-label">プレー日</span>
          <input class="input" id="g-date" name="date" type="date" max="${jstToday()}" value="${st.playedOn}"></label>
        <div class="field"><span class="field-label">ホール数</span>
          <div class="seg" role="radiogroup">
            <button type="button" class="${st.holes === 18 ? 'on' : ''}" data-action="holes" data-v="18">18H</button>
            <button type="button" class="${st.holes === 9 ? 'on' : ''}" data-action="holes" data-v="9">9H</button>
          </div></div>
      </div>
      <div class="field"><span class="field-label">入力のしかた</span>
        <div class="radio-cards">
          <label class="radio-card ${st.mode === 'hole' ? 'on' : ''}"><input type="radio" name="mode" value="hole" ${st.mode === 'hole' ? 'checked' : ''}><span class="radio-dot"></span>
            <span class="radio-body"><b>ホールごと（おすすめ）</b><span>パーオン・寄せワン・サンドセーブまで自動で計算。1ホール数タップです</span></span></label>
          <label class="radio-card ${st.mode === 'total' ? 'on' : ''}"><input type="radio" name="mode" value="total" ${st.mode === 'total' ? 'checked' : ''}><span class="radio-dot"></span>
            <span class="radio-body"><b>合計だけ（かんたん）</b><span>スコアカードを見ながら、合計の数字だけ入力します</span></span></label>
        </div></div>
      <details class="par-details"><summary>パーを確認・変更</summary><div class="par-slot">${parsGrid()}</div></details>
      <button class="btn btn-primary btn-block btn-lg" type="submit">${icon('check', { size: 20, stroke: 2.6 })}ラウンドを始める</button>
    </form>`);

  const form = $('#golf-new', root);
  const redrawPars = () => mount($('.par-slot', root), parsGrid());
  form.course.addEventListener('change', () => {
    const c = courses.find((x) => x.name === form.course.value.trim());
    if (c) {
      st.pars = c.pars.length >= st.holes ? [...c.pars, ...defaultPars.slice(c.pars.length)] : [...defaultPars];
      redrawPars();
      toast('このコースのパーを読み込みました');
    }
  });
  $$('input[name=mode]', root).forEach((r) => r.addEventListener('change', () => {
    st.mode = r.value;
    $$('.radio-card', root).forEach((c) => c.classList.toggle('on', $('input', c).checked));
  }));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('button[type=submit]', form);
    btn.classList.add('loading');
    try {
      const res = await api('/golf/rounds', {
        method: 'POST',
        body: { courseName: form.course.value.trim() || 'コース名なし', playedOn: form.date.value, holesCount: st.holes, mode: st.mode, pars: st.pars.slice(0, st.holes) },
      });
      navigate(`/golf/rounds/${res.round.id}`, { replace: true });
    } catch (err) {
      toast(err.message, { type: 'error' });
      btn.classList.remove('loading');
    }
  });
  return onAction(root, {
    par: (el) => {
      const i = Number(el.dataset.i);
      st.pars[i] = st.pars[i] >= 5 ? 3 : st.pars[i] + 1;
      redrawPars();
    },
    holes: (el) => {
      st.holes = Number(el.dataset.v);
      $$('.seg button', root).forEach((b) => b.classList.toggle('on', b.dataset.v === el.dataset.v));
      redrawPars();
    },
  });
}

// ---------- ホールごとの入力 ----------
function holeInput(root, data, startNo, { navigate }) {
  let { round, holes, stats } = data;
  let no = startNo;
  let cur = null; // 表示中のホールの入力値
  let saving = false;

  const load = () => {
    const h = holes[no - 1];
    cur = h.score == null
      ? { par: h.par, score: h.par, putts: 2, fairway: null, ob: 0, bunker: false, penalty: 0, fresh: true }
      : { ...h, fresh: false };
  };

  const dotClass = (h) => (h.score == null ? '' : resultKey(h.score, h.par));
  const view = () => html`
    <header class="hole-head">
      <a class="icon-btn" href="#/golf" aria-label="ゴルフのトップへ">${icon('x', { size: 20 })}</a>
      <div class="hole-head-main"><b>${round.courseName}</b>
        <span>${stats.holesPlayed ? html`${stats.holesPlayed}H ・ <strong>${stats.score}</strong>（${toParText(stats.toPar)}）${stats.putts != null ? ` ・ ${stats.putts}パット` : ''}` : '入力するとスコアが表示されます'}</span></div>
    </header>
    <nav class="hole-dots" aria-label="ホールを選ぶ">${holes.map((h) => html`
      <button class="hole-dot ${dotClass(h)} ${h.no === no ? 'current' : ''}" data-action="go" data-no="${h.no}" aria-label="${h.no}番ホール${h.score != null ? ` ${h.score}打` : ''}">${h.no}</button>`)}</nav>

    <section class="card hole-card">
      <div class="hole-title">
        <span class="hole-no"><b class="num">${no}</b>番ホール</span>
        <button class="par-pill" data-action="cycle-par">Par <b>${cur.par}</b></button>
      </div>

      <div class="score-row">
        <button class="round-btn" data-action="score-dec" aria-label="1打減らす">−</button>
        <div class="score-big ${resultKey(cur.score, cur.par)}"><span class="num">${cur.score}</span><small>${resultLabel(cur.score, cur.par)}</small></div>
        <button class="round-btn" data-action="score-inc" aria-label="1打増やす">＋</button>
      </div>
      <div class="quick-results">${RESULT.slice(1).map((r) => html`<button class="chip ${cur.score - cur.par === r.d ? 'on' : ''}" data-action="score-set" data-v="${cur.par + r.d}">${r.label}</button>`)}</div>

      <div class="hole-field"><span class="hole-label">パット</span>
        <div class="num-chips">${[0, 1, 2, 3, 4].map((n) => html`<button class="num-chip ${cur.putts === n ? 'on' : ''}" data-action="putts" data-v="${n}" ${n >= cur.score ? 'disabled' : ''}>${n}</button>`)}</div></div>

      ${cur.par >= 4 ? html`<div class="hole-field"><span class="hole-label">ティーショット</span>
        <div class="tee-btns">
          <button class="tee-btn ${cur.fairway === 'left' ? 'on' : ''}" data-action="fw" data-v="left">← 左</button>
          <button class="tee-btn fw ${cur.fairway === 'fw' ? 'on' : ''}" data-action="fw" data-v="fw">FW</button>
          <button class="tee-btn ${cur.fairway === 'right' ? 'on' : ''}" data-action="fw" data-v="right">右 →</button>
        </div></div>` : ''}

      <div class="trouble-row">
        <div class="stepper"><span>OB</span><button data-action="ob-dec" aria-label="OBを減らす">−</button><b class="num">${cur.ob}</b><button data-action="ob-inc" aria-label="OBを増やす">＋</button></div>
        <div class="stepper"><span>池など</span><button data-action="pen-dec" aria-label="ペナルティを減らす">−</button><b class="num">${cur.penalty}</b><button data-action="pen-inc" aria-label="ペナルティを増やす">＋</button></div>
        <button class="toggle-chip ${cur.bunker ? 'on' : ''}" data-action="bunker" aria-pressed="${cur.bunker}">バンカー</button>
      </div>
      ${cur.fresh ? html`<p class="hint center">パーで2パットなら、そのまま「次へ」でOK</p>` : ''}
    </section>

    <div class="hole-nav">
      <button class="btn btn-ghost" data-action="prev" ${no === 1 ? 'disabled' : ''}>${icon('chevronLeft', { size: 18 })}前へ</button>
      <button class="btn btn-primary btn-lg" data-action="next">${no === round.holesCount ? 'ラウンドを終える' : html`次のホールへ ${icon('chevronRight', { size: 18 })}`}</button>
    </div>`;

  const draw = () => {
    mount(root, view());
    $('.hole-dot.current', root)?.scrollIntoView({ block: 'nearest', inline: 'center' });
  };

  async function save() {
    if (saving) return false;
    saving = true;
    try {
      const body = { par: cur.par, score: cur.score, putts: cur.putts, fairway: cur.fairway, ob: cur.ob, bunker: cur.bunker, penalty: cur.penalty };
      ({ round, holes, stats } = await api(`/golf/rounds/${round.id}/holes/${no}`, { method: 'PUT', body }));
      return true;
    } catch (err) {
      toast(err.message, { type: 'error' });
      return false;
    } finally {
      saving = false;
    }
  }
  async function goTo(n) {
    if (!(await save())) return;
    no = n;
    history.replaceState(null, '', `#/golf/rounds/${round.id}?hole=${no}`);
    load();
    draw();
    window.scrollTo(0, 0);
  }
  const setScore = (v) => {
    cur.score = Math.max(1, Math.min(15, v));
    if (cur.putts != null && cur.putts >= cur.score) cur.putts = cur.score - 1;
    draw();
  };

  load();
  draw();
  return onAction(root, {
    'score-dec': () => setScore(cur.score - 1),
    'score-inc': () => setScore(cur.score + 1),
    'score-set': (el) => setScore(Number(el.dataset.v)),
    putts: (el) => { cur.putts = Number(el.dataset.v); draw(); },
    fw: (el) => { cur.fairway = cur.fairway === el.dataset.v ? null : el.dataset.v; draw(); },
    'ob-inc': () => { cur.ob = Math.min(9, cur.ob + 1); draw(); },
    'ob-dec': () => { cur.ob = Math.max(0, cur.ob - 1); draw(); },
    'pen-inc': () => { cur.penalty = Math.min(9, cur.penalty + 1); draw(); },
    'pen-dec': () => { cur.penalty = Math.max(0, cur.penalty - 1); draw(); },
    bunker: () => { cur.bunker = !cur.bunker; draw(); },
    'cycle-par': () => {
      const old = cur.par;
      cur.par = cur.par >= 5 ? 3 : cur.par + 1;
      if (cur.fresh) cur.score = cur.par;
      else cur.score += cur.par - old;
      if (cur.par === 3) cur.fairway = null;
      draw();
    },
    go: (el) => goTo(Number(el.dataset.no)),
    prev: () => no > 1 && goTo(no - 1),
    next: async () => {
      if (no < round.holesCount) return goTo(no + 1);
      if (!(await save())) return;
      navigate(`/golf/rounds/${round.id}?finish=1`, { replace: true });
    },
  });
}

// ---------- 合計だけ入力 ----------
function totalInput(root, data, { navigate }) {
  const { round } = data;
  const t = round.totals || {};
  const n = round.holesCount;
  const fwDefault = round.pars.filter((p) => p >= 4).length;
  const field = (name, label, val, hint = '') => html`<label class="field total-field"><span class="field-label">${label}</span>
    <input class="input input-num" id="t-${name}" name="${name}" type="number" inputmode="numeric" min="0" value="${val ?? ''}" placeholder="—">${hint ? html`<span class="hint">${hint}</span>` : ''}</label>`;
  mount(root, html`
    <header class="page-head with-back">
      <a class="icon-btn" href="#/golf" aria-label="戻る">${icon('chevronLeft', { size: 22 })}</a>
      <div><h1 class="page-title small">${round.courseName}</h1></div><span></span>
    </header>
    <form class="card" id="total-form" novalidate>
      <p class="muted small">わかる項目だけで大丈夫です。空欄は分析に使いません。</p>
      <div class="total-grid">
        ${field('score', `スコア（${n}H・パー${round.pars.reduce((a, b) => a + b, 0)}）`, t.score)}
        ${field('putts', 'パット数', t.putts)}
        ${field('fwHit', 'FWキープ', t.fwHit, `${fwDefault}ホール中`)}
        ${field('gir', 'パーオン', t.gir, `${n}ホール中`)}
        ${field('ob', 'OB', t.ob)}
        ${field('penalties', '池などのペナルティ', t.penalties)}
        ${field('threePutts', '3パット', t.threePutts)}
        ${field('sandChances', 'バンカーに入った', t.sandChances, 'ホール数')}
        ${field('sandSaves', 'うちパー以内', t.sandSaves)}
        ${field('drive', 'ドライバー飛距離', round.driveDistance, 'ヤード（任意）')}
      </div>
      <button class="btn btn-primary btn-block btn-lg" type="submit">保存してラウンドを終える</button>
    </form>`);
  const form = $('#total-form', root);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = (k) => (form[k].value === '' ? null : Number(form[k].value));
    if (v('score') == null) return toast('スコアを入力してください');
    try {
      await api(`/golf/rounds/${round.id}`, {
        method: 'PATCH',
        body: {
          driveDistance: v('drive'),
          totals: { score: v('score'), putts: v('putts'), fwHit: v('fwHit'), fwChances: v('fwHit') != null ? fwDefault : null, gir: v('gir'), ob: v('ob'), penalties: v('penalties'), threePutts: v('threePutts'), sandChances: v('sandChances'), sandSaves: v('sandSaves') },
        },
      });
      navigate(`/golf/rounds/${round.id}?finish=1`, { replace: true });
    } catch (err) {
      toast(err.message, { type: 'error' });
    }
  });
}

// ---------- 終了（メモ・気分・写真・共有） ----------
async function finishView(root, data, { navigate }) {
  const { round, stats } = data;
  const links = (await api('/links').catch(() => ({ links: [] }))).links.filter((l) => l.status === 'active');
  const st = { mood: null, storeIds: new Set(links.filter((l) => l.shareMode === 'all').map((l) => l.store.id)), media: [] };
  const drive = round.driveDistance;

  const draw = () => mount(root, html`
    <header class="page-head with-back">
      <a class="icon-btn" href="#/golf/rounds/${round.id}?hole=${round.holesCount}" aria-label="入力に戻る">${icon('chevronLeft', { size: 22 })}</a>
      <div><h1 class="page-title small">ラウンドおつかれさまでした</h1></div><span></span>
    </header>
    <section class="card finish-score">
      <p class="muted small">${round.courseName} ・ ${fmtDate(round.playedOn)}</p>
      <p class="finish-big"><span class="num">${stats.score}</span><small>（${toParText(stats.toPar)}）</small></p>
      ${statTiles(stats)}
    </section>
    <form class="card" id="finish-form" novalidate>
      <label class="field"><span class="field-label">ふりかえりメモ</span>
        <textarea class="input" id="f-note" name="note" rows="4" maxlength="2000" placeholder="良かったこと・悔しかったこと・次に試したいこと">${round.note || ''}</textarea></label>
      ${round.mode === 'hole' ? html`<label class="field"><span class="field-label">ドライバーの平均飛距離（任意）</span>
        <input class="input input-num" id="f-drive" name="drive" type="number" inputmode="numeric" min="80" max="400" placeholder="ヤード" value="${drive ?? ''}"></label>` : ''}
      <div class="field"><span class="field-label">今日の気分</span>
        <div class="moods">${MOODS.map((m) => html`<button type="button" class="mood ${st.mood === m.v ? 'on' : ''}" data-action="mood" data-v="${m.v}"><span class="mood-emoji">${m.emoji}</span><span class="mood-label">${m.label}</span></button>`)}</div></div>
      ${round.entryId ? '' : html`<div class="field"><span class="field-label">写真（スコアカードなど）</span>
        <label class="attach-btn wide">${icon('camera', { size: 20 })}<span>写真を追加</span><input type="file" accept="image/*" multiple hidden id="f-photo"></label>
        <div class="finish-photos">${st.media.map((m) => html`<img src="${m.preview}" alt="">`)}</div></div>`}
      ${links.length ? html`<div class="field"><span class="field-label">教室・お店に共有</span>
        <div class="share-pick">${links.map((l) => html`<button type="button" class="chip share-chip ${st.storeIds.has(l.store.id) ? 'on' : ''}" data-action="share" data-id="${l.store.id}">${icon('check', { size: 14, stroke: 3 })}${l.store.name}</button>`)}</div></div>` : ''}
      <button class="btn btn-primary btn-block btn-lg" type="submit">${icon('check', { size: 20, stroke: 2.6 })}成長ノートに記録する</button>
    </form>`);
  draw();

  const onChange = async (e) => {
    if (e.target.id !== 'f-photo') return;
    for (const file of [...e.target.files].slice(0, 6)) {
      try {
        const res = await uploadFile(file);
        st.media.push({ id: res.id, preview: URL.createObjectURL(file) });
      } catch (err) {
        toast(err.message, { type: 'error' });
      }
    }
    const note = $('#f-note', root).value;
    draw();
    $('#f-note', root).value = note;
  };
  const onSubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const btn = $('button[type=submit]', f);
    btn.classList.add('loading');
    try {
      if (f.drive && f.drive.value !== String(drive ?? '')) {
        await api(`/golf/rounds/${round.id}`, { method: 'PATCH', body: { driveDistance: f.drive.value === '' ? null : Number(f.drive.value) } });
      }
      const res = await api(`/golf/rounds/${round.id}/finish`, {
        method: 'POST',
        body: { note: f.note.value, mood: st.mood, mediaIds: st.media.map((m) => m.id), storeIds: [...st.storeIds] },
      });
      navigate(`/golf/rounds/${round.id}?done=${res.personalBest ? 'best' : '1'}`, { replace: true });
    } catch (err) {
      toast(err.message, { type: 'error' });
      btn.classList.remove('loading');
    }
  };
  root.addEventListener('change', onChange);
  root.addEventListener('submit', onSubmit);
  const off = onAction(root, {
    mood: (el) => {
      st.mood = st.mood === Number(el.dataset.v) ? null : Number(el.dataset.v);
      $$('.mood', root).forEach((b) => b.classList.toggle('on', Number(b.dataset.v) === st.mood));
    },
    share: (el) => {
      const id = el.dataset.id;
      if (st.storeIds.has(id)) st.storeIds.delete(id);
      else st.storeIds.add(id);
      el.classList.toggle('on', st.storeIds.has(id));
    },
  });
  return () => {
    off();
    root.removeEventListener('change', onChange);
    root.removeEventListener('submit', onSubmit);
  };
}

// ---------- スコアカード ----------
export function statTiles(s) {
  const tile = (label, value, sub = '') => html`<div class="stat-tile"><span class="stat-label">${label}</span><b class="num">${value ?? '—'}</b>${sub ? html`<span class="stat-sub">${sub}</span>` : ''}</div>`;
  return html`<div class="stat-tiles">
    ${tile('パット', s.putts, s.threePutts != null ? `3パット ${s.threePutts}` : '')}
    ${tile('FWキープ', s.fwPct != null ? `${s.fwPct}%` : null, s.fwChances ? `${s.fwHit}/${s.fwChances}` : '')}
    ${tile('パーオン', s.girPct != null ? `${s.girPct}%` : null, s.girHoles ? `${s.gir}/${s.girHoles}` : '')}
    ${tile('寄せワン', s.scramblePct != null ? `${s.scramblePct}%` : null, s.scrambleChances ? `${s.scrambles}/${s.scrambleChances}` : '')}
    ${tile('サンドセーブ', s.sandPct != null ? `${s.sandPct}%` : null, s.sandChances ? `${s.sandSaves}/${s.sandChances}` : '')}
    ${tile('OB', s.ob, s.penalties ? `ペナ ${s.penalties}` : '')}
  </div>`;
}

function scorecard(holes, stats) {
  const nine = (from) => holes.slice(from, from + 9);
  const sub = (hs, f) => hs.reduce((a, h) => a + (f(h) ?? 0), 0);
  const table = (hs, label) => hs.length ? html`<div class="sc-wrap"><table class="scorecard">
    <tr><th>${label}</th>${hs.map((h) => html`<th>${h.no}</th>`)}<th>計</th></tr>
    <tr class="sc-par"><td>Par</td>${hs.map((h) => html`<td>${h.par}</td>`)}<td>${sub(hs, (h) => h.par)}</td></tr>
    <tr class="sc-score"><td>打数</td>${hs.map((h) => html`<td>${h.score == null ? '' : html`<span class="sc ${resultKey(h.score, h.par)}">${h.score}</span>`}</td>`)}<td><b>${sub(hs, (h) => h.score)}</b></td></tr>
    <tr class="sc-putt"><td>パット</td>${hs.map((h) => html`<td>${h.putts ?? ''}</td>`)}<td>${sub(hs, (h) => h.putts)}</td></tr>
    <tr class="sc-fw"><td>TS</td>${hs.map((h) => html`<td>${h.fairway === 'fw' ? '◎' : h.fairway === 'left' ? '←' : h.fairway === 'right' ? '→' : ''}${h.ob ? html`<i class="ob">OB</i>` : ''}</td>`)}<td></td></tr>
  </table></div>` : '';
  return html`${table(nine(0), 'OUT')}${table(nine(9), 'IN')}
    ${stats.dist ? html`<div class="dist-bar" role="img" aria-label="内訳">${['eagle', 'birdie', 'par', 'bogey', 'double', 'triple'].filter((k) => stats.dist[k]).map((k) => html`
      <span class="dist ${k}" style="flex:${stats.dist[k]}">${stats.dist[k]}</span>`)}</div>
      <p class="dist-legend">${[['birdie', 'バーディ以上'], ['par', 'パー'], ['bogey', 'ボギー'], ['double', 'ダボ'], ['triple', 'トリ以上']].map(([k, l]) => html`<span class="dl ${k}">${l}</span>`)}</p>` : ''}`;
}

async function summaryView(root, data, query, { navigate }) {
  const { round, holes, stats } = data;
  const done = query.get('done');
  mount(root, html`
    <header class="page-head with-back">
      <a class="icon-btn" href="#/golf" aria-label="ゴルフのトップへ">${icon('chevronLeft', { size: 22 })}</a>
      <div><p class="eyebrow">${fmtDate(round.playedOn, { year: true })}</p><h1 class="page-title small">${round.courseName}</h1></div>
      <button class="icon-btn" data-action="delete" aria-label="ラウンドを削除">${icon('trash', { size: 20 })}</button>
    </header>
    ${done ? html`<section class="celebrate">
      <div class="celebrate-burst">${done === 'best' ? '🏆' : '⛳'}</div>
      <h2 class="celebrate-title">${done === 'best' ? 'ベストスコア更新！' : '記録しました'}</h2>
      <p class="celebrate-sub">成長ノートにも残しました</p></section>` : ''}
    <section class="card finish-score">
      <p class="finish-big"><span class="num">${stats.score ?? '—'}</span><small>${stats.toPar != null ? `（${toParText(stats.toPar)}）` : ''}</small></p>
      ${stats.front && stats.back ? html`<p class="muted small center">OUT ${stats.front.score} ・ IN ${stats.back.score}</p>` : ''}
      ${statTiles(stats)}
      ${stats.byPar ? html`<p class="bypar">平均スコア： Par3 <b>${stats.byPar[3] ?? '—'}</b> ・ Par4 <b>${stats.byPar[4] ?? '—'}</b> ・ Par5 <b>${stats.byPar[5] ?? '—'}</b></p>` : ''}
    </section>
    ${round.mode === 'hole' ? html`<section class="card">${scorecard(holes, stats)}</section>` : ''}
    ${round.note ? html`<section class="card"><h2 class="card-title small">メモ</h2><p class="entry-body">${round.note}</p></section>` : ''}
    <div class="after-actions">
      <a class="btn btn-primary btn-block" href="#/golf?tab=analysis">${icon('target', { size: 18 })}スコアを分析する</a>
      ${round.entryId ? html`<a class="btn btn-soft btn-block" href="#/entries/${round.entryId}">成長ノートの記録を見る</a>` : ''}
      <a class="btn btn-ghost btn-block" href="#/golf/rounds/${round.id}?${round.mode === 'hole' ? 'hole=1' : 'edit=1'}">${icon('edit', { size: 16 })}スコアを修正する</a>
    </div>`);
  if (done === 'best') celebrate();
  return onAction(root, {
    delete: async () => {
      const ok = await confirmSheet({ title: 'このラウンドを削除しますか？', message: 'スコアの記録が削除されます。成長ノートの記録は残ります。', ok: '削除する', danger: true });
      if (!ok) return;
      await api(`/golf/rounds/${round.id}`, { method: 'DELETE' });
      toast('削除しました');
      navigate('/golf', { replace: true });
    },
  });
}

export async function render(root, { id, query }, ctx) {
  if (!id) return renderNew(root, ctx);
  const data = await api(`/golf/rounds/${id}`);
  const { round } = data;
  if (query.get('finish') === '1') return finishView(root, data, ctx);
  const editing = query.has('hole') || query.get('edit') === '1';
  if (round.status === 'done' && !editing) return summaryView(root, data, query, ctx);
  if (round.mode === 'total') return totalInput(root, data, ctx);
  // 続きから: 最初の未入力ホール
  const first = data.holes.find((h) => h.score == null)?.no ?? 1;
  const start = Math.min(round.holesCount, Math.max(1, Number(query.get('hole')) || first));
  return holeInput(root, data, start, ctx);
}
