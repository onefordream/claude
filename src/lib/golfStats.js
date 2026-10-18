// Pure calculation engine for round-by-round golf stats, score-band
// benchmarks, the ability radar, and the "growth potential" (伸びしろ)
// estimate. No DB/HTTP here on purpose, so all of this is testable with
// plain inputs — see test/golfStats.test.js.

export const DEFAULT_PARS_18 = [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5];

export const SCORE_BANDS = ['70s', '80s', '90s', '100plus'];

export const SCORE_BAND_LABELS = {
  '70s': '70台',
  '80s': '80台',
  '90s': '90台',
  '100plus': '100以上',
};

// 18-hole benchmark values per score band, as given by the studio.
export const BENCHMARKS = {
  '70s': { putts: 31, fwKeepPct: 60, girPct: 50, upAndDownPct: 45, sandSavePct: 35, ob: 0.3, penalty: 0.5, doubleBogeyPlusPct: 5, driverYards: 250 },
  '80s': { putts: 33, fwKeepPct: 52, girPct: 33, upAndDownPct: 30, sandSavePct: 22, ob: 0.8, penalty: 1, doubleBogeyPlusPct: 14, driverYards: 230 },
  '90s': { putts: 35, fwKeepPct: 45, girPct: 18, upAndDownPct: 20, sandSavePct: 12, ob: 1.8, penalty: 1.5, doubleBogeyPlusPct: 28, driverYards: 215 },
  '100plus': { putts: 37, fwKeepPct: 36, girPct: 8, upAndDownPct: 12, sandSavePct: 6, ob: 3, penalty: 2.5, doubleBogeyPlusPct: 45, driverYards: 200 },
};

export function scoreBandForAverage(avg18) {
  if (avg18 === null || avg18 === undefined) return null;
  if (avg18 < 80) return '70s';
  if (avg18 < 90) return '80s';
  if (avg18 < 100) return '90s';
  return '100plus';
}

export function targetBandFor(currentBand) {
  if (currentBand === '70s') return '70s';
  if (currentBand === '80s') return '70s';
  if (currentBand === '90s') return '80s';
  return '90s';
}

function round1(v) {
  return v === null || v === undefined ? null : Math.round(v * 10) / 10;
}

function pct(numerator, denominator) {
  if (!denominator) return null;
  return round1((numerator / denominator) * 100);
}

function resultLabel(strokes, par) {
  const diff = strokes - par;
  if (strokes === 1) return 'ホールインワン';
  if (diff <= -3) return 'アルバトロス';
  if (diff === -2) return 'イーグル';
  if (diff === -1) return 'バーディ';
  if (diff === 0) return 'パー';
  if (diff === 1) return 'ボギー';
  if (diff === 2) return 'ダブルボギー';
  return 'トリプル以上';
}

export const RESULT_LABEL = resultLabel;

// ---------- per-hole flags (hole-by-hole entry mode) ----------

export function holeIsGir(hole) {
  if (hole.strokes == null || hole.putts == null) return null;
  return hole.strokes - hole.putts <= hole.par - 2;
}

export function holeUpAndDown(hole) {
  const gir = holeIsGir(hole);
  if (gir === null) return { opportunity: false, success: false };
  if (gir) return { opportunity: false, success: false };
  return { opportunity: true, success: hole.strokes <= hole.par };
}

export function holeSandSave(hole) {
  if (!hole.bunker) return { opportunity: false, success: false };
  if (hole.strokes == null) return { opportunity: true, success: false };
  return { opportunity: true, success: hole.strokes <= hole.par };
}

export function holeFwKeep(hole) {
  const eligible = hole.par === 4 || hole.par === 5;
  if (!eligible || !hole.tee_shot) return { opportunity: false, success: false };
  return { opportunity: true, success: hole.tee_shot === 'fw' };
}

// ---------- per-round aggregation ----------

