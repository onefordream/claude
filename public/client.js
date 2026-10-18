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
// until the form is submitted (via a nav button's formaction), matching
// "save whenever you move to another hole".
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
  const form = document.getElementById('hole-form');
  if (!form) return;

  const strokesInput = document.getElementById('strokes-input');
  const strokesDisplay = document.getElementById('strokes-display');
  const resultLabel = document.getElementById('result-label');
  const puttsInput = document.getElementById('putts-input');
  const parInput = document.getElementById('par-input');
  const parDisplay = document.getElementById('par-display');

  function currentPar() {
    return Number(parInput.value);
  }

  function setStrokes(value) {
    const strokes = Math.max(1, Math.min(15, value));
    strokesInput.value = strokes;
    strokesDisplay.textContent = strokes;
    resultLabel.textContent = resultLabelFor(strokes, currentPar());
    // Putts can never exceed strokes.
    if (Number(puttsInput.value) > strokes) setPutts(strokes);
  }

  function setPutts(value) {
    const putts = Math.max(0, Math.min(Number(strokesInput.value), value));
    puttsInput.value = putts;
    document.querySelectorAll('#putts-row .chip-btn').forEach((btn) => {
      btn.classList.toggle('active', Number(btn.getAttribute('data-putts')) === putts);
    });
  }

  const minus = document.getElementById('strokes-minus');
  const plus = document.getElementById('strokes-plus');
  if (minus) minus.addEventListener('click', () => setStrokes(Number(strokesInput.value) - 1));
  if (plus) plus.addEventListener('click', () => setStrokes(Number(strokesInput.value) + 1));

  document.querySelectorAll('.quick-score-btn').forEach((btn) => {
    btn.addEventListener('click', () => setStrokes(currentPar() + Number(btn.getAttribute('data-offset'))));
  });

  document.querySelectorAll('#putts-row .chip-btn').forEach((btn) => {
    btn.addEventListener('click', () => setPutts(Number(btn.getAttribute('data-putts'))));
  });

  const teeShotInput = document.getElementById('tee-shot-input');
  document.querySelectorAll('#tee-shot-row .chip-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const value = btn.getAttribute('data-tee');
      const isActive = teeShotInput.value === value;
      teeShotInput.value = isActive ? '' : value;
      document.querySelectorAll('#tee-shot-row .chip-btn').forEach((b) => b.classList.toggle('active', !isActive && b === btn));
    });
  });

  function miniStepper(inputId, displayId, minusId, plusId, max) {
    const input = document.getElementById(inputId);
    const display = document.getElementById(displayId);
    const set = (v) => {
      const clamped = Math.max(0, Math.min(max, v));
      input.value = clamped;
      display.textContent = clamped;
    };
    const minusBtn = document.getElementById(minusId);
    const plusBtn = document.getElementById(plusId);
    if (minusBtn) minusBtn.addEventListener('click', () => set(Number(input.value) - 1));
    if (plusBtn) plusBtn.addEventListener('click', () => set(Number(input.value) + 1));
  }
  miniStepper('ob-input', 'ob-display', 'ob-minus', 'ob-plus', 9);
  miniStepper('penalty-input', 'penalty-display', 'penalty-minus', 'penalty-plus', 9);

  const bunkerInput = document.getElementById('bunker-input');
  const bunkerToggle = document.getElementById('bunker-toggle');
  if (bunkerToggle) {
    bunkerToggle.addEventListener('click', () => {
      const active = bunkerInput.value !== '1';
      bunkerInput.value = active ? '1' : '0';
      bunkerToggle.classList.toggle('active', active);
      bunkerToggle.textContent = active ? 'あり' : 'なし';
    });
  }

  const parChip = document.getElementById('par-chip');
  if (parChip) {
    parChip.addEventListener('click', () => {
      const next = { 3: 4, 4: 5, 5: 3 }[currentPar()];
      parInput.value = next;
      parDisplay.textContent = next;
      resultLabel.textContent = resultLabelFor(Number(strokesInput.value), next);
    });
  }
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
