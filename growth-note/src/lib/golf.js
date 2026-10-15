// ゴルフのスコア計算と分析。
// 入力はできるだけ少なく（スコア・パット・ティーショットの方向・OB・バンカー・ペナルティ）、
// パーオンや寄せワンなどは入力から自動で計算する。

export const DEFAULT_PARS = [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5]; // パー72

export const FAIRWAY = ['fw', 'left', 'right'];

export function resultOf(score, par) {
  const d = score - par;
  if (score === 1) return { key: 'ace', label: 'ホールインワン' };
  if (d <= -3) return { key: 'albatross', label: 'アルバトロス' };
  if (d === -2) return { key: 'eagle', label: 'イーグル' };
  if (d === -1) return { key: 'birdie', label: 'バーディ' };
  if (d === 0) return { key: 'par', label: 'パー' };
  if (d === 1) return { key: 'bogey', label: 'ボギー' };
  if (d === 2) return { key: 'double', label: 'ダブルボギー' };
  return { key: 'triple', label: 'トリプル以上' };
}

const pct = (n, d) => (d > 0 ? Math.round((n / d) * 1000) / 10 : null);
const r1 = (v) => (v == null ? null : Math.round(v * 10) / 10);

/** 1ホールから自動で決まる値 */
export function holeDerived(h) {
  if (h.score == null) return null;
  const hasPutts = h.putts != null;
  // パーオン: グリーンに乗るまでの打数がパー − 2 以下
  const gir = hasPutts ? h.score - h.putts <= h.par - 2 : null;
  return {
    gir,
    // 寄せワン（スクランブル）: パーオンしなかったのにパー以内
    scrambleChance: gir === false,
    scramble: gir === false && h.score <= h.par,
    // サンドセーブ（目安）: バンカーに入ったホールでパー以内
    sandChance: !!h.bunker,
    sandSave: !!h.bunker && h.score <= h.par,
    fwChance: h.par >= 4 && FAIRWAY.includes(h.fairway),
    fwHit: h.par >= 4 && h.fairway === 'fw',
  };
}

/** 1ラウンドの成績。mode=total のときは入力された合計値から計算する */
export function roundStats(round, holes) {
  if (round.mode === 'total') {
    const t = round.totals || {};
    const holesPlayed = round.holes_count;
    const par = round.pars.slice(0, holesPlayed).reduce((a, b) => a + b, 0);
    const score = t.score ?? null;
    return finalize({
      mode: 'total', holesPlayed, complete: score != null, par, score,
      putts: t.putts ?? null, puttHoles: t.putts != null ? holesPlayed : 0, onePutts: null, threePutts: t.threePutts ?? null,
      fwHit: t.fwHit ?? null, fwChances: t.fwChances ?? null, missLeft: null, missRight: null,
      gir: t.gir ?? null, girHoles: t.gir != null ? holesPlayed : 0,
      scrambles: null, scrambleChances: null, sandSaves: t.sandSaves ?? null, sandChances: t.sandChances ?? null,
      ob: t.ob ?? null, penalties: t.penalties ?? null, doublePlus: null, dist: null, byPar: null, front: null, back: null,
      driveDistance: round.drive_distance ?? null,
    });
  }

  const played = holes.filter((h) => h.score != null).sort((a, b) => a.hole_no - b.hole_no);
  const sum = (arr, f) => arr.reduce((s, h) => s + (f(h) || 0), 0);
  const derived = played.map((h) => ({ h, d: holeDerived(h) }));
  const withPutts = played.filter((h) => h.putts != null);
  const dist = { eagle: 0, birdie: 0, par: 0, bogey: 0, double: 0, triple: 0 };
  for (const h of played) {
    const k = resultOf(h.score, h.par).key;
    dist[['ace', 'albatross'].includes(k) ? 'eagle' : k]++;
  }
  const byPar = {};
  for (const p of [3, 4, 5]) {
    const hs = played.filter((h) => h.par === p);
    byPar[p] = hs.length ? r1(sum(hs, (h) => h.score) / hs.length) : null;
  }
  const half = (from, to) => {
    const hs = played.filter((h) => h.hole_no >= from && h.hole_no <= to);
    return hs.length ? { score: sum(hs, (h) => h.score), par: sum(hs, (h) => h.par), holes: hs.length } : null;
  };
  return finalize({
    mode: 'hole',
    holesPlayed: played.length,
    complete: played.length === round.holes_count,
    par: sum(played, (h) => h.par),
    score: played.length ? sum(played, (h) => h.score) : null,
    putts: withPutts.length ? sum(withPutts, (h) => h.putts) : null,
    puttHoles: withPutts.length,
    onePutts: withPutts.filter((h) => h.putts === 1).length,
    threePutts: withPutts.filter((h) => h.putts >= 3).length,
    fwHit: derived.filter((x) => x.d.fwHit).length,
    fwChances: derived.filter((x) => x.d.fwChance).length,
    missLeft: played.filter((h) => h.par >= 4 && h.fairway === 'left').length,
    missRight: played.filter((h) => h.par >= 4 && h.fairway === 'right').length,
    gir: derived.filter((x) => x.d.gir === true).length,
    girHoles: derived.filter((x) => x.d.gir !== null).length,
    scrambles: derived.filter((x) => x.d.scramble).length,
    scrambleChances: derived.filter((x) => x.d.scrambleChance).length,
    sandSaves: derived.filter((x) => x.d.sandSave).length,
    sandChances: derived.filter((x) => x.d.sandChance).length,
    ob: sum(played, (h) => h.ob),
    penalties: sum(played, (h) => h.penalty),
    doublePlus: dist.double + dist.triple,
    dist,
    byPar,
    front: half(1, 9),
    back: round.holes_count > 9 ? half(10, 18) : null,
    driveDistance: round.drive_distance ?? null,
  });
}