// `round` carries the entry_mode + (for 'total' mode) the stored totals;
// `holes` is the list of round_holes rows (only used for 'hole' mode).
export function aggregateRound(round, holes = []) {
  const pars = Array.isArray(round.pars) ? round.pars : JSON.parse(round.pars || '[]');
  const totalPar = pars.reduce((s, p) => s + p, 0);

  if (round.entry_mode === 'hole') {
    const played = holes.filter((h) => h.strokes != null);
    const totalScore = played.length ? played.reduce((s, h) => s + h.strokes, 0) : null;
    const puttsTotal = played.every((h) => h.putts != null) && played.length ? played.reduce((s, h) => s + h.putts, 0) : null;
    const onePuttCount = played.filter((h) => h.putts === 1).length;
    const threePuttPlusCount = played.filter((h) => h.putts != null && h.putts >= 3).length;

    let girCount = 0;
    let girElig = 0;
    let uAndDOpp = 0;
    let uAndDSuc = 0;
    let sandOpp = 0;
    let sandSuc = 0;
    let fwOpp = 0;
    let fwSuc = 0;
    let obTotal = 0;
    let penaltyTotal = 0;
    const breakdown = { eagleOrBetter: 0, birdie: 0, par: 0, bogey: 0, doubleBogey: 0, tripleOrWorse: 0 };
    let doubleBogeyPlus = 0;
    const parTotals = { 3: { sum: 0, n: 0 }, 4: { sum: 0, n: 0 }, 5: { sum: 0, n: 0 } };
    let outTotal = 0;
    let outN = 0;
    let inTotal = 0;
    let inN = 0;
    let missLeft = 0;
    let missRight = 0;

    for (const h of played) {
      const gir = holeIsGir(h);
      if (gir !== null) {
        girElig++;
        if (gir) girCount++;
      }
      const ud = holeUpAndDown(h);
      if (ud.opportunity) {
        uAndDOpp++;
        if (ud.success) uAndDSuc++;
      }
      const ss = holeSandSave(h);
      if (ss.opportunity) {
        sandOpp++;
        if (ss.success) sandSuc++;
      }
      const fw = holeFwKeep(h);
      if (fw.opportunity) {
        fwOpp++;
        if (fw.success) fwSuc++;
      }
      if (h.tee_shot === 'left') missLeft++;
      if (h.tee_shot === 'right') missRight++;

      obTotal += h.ob_count || 0;
      penaltyTotal += h.penalty_count || 0;

      const diff = h.strokes - h.par;
      if (diff <= -2) breakdown.eagleOrBetter++;
      else if (diff === -1) breakdown.birdie++;
      else if (diff === 0) breakdown.par++;
      else if (diff === 1) breakdown.bogey++;
      else if (diff === 2) breakdown.doubleBogey++;
      else breakdown.tripleOrWorse++;
      if (diff >= 2) doubleBogeyPlus++;

      if (parTotals[h.par]) {
        parTotals[h.par].sum += h.strokes;
        parTotals[h.par].n++;
      }
      if (h.hole_no <= 9) {
        outTotal += h.strokes;
        outN++;
      } else {
        inTotal += h.strokes;
        inN++;
      }
    }

    const holesPlayed = played.length;
    return {
      holesPlayed,
      totalScore,
      totalPar: holesPlayed ? played.reduce((s, h) => s + h.par, 0) : null,
      scoreToPar: totalScore !== null ? totalScore - played.reduce((s, h) => s + h.par, 0) : null,
      puttsTotal,
      onePuttCount: holesPlayed ? onePuttCount : null,
      threePuttPlusCount: holesPlayed ? threePuttPlusCount : null,
      fwKeepCount: fwOpp ? fwSuc : null,
      fwOpportunities: fwOpp,
      fwKeepPct: pct(fwSuc, fwOpp),
      girCount: girElig ? girCount : null,
      girOpportunities: girElig,
      girPct: pct(girCount, girElig),
      upAndDownCount: uAndDOpp ? uAndDSuc : null,
      upAndDownOpportunities: uAndDOpp,
      upAndDownPct: pct(uAndDSuc, uAndDOpp),
      sandSaveCount: sandOpp ? sandSuc : null,
      sandSaveOpportunities: sandOpp,
      sandSavePct: pct(sandSuc, sandOpp),
      obTotal: holesPlayed ? obTotal : null,
      penaltyTotal: holesPlayed ? penaltyTotal : null,
      doubleBogeyPlusCount: holesPlayed ? doubleBogeyPlus : null,
      doubleBogeyPlusPct: pct(doubleBogeyPlus, holesPlayed),
      resultBreakdown: holesPlayed ? breakdown : null,
      parAverages: holesPlayed
        ? {
            3: parTotals[3].n ? round1(parTotals[3].sum / parTotals[3].n) : null,
            4: parTotals[4].n ? round1(parTotals[4].sum / parTotals[4].n) : null,
            5: parTotals[5].n ? round1(parTotals[5].sum / parTotals[5].n) : null,
          }
        : null,
      outTotal: outN ? outTotal : null,
      inTotal: inN ? inTotal : null,
      teeShotMiss: fwOpp ? { left: missLeft, right: missRight } : null,
      driverAvgYards: round.driver_avg_yards ?? null,
      totalParForRound: totalPar,
    };
  }

  // entry_mode === 'total'
  const holesPlayed = round.holes;
  const fwElig = pars.filter((p) => p === 4 || p === 5).length;
  return {
    holesPlayed,
    totalScore: round.total_score ?? null,
    totalPar,
    scoreToPar: round.total_score != null ? round.total_score - totalPar : null,
    puttsTotal: round.putts_total ?? null,
    onePuttCount: null,
    threePuttPlusCount: round.three_putt_count ?? null,
    fwKeepCount: round.fw_keep_count ?? null,
    fwOpportunities: round.fw_keep_count != null ? fwElig : 0,
    fwKeepPct: round.fw_keep_count != null ? pct(round.fw_keep_count, fwElig) : null,
    girCount: round.gir_count ?? null,
    girOpportunities: round.gir_count != null ? holesPlayed : 0,
    girPct: round.gir_count != null ? pct(round.gir_count, holesPlayed) : null,
    upAndDownCount: null,
    upAndDownOpportunities: 0,
    upAndDownPct: null,
    sandSaveCount: round.bunker_save_count ?? null,
    sandSaveOpportunities: round.bunker_count ?? 0,
    sandSavePct: round.bunker_count ? pct(round.bunker_save_count, round.bunker_count) : null,
    obTotal: round.ob_total ?? null,
    penaltyTotal: round.penalty_total ?? null,
    doubleBogeyPlusCount: null,
    doubleBogeyPlusPct: null,
    resultBreakdown: null,
    parAverages: null,
    outTotal: null,
    inTotal: null,
    teeShotMiss: null,
    driverAvgYards: round.driver_avg_yards ?? null,
    totalParForRound: totalPar,
  };
}

