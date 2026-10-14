import { addDays, diffDays } from './date.js';

// 成長の指標（6軸）とレベル。どのジャンルの記録にも当てはまるよう、
// 「何をしたか」ではなく「どう取り組んでいるか」を記録から数える。
// すべて 0〜100。直近 28 日（4週間）を見る。

export const AXES = [
  { key: 'consistency', label: '継続力', short: '継続' },
  { key: 'volume', label: '行動量', short: '行動' },
  { key: 'reflection', label: '振り返り力', short: '振り返り' },
  { key: 'goals', label: '目標推進力', short: '目標' },
  { key: 'challenge', label: '挑戦・改善', short: '挑戦' },
  { key: 'condition', label: 'コンディション', short: '調子' },
];

const WINDOW = 28;
const REFLECTION_RE = /気づ|わかった|分かった|なぜ|次は|次回|反省|学ん|学び|理由|ポイント|コツ|意識/;
const CHALLENGE_RE = /挑戦|初めて|はじめて|試し|試す|課題|改善|難し|できなかった|苦手|新しい|工夫|チャレンジ/;

const clamp = (v) => Math.max(0, Math.min(100, Math.round(v)));

/**
 * @param {object} p
 * @param {{local_date:string, body:string, mood:number|null, media_count:number}[]} p.entries 全期間の記録
 * @param {{target_value:number, current_value:number, start_date:string, due_date:string, status:string, completed_at:string|null}[]} p.goals
 * @param {{local_date:string}[]} p.goalLogs
 * @param {number} p.weeklyTarget
 * @param {string} p.end JST の基準日（この日を含む28日間を見る）
 */
export function axisScores({ entries, goals, goalLogs, weeklyTarget, end }) {
  const start = addDays(end, -(WINDOW - 1));
  const inWin = entries.filter((e) => e.local_date >= start && e.local_date <= end);
  const days = new Set(inWin.map((e) => e.local_date));
  const n = inWin.length;

  const consistency = (days.size / Math.max(1, weeklyTarget * 4)) * 100;

  const logs = goalLogs.filter((l) => l.local_date >= start && l.local_date <= end).length;
  const volume = ((n + logs * 0.5) / 24) * 100;

  const avgLen = n ? inWin.reduce((s, e) => s + [...(e.body || '')].length, 0) / n : 0;
  const reflectShare = n ? inWin.filter((e) => REFLECTION_RE.test(e.body || '')).length / n : 0;
  const reflection = n ? Math.min(1, avgLen / 120) * 60 + reflectShare * 40 : 0;

  let goalScore;
  const active = goals.filter((g) => g.status === 'active');
  const recentDone = goals.filter((g) => g.status === 'done' && g.completed_at && g.completed_at.slice(0, 10) >= start).length;
  if (!active.length && !recentDone) {
    goalScore = 15; // 目標がないと伸ばしにくい軸。目標を立てると上がる
  } else {
    const paces = active.map((g) => {
      const total = Math.max(1, diffDays(g.start_date, g.due_date));
      const elapsed = Math.min(total, Math.max(1, diffDays(g.start_date, end)));
      const expected = elapsed / total;
      const progress = g.target_value > 0 ? Math.min(1, g.current_value / g.target_value) : 0;
      return Math.min(1, progress / Math.max(0.05, expected));
    });
    const paceAvg = paces.length ? paces.reduce((a, b) => a + b, 0) / paces.length : 1;
    goalScore = paceAvg * 80 + Math.min(1, recentDone) * 20;
  }

  const challengeShare = n ? inWin.filter((e) => CHALLENGE_RE.test(e.body || '')).length / n : 0;
  const mediaShare = n ? inWin.filter((e) => e.media_count > 0).length / n : 0;
  const challenge = n ? challengeShare * 75 + mediaShare * 25 : 0;

  const moods = inWin.map((e) => e.mood).filter((m) => m);
  let condition = 50;
  if (moods.length) {
    const avg = moods.reduce((a, b) => a + b, 0) / moods.length;
    const variance = moods.reduce((s, m) => s + (m - avg) ** 2, 0) / moods.length;
    condition = ((avg - 1) / 4) * 100 - Math.sqrt(variance) * 6;
  }

  return {
    consistency: clamp(consistency),
    volume: clamp(volume),
    reflection: clamp(reflection),
    goals: clamp(goalScore),
    challenge: clamp(challenge),
    condition: clamp(condition),
  };
}

export const overallOf = (scores) => Math.round(AXES.reduce((s, a) => s + scores[a.key], 0) / AXES.length);

export function rankOf(score) {
  if (score >= 80) return { key: 'great', label: 'とても良い' };
  if (score >= 60) return { key: 'steady', label: '安定' };
  if (score >= 40) return { key: 'growing', label: '成長中' };
  return { key: 'start', label: 'これから' };
}

/** 経験値: 積み重ねは減らない。レベル L に必要な累計は 25 × L × (L + 1) */
export function experience({ totalEntries, activeDays, goalLogs, goalsDone, bestStreak }) {
  return totalEntries * 10 + activeDays * 5 + goalLogs * 3 + goalsDone * 50 + bestStreak * 2;
}

export function levelOf(xp) {
  const level = Math.floor((-1 + Math.sqrt(1 + (4 * xp) / 25)) / 2) + 1;
  const floor = 25 * (level - 1) * level;
  const next = 25 * level * (level + 1);
  return { level, xp, floor, next, progress: (xp - floor) / (next - floor) };
}

const ADVICE = {
  consistency: { advice: '記録する日が少なめです。毎日同じ時間に一言だけ書くと、続けやすくなります。', action: '寝る前の1分を「記録の時間」に決める' },
  volume: { advice: '取り組みの量がまだ少なめです。小さな行動でも記録すると、量が見えるようになります。', action: '今日やったことを1つ、短く記録する' },
  reflection: { advice: 'やったことに加えて「気づき」や「次はこうする」を書くと、学びが定着します。', action: '次の記録に「気づいたこと」を一文足す' },
  goals: { advice: '期限のある目標があると、日々の記録が前進として見えるようになります。', action: '1か月で達成できる小さな目標を1つ立てる' },
  challenge: { advice: '新しく試したことや、うまくいかなかったことも記録すると、改善のきっかけになります。', action: '今週ひとつ、いつもと違うやり方を試してみる' },
  condition: { advice: '気分が下がり気味の日が多いようです。休むことも成長の一部です。', action: '今日は早めに休み、気分の記録を続けてみる' },
};

/** 低い順に2つ（足りないもの） */
export function gapsOf(scores) {
  return AXES.map((a) => ({ ...a, score: scores[a.key] }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 2)
    .map((a) => ({ ...a, ...ADVICE[a.key] }));
}

export function strengthsOf(scores) {
  return AXES.map((a) => ({ ...a, score: scores[a.key] })).sort((a, b) => b.score - a.score).slice(0, 2);
}

/** 直近 8 週の総合スコアの推移（各週の終わり時点の 28 日間で計算） */
export function trendOf(input, weeks = 8) {
  const out = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const end = addDays(input.end, -7 * i);
    out.push({ end, score: overallOf(axisScores({ ...input, end })) });
  }
  return out;
}
