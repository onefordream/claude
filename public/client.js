document.addEventListener('DOMContentLoaded', () => {
  setupAiSuggestButton();
  setupRoundAiButton();
  setupScoreChartTooltip();
  setupUploadGuard();
  setupRecordSheet();
  setupRoundStartForm();
  setupHoleEntryForm();
});

// The bottom-nav "+" button opens a small sheet to pick which kind of
// record to create (lesson / practice / round), instead of each record
// type needing its own nav entry.
function setupRecordSheet() {
  const fab = document.getElementById('record-fab');
  const overlay = document.getElementById('record-sheet-overlay');
  const cancelBtn = document.getElementById('record-sheet-cancel');
  if (!fab || !overlay) return;

  fab.addEventListener('click', () => {
    overlay.hidden = false;
  });
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      overlay.hidden = true;
    });
  }
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.hidden = true;
  });
}

function setupAiSuggestButton() {
  const btn = document.getElementById('ask-ai-btn');
  if (!btn) return;
  const resultBox = document.getElementById('ai-result');

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = '考え中...';
    resultBox.hidden = false;
    resultBox.textContent = 'AIコーチが練習履歴を確認しています…';

    try {
      const res = await fetch('/ai/suggest', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        resultBox.textContent = data.suggestion;
      } else {
        resultBox.textContent = data.message || 'AI機能が利用できませんでした。';
      }
    } catch (err) {
      resultBox.textContent = '通信エラーが発生しました。もう一度お試しください。';
    } finally {
      btn.disabled = false;
      btn.textContent = '今日の練習メニューを聞く';
    }
  });
}

// The round-analysis AI coach button (used on both the student's /analysis
// page and the coach's student-detail page) returns structured JSON instead
// of a plain suggestion string, so it gets its own renderer.
function setupRoundAiButton() {
  const btn = document.getElementById('ask-round-ai-btn');
  if (!btn) return;
  const resultBox = document.getElementById('round-ai-result');
  const endpoint = btn.getAttribute('data-endpoint');

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = '分析中...';
    resultBox.hidden = false;
    resultBox.innerHTML = '<p class="muted">AIコーチが数字を確認しています…</p>';

    try {
      const res = await fetch(endpoint, { method: 'POST' });
      const data = await res.json();
      if (!data.ok) {
        resultBox.innerHTML = `<p class="muted">${escapeHtmlClient(data.message || 'AI機能が利用できませんでした。')}</p>`;
        return;
      }
      resultBox.innerHTML = renderRoundAiAnalysis(data.analysis);
    } catch (err) {
      resultBox.innerHTML = '<p class="muted">通信エラーが発生しました。もう一度お試しください。</p>';
    } finally {
      btn.disabled = false;
      btn.textContent = '分析してもらう';
    }
  });
}

function escapeHtmlClient(value) {
  const div = document.createElement('div');
  div.textContent = value == null ? '' : String(value);
  return div.innerHTML;
}

function renderRoundAiAnalysis(a) {
  const list = (items) => (items && items.length ? `<ul>${items.map((i) => `<li>${escapeHtmlClient(i)}</li>`).join('')}</ul>` : '');
  const priorities = (a.priorities || [])
    .map(
      (p) => `
      <div class="ai-priority-item">
        <div class="ai-priority-head">${escapeHtmlClient(p.area)}<span class="ai-priority-gain">約${escapeHtmlClient(p.expected_gain)}打</span></div>
        <p class="muted">${escapeHtmlClient(p.why)}</p>
        <p>${escapeHtmlClient(p.drill)}</p>
      </div>`
    )
    .join('');

  return `
    <p>${escapeHtmlClient(a.summary)}</p>
    ${a.strengths && a.strengths.length ? `<p class="ai-section-label">強み</p>${list(a.strengths)}` : ''}
    ${a.weaknesses && a.weaknesses.length ? `<p class="ai-section-label">弱点</p>${list(a.weaknesses)}` : ''}
    ${priorities ? `<p class="ai-section-label">優先して取り組むこと</p>${priorities}` : ''}
    ${a.next_round_plan && a.next_round_plan.length ? `<p class="ai-section-label">次のラウンドで意識すること</p>${list(a.next_round_plan)}` : ''}
  `;
}