// ---------- multi-round aggregation (18-hole normalized) ----------

function sumField(aggs, key) {
  const vals = aggs.map((a) => a[key]).filter((v) => v !== null && v !== undefined);
  if (!vals.length) return null;
  return vals.reduce((s, v) => s + v, 0);
}

function per18(sum, holes) {
  if (sum === null || !holes) return null;
  return round1((sum / holes) * 18);
}

// `aggregates` = aggregateRound(...) output per completed round, each
// tagged with its own `holesPlayed`. Rounds with 9 and 18 holes can be
// mixed; everything is normalized to a per-18-hole basis before combining.
export function combineRoundAggregates(aggregates) {
  if (!aggregates.length) return null;
  const totalHoles = aggregates.reduce((s, a) => s + (a.holesPlayed || 0), 0);
  if (!totalHoles) return null;

  const scoreSum = sumField(aggregates, 'totalScore');
  const puttsSum = sumField(aggregates, 'puttsTotal');
  const threePuttSum = sumField(aggregates, 'threePuttPlusCount');
  const obSum = sumField(aggregates, 'obTotal');
  const penaltySum = sumField(aggregates, 'penaltyTotal');
  const dblSum = sumField(aggregates, 'doubleBogeyPlusCount');

  const girMissPerRound = aggregates
    .filter((a) => a.girCount !== null && a.girCount !== undefined)
    .map((a) => a.holesPlayed - a.girCount);
  const girMissSum = girMissPerRound.length ? girMissPerRound.reduce((s, v) => s + v, 0) : null;

  const sandOppSum = sumField(aggregates, 'sandSaveOpportunities');

  const fwSucSum = sumField(aggregates, 'fwKeepCount');
  const fwOppSum = sumField(aggregates, 'fwOpportunities');
  const girSucSum = sumField(aggregates, 'girCount');
  const girOppSum = sumField(aggregates, 'girOpportunities');
  const udSucSum = sumField(aggregates, 'upAndDownCount');
  const udOppSum = sumField(aggregates, 'upAndDownOpportunities');
  const sandSucSum = sumField(aggregates, 'sandSaveCount');

  const bestScore18 = aggregates
    .filter((a) => a.holesPlayed === 18 && a.totalScore !== null)
    .reduce((min, a) => (min === null || a.totalScore < min ? a.totalScore : min), null);

  const driverVals = aggregates.map((a) => a.driverAvgYards).filter((v) => v !== null && v !== undefined);
  const driverAvg = driverVals.length ? Math.round(driverVals.reduce((s, v) => s + v, 0) / driverVals.length) : null;

  return {
    roundsCount: aggregates.length,
    holesTotal: totalHoles,
    avgScorePer18: per18(scoreSum, totalHoles),
    bestScore18,
    puttsPer18: per18(puttsSum, totalHoles),
    threePuttPlusPer18: per18(threePuttSum, totalHoles),
    obPer18: per18(obSum, totalHoles),
    penaltyPer18: per18(penaltySum, totalHoles),
    doubleBogeyPlusPer18: per18(dblSum, totalHoles),
    doubleBogeyPlusPct: dblSum !== null ? pct(dblSum, totalHoles) : null,
    girMissPer18: per18(girMissSum, totalHoles),
    sandOpportunityPer18: per18(sandOppSum, totalHoles),
    fwKeepPct: fwOppSum ? pct(fwSucSum, fwOppSum) : null,
    girPct: girOppSum ? pct(girSucSum, girOppSum) : null,
    upAndDownPct: udOppSum ? pct(udSucSum, udOppSum) : null,
    sandSavePct: sandOppSum ? pct(sandSucSum, sandOppSum) : null,
    driverAvgYards: driverAvg,
  };
}