function finalize(s) {
  return {
    ...s,
    toPar: s.score != null ? s.score - s.par : null,
    fwPct: s.fwChances ? pct(s.fwHit, s.fwChances) : null,
    girPct: s.girHoles ? pct(s.gir, s.girHoles) : null,
    scramblePct: s.scrambleChances ? pct(s.scrambles, s.scrambleChances) : null,
    sandPct: s.sandChances ? pct(s.sandSaves, s.sandChances) : null,
    puttsPerHole: s.puttHoles ? r1(s.putts / s.puttHoles) : null,
  };
}

/**
 * 複数ラウンドを合算し、18ホールあたりの値にそろえる（9ホールのラウンドも混ぜられる）。
 * 率（%）は回数を合算してから計算する。
 */
export function aggregate(statsList) {
  const list = statsList.filter((s) => s.complete && s.score != null);
  if (!list.length) return null;
  const add = (f) => list.reduce((a, s) => a + (f(s) ?? 0), 0);
  const holes = add((s) => s.holesPlayed);
  const per18 = (total, h) => (h > 0 ? r1((total / h) * 18) : null);
  const puttHoles = add((s) => (s.putts != null ? s.puttHoles : 0));
  const obHoles = add((s) => (s.ob != null ? s.holesPlayed : 0));
  const penHoles = add((s) => (s.penalties != null ? s.holesPlayed : 0));
  const dpHoles = add((s) => (s.doublePlus != null ? s.holesPlayed : 0));
  const threeHoles = add((s) => (s.threePutts != null ? s.puttHoles : 0));
  const scr = add((s) => s.scrambleChances);
  const drives = list.map((s) => s.driveDistance).filter((d) => d);
  return {
    rounds: list.length,
    holes,
    score18: per18(add((s) => s.score), holes),
    toPar18: per18(add((s) => s.toPar), holes),
    best: list.filter((s) => s.holesPlayed === 18).reduce((m, s) => (m == null || s.score < m ? s.score : m), null),
    putts18: per18(add((s) => (s.putts != null ? s.putts : 0)), puttHoles),
    threePutts18: per18(add((s) => s.threePutts), threeHoles),
    fwPct: pct(add((s) => s.fwHit), add((s) => s.fwChances)),
    missLeft: add((s) => s.missLeft),
    missRight: add((s) => s.missRight),
    girPct: pct(add((s) => s.gir), add((s) => s.girHoles)),
    scramblePct: scr ? pct(add((s) => s.scrambles), scr) : null,
    missedGreens18: per18(add((s) => (s.girHoles ? s.girHoles - s.gir : 0)), add((s) => s.girHoles)),
    sandPct: add((s) => s.sandChances) ? pct(add((s) => s.sandSaves), add((s) => s.sandChances)) : null,
    sandChances18: per18(add((s) => s.sandChances), add((s) => (s.sandChances != null ? s.holesPlayed : 0))),
    ob18: per18(add((s) => s.ob), obHoles),
    penalties18: per18(add((s) => s.penalties), penHoles),
    doublePlusPct: dpHoles ? pct(add((s) => s.doublePlus), dpHoles) : null,
    driveDistance: drives.length ? Math.round(drives.reduce((a, b) => a + b, 0) / drives.length) : null,
  };
}

/**
 * スコア帯ごとの目安（18ホールあたり）。一般的なアマチュアの傾向をもとにした当アプリの推定値。
 * 分析では「ひとつ上のスコア帯」を目標にする。
 */
export const BRACKETS = [
  { key: '70s', label: '70台', putts: 31, fw: 60, gir: 50, scramble: 45, sand: 35, ob: 0.3, penalties: 0.5, doublePlus: 5, drive: 250 },
  { key: '80s', label: '80台', putts: 33, fw: 52, gir: 33, scramble: 30, sand: 22, ob: 0.8, penalties: 1, doublePlus: 14, drive: 230 },
  { key: '90s', label: '90台', putts: 35, fw: 45, gir: 18, scramble: 20, sand: 12, ob: 1.8, penalties: 1.5, doublePlus: 28, drive: 215 },
  { key: '100s', label: '100以上', putts: 37, fw: 36, gir: 8, scramble: 12, sand: 6, ob: 3, penalties: 2.5, doublePlus: 45, drive: 200 },
];

export function bracketOf(score18) {
  if (score18 < 80) return BRACKETS[0];
  if (score18 < 90) return BRACKETS[1];
  if (score18 < 100) return BRACKETS[2];
  return BRACKETS[3];
}