// Round start screen: tapping a par cell cycles 3 -> 4 -> 5 -> 3, the 9H/18H
// radio shows/hides the back-nine cells, and picking a known course name
// (embedded as JSON by the server) prefills holes + pars.
function setupRoundStartForm() {
  const grid = document.getElementById('par-cell-grid');
  if (!grid) return;

  grid.querySelectorAll('.par-cell').forEach((cell) => {
    cell.addEventListener('click', () => {
      const hole = cell.getAttribute('data-hole');
      const next = { 3: 4, 4: 5, 5: 3 }[cell.getAttribute('data-par')];
      cell.setAttribute('data-par', next);
      cell.querySelector('.par-cell-value').textContent = next;
      const hidden = document.getElementById(`par-hidden-${hole}`);
      if (hidden) hidden.value = next;
    });
  });

  function applyHoles(holes) {
    grid.querySelectorAll('.par-cell').forEach((cell) => {
      const hole = Number(cell.getAttribute('data-hole'));
      cell.style.display = hole <= holes ? '' : 'none';
    });
  }

  const holesGroup = document.getElementById('holes-group');
  if (holesGroup) {
    holesGroup.querySelectorAll('input[name="holes"]').forEach((radio) => {
      radio.addEventListener('change', () => applyHoles(Number(radio.value)));
      if (radio.checked) applyHoles(Number(radio.value));
    });
  }

  const courseInput = document.getElementById('course-name-input');
  const dataEl = document.getElementById('course-par-data');
  if (courseInput && dataEl) {
    let courseMap = {};
    try {
      courseMap = JSON.parse(dataEl.textContent);
    } catch {
      courseMap = {};
    }
    courseInput.addEventListener('change', () => {
      const course = courseMap[courseInput.value];
      if (!course) return;
      const holesRadio = document.querySelector(`input[name="holes"][value="${course.holes}"]`);
      if (holesRadio) {
        holesRadio.checked = true;
        applyHoles(course.holes);
      }
      course.pars.forEach((p, i) => {
        const cell = grid.querySelector(`.par-cell[data-hole="${i + 1}"]`);
        const hidden = document.getElementById(`par-hidden-${i + 1}`);
        if (cell) {
          cell.setAttribute('data-par', p);
          cell.querySelector('.par-cell-value').textContent = p;
        }
        if (hidden) hidden.value = p;
      });
    });
  }
}

// Hole-by-hole entry screen: every control here only updates the hidden
// inputs + on-screen display client-side. Nothing is saved to the server
// Everything on the hole screen stays on one page: the scorecard strip
// (every hole entered so far, always visible) and the current hole's input
// panel are both re-rendered from in-memory state as the student moves
// between holes. Only navigation (prev/next/strip tap/finish) triggers a
// background save — the page itself never reloads and the URL never
// changes, so the student can glance back at any earlier hole's score at
// any time instead of having it scroll out of view behind a page change.
const RESULT_LABELS_BY_DIFF = {
  '-3': 'アルバトロス',
  '-2': 'イーグル',
  '-1': 'バーディ',
  0: 'パー',
  1: 'ボギー',
  2: 'ダブルボギー',
};

function resultLabelFor(strokes, par) {
  if (strokes === 1) return 'ホールインワン';
  const diff = strokes - par;
  if (diff <= -3) return RESULT_LABELS_BY_DIFF['-3'];
  if (diff >= 3) return 'トリプル以上';
  return RESULT_LABELS_BY_DIFF[diff];
}

