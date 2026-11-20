// AIコーチ診断エンジン
// MVPではルールベース（ゴルフ指導の定石をスコア化）で動作する。
// 本番ではこの analyzeSession() の結果（数値・課題・履歴）をサーバー経由で
// LLMに渡し、文章のパーソナライズを行う構成を想定している。
import { simulate, M_TO_YD } from './physics.js';
import { clubById } from './clubs.js';

const mean = (a) => a.reduce((s, v) => s + v, 0) / (a.length || 1);
const sd = (a) => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
};
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const yd = (m) => m * M_TO_YD;

/** 1球ごとの計算（無料） */
export function shotMetrics(shot, clubId) {
  const club = clubById(clubId);
  const spin = shot.spin || club.spin;
  const sim = simulate(shot.speed, shot.launch, spin);
  return {
    carry: yd(sim.carry),
    apex: yd(sim.apex),
    headSpeed: shot.speed / club.smash,
    spin,
    path: sim.path,
  };
}

/** セッション集計（無料で表示する部分） */
export function sessionStats(session) {
  const club = clubById(session.club);
  const shots = session.shots;
  const speeds = shots.map((s) => s.speed);
  const launches = shots.map((s) => s.launch);
  const metrics = shots.map((s) => shotMetrics(s, session.club));
  const carries = metrics.map((m) => m.carry);
  const speedCv = sd(speeds) / (mean(speeds) || 1);
  const launchSd = sd(launches);
  const shapeCount = {};
  shots.forEach((s) => { if (s.shape) shapeCount[s.shape] = (shapeCount[s.shape] || 0) + 1; });
  const shaped = shots.filter((s) => s.shape).length || 1;
  const ratio = (ids) => ids.reduce((n, id) => n + (shapeCount[id] || 0), 0) / shaped;

  const avgSpeed = mean(speeds);
  const avgLaunch = mean(launches);
  const [lo, hi] = club.launch;
  const launchDev = avgLaunch < lo ? avgLaunch - lo : avgLaunch > hi ? avgLaunch - hi : 0;

  // サブスコア（0-100）
  const power = clamp(Math.round(60 + ((avgSpeed - club.avgSpeed) / (club.goodSpeed - club.avgSpeed)) * 25), 0, 100);
  const launchScore = clamp(Math.round(100 - Math.abs(launchDev) * 9), 0, 100);
  const consistency = clamp(Math.round(100 - speedCv * 900 - launchSd * 6), 0, 100);
  const hasShape = shots.some((s) => s.shape);
  const direction = hasShape
    ? clamp(Math.round(100 - ratio(['slice', 'hook']) * 70 - ratio(['fade', 'draw']) * 10), 0, 100)
    : null;
  const parts = [power, launchScore, consistency].concat(direction == null ? [] : [direction]);
  const total = Math.round(mean(parts));

  return {
    club,
    n: shots.length,
    avgSpeed,
    maxSpeed: Math.max(...speeds),
    avgLaunch,
    launchSd,
    speedCv,
    headSpeed: avgSpeed / club.smash,
    avgCarry: mean(carries),
    maxCarry: Math.max(...carries),
    carrySd: sd(carries),
    metrics,
    shapeCount,
    sliceRatio: ratio(['slice']),
    hookRatio: ratio(['hook']),
    hasShape,
    launchDev,
    scores: { total, power, launch: launchScore, consistency, direction },
  };
}