// ---------- ability radar (0-100) ----------

const ABILITY_ITEMS = [
  { key: 'putter', label: 'パター', metric: 'puttsPer18', bench: 'putts' },
  { key: 'direction', label: '方向性', metric: 'fwKeepPct', bench: 'fwKeepPct' },
  { key: 'obAvoid', label: 'OB回避', metric: 'obPer18', bench: 'ob' },
  { key: 'shotAccuracy', label: 'ショット精度', metric: 'girPct', bench: 'girPct' },
  { key: 'approach', label: 'アプローチ', metric: 'upAndDownPct', bench: 'upAndDownPct' },
  { key: 'bunker', label: 'バンカー', metric: 'sandSavePct', bench: 'sandSavePct' },
  { key: 'bigMissAvoid', label: '大叩き回避', metric: 'doubleBogeyPlusPct', bench: 'doubleBogeyPlusPct' },
  { key: 'distance', label: '飛距離', metric: 'driverAvgYards', bench: 'driverYards' },
];

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function abilityScore(value, v70, v100) {
  const raw = 20 + ((value - v100) / (v70 - v100)) * 70;
  return clamp(Math.round(raw), 0, 100);
}

// Returns only the items for which combined data is available.
export function computeAbilityScores(combined) {
  if (!combined) return [];
  const v70 = BENCHMARKS['70s'];
  const v100 = BENCHMARKS['100plus'];
  return ABILITY_ITEMS.filter((item) => combined[item.metric] !== null && combined[item.metric] !== undefined).map(
    (item) => ({
      key: item.key,
      label: item.label,
      value: combined[item.metric],
      score: abilityScore(combined[item.metric], v70[item.bench], v100[item.bench]),
    })
  );
}

// ---------- growth potential (伸びしろ) ----------