function setupHoleEntryForm() {
  const dataEl = document.getElementById('hole-entry-data');
  const stripEl = document.getElementById('scorecard-strip');
  const totalsEl = document.getElementById('hole-totals');
  const panelEl = document.getElementById('hole-panel');
  const navEl = document.getElementById('hole-nav-row');
  const statusEl = document.getElementById('hole-save-status');
  if (!dataEl || !stripEl || !panelEl) return;

  const info = JSON.parse(dataEl.textContent);
  const holes = info.holeSummaries; // index i = hole (i+1), server data as last saved
  const firstUnanswered = holes.findIndex((h) => h.strokes == null);
  let currentHole = firstUnanswered === -1 ? holes.length : firstUnanswered + 1;
  let draft = draftFor(holes[currentHole - 1]);

  function draftFor(h) {
    return {
      par: h.par,
      strokes: h.strokes ?? h.par,
      putts: h.putts ?? 2,
      tee_shot: h.tee_shot || '',
      ob_count: h.ob_count || 0,
      penalty_count: h.penalty_count || 0,
      bunker: h.bunker || 0,
    };
  }

  function renderStrip() {
    const sections = info.holes > 9 ? [[1, 9], [10, info.holes]] : [[1, info.holes]];
    stripEl.innerHTML = sections
      .map(([start, end]) => {
        const cells = [];
        for (let n = start; n <= end; n++) {
          const h = holes[n - 1];
          const filled = h.strokes != null;
          const cls = ['sc-strip-cell'];
          if (n === currentHole) cls.push('active');
          if (filled) cls.push(filled && h.strokes - h.par <= -1 ? 'sc-ok' : filled && h.strokes - h.par >= 2 ? 'sc-miss' : 'filled');
          cells.push(
            `<button type="button" class="${cls.join(' ')}" data-hole="${n}">
              <span class="sc-strip-no">${n}</span>
              <span class="sc-strip-score">${filled ? h.strokes : '-'}</span>
            </button>`
          );
        }
        return `<div class="sc-strip-row">${cells.join('')}</div>`;
      })
      .join('');
    stripEl.querySelectorAll('[data-hole]').forEach((btn) => {
      btn.addEventListener('click', () => goToHole(Number(btn.getAttribute('data-hole'))));
    });
  }

  function renderTotals() {
    const played = holes.filter((h) => h.strokes != null);
    const totalScore = played.reduce((s, h) => s + h.strokes, 0);
    const toPar = played.reduce((s, h) => s + (h.strokes - h.par), 0);
    const totalPutts = played.filter((h) => h.putts != null).reduce((s, h) => s + h.putts, 0);
    totalsEl.innerHTML = `
      <span>${played.length}/${info.holes}H</span>
      <span>合計 ${totalScore}</span>
      <span>パー比 ${toPar >= 0 ? '+' + toPar : toPar}</span>
      <span>パット ${totalPutts}</span>
    `;
  }

  function renderPanel() {
    const showTeeShot = draft.par === 4 || draft.par === 5;
    panelEl.innerHTML = `
      <div class="hole-card-head">
        <span class="hole-card-title">ホール ${currentHole}</span>
        <button type="button" class="par-chip" id="par-chip">パー<span id="par-display">${draft.par}</span></button>
      </div>
      <div class="stroke-block">
        <button type="button" class="stepper-btn" id="strokes-minus" aria-label="打数を減らす">−</button>
        <div class="stroke-display">
          <span class="stroke-num" id="strokes-display">${draft.strokes}</span>
          <span class="stroke-result" id="result-label">${resultLabelFor(draft.strokes, draft.par)}</span>
        </div>
        <button type="button" class="stepper-btn" id="strokes-plus" aria-label="打数を増やす">+</button>
      </div>
      <div class="quick-score-row">
        <button type="button" class="quick-score-btn" data-offset="-1">バーディ</button>
        <button type="button" class="quick-score-btn" data-offset="0">パー</button>
        <button type="button" class="quick-score-btn" data-offset="1">ボギー</button>
        <button type="button" class="quick-score-btn" data-offset="2">ダボ</button>
        <button type="button" class="quick-score-btn" data-offset="3">トリプル</button>
      </div>
      <p class="field-label">パット数</p>
      <div class="chip-row" id="putts-row">
        ${[0, 1, 2, 3, 4].map((n) => `<button type="button" class="chip-btn ${n === draft.putts ? 'active' : ''}" data-putts="${n}">${n}</button>`).join('')}
      </div>
      ${
        showTeeShot
          ? `
      <p class="field-label">ティーショット</p>
      <div class="chip-row" id="tee-shot-row">
        <button type="button" class="chip-btn ${draft.tee_shot === 'left' ? 'active' : ''}" data-tee="left">左</button>
        <button type="button" class="chip-btn ${draft.tee_shot === 'fw' ? 'active' : ''}" data-tee="fw">FW</button>
        <button type="button" class="chip-btn ${draft.tee_shot === 'right' ? 'active' : ''}" data-tee="right">右</button>
      </div>`
          : ''
      }
      <div class="form-row hole-extra-row">
        <div class="stepper-field">
          <span class="field-label">OB</span>
          <div class="stepper-mini">
            <button type="button" class="stepper-btn-sm" id="ob-minus">−</button>
            <span id="ob-display">${draft.ob_count}</span>
            <button type="button" class="stepper-btn-sm" id="ob-plus">+</button>
          </div>
        </div>
        <div class="stepper-field">
          <span class="field-label">ペナルティ</span>
          <div class="stepper-mini">
            <button type="button" class="stepper-btn-sm" id="penalty-minus">−</button>
            <span id="penalty-display">${draft.penalty_count}</span>
            <button type="button" class="stepper-btn-sm" id="penalty-plus">+</button>
          </div>
        </div>
        <div class="stepper-field">
          <span class="field-label">バンカー</span>
          <button type="button" class="toggle-btn ${draft.bunker ? 'active' : ''}" id="bunker-toggle">${draft.bunker ? 'あり' : 'なし'}</button>
        </div>
      </div>
    `;

    const strokesDisplay = panelEl.querySelector('#strokes-display');
    const resultLabel = panelEl.querySelector('#result-label');
    const setStrokes = (value) => {
      draft.strokes = Math.max(1, Math.min(15, value));
      strokesDisplay.textContent = draft.strokes;
      resultLabel.textContent = resultLabelFor(draft.strokes, draft.par);
      if (draft.putts > draft.strokes) setPutts(draft.strokes);
    };
    const setPutts = (value) => {
      draft.putts = Math.max(0, Math.min(draft.strokes, value));
      panelEl.querySelectorAll('#putts-row .chip-btn').forEach((btn) => {
        btn.classList.toggle('active', Number(btn.getAttribute('data-putts')) === draft.putts);
      });
    };

    panelEl.querySelector('#strokes-minus').addEventListener('click', () => setStrokes(draft.strokes - 1));
    panelEl.querySelector('#strokes-plus').addEventListener('click', () => setStrokes(draft.strokes + 1));
    panelEl.querySelectorAll('.quick-score-btn').forEach((btn) => {
      btn.addEventListener('click', () => setStrokes(draft.par + Number(btn.getAttribute('data-offset'))));
    });
    panelEl.querySelectorAll('#putts-row .chip-btn').forEach((btn) => {
      btn.addEventListener('click', () => setPutts(Number(btn.getAttribute('data-putts'))));
    });

    const teeRow = panelEl.querySelector('#tee-shot-row');
    if (teeRow) {
      teeRow.querySelectorAll('.chip-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const value = btn.getAttribute('data-tee');
          draft.tee_shot = draft.tee_shot === value ? '' : value;
          teeRow.querySelectorAll('.chip-btn').forEach((b) => b.classList.toggle('active', draft.tee_shot === b.getAttribute('data-tee')));
        });
      });
    }

    function miniStepper(key, displayId, minusId, plusId, max) {
      const display = panelEl.querySelector(displayId);
      const set = (v) => {
        draft[key] = Math.max(0, Math.min(max, v));
        display.textContent = draft[key];
      };
      panelEl.querySelector(minusId).addEventListener('click', () => set(draft[key] - 1));
      panelEl.querySelector(plusId).addEventListener('click', () => set(draft[key] + 1));
    }
    miniStepper('ob_count', '#ob-display', '#ob-minus', '#ob-plus', 9);
    miniStepper('penalty_count', '#penalty-display', '#penalty-minus', '#penalty-plus', 9);

    panelEl.querySelector('#bunker-toggle').addEventListener('click', (e) => {
      draft.bunker = draft.bunker ? 0 : 1;
      e.target.classList.toggle('active', Boolean(draft.bunker));
      e.target.textContent = draft.bunker ? 'あり' : 'なし';
    });

    panelEl.querySelector('#par-chip').addEventListener('click', () => {
      draft.par = { 3: 4, 4: 5, 5: 3 }[draft.par];
      panelEl.querySelector('#par-display').textContent = draft.par;
      resultLabel.textContent = resultLabelFor(draft.strokes, draft.par);
      renderPanel(); // par change may show/hide the tee-shot row
    });
  }

  function renderNav() {
    const isLast = currentHole === info.holes;
    navEl.innerHTML = `
      ${currentHole > 1 ? '<button type="button" class="btn btn-secondary" id="hole-prev-btn">前へ</button>' : '<span></span>'}
      ${
        isLast
          ? '<button type="button" class="btn btn-primary" id="hole-finish-btn">ラウンドを終える</button>'
          : '<button type="button" class="btn btn-primary" id="hole-next-btn">次のホールへ</button>'
      }
    `;
    const prevBtn = navEl.querySelector('#hole-prev-btn');
    if (prevBtn) prevBtn.addEventListener('click', () => goToHole(currentHole - 1));
    const nextBtn = navEl.querySelector('#hole-next-btn');
    if (nextBtn) nextBtn.addEventListener('click', () => goToHole(currentHole + 1));
    const finishBtn = navEl.querySelector('#hole-finish-btn');
    if (finishBtn) finishBtn.addEventListener('click', finishRound);
  }

  function renderCurrentHole() {
    renderStrip();
    renderTotals();
    renderPanel();
    renderNav();
  }

  async function saveCurrentHole() {
    if (statusEl) statusEl.textContent = '保存中...';
    const body = new URLSearchParams({
      current_hole: String(currentHole),
      par: String(draft.par),
      strokes: String(draft.strokes),
      putts: String(draft.putts),
      tee_shot: draft.tee_shot,
      ob_count: String(draft.ob_count),
      penalty_count: String(draft.penalty_count),
      bunker: String(draft.bunker),
    });
    try {
      const res = await fetch(`/rounds/${info.roundId}/holes/save`, { method: 'POST', body });
      const data = await res.json();
      if (data.ok) {
        holes[currentHole - 1] = { hole_no: currentHole, ...draft };
        if (statusEl) statusEl.textContent = '';
      } else {
        if (statusEl) statusEl.textContent = '保存に失敗しました。もう一度お試しください。';
      }
    } catch {
      if (statusEl) statusEl.textContent = '通信エラーのため保存できませんでした。もう一度お試しください。';
    }
  }

  async function goToHole(n) {
    await saveCurrentHole();
    currentHole = Math.max(1, Math.min(info.holes, n));
    draft = draftFor(holes[currentHole - 1]);
    renderCurrentHole();
  }

  async function finishRound() {
    const finishBtn = navEl.querySelector('#hole-finish-btn');
    if (finishBtn) {
      finishBtn.disabled = true;
      finishBtn.textContent = '保存中...';
    }
    // The finish endpoint saves the current hole's fields itself, so there's
    // no need for a separate save call here.
    const body = new URLSearchParams({
      current_hole: String(currentHole),
      par: String(draft.par),
      strokes: String(draft.strokes),
      putts: String(draft.putts),
      tee_shot: draft.tee_shot,
      ob_count: String(draft.ob_count),
      penalty_count: String(draft.penalty_count),
      bunker: String(draft.bunker),
    });
    await fetch(`/rounds/${info.roundId}/finish`, { method: 'POST', body });
    window.location.href = `/rounds/${info.roundId}`;
  }

  renderCurrentHole();
}