// 練習ドリル辞書
const DRILLS = {
  teeUp: {
    title: 'ティー高め＋ボール左足かかと線上',
    how: 'ティーを普段よりボール半個分高くし、ボール位置を左足かかとの延長線に。ヘッドが最下点を過ぎてから当たる感覚をつかむ。',
    reps: '10球 × 2セット',
  },
  headcover: {
    title: 'ヘッドカバー・アッパー軌道ドリル',
    how: 'ボールの30cm後方（飛球線上）にヘッドカバーを置き、触れないように振る。上から鋭角に入るのを防ぎ、払い打ちの軌道を作る。',
    reps: '10球 × 2セット',
  },
  halfLoft: {
    title: 'ハーフスイングでロフトどおりに当てる',
    how: '腰から腰の振り幅で、フェースを返しすぎず・かぶせすぎず打つ。打ち出しが目標レンジに入る球が続くまで繰り返す。',
    reps: '15球',
  },
  handFirst: {
    title: 'ハンドファースト・インパクトドリル',
    how: 'アドレスで手元を左太もも内側に置き、その形のままインパクトを迎える。左手甲を目標に向けたまま、すくい上げない。',
    reps: '10球 × 3セット',
  },
  lowTee: {
    title: 'ティー低めのライン出しショット',
    how: 'ティーを低くし、フィニッシュを胸の高さで止める。打ち出しを抑えた低い球を、まっすぐ出すことを意識する。',
    reps: '10球 × 2セット',
  },
  feetTogether: {
    title: '両足そろえ打ち',
    how: '両足をくっつけて立ち、7割の力で振る。体の軸がぶれるとミートしないので、芯で当てる感覚が身につく。',
    reps: '15球',
  },
  seventy: {
    title: '70%スイングで芯に当てる',
    how: 'フェースにショットマーカー（またはフットスプレー）を付け、打点を毎球確認。芯に3球連続で当たるまで振り幅を固定する。',
    reps: '20球',
  },
  towel: {
    title: 'タオル・入射角ドリル',
    how: 'ボールの20cm後方にタオルを置き、タオルに触れずに打つ。最下点が安定し、打ち出し角のばらつきが減る。',
    reps: '10球 × 3セット',
  },
  closeStance: {
    title: 'クローズスタンス・ドロー練習',
    how: '右足を半足分引いて構え、インサイドから振る。フォローで右手が左手を追い越すようにフェースを返す。',
    reps: '15球',
  },
  gripCheck: {
    title: 'グリップと右脇タオル',
    how: '左手のナックルが2〜3個見えるまでかぶせて握る。右脇にタオルを挟み、落とさずにハーフスイング。手打ちのカット軌道を防ぐ。',
    reps: '素振り10回＋10球',
  },
  holdFace: {
    title: 'フェースを返しすぎないフォロー',
    how: 'フォローで左ひじをたたまず、フェース面を目標に長く向ける。体の回転を止めずに、腕の返しで打たない。',
    reps: '15球',
  },
  speedSwing: {
    title: '連続速振り（スピードトレーニング）',
    how: 'クラブを逆さに持ち、グリップ側で「ビュッ」と音が左側で鳴るように全力素振り。左右交互にも振る。',
    reps: '左右各5回 × 3セット（週3回）',
  },
  stepSwing: {
    title: 'ステップ打ち',
    how: '両足を閉じて構え、テークバックと同時に左足を踏み込んで打つ。地面反力と体重移動でヘッドスピードを上げる。',
    reps: '10球 × 2セット',
  },
  distance: {
    title: '振り幅3段階の距離打ち分け',
    how: '腰・肩・フルの3つの振り幅で打ち分け、それぞれのキャリーを記録。コースで使える距離の引き出しを増やす。',
    reps: '各5球',
  },
};

/** 課題抽出と練習メニュー（AI機能：有料） */
export function diagnose(session, history = []) {
  const st = sessionStats(session);
  const { club } = st;
  const isWood = club.id === 'dr' || club.id === 'fw';
  const issues = [];
  const [lo, hi] = club.launch;

  if (st.avgLaunch < lo - 0.5) {
    issues.push({
      id: 'launch_low', goal: '打ち出しを上げる', severity: st.avgLaunch < lo - 3 ? 3 : 2,
      title: '打ち出し角が低い',
      detail: `平均${st.avgLaunch.toFixed(1)}°で、${club.short}の目標${lo}〜${hi}°より低めです。${isWood ? 'ヘッドが上から入り、ロフトが立って当たっている可能性があります。' : 'ロフトが立ちすぎ、または打ち込みすぎの可能性があります。'}`,
      drills: isWood ? ['teeUp', 'headcover'] : ['halfLoft'],
    });
  } else if (st.avgLaunch > hi + 0.5) {
    issues.push({
      id: 'launch_high', goal: '打ち出しを抑える', severity: st.avgLaunch > hi + 3 ? 3 : 2,
      title: '打ち出し角が高い',
      detail: `平均${st.avgLaunch.toFixed(1)}°で、目標${lo}〜${hi}°より高めです。すくい打ちでロフトが寝て当たると、飛距離をロスします。`,
      drills: isWood ? ['lowTee', 'handFirst'] : ['handFirst', 'halfLoft'],
    });
  }

  if (st.n >= 3 && st.speedCv > 0.035) {
    issues.push({
      id: 'meet', goal: '芯で当てる確率を上げる', severity: st.speedCv > 0.06 ? 3 : 2,
      title: 'ミートが安定しない',
      detail: `初速のばらつきが${(st.speedCv * 100).toFixed(1)}%あります（目安は3%以内）。芯を外した球で飛距離が落ちています。`,
      drills: ['seventy', 'feetTogether'],
    });
  }

  if (st.n >= 3 && st.launchSd > 2.5) {
    issues.push({
      id: 'launch_sd', goal: '入射角をそろえる', severity: st.launchSd > 4 ? 3 : 2,
      title: '打ち出し角がばらつく',
      detail: `打ち出し角のばらつきが±${st.launchSd.toFixed(1)}°あります。スイングの最下点（入射角）が毎回変わっている状態です。`,
      drills: ['towel', 'feetTogether'],
    });
  }

  if (st.hasShape && st.sliceRatio >= 0.4) {
    issues.push({
      id: 'slice', goal: 'スライスを抑える', severity: st.sliceRatio >= 0.6 ? 3 : 2,
      title: 'スライスが多い',
      detail: `${Math.round(st.sliceRatio * 100)}%の球がスライスでした。カット軌道かフェースが開いて当たっています。曲がった分だけキャリーと方向をロスします。`,
      drills: ['gripCheck', 'closeStance'],
    });
  }
  if (st.hasShape && st.hookRatio >= 0.4) {
    issues.push({
      id: 'hook', goal: 'フックを抑える', severity: st.hookRatio >= 0.6 ? 3 : 2,
      title: 'フックが多い',
      detail: `${Math.round(st.hookRatio * 100)}%の球がフックでした。手首の返しすぎ、または体の回転が止まっている可能性があります。`,
      drills: ['holdFace'],
    });
  }

  const hsAvg = club.avgSpeed / club.smash;
  if (st.headSpeed < hsAvg * 0.94) {
    issues.push({
      id: 'speed', goal: 'ヘッドスピードを上げる', severity: st.headSpeed < hsAvg * 0.85 ? 2 : 1,
      title: 'ヘッドスピードに伸び代がある',
      detail: `推定ヘッドスピードは${st.headSpeed.toFixed(1)}m/sで、一般男性平均（約${hsAvg.toFixed(0)}m/s）より低めです。スピードは練習で上げやすい項目です。`,
      drills: ['speedSwing', 'stepSwing'],
    });
  }

  issues.sort((a, b) => b.severity - a.severity);

  // 練習メニュー（重複排除して最大4つ）
  const menuIds = [];
  issues.forEach((i) => i.drills.forEach((d) => { if (!menuIds.includes(d)) menuIds.push(d); }));
  if (!menuIds.length) menuIds.push('distance');
  const menu = menuIds.slice(0, 4).map((id) => ({ id, ...DRILLS[id] }));

  const theme = issues[0]
    ? { title: issues[0].title, text: `今日のテーマは「${issues[0].goal}」。まず「${DRILLS[issues[0].drills[0]].title}」から始めましょう。` }
    : { title: '全体的に良好です', text: '大きな課題は見つかりませんでした。距離の打ち分けで、コースで使える精度を上げましょう。' };

  return { stats: st, issues, menu, theme, potential: potential(st), growth: growth(session, history) };
}