export function targetOf(score18) {
  const i = BRACKETS.indexOf(bracketOf(score18));
  return BRACKETS[Math.max(0, i - 1)];
}

const top = BRACKETS[0];
const low = BRACKETS[3];
/** 100以上の水準 = 20点、70台の水準 = 90点 になるように直線でならす */
const scale = (v, key) => (v == null ? null : Math.max(0, Math.min(100, Math.round(20 + ((v - low[key]) / (top[key] - low[key])) * 70))));

export const GOLF_AXES = [
  { key: 'putting', label: 'パター', from: (a) => scale(a.putts18, 'putts'), detail: (a) => a.putts18 != null && `1ラウンド ${a.putts18}パット` },
  { key: 'direction', label: '方向性', from: (a) => scale(a.fwPct, 'fw'), detail: (a) => a.fwPct != null && `FWキープ率 ${a.fwPct}%` },
  { key: 'ob', label: 'OB回避', from: (a) => scale(a.ob18, 'ob'), detail: (a) => a.ob18 != null && `1ラウンド ${a.ob18}回` },
  { key: 'shot', label: 'ショット精度', from: (a) => scale(a.girPct, 'gir'), detail: (a) => a.girPct != null && `パーオン率 ${a.girPct}%` },
  { key: 'approach', label: 'アプローチ', from: (a) => scale(a.scramblePct, 'scramble'), detail: (a) => a.scramblePct != null && `寄せワン率 ${a.scramblePct}%` },
  { key: 'bunker', label: 'バンカー', from: (a) => scale(a.sandPct, 'sand'), detail: (a) => a.sandPct != null && `サンドセーブ率 ${a.sandPct}%` },
  { key: 'management', label: '大叩き回避', from: (a) => scale(a.doublePlusPct, 'doublePlus'), detail: (a) => a.doublePlusPct != null && `ダボ以上 ${a.doublePlusPct}%` },
  { key: 'distance', label: '飛距離', from: (a) => scale(a.driveDistance, 'drive'), detail: (a) => a.driveDistance != null && `ドライバー ${a.driveDistance}ヤード` },
];

/** 能力の6〜8軸（データのない軸は除く） */
export function skillAxes(agg) {
  return GOLF_AXES.map((ax) => ({ key: ax.key, label: ax.label, score: ax.from(agg), detail: ax.detail(agg) || null }))
    .filter((a) => a.score != null);
}

/**
 * どこを伸ばすと何打縮むか（1ラウンドあたりの目安）。
 * 目標＝ひとつ上のスコア帯の水準。重なりがあるため合計は目安。
 */
export function potentials(agg) {
  const t = targetOf(agg.score18);
  const out = [];
  const push = (key, label, strokes, from, to, unit, tip) => {
    if (strokes == null || !(strokes > 0.15)) return;
    out.push({ key, label, strokes: Math.round(strokes * 10) / 10, from, to, unit, tip });
  };
  if (agg.putts18 != null) {
    push('putting', 'パター', agg.putts18 - t.putts, agg.putts18, t.putts, 'パット', '3パットを減らすには、ファーストパットの距離感（2m以内に寄せる）を優先');
  }
  if (agg.ob18 != null) {
    push('ob', 'OB', (agg.ob18 - t.ob) * 2, agg.ob18, t.ob, '回', 'OBは1回で約2打の損。危ないホールはティーショットの番手を落とす');
  }
  if (agg.penalties18 != null) {
    push('penalty', 'ペナルティ（池など）', agg.penalties18 - t.penalties, agg.penalties18, t.penalties, '回', 'ハザード越えは無理をせず、刻む選択肢を持つ');
  }
  if (agg.fwPct != null) {
    push('direction', '方向性（FWキープ）', ((t.fw - agg.fwPct) / 100) * 14 * 0.3, agg.fwPct, t.fw, '%', 'フェアウェイを外すと次のショットが難しくなる。飛距離より方向を優先');
  }
  if (agg.girPct != null) {
    const saveRate = (agg.scramblePct ?? 0) / 100;
    push('shot', 'ショット精度（パーオン）', ((t.gir - agg.girPct) / 100) * 18 * (1 - saveRate), agg.girPct, t.gir, '%', 'グリーンの真ん中を狙い、ピンを直接狙うのは短い番手のときだけ');
  }
  if (agg.scramblePct != null && agg.missedGreens18 != null) {
    push('approach', 'アプローチ（寄せワン）', (agg.missedGreens18 * (t.scramble - agg.scramblePct)) / 100, agg.scramblePct, t.scramble, '%', '転がしのアプローチを基本にして、1パット圏に寄せる練習を');
  }
  if (agg.sandPct != null && agg.sandChances18 != null) {
    push('bunker', 'バンカー', (agg.sandChances18 * (t.sand - agg.sandPct)) / 100, agg.sandPct, t.sand, '%', 'まずは1回で出すこと。フェースを開いて砂ごと打つ練習を');
  }
  return { target: t, current: bracketOf(agg.score18), items: out.sort((a, b) => b.strokes - a.strokes) };
}
