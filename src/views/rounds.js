import { layout, escapeHtml, nl2br, icon } from './layout.js';
import { renderAbilityRadar, renderRoundTrendChart } from './chart.js';
import { jstToday } from '../lib/date.js';
import { DEFAULT_PARS_18, SCORE_BAND_LABELS, BENCHMARKS, scoreBandForAverage, targetBandFor } from '../lib/golfStats.js';

function fmtDate(d) {
  return d || '';
}

// Shared by the hole-entry, total-entry, and detail pages: lets the student
// delete their own round (in-progress or complete) with a confirmation
// dialog, since this can't be undone.
function deleteRoundForm(roundId, { className = 'link-button link-button-danger' } = {}) {
  return `
    <form method="post" action="/rounds/${roundId}/delete" class="inline-form"
      onsubmit="return confirm('この記録を削除します。入力した内容は元に戻せません。本当に削除しますか？');">
      <button type="submit" class="${className}">このラウンドを削除する</button>
    </form>`;
}

function parCells(pars, holes, { editable = false } = {}) {
  return pars
    .slice(0, holes)
    .map(
      (p, i) => `
      <button type="button" class="par-cell" data-hole="${i + 1}" data-par="${p}" ${editable ? '' : 'disabled'}>
        <span class="par-cell-hole">${i + 1}</span>
        <span class="par-cell-value">${p}</span>
      </button>`
    )
    .join('');
}

// ---------- start screen ----------

export function newRoundStartPage({ user, flash, courses, values = {} }) {
  const today = jstToday();
  const holes = Number(values.holes || 18);
  const pars = values.pars || DEFAULT_PARS_18;
  const entryMode = values.entry_mode || 'hole';

  const courseOptions = courses.map((c) => `<option value="${escapeHtml(c.name)}">`).join('');
  const courseMap = Object.fromEntries(courses.map((c) => [c.name, { holes: c.holes, pars: JSON.parse(c.pars) }]));

  return layout({
    title: 'ラウンドを記録',
    user,
    active: 'rounds',
    flash,
    body: `
      <div class="page-header">
        <h1>ラウンドを記録</h1>
        <a href="/rounds" class="back-link">${icon('chevronLeft', { size: 14 })}<span>ラウンド一覧に戻る</span></a>
      </div>

      <form method="post" action="/rounds" class="form" id="round-start-form">
        <div class="form-row">
          <label>コース名
            <input type="text" name="course_name" list="course-list" required value="${escapeHtml(values.course_name || '')}" id="course-name-input">
            <datalist id="course-list">${courseOptions}</datalist>
          </label>
          <label>プレー日
            <input type="date" name="play_date" required max="${today}" value="${escapeHtml(values.play_date || today)}">
          </label>
        </div>

        <div class="card-subsection">
          <p class="field-label">ホール数</p>
          <div class="radio-pill-group" id="holes-group">
            <label class="radio-pill"><input type="radio" name="holes" value="18" ${holes === 18 ? 'checked' : ''}> 18H</label>
            <label class="radio-pill"><input type="radio" name="holes" value="9" ${holes === 9 ? 'checked' : ''}> 9H</label>
          </div>
        </div>

        <div class="card-subsection">
          <p class="field-label">入力方法</p>
          <div class="radio-pill-group" id="entry-mode-group">
            <label class="radio-pill"><input type="radio" name="entry_mode" value="hole" ${entryMode === 'hole' ? 'checked' : ''}> ホールごと(おすすめ)</label>
            <label class="radio-pill"><input type="radio" name="entry_mode" value="total" ${entryMode === 'total' ? 'checked' : ''}> 合計だけ</label>
          </div>
        </div>

        <details class="card-subsection">
          <summary class="field-label">各ホールのパー(タップで変更)</summary>
          <div class="par-cell-grid" id="par-cell-grid" data-holes="${holes}">${parCells(pars, 18, { editable: true })}</div>
          <div id="par-hidden-inputs">
            ${pars.map((p, i) => `<input type="hidden" name="par_${i + 1}" value="${p}" id="par-hidden-${i + 1}">`).join('')}
          </div>
        </details>

        <button type="submit" class="btn btn-primary">次へ</button>
      </form>
      <script id="course-par-data" type="application/json">${JSON.stringify(courseMap)}</script>
    `,
  });
}

// ---------- hole-by-hole entry ----------