/** 伸び代（ポテンシャル） */
export function potential(st) {
  const { club } = st;
  const [lo, hi] = club.launch;
  const target = clamp(st.avgLaunch, lo, hi) === st.avgLaunch ? st.avgLaunch : (st.avgLaunch < lo ? lo + 0.5 : hi - 0.5);
  const carry = (v, a) => yd(simulate(v, a, club.spin).carry);

  const now = carry(st.avgSpeed, st.avgLaunch);
  const launchOpt = carry(st.avgSpeed, target);
  // ミートが安定すれば、今日の上位の当たり（最大初速の98%）が平均になる
  const meetSpeed = Math.max(st.avgSpeed, st.maxSpeed * 0.98);
  const meetOpt = carry(meetSpeed, target);
  // 3か月の練習で ヘッドスピード +2m/s を想定
  const hsUp = 2;
  const speedOpt = carry(meetSpeed + hsUp * club.smash, target);

  const steps = [
    { id: 'launch', label: '打ち出し角を最適化', gain: Math.max(0, launchOpt - now), target: `打ち出し ${target.toFixed(1)}°` },
    { id: 'meet', label: 'ミートを安定', gain: Math.max(0, meetOpt - launchOpt), target: `初速 ${meetSpeed.toFixed(1)}m/s` },
    { id: 'speed', label: 'ヘッドスピード +2m/s', gain: Math.max(0, speedOpt - meetOpt), target: `HS ${(meetSpeed / club.smash + hsUp).toFixed(1)}m/s` },
  ];
  return {
    now,
    best: speedOpt,
    total: Math.max(0, speedOpt - now),
    steps,
    targets: { launch: target, speed: meetSpeed + hsUp * club.smash, headSpeed: meetSpeed / club.smash + hsUp },
  };
}

/** 前回との比較コメント */
export function growth(session, history) {
  const prev = history
    .filter((s) => s.club === session.club && s.id !== session.id && s.date < session.date)
    .sort((a, b) => b.date - a.date)[0];
  if (!prev) return null;
  const a = sessionStats(prev);
  const b = sessionStats(session);
  const dCarry = b.avgCarry - a.avgCarry;
  const dCons = b.scores.consistency - a.scores.consistency;
  const dSpeed = b.avgSpeed - a.avgSpeed;
  const parts = [];
  if (Math.abs(dCarry) >= 2) parts.push(`平均キャリーが${dCarry > 0 ? '+' : ''}${dCarry.toFixed(0)}yd`);
  if (Math.abs(dSpeed) >= 0.5) parts.push(`初速が${dSpeed > 0 ? '+' : ''}${dSpeed.toFixed(1)}m/s`);
  if (Math.abs(dCons) >= 3) parts.push(`安定性スコアが${dCons > 0 ? '+' : ''}${dCons}`);
  let text;
  if (!parts.length) text = '前回とほぼ同じ水準です。今のテーマを続けて、変化が出るまで反復しましょう。';
  else if (dCarry >= 0 && dCons >= 0) text = `前回より${parts.join('、')}。練習の成果が数字に出ています。`;
  else text = `前回比で${parts.join('、')}。疲れや調子の波もあるので、2〜3回分の推移で判断しましょう。`;
  return { prevDate: prev.date, dCarry, dCons, dSpeed, text };
}
