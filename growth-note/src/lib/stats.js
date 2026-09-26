import { addDays, diffDays, startOfWeek } from './date.js';

/**
 * 継続日数（ストリーク）。
 * - 今日記録があれば今日から遡って数える
 * - 今日まだ記録がなくても、昨日まで続いていれば「継続中（今日はまだ）」として昨日から数える
 * @param {Iterable<string>} dates 記録のある JST 日付
 * @param {string} today JST の今日
 */
export function computeStreak(dates, today) {
  const set = dates instanceof Set ? dates : new Set(dates);
  const recordedToday = set.has(today);
  let cursor = recordedToday ? today : addDays(today, -1);
  let current = 0;
  while (set.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  return { current, recordedToday, best: Math.max(bestStreak(set), current) };
}

export function bestStreak(dates) {
  const sorted = [...dates].sort();
  let best = 0;
  let run = 0;
  let prev = null;
  for (const d of sorted) {
    run = prev && diffDays(prev, d) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

/** 今週（月曜はじまり）の7日分の記録状況 */
export function weekActivity(countsByDate, today, target) {
  const monday = startOfWeek(today);
  const labels = ['月', '火', '水', '木', '金', '土', '日'];
  const days = labels.map((label, i) => {
    const date = addDays(monday, i);
    return {
      date,
      label,
      count: countsByDate.get(date) || 0,
      isToday: date === today,
      isFuture: date > today,
    };
  });
  const activeDays = days.filter((d) => d.count > 0).length;
  return { days, activeDays, target, achieved: activeDays >= target };
}

/** 直近 weeks 週のヒートマップ用データ（月曜はじまり、列=週） */
export function calendar(countsByDate, today, weeks = 12) {
  const start = addDays(startOfWeek(today), -7 * (weeks - 1));
  const cells = [];
  for (let i = 0; i < weeks * 7; i++) {
    const date = addDays(start, i);
    cells.push({ date, count: countsByDate.get(date) || 0, isFuture: date > today });
  }
  return { start, weeks, cells };
}

const STREAK_BADGES = [
  { id: 'streak3', threshold: 3, icon: '🌱', title: '3日連続', desc: '3日続けて記録した' },
  { id: 'streak7', threshold: 7, icon: '🌿', title: '1週間連続', desc: '7日続けて記録した' },
  { id: 'streak14', threshold: 14, icon: '🪴', title: '2週間連続', desc: '14日続けて記録した' },
  { id: 'streak30', threshold: 30, icon: '🌳', title: '30日連続', desc: '30日続けて記録した' },
  { id: 'streak100', threshold: 100, icon: '🏔️', title: '100日連続', desc: '100日続けて記録した' },
  { id: 'streak365', threshold: 365, icon: '👑', title: '365日連続', desc: '1年間続けて記録した' },
];

const COUNT_BADGES = [
  { id: 'entries1', threshold: 1, icon: '✏️', title: 'はじめの一歩', desc: '最初の記録を残した' },
  { id: 'entries10', threshold: 10, icon: '📗', title: '10の記録', desc: '記録が10件になった' },
  { id: 'entries50', threshold: 50, icon: '📚', title: '50の記録', desc: '記録が50件になった' },
  { id: 'entries100', threshold: 100, icon: '🏅', title: '100の記録', desc: '記録が100件になった' },
  { id: 'entries365', threshold: 365, icon: '💎', title: '365の記録', desc: '記録が365件になった' },
];

const GOAL_BADGES = [
  { id: 'goal1', threshold: 1, icon: '🎯', title: '目標達成', desc: 'はじめて目標を達成した' },
  { id: 'goal5', threshold: 5, icon: '🏆', title: '目標5つ達成', desc: '目標を5つ達成した' },
];

/** 獲得バッジ一覧（獲得済み・未獲得の両方を返す） */
export function badges({ bestStreakDays, totalEntries, goalsDone }) {
  const mark = (list, value) => list.map((b) => ({ ...b, earned: value >= b.threshold }));
  return [
    ...mark(COUNT_BADGES, totalEntries),
    ...mark(STREAK_BADGES, bestStreakDays),
    ...mark(GOAL_BADGES, goalsDone),
  ];
}

export function newlyEarned(before, after) {
  const had = new Set(before.filter((b) => b.earned).map((b) => b.id));
  return after.filter((b) => b.earned && !had.has(b.id));
}