// Single page for the whole round: the scorecard strip (always showing every
// hole already entered) and the current-hole input panel are both built and
// kept in sync by client.js from the embedded JSON below — navigating
// between holes never reloads the page or changes the URL, and every
// previous score stays visible the whole time. See
// setupHoleEntryForm/renderHolePanel/renderScorecardStrip in public/client.js.
export function holeEntryPage({ user, flash, round, holeSummaries }) {
  const dataJson = JSON.stringify({ roundId: round.id, holes: round.holes, holeSummaries });

  return layout({
    title: `${round.course_name} 入力中`,
    user,
    active: 'rounds',
    flash,
    body: `
      <div class="page-header">
        <h1>${escapeHtml(round.course_name)}</h1>
        <span class="muted">${escapeHtml(fmtDate(round.play_date))}</span>
      </div>

      <div class="scorecard-strip" id="scorecard-strip"></div>
      <div class="hole-totals" id="hole-totals"></div>
      <div class="card hole-card" id="hole-panel"></div>
      <div class="hole-nav-row" id="hole-nav-row"></div>
      <p class="muted hole-save-status" id="hole-save-status"></p>

      <div class="round-delete-row">${deleteRoundForm(round.id)}</div>

      <script id="hole-entry-data" type="application/json">${dataJson}</script>
    `,
  });
}

// ---------- total-only entry ----------

export function totalEntryPage({ user, flash, round, values = {} }) {
  const v = (key, fallback = '') => escapeHtml(values[key] ?? round[key] ?? fallback ?? '');
  return layout({
    title: 'ラウンド結果を入力',
    user,
    active: 'rounds',
    flash,
    body: `
      <div class="page-header">
        <h1>${escapeHtml(round.course_name)}の結果</h1>
        <a href="/rounds" class="back-link">${icon('chevronLeft', { size: 14 })}<span>ラウンド一覧に戻る</span></a>
      </div>
      <p class="muted">分かる範囲だけで大丈夫です。空欄の項目は分析に使われません。</p>

      <form method="post" action="/rounds/${round.id}/total" class="form">
        <div class="form-row">
          <label>スコア(必須)
            <input type="number" name="total_score" min="${round.holes}" max="200" required value="${v('total_score')}">
          </label>
          <label>パット数
            <input type="number" name="putts_total" min="0" max="99" value="${v('putts_total')}">
          </label>
        </div>
        <div class="form-row">
          <label>FWキープ数
            <input type="number" name="fw_keep_count" min="0" value="${v('fw_keep_count')}">
          </label>
          <label>パーオン数
            <input type="number" name="gir_count" min="0" max="${round.holes}" value="${v('gir_count')}">
          </label>
        </div>
        <div class="form-row">
          <label>3パット数
            <input type="number" name="three_putt_count" min="0" value="${v('three_putt_count')}">
          </label>
          <label>OB
            <input type="number" name="ob_total" min="0" value="${v('ob_total')}">
          </label>
        </div>
        <div class="form-row">
          <label>ペナルティ(OB以外)
            <input type="number" name="penalty_total" min="0" value="${v('penalty_total')}">
          </label>
          <label>ドライバー平均飛距離(任意・ヤード)
            <input type="number" name="driver_avg_yards" min="0" max="400" value="${v('driver_avg_yards')}">
          </label>
        </div>
        <div class="form-row">
          <label>バンカーに入ったホール数
            <input type="number" name="bunker_count" min="0" value="${v('bunker_count')}">
          </label>
          <label>そのうちパー以内だった数
            <input type="number" name="bunker_save_count" min="0" value="${v('bunker_save_count')}">
          </label>
        </div>
        <label>メモ(任意)
          <textarea name="notes" rows="3">${v('notes')}</textarea>
        </label>
        <label>写真(任意・スコアカードなど)
          <input type="file" name="photo" accept="image/*">
        </label>
        <button type="submit" class="btn btn-primary">記録する</button>
      </form>

      <div class="round-delete-row">${deleteRoundForm(round.id)}</div>
    `,
  });
}

// ---------- scorecard table (hole-mode rounds only) ----------

function scoreClass(strokes, par) {
  const diff = strokes - par;
  if (diff <= -2) return 'score-eagle';
  if (diff === -1) return 'score-birdie';
  if (diff === 0) return 'score-par';
  if (diff === 1) return 'score-bogey';
  return 'score-double';
}

