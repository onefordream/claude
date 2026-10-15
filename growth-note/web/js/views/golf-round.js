import { api, uploadFile } from '../api.js';
import { html, mount, $, $$, onAction, toast, jstToday, fmtDate, MOODS, confirmSheet } from '../ui.js';
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
      <button type="button" class="par-cell" data-action="par" data-i="${i}" aria-label="${i + 1}番 パー${p}">
        <span>${i + 1}</span><b>${p}</b></button>`)}</div>
    <p class="hint">押すたびにパーが 3・4・5 の順に切り替わります。合計パー ${st.pars.slice(0, st.holes).reduce((a, b) => a + b, 0)}</p>`;

  mount(root, html`
    <header class="page-head with-back">
      <a class="icon-btn" href="#/golf" aria-label="戻る">${icon('caretLeft', { size: 20 })}</a>
      <div class="page-head-main"><h1 class="page-title page-title-sm">ラウンドを記録</h1></div>
    </header>
    <form class="form" id="golf-new" novalidate>
      <label class="field"><span class="field-label">コース</span>
        <input class="input" id="g-course" name="course" maxlength="60" list="g-courses" placeholder="例: 青山カントリークラブ" value="${st.courseName}" autocomplete="off">
        <datalist id="g-courses">${courses.map((c) => html`<option value="${c.name}">`)}</datalist>
      </label>
      <div class="field-row">
        <label class="field"><span class="field-label">プレー日</span>
          <input class="input" id="g-date" name="date" type="date" max="${jstToday()}" value="${st.playedOn}"></label>
        <div class="field"><span class="field-label">ホール数</span>
          <div class="seg" role="group" aria-label="ホール数">
            <button type="button" class="${st.holes === 18 ? 'on' : ''}" data-action="holes" data-v="18" aria-pressed="${st.holes === 18}">18H</button>
            <button type="button" class="${st.holes === 9 ? 'on' : ''}" data-action="holes" data-v="9" aria-pressed="${st.holes === 9}">9H</button>
          </div></div>
      </div>
      <div class="field"><span class="field-label">入力のしかた</span>
        <div class="radio-cards">
          <label class="radio-card ${st.mode === 'hole' ? 'on' : ''}"><input type="radio" name="mode" value="hole" ${st.mode === 'hole' ? 'checked' : ''}><span class="radio-dot"></span>
            <span class="radio-body"><b>ホールごと</b><span>パーオン・寄せワン・サンドセーブまで自動で計算します。1ホール数タップです。</span></span></label>
          <label class="radio-card ${st.mode === 'total' ? 'on' : ''}"><input type="radio" name="mode" value="total" ${st.mode === 'total' ? 'checked' : ''}><span class="radio-dot"></span>
            <span class="radio-body"><b>合計だけ</b><span>スコアカードを見ながら、合計の数字だけを入力します。</span></span></label>
        </div></div>
      <details class="disclosure"><summary>パーを確認・変更</summary><div class="par-slot">${parsGrid()}</div></details>
      <button class="btn btn-primary btn-block btn-lg" type="submit">ラウンドを始める</button>
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
      $$('.seg button', root).forEach((b) => {
        b.classList.toggle('on', b.dataset.v === el.dataset.v);
        b.setAttribute('aria-pressed', String(b.dataset.v === el.dataset.v));
      });
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
    <header class="focus-head">
      <a class="icon-btn" href="#/golf" aria-label="ゴルフのトップへ">${icon('x', { size: 20 })}</a>
      <div class="focus-head-title"><span>${round.courseName}</span>
        <span class="focus-head-sub num">${stats.holesPlayed ? `${stats.holesPlayed}H　${stats.score}（${toParText(stats.toPar)}）${stats.putts != null ? `　${stats.putts}パット` : ''}` : '入力するとスコアが表示されます'}</span></div>
    </header>
    <nav class="hole-strip" aria-label="ホールを選ぶ">${holes.map((h) => html`
      <button class="hole-cell ${h.no === no ? 'current' : ''} ${h.score != null ? 'filled' : ''}" data-action="go" data-no="${h.no}" aria-label="${h.no}番ホール${h.score != null ? ` ${h.score}打` : ''}" ${h.no === no ? html`aria-current="step"` : ''}>
        <span class="hole-cell-no">${h.no}</span><span class="hole-cell-score">${h.score != null ? html`<span class="sc ${dotClass(h)}">${h.score}</span>` : ''}</span></button>`)}</nav>

    <section class="section hole">
      <div class="hole-title">
        <p class="hole-no"><b class="num">${no}</b>番ホール</p>
        <button class="btn btn-secondary btn-sm" data-action="cycle-par" aria-label="パーを切り替える">Par ${cur.par}</button>
      </div>

      <div class="score-row">
        <button class="step-btn" data-action="score-dec" aria-label="1打減らす">−</button>
        <div class="score-big"><span class="num">${cur.score}</span><small>${resultLabel(cur.score, cur.par)}</small></div>
        <button class="step-btn" data-action="score-inc" aria-label="1打増やす">+</button>
      </div>
      <div class="chips chips-center">${RESULT.slice(1).map((r) => html`<button class="chip ${cur.score - cur.par === r.d ? 'on' : ''}" data-action="score-set" data-v="${cur.par + r.d}">${r.label}</button>`)}</div>

      <div class="hole-field"><span class="field-label">パット</span>
        <div class="seg seg-fill">${[0, 1, 2, 3, 4].map((n) => html`<button class="${cur.putts === n ? 'on' : ''}" data-action="putts" data-v="${n}" ${n >= cur.score ? 'disabled' : ''} aria-pressed="${cur.putts === n}">${n}</button>`)}</div></div>

      ${cur.par >= 4 ? html`<div class="hole-field"><span class="field-label">ティーショット</span>
        <div class="seg seg-fill">
          <button class="${cur.fairway === 'left' ? 'on' : ''}" data-action="fw" data-v="left" aria-pressed="${cur.fairway === 'left'}">左</button>
          <button class="${cur.fairway === 'fw' ? 'on' : ''}" data-action="fw" data-v="fw" aria-pressed="${cur.fairway === 'fw'}">FW</button>
          <button class="${cur.fairway === 'right' ? 'on' : ''}" data-action="fw" data-v="right" aria-pressed="${cur.fairway === 'right'}">右</button>
        </div></div>` : ''}

      <div class="hole-field trouble-row">
        <div class="stepper"><span class="field-label">OB</span><button data-action="ob-dec" aria-label="OBを減らす">−</button><b class="num">${cur.ob}</b><button data-action="ob-inc" aria-label="OBを増やす">+</button></div>
        <div class="stepper"><span class="field-label">池など</span><button data-action="pen-dec" aria-label="ペナルティを減らす">−</button><b class="num">${cur.penalty}</b><button data-action="pen-inc" aria-label="ペナルティを増やす">+</button></div>
        <button class="chip ${cur.bunker ? 'on' : ''}" data-action="bunker" aria-pressed="${cur.bunker}">バンカー</button>
      </div>
      ${cur.fresh ? html`<p class="hint">パーで2パットなら、そのまま次へ進めます。</p>` : ''}
    </section>

    <div class="hole-nav">
      <button class="btn btn-secondary" data-action="prev" ${no === 1 ? 'disabled' : ''}>${icon('caretLeft', { size: 16 })}前へ</button>
      <button class="btn btn-primary btn-lg" data-action="next">${no === round.holesCount ? 'ラウンドを終える' : html`次のホールへ${icon('caretRight', { size: 16 })}`}</button>
    </div>`;

  const draw = () => {
    mount(root, view());
    $('.hole-cell.current', root)?.scrollIntoView({ block: 'nearest', inline: 'center' });
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
  const field = (name, label, val, hint = '') => html`<label class="field"><span class="field-label">${label}</span>
    <input class="input input-num" id="t-${name}" name="${name}" type="number" inputmode="numeric" min="0" value="${val ?? ''}" placeholder="—">${hint ? html`<span class="hint">${hint}</span>` : ''}</label>`;
  mount(root, html`
    <header class="page-head with-back">
      <a class="icon-btn" href="#/golf" aria-label="戻る">${icon('caretLeft', { size: 20 })}</a>
      <div class="page-head-main"><h1 class="page-title page-title-sm">${round.courseName}</h1><p class="page-sub">わかる項目だけ入力してください。空欄は分析に使いません。</p></div>
    </header>
    <form class="form" id="total-form" novalidate>
      <div class="field-grid">
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
      <button class="btn btn-primary btn-block btn-lg" type="submit">保存して終える</button>
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
      <a class="icon-btn" href="#/golf/rounds/${round.id}?hole=${round.holesCount}" aria-label="入力に戻る">${icon('caretLeft', { size: 20 })}</a>
      <div class="page-head-main"><p class="eyebrow">${round.courseName}　${fmtDate(round.playedOn)}</p><h1 class="page-title page-title-sm">ラウンドの記録</h1></div>
    </header>
    <section class="section">
      <div class="metric metric-xl"><span class="metric-value">${stats.score}</span><span class="metric-unit">${toParText(stats.toPar)}</span></div>
      ${statTiles(stats)}
    </section>
    <form class="form" id="finish-form" novalidate>
      <label class="field"><span class="field-label">ふりかえりメモ</span>
        <textarea class="input" id="f-note" name="note" rows="4" maxlength="2000" placeholder="良かったこと・悔しかったこと・次に試したいこと">${round.note || ''}</textarea></label>
      ${round.mode === 'hole' ? html`<label class="field"><span class="field-label">ドライバーの平均飛距離（任意）</span>
        <input class="input input-num" id="f-drive" name="drive" type="number" inputmode="numeric" min="80" max="400" placeholder="ヤード" value="${drive ?? ''}"></label>` : ''}
      <div class="field"><span class="field-label">気分</span>
        <div class="scale">${MOODS.map((m) => html`<button type="button" class="scale-opt mood ${st.mood === m.v ? 'on' : ''}" data-action="mood" data-v="${m.v}" aria-pressed="${st.mood === m.v}">${m.label}</button>`)}</div></div>
      ${round.entryId ? '' : html`<div class="field"><span class="field-label">写真（スコアカードなど）</span>
        <label class="attach-btn">${icon('camera', { size: 20 })}<span>写真を追加</span><input type="file" accept="image/*" multiple hidden id="f-photo"></label>
        <div class="finish-photos">${st.media.map((m) => html`<img src="${m.preview}" alt="">`)}</div></div>`}
      ${links.length ? html`<div class="field"><span class="field-label">教室・お店に共有</span>
        <div class="chips">${links.map((l) => html`<button type="button" class="chip ${st.storeIds.has(l.store.id) ? 'on' : ''}" data-action="share" data-id="${l.store.id}" aria-pressed="${st.storeIds.has(l.store.id)}">${l.store.name}</button>`)}</div></div>` : ''}
      <button class="btn btn-primary btn-block btn-lg" type="submit">ノートに記録する</button>
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
      $$('.mood', root).forEach((b) => {
        b.classList.toggle('on', Number(b.dataset.v) === st.mood);
        b.setAttribute('aria-pressed', String(Number(b.dataset.v) === st.mood));
      });
    },
    share: (el) => {
      const id = el.dataset.id;
      if (st.storeIds.has(id)) st.storeIds.delete(id);
      else st.storeIds.add(id);
      el.classList.toggle('on', st.storeIds.has(id));
      el.setAttribute('aria-pressed', String(st.storeIds.has(id)));
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
  const item = (label, value, sub = '') => html`<div><dt>${label}</dt><dd>${value ?? '—'}</dd>${sub ? html`<dd class="figure-sub">${sub}</dd>` : ''}</div>`;
  return html`<dl class="figures figures-3">
    ${item('パット', s.putts, s.threePutts != null ? `3パット ${s.threePutts}` : '')}
    ${item('FWキープ', s.fwPct != null ? `${s.fwPct}%` : null, s.fwChances ? `${s.fwHit} / ${s.fwChances}` : '')}
    ${item('パーオン', s.girPct != null ? `${s.girPct}%` : null, s.girHoles ? `${s.gir} / ${s.girHoles}` : '')}
    ${item('寄せワン', s.scramblePct != null ? `${s.scramblePct}%` : null, s.scrambleChances ? `${s.scrambles} / ${s.scrambleChances}` : '')}
    ${item('サンドセーブ', s.sandPct != null ? `${s.sandPct}%` : null, s.sandChances ? `${s.sandSaves} / ${s.sandChances}` : '')}
    ${item('OB', s.ob, s.penalties ? `ペナルティ ${s.penalties}` : '')}
  </dl>`;
}

function scorecard(holes, stats) {
  const nine = (from) => holes.slice(from, from + 9);
  const sub = (hs, f) => hs.reduce((a, h) => a + (f(h) ?? 0), 0);
  const table = (hs, label) => hs.length ? html`<div class="sc-wrap"><table class="scorecard">
    <tr><th>${label}</th>${hs.map((h) => html`<th>${h.no}</th>`)}<th>計</th></tr>
    <tr class="sc-par"><td>Par</td>${hs.map((h) => html`<td>${h.par}</td>`)}<td>${sub(hs, (h) => h.par)}</td></tr>
    <tr class="sc-score"><td>打数</td>${hs.map((h) => html`<td>${h.score == null ? '' : html`<span class="sc ${resultKey(h.score, h.par)}">${h.score}</span>`}</td>`)}<td><b>${sub(hs, (h) => h.score)}</b></td></tr>
    <tr class="sc-putt"><td>パット</td>${hs.map((h) => html`<td>${h.putts ?? ''}</td>`)}<td>${sub(hs, (h) => h.putts)}</td></tr>
    <tr class="sc-fw"><td>TS</td>${hs.map((h) => html`<td>${h.fairway === 'fw' ? '○' : h.fairway === 'left' ? '左' : h.fairway === 'right' ? '右' : ''}${h.ob ? html`<i class="ob">OB</i>` : ''}</td>`)}<td></td></tr>
  </table></div>` : '';
  return html`${table(nine(0), 'OUT')}${table(nine(9), 'IN')}
    <p class="sc-legend"><span><span class="sc birdie">3</span>バーディ以上</span><span><span class="sc bogey">5</span>ボギー</span><span><span class="sc double">6</span>ダボ以上</span></p>
    ${stats.dist ? html`<dl class="figures figures-5">${[['バーディ', (stats.dist.eagle || 0) + (stats.dist.birdie || 0)], ['パー', stats.dist.par || 0], ['ボギー', stats.dist.bogey || 0], ['ダボ', stats.dist.double || 0], ['トリ以上', stats.dist.triple || 0]].map(([l, n]) => html`<div><dt>${l}</dt><dd>${n}</dd></div>`)}</dl>` : ''}`;
}

async function summaryView(root, data, query, { navigate }) {
  const { round, holes, stats } = data;
  const done = query.get('done');
  mount(root, html`
    <header class="page-head with-back">
      <a class="icon-btn" href="#/golf" aria-label="ゴルフのトップへ">${icon('caretLeft', { size: 20 })}</a>
      <div class="page-head-main"><p class="eyebrow">${fmtDate(round.playedOn, { year: true })}</p><h1 class="page-title page-title-sm">${round.courseName}</h1></div>
      <button class="icon-btn" data-action="delete" aria-label="ラウンドを削除">${icon('trash', { size: 20 })}</button>
    </header>
    ${done ? html`<section class="confirm" role="status">
      <p class="confirm-title">${icon('check', { size: 16 })}${done === 'best' ? 'ベストスコアを更新しました' : '記録しました'}</p>
      <p class="confirm-facts">ノートにも記録を残しました</p></section>` : ''}
    <section class="section">
      <div class="metric metric-xl"><span class="metric-value">${stats.score ?? '—'}</span><span class="metric-unit">${stats.toPar != null ? toParText(stats.toPar) : ''}</span></div>
      ${stats.front && stats.back ? html`<p class="page-sub num">OUT ${stats.front.score}　IN ${stats.back.score}</p>` : ''}
      ${statTiles(stats)}
      ${stats.byPar ? html`<p class="hint num">平均スコア　Par3 ${stats.byPar[3] ?? '—'}　Par4 ${stats.byPar[4] ?? '—'}　Par5 ${stats.byPar[5] ?? '—'}</p>` : ''}
    </section>
    ${round.mode === 'hole' ? html`<section class="section"><h2 class="section-title">スコアカード</h2>${scorecard(holes, stats)}</section>` : ''}
    ${round.note ? html`<section class="section"><h2 class="section-title">メモ</h2><p class="entry-body">${round.note}</p></section>` : ''}
    <div class="form-foot">
      <a class="btn btn-primary btn-block" href="#/golf?tab=analysis">スコアを分析</a>
      <div class="quiet-actions">
        ${round.entryId ? html`<a class="text-btn" href="#/entries/${round.entryId}">ノートの記録を見る</a>` : ''}
        <a class="text-btn" href="#/golf/rounds/${round.id}?${round.mode === 'hole' ? 'hole=1' : 'edit=1'}">スコアを修正</a>
      </div>
    </div>`);
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