const GROWTH_ADVICE = {
  putter: '3パットを減らすには、ファーストパットの距離感(2m以内に寄せる)を優先しましょう。',
  obAvoid: '危ないホールはティーショットの番手を落としましょう。',
  penalty: 'ハザード越えは無理をせず、刻む選択肢を持ちましょう。',
  direction: '飛距離より方向を優先しましょう。',
  shotAccuracy: 'グリーンの真ん中を狙い、ピンを直接狙うのは短い番手のときだけにしましょう。',
  approach: '転がしのアプローチを基本にして、1パット圏に寄せる練習をしましょう。',
  bunker: 'まずは1回で出すこと。フェースを開いて砂ごと打つ練習をしましょう。',
};

const GROWTH_LABELS = {
  putter: 'パター',
  obAvoid: 'OB',
  penalty: 'ペナルティ',
  direction: '方向性',
  shotAccuracy: 'ショット精度',
  approach: 'アプローチ',
  bunker: 'バンカー',
};

const MIN_GAIN = 0.15;

export function computeGrowthPotential(combined) {
  if (!combined) return { items: [], totalGain: 0 };
  const band = scoreBandForAverage(combined.avgScorePer18);
  const target = BENCHMARKS[targetBandFor(band)];
  const items = [];

  const add = (key, gain) => {
    if (gain === null || gain === undefined || !Number.isFinite(gain) || gain <= MIN_GAIN) return;
    items.push({ key, label: GROWTH_LABELS[key], gain: round1(gain), advice: GROWTH_ADVICE[key] });
  };

  if (combined.puttsPer18 !== null) add('putter', combined.puttsPer18 - target.putts);
  if (combined.obPer18 !== null) add('obAvoid', (combined.obPer18 - target.ob) * 2);
  if (combined.penaltyPer18 !== null) add('penalty', combined.penaltyPer18 - target.penalty);
  if (combined.fwKeepPct !== null) add('direction', ((target.fwKeepPct - combined.fwKeepPct) / 100) * 14 * 0.3);
  if (combined.girPct !== null && combined.upAndDownPct !== null) {
    add('shotAccuracy', ((target.girPct - combined.girPct) / 100) * 18 * (1 - combined.upAndDownPct / 100));
  }
  if (combined.girMissPer18 !== null && combined.upAndDownPct !== null) {
    add('approach', combined.girMissPer18 * ((target.upAndDownPct - combined.upAndDownPct) / 100));
  }
  if (combined.sandOpportunityPer18 !== null && combined.sandSavePct !== null) {
    add('bunker', combined.sandOpportunityPer18 * ((target.sandSavePct - combined.sandSavePct) / 100));
  }

  items.sort((a, b) => b.gain - a.gain);
  const totalGain = round1(items.reduce((s, i) => s + i.gain, 0));
  return { items, totalGain, targetBand: targetBandFor(band), currentBand: band };
}

// ---------- AI-unavailable fallback for the round coach ----------

export function buildFallbackRoundAnalysis({ combined, abilityScores, growth }) {
  const bandLabel = SCORE_BAND_LABELS[growth.currentBand] || '';
  const targetLabel = SCORE_BAND_LABELS[growth.targetBand] || '';
  const top = growth.items.slice(0, 3);
  const sortedAbility = [...abilityScores].sort((a, b) => b.score - a.score);
  const strengths = sortedAbility.slice(0, 2);
  const weaknesses = sortedAbility.slice(-2).reverse();

  const summary = top.length
    ? `平均${combined.avgScorePer18}(18H換算・${bandLabel})です。${top[0].label}を${targetLabel}の水準に近づけると、1ラウンドで約${growth.totalGain}打縮まる見込みです。`
    : `平均${combined.avgScorePer18}(18H換算・${bandLabel})です。データが増えると、より具体的な伸びしろが見えてきます。`;

  return {
    summary,
    strengths: strengths.map((s) => `${s.label}(点数${s.score})`),
    weaknesses: weaknesses.map((w) => `${w.label}(点数${w.score})`),
    priorities: top.map((t) => ({
      area: t.label,
      why: `現在の数値は目標(${targetLabel}の水準)に対して約${t.gain}打分の差があります。`,
      drill: t.advice,
      expected_gain: t.gain,
    })),
    next_round_plan: top.length
      ? top.map((t) => `${t.label}を意識する: ${t.advice}`)
      : ['まずはラウンドを重ねて、データを増やしましょう。'],
  };
}