export function renderScorecardTable(round, holes) {
  if (round.entry_mode !== 'hole' || !holes.length) return '';
  const out = holes.filter((h) => h.hole_no <= 9);
  const back = holes.filter((h) => h.hole_no > 9);
  const sections = round.holes > 9 ? [out, back] : [out];
  const sumPar = (list) => list.reduce((s, h) => s + h.par, 0);
  const sumScore = (list) => (list.every((h) => h.strokes != null) ? list.reduce((s, h) => s + h.strokes, 0) : null);
  const sumPutts = (list) => (list.every((h) => h.putts != null) ? list.reduce((s, h) => s + h.putts, 0) : null);

  const holeHeader = (list, label) =>
    `${list.map((h) => `<th>${h.hole_no}</th>`).join('')}<th class="sc-sub">${label}</th>`;
  const parRow = (list) => `${list.map((h) => `<td>${h.par}</td>`).join('')}<td class="sc-sub">${sumPar(list)}</td>`;
  const scoreRow = (list) =>
    `${list
      .map((h) =>
        h.strokes != null
          ? `<td class="sc-score"><span class="sc-score-badge ${scoreClass(h.strokes, h.par)}">${h.strokes}</span></td>`
          : `<td class="sc-score sc-empty">-</td>`
      )
      .join('')}<td class="sc-sub">${sumScore(list) ?? '-'}</td>`;
  const puttsRow = (list) => `${list.map((h) => `<td>${h.putts ?? '-'}</td>`).join('')}<td class="sc-sub">${sumPutts(list) ?? '-'}</td>`;
  const teeRow = (list) =>
    `${list
      .map((h) => {
        if (!(h.par === 4 || h.par === 5)) return '<td class="muted">-</td>';
        const label = h.tee_shot === 'fw' ? 'FW' : h.tee_shot === 'left' ? '左' : h.tee_shot === 'right' ? '右' : '-';
        const cls = h.tee_shot === 'fw' ? 'sc-ok' : h.tee_shot ? 'sc-miss' : '';
        return `<td class="${cls}">${label}</td>`;
      })
      .join('')}<td></td>`;
  const girRow = (list) =>
    `${list
      .map((h) => {
        if (h.strokes == null || h.putts == null) return '<td class="muted">-</td>';
        const gir = h.strokes - h.putts <= h.par - 2;
        return `<td class="${gir ? 'sc-ok' : ''}">${gir ? '○' : '-'}</td>`;
      })
      .join('')}<td></td>`;
  const bunkerRow = (list) => `${list.map((h) => `<td>${h.bunker ? '●' : ''}</td>`).join('')}<td class="sc-sub">${list.filter((h) => h.bunker).length}</td>`;
  const obRow = (list) => `${list.map((h) => `<td>${h.ob_count || ''}</td>`).join('')}<td class="sc-sub">${list.reduce((s, h) => s + (h.ob_count || 0), 0)}</td>`;
  const penaltyRow = (list) => `${list.map((h) => `<td>${h.penalty_count || ''}</td>`).join('')}<td class="sc-sub">${list.reduce((s, h) => s + (h.penalty_count || 0), 0)}</td>`;

  const gross = sumScore(holes);

  return `
    <div class="scorecard-table-wrap">
      <table class="scorecard-table">
        <tbody>
          <tr class="sc-head-row"><th></th>${sections.map((s, i) => holeHeader(s, i === 0 ? 'OUT' : 'IN')).join('')}${sections.length > 1 ? '<th class="sc-sub">GROSS</th>' : ''}</tr>
          <tr><th>Par</th>${sections.map((s) => parRow(s)).join('')}${sections.length > 1 ? `<td class="sc-sub">${sumPar(holes)}</td>` : ''}</tr>
          <tr class="sc-score-row"><th>スコア</th>${sections.map((s) => scoreRow(s)).join('')}${sections.length > 1 ? `<td class="sc-sub">${gross ?? '-'}</td>` : ''}</tr>
          <tr><th>パット</th>${sections.map((s) => puttsRow(s)).join('')}${sections.length > 1 ? `<td class="sc-sub">${sumPutts(holes) ?? '-'}</td>` : ''}</tr>
          <tr><th>ティーショット</th>${sections.map((s) => teeRow(s)).join('')}${sections.length > 1 ? '<td></td>' : ''}</tr>
          <tr><th>パーオン</th>${sections.map((s) => girRow(s)).join('')}${sections.length > 1 ? '<td></td>' : ''}</tr>
          <tr><th>バンカー</th>${sections.map((s) => bunkerRow(s)).join('')}${sections.length > 1 ? `<td class="sc-sub">${holes.filter((h) => h.bunker).length}</td>` : ''}</tr>
          <tr><th>OB</th>${sections.map((s) => obRow(s)).join('')}${sections.length > 1 ? `<td class="sc-sub">${holes.reduce((s, h) => s + (h.ob_count || 0), 0)}</td>` : ''}</tr>
          <tr><th>ペナルティ</th>${sections.map((s) => penaltyRow(s)).join('')}${sections.length > 1 ? `<td class="sc-sub">${holes.reduce((s, h) => s + (h.penalty_count || 0), 0)}</td>` : ''}</tr>
        </tbody>
      </table>
    </div>
  `;
}