function setupScoreChartTooltip() {
  const tooltip = document.getElementById('chart-tooltip');
  const points = document.querySelectorAll('.chart-point');
  if (!tooltip || !points.length) return;

  points.forEach((pt) => {
    pt.addEventListener('mouseenter', (e) => showTooltip(e, pt));
    pt.addEventListener('mousemove', (e) => showTooltip(e, pt));
    pt.addEventListener('mouseleave', () => {
      tooltip.hidden = true;
    });
  });

  function showTooltip(e, pt) {
    const date = pt.getAttribute('data-date');
    const score = pt.getAttribute('data-score');
    const course = pt.getAttribute('data-course');
    tooltip.textContent = `${date} ${course} スコア ${score}`;
    tooltip.style.left = `${e.clientX}px`;
    tooltip.style.top = `${e.clientY}px`;
    tooltip.hidden = false;
  }
}

// Warn before submitting an oversized video so the form doesn't just hang
// on a slow connection with no feedback.
function setupUploadGuard() {
  const input = document.querySelector('input[type="file"][name="videos"]');
  const form = input ? input.closest('form') : null;
  if (!input || !form) return;

  const MAX_BYTES = 60 * 1024 * 1024; // keep in sync with server.js MAX_VIDEO_BYTES

  form.addEventListener('submit', (e) => {
    const oversized = Array.from(input.files || []).filter((f) => f.size > MAX_BYTES);
    if (oversized.length) {
      e.preventDefault();
      alert(
        `動画ファイルが大きすぎます(上限60MB): ${oversized.map((f) => f.name).join(', ')}\n` +
          'スマホの設定で解像度を下げるか、短く撮影してからお試しください。'
      );
      return;
    }
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn && input.files && input.files.length) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'アップロード中...(動画がある場合は時間がかかります)';
    }
  });
}
