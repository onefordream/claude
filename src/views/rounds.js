import { layout, escapeHtml, nl2br, icon } from './layout.js';
import { renderAbilityRadar, renderRoundTrendChart } from './chart.js';
import { jstToday } from '../lib/date.js';
import { DEFAULT_PARS_18, RESULT_LABEL, SCORE_BAND_LABELS, BENCHMARKS, scoreBandForAverage, targetBandFor } from '../lib/golfStats.js';

function fmtDate(d) {
  return d || '';
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

export function holeEntryPage({ user, flash, round, hole, holeSummaries, totals }) {
  const holeNo = hole.hole_no;
  const isLast = holeNo === round.holes;
  const par = hole.par;
  const strokes = hole.strokes ?? par;
  const putts = hole.putts ?? 2;
  const teeShot = hole.tee_shot || '';
  const ob = hole.ob_count || 0;
  const penalty = hole.penalty_count || 0;
  const bunker = hole.bunker || 0;
  const showTeeShot = par === 4 || par === 5;

  const strip = holeSummaries
    .map(
      (h) => `
      <button type="submit" form="hole-form" formaction="/rounds/${round.id}/holes/${h.hole_no}"
        class="hole-strip-item ${h.hole_no === holeNo ? 'active' : ''} ${h.strokes != null ? 'filled' : ''}">
        <span class="hole-strip-no">${h.hole_no}</span>
        <span class="hole-strip-score">${h.strokes != null ? h.strokes : '-'}</span>
      </button>`
    )
    .join('');

  return layout({
    title: `ホール ${holeNo}`,
    user,
    active: 'rounds',
    flash,
    body: `
      <div class="hole-strip">${strip}</div>

      <div class="hole-totals">
        <span>${totals.holesIn}/${round.holes}H</span>
        <span>合計 ${totals.totalScore}</span>
        <span>パー比 ${totals.toPar >= 0 ? '+' + totals.toPar : totals.toPar}</span>
        <span>パット ${totals.totalPutts}</span>
      </div>

      <form method="post" action="/rounds/${round.id}/holes/${holeNo}" id="hole-form" class="hole-form">
        <input type="hidden" name="current_hole" value="${holeNo}">
        <input type="hidden" name="strokes" id="strokes-input" value="${strokes}">
        <input type="hidden" name="putts" id="putts-input" value="${putts}">
        <input type="hidden" name="tee_shot" id="tee-shot-input" value="${teeShot}">
        <input type="hidden" name="ob_count" id="ob-input" value="${ob}">
        <input type="hidden" name="penalty_count" id="penalty-input" value="${penalty}">
        <input type="hidden" name="bunker" id="bunker-input" value="${bunker}">
        <input type="hidden" name="par" id="par-input" value="${par}">

        <div class="card hole-card">
          <div class="hole-card-head">
            <span class="hole-card-title">ホール ${holeNo}</span>
            <button type="button" class="par-chip" id="par-chip">パー<span id="par-display">${par}</span></button>
          </div>

          <div class="stroke-block">
            <button type="button" class="stepper-btn" id="strokes-minus" aria-label="打数を減らす">−</button>
            <div class="stroke-display">
              <span class="stroke-num" id="strokes-display">${strokes}</span>
              <span class="stroke-result" id="result-label">${escapeHtml(RESULT_LABEL(strokes, par))}</span>
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
            ${[0, 1, 2, 3, 4].map((n) => `<button type="button" class="chip-btn ${n === putts ? 'active' : ''}" data-putts="${n}">${n}</button>`).join('')}
          </div>

          ${
            showTeeShot
              ? `
          <p class="field-label">ティーショット</p>
          <div class="chip-row" id="tee-shot-row">
            <button type="button" class="chip-btn ${teeShot === 'left' ? 'active' : ''}" data-tee="left">左</button>
            <button type="button" class="chip-btn ${teeShot === 'fw' ? 'active' : ''}" data-tee="fw">FW</button>
            <button type="button" class="chip-btn ${teeShot === 'right' ? 'active' : ''}" data-tee="right">右</button>
          </div>`
              : ''
          }

          <div class="form-row hole-extra-row">
            <div class="stepper-field">
              <span class="field-label">OB</span>
              <div class="stepper-mini">
                <button type="button" class="stepper-btn-sm" id="ob-minus">−</button>
                <span id="ob-display">${ob}</span>
                <button type="button" class="stepper-btn-sm" id="ob-plus">+</button>
              </div>
            </div>
            <div class="stepper-field">
              <span class="field-label">ペナルティ</span>
              <div class="stepper-mini">
                <button type="button" class="stepper-btn-sm" id="penalty-minus">−</button>
                <span id="penalty-display">${penalty}</span>
                <button type="button" class="stepper-btn-sm" id="penalty-plus">+</button>
              </div>
            </div>
            <div class="stepper-field">
              <span class="field-label">バンカー</span>
              <button type="button" class="toggle-btn ${bunker ? 'active' : ''}" id="bunker-toggle">${bunker ? 'あり' : 'なし'}</button>
            </div>
          </div>
        </div>

        <div class="hole-nav-row">
          ${holeNo > 1 ? `<button type="submit" formaction="/rounds/${round.id}/holes/${holeNo - 1}" class="btn btn-secondary">${icon('chevronLeft', { size: 16 })}前へ</button>` : '<span></span>'}
          ${
            isLast
              ? `<button type="submit" formaction="/rounds/${round.id}/finish" class="btn btn-primary">ラウンドを終える</button>`
              : `<button type="submit" formaction="/rounds/${round.id}/holes/${holeNo + 1}" class="btn btn-primary">次のホールへ${icon('chevronRight', { size: 16 })}</button>`
          }
        </div>
      </form>
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
    `,
  });
}

// ---------- round detail / finish summary ----------

export function roundDetailPage({ user, flash, round, aggregate, comments, readOnly = false, backHref = '/rounds' }) {
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
    `,
  });
}

// ---------- round list / overview ----------

export function roundsPage({ user, flash, rounds, combined }) {
  const rows = rounds.length
    ? rounds
        .map((r) => {
          const label = r.status === 'in_progress' ? '<span class="badge badge-warn">入力中</span>' : '';
          const href = r.status === 'in_progress' && r.entry_mode === 'hole' ? `/rounds/${r.id}/holes/1` : `/rounds/${r.id}`;
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