// ---------- round detail / finish summary ----------

export function roundDetailPage({ user, flash, round, holes, aggregate, comments, readOnly = false, backHref = '/rounds' }) {
  const bandLabel = round.holes && aggregate.totalScore !== null ? '' : '';
  const commentsHtml = comments.length
    ? comments
        .map(
          (c) => `
      <li class="comment-item">
        <div class="comment-author">${escapeHtml(c.author_name || '指導者')}</div>
        <div class="comment-body">${nl2br(c.body)}</div>
        <div class="comment-date">${escapeHtml(c.created_at.slice(0, 16).replace('T', ' '))}</div>
      </li>`
        )
        .join('')
    : `<li class="empty">まだコメントはありません。</li>`;

  const editLink =
    !readOnly && round.status === 'complete'
      ? `<a href="/rounds/${round.id}/edit" class="btn btn-secondary">スコアを修正</a>`
      : '';
  const deleteRow = !readOnly ? `<div class="round-delete-row">${deleteRoundForm(round.id)}</div>` : '';

  return layout({
    title: `${escapeHtml(round.course_name)}の記録`,
    user,
    active: 'rounds',
    flash,
    body: `
      <div class="page-header">
        <h1>${escapeHtml(round.course_name)}</h1>
        <a href="${backHref}" class="back-link">${icon('chevronLeft', { size: 14 })}<span>戻る</span></a>
      </div>
      <p class="muted">${escapeHtml(fmtDate(round.play_date))} / ${round.holes}H${bandLabel}</p>

      ${renderScorecardTable(round, holes)}

      <div class="stat-row">
        <div class="stat-card"><div class="stat-num">${aggregate.totalScore ?? '-'}</div><div class="stat-label">合計スコア</div></div>
        <div class="stat-card"><div class="stat-num">${aggregate.scoreToPar !== null ? (aggregate.scoreToPar >= 0 ? '+' + aggregate.scoreToPar : aggregate.scoreToPar) : '-'}</div><div class="stat-label">パー比</div></div>
        <div class="stat-card"><div class="stat-num">${aggregate.puttsTotal ?? '-'}</div><div class="stat-label">パット数</div></div>
      </div>

      ${
        aggregate.resultBreakdown
          ? `
      <div class="card">
        <h2>内訳</h2>
        <div class="breakdown-row">
          <span>イーグル以上 ${aggregate.resultBreakdown.eagleOrBetter}</span>
          <span>バーディ ${aggregate.resultBreakdown.birdie}</span>
          <span>パー ${aggregate.resultBreakdown.par}</span>
          <span>ボギー ${aggregate.resultBreakdown.bogey}</span>
          <span>ダボ ${aggregate.resultBreakdown.doubleBogey}</span>
          <span>トリプル以上 ${aggregate.resultBreakdown.tripleOrWorse}</span>
        </div>
        ${aggregate.outTotal !== null ? `<p class="muted">OUT ${aggregate.outTotal} / IN ${aggregate.inTotal}</p>` : ''}
      </div>`
          : ''
      }

      <div class="card">
        <h2>各種スタッツ</h2>
        <div class="stats-table">
          <div><span>FWキープ率</span><span>${aggregate.fwKeepPct ?? 'データなし'}${aggregate.fwKeepPct !== null ? '%' : ''}</span></div>
          <div><span>パーオン率</span><span>${aggregate.girPct ?? 'データなし'}${aggregate.girPct !== null ? '%' : ''}</span></div>
          <div><span>寄せワン率</span><span>${aggregate.upAndDownPct ?? 'データなし'}${aggregate.upAndDownPct !== null ? '%' : ''}</span></div>
          <div><span>サンドセーブ率</span><span>${aggregate.sandSavePct ?? 'データなし'}${aggregate.sandSavePct !== null ? '%' : ''}</span></div>
          <div><span>OB</span><span>${aggregate.obTotal ?? 'データなし'}</span></div>
          <div><span>ペナルティ</span><span>${aggregate.penaltyTotal ?? 'データなし'}</span></div>
        </div>
      </div>

      ${round.notes ? `<div class="card"><h2>メモ</h2><p>${nl2br(round.notes)}</p></div>` : ''}
      ${round.photo_filename ? `<div class="card"><h2>写真</h2><img src="/media/${escapeHtml(round.photo_filename)}" class="round-photo" alt="ラウンド写真"></div>` : ''}

      <div class="card">
        <h2>コーチからのコメント</h2>
        <ul class="list comment-list">${commentsHtml}</ul>
        ${
          readOnly
            ? `
        <form method="post" action="/admin/students/${round.user_id}/rounds/${round.id}/comments" class="form">
          <textarea name="body" rows="3" placeholder="練習課題やアドバイスを残しましょう" required></textarea>
          <button type="submit" class="btn btn-primary">コメントする</button>
        </form>`
            : ''
        }
      </div>

      ${editLink}
      ${deleteRow}
    `,
  });
}

// ---------- round list / overview ----------

export function roundsPage({ user, flash, rounds, combined }) {
  const rows = rounds.length
    ? rounds
        .map((r) => {
          const label = r.status === 'in_progress' ? '<span class="badge badge-warn">入力中</span>' : '';
          // /rounds/:id itself redirects in-progress rounds to wherever entry
          // should resume (hole-by-hole or the total-entry form).
          const href = `/rounds/${r.id}`;
          return `
      <li class="list-item round-item">
        <a href="${href}">
          <span class="list-date">${fmtDate(r.play_date)}</span>
          <span class="list-title">${escapeHtml(r.course_name)}${r.total_score ? ' / スコア ' + r.total_score : ''}</span>
          ${label}
        </a>
      </li>`;
        })
        .join('')
    : `<li class="empty">まだラウンド記録がありません。</li>`;

  return layout({
    title: 'ラウンド記録',
    user,
    active: 'rounds',
    flash,
    body: `
      <div class="page-header">
        <h1>ラウンド記録</h1>
        <a href="/rounds/new" class="btn btn-primary">${icon('plus', { size: 16 })}新しいラウンド</a>
      </div>

      <div class="stat-row">
        <div class="stat-card"><div class="stat-num">${combined ? combined.avgScorePer18 : '-'}</div><div class="stat-label">平均スコア(18H換算)</div></div>
        <div class="stat-card"><div class="stat-num">${combined && combined.bestScore18 !== null ? combined.bestScore18 : '-'}</div><div class="stat-label">ベストスコア</div></div>
        <div class="stat-card"><div class="stat-num">${combined ? SCORE_BAND_LABELS[scoreBandForAverage(combined.avgScorePer18)] : '-'}</div><div class="stat-label">現在のスコア帯</div></div>
      </div>

      <div class="card">
        <a href="/analysis" class="analysis-link-card">
          ${icon('target', { size: 20 })}
          <div>
            <div class="analysis-link-title">成長分析を見る</div>
            <div class="muted">能力チャート・伸びしろ・AIコーチのアドバイス</div>
          </div>
          ${icon('chevronRight', { size: 18 })}
        </a>
      </div>

      <div class="card">
        <h2>ラウンド履歴</h2>
        <ul class="list">${rows}</ul>
      </div>
    `,
  });
}

// ---------- analysis page ----------

export function analysisPage({ user, flash, combined, abilityScores, growth, recentRounds, aiState }) {
  if (!combined) {
    return layout({
      title: '成長分析',
      user,
      active: 'rounds',
      flash,
      body: `
        <h1>成長分析</h1>
        <div class="card empty-state">
          <p class="empty-state-title">ラウンドを記録すると分析できます</p>
          <a href="/rounds/new" class="btn btn-primary">ラウンドを記録する</a>
        </div>
      `,
    });
  }

  const band = scoreBandForAverage(combined.avgScorePer18);
  const targetBand = targetBandFor(band);
  const targetVals = BENCHMARKS[targetBand];

  const compareRows = [
    ['パット数', combined.puttsPer18, targetVals.putts, false],
    ['FWキープ率', combined.fwKeepPct, targetVals.fwKeepPct, true],
    ['パーオン率', combined.girPct, targetVals.girPct, true],
    ['寄せワン率', combined.upAndDownPct, targetVals.upAndDownPct, true],
    ['サンドセーブ率', combined.sandSavePct, targetVals.sandSavePct, true],
    ['OB(18Hあたり)', combined.obPer18, targetVals.ob, false],
    ['ペナルティ(18Hあたり)', combined.penaltyPer18, targetVals.penalty, false],
    ['ダボ以上率', combined.doubleBogeyPlusPct, targetVals.doubleBogeyPlusPct, false],
  ]
    .map(([label, value, target, higherIsBetter]) => {
      if (value === null || value === undefined) return `<tr><td>${label}</td><td colspan="2" class="muted">データなし</td></tr>`;
      const reached = higherIsBetter ? value >= target : value <= target;
      return `<tr><td>${label}</td><td class="${reached ? 'stat-good' : 'stat-bad'}">${value}</td><td class="muted">目標 ${target}</td></tr>`;
    })
    .join('');

  const growthHtml = growth.items.length
    ? `
      <ul class="growth-list">
        ${growth.items
          .map(
            (g, i) => `
          <li class="growth-item">
            <div class="growth-item-head">
              <span class="growth-rank">${i + 1}</span>
              <span class="growth-label">${escapeHtml(g.label)}</span>
              <span class="growth-gain">約${g.gain}打</span>
            </div>
            ${i === 0 ? `<p class="growth-advice">${escapeHtml(g.advice)}</p>` : ''}
          </li>`
          )
          .join('')}
      </ul>
      <p class="muted growth-total">合計で約${growth.totalGain}打縮まる見込みです(項目どうしに重なりがあるため合計は目安です)。</p>
    `
    : `<p class="muted">目標の水準に届いている項目が多く、大きな伸びしろは見つかりませんでした。</p>`;

  const teeShotMiss = recentRounds
    .map((r) => r.aggregate.teeShotMiss)
    .filter(Boolean)
    .reduce((acc, m) => ({ left: acc.left + m.left, right: acc.right + m.right }), { left: 0, right: 0 });

  return layout({
    title: '成長分析',
    user,
    active: 'rounds',
    flash,
    body: `
      <h1>成長分析</h1>
      <div class="stat-row">
        <div class="stat-card"><div class="stat-num">${combined.avgScorePer18}</div><div class="stat-label">平均スコア(18H換算)</div></div>
        <div class="stat-card"><div class="stat-num">${combined.bestScore18 ?? '-'}</div><div class="stat-label">ベストスコア</div></div>
        <div class="stat-card"><div class="stat-num">${SCORE_BAND_LABELS[band]}</div><div class="stat-label">現在のスコア帯</div></div>
      </div>

      <div class="card">
        <h2>スコアの推移</h2>
        ${renderRoundTrendChart(recentRounds, targetVals === BENCHMARKS[targetBand] ? (targetBand === '70s' ? 79 : targetBand === '80s' ? 89 : 99) : null)}
      </div>

      ${
        abilityScores.length
          ? `
      <div class="card">
        <h2>能力チャート</h2>
        ${renderAbilityRadar(abilityScores)}
        <table class="ability-table">
          ${abilityScores.map((a) => `<tr><td>${escapeHtml(a.label)}</td><td>${a.score}点</td><td class="muted">${a.value}</td></tr>`).join('')}
        </table>
      </div>`
          : ''
      }

      <div class="card">
        <h2>伸びしろ(どこを直せば縮むか)</h2>
        ${growthHtml}
      </div>

      <div class="card">
        <h2>目標水準との比較</h2>
        <table class="compare-table">${compareRows}</table>
      </div>

      ${
        teeShotMiss.left + teeShotMiss.right > 0
          ? `<div class="card"><h2>ティーショットのミス方向</h2><p>左 ${teeShotMiss.left}回 / 右 ${teeShotMiss.right}回</p></div>`
          : ''
      }

      <div class="card ai-coach-card">
        <div class="ai-coach-head">
          <div class="ai-coach-avatar">${icon('chat', { size: 20 })}</div>
          <div>
            <h2>AIコーチの分析</h2>
            <p class="muted">今の数字をもとに、何を直せば縮むかを具体的に提案します</p>
          </div>
        </div>
        <button id="ask-round-ai-btn" class="btn btn-primary" data-endpoint="/ai/round-coach">分析してもらう</button>
        <div id="round-ai-result" class="ai-result" hidden></div>
      </div>
    `,
  });
}
