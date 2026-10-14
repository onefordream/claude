import { jstDate, jstMonth, addDays } from './lib/date.js';
import { AXES, axisScores, overallOf, rankOf, experience, levelOf, gapsOf, strengthsOf, trendOf } from './lib/growth.js';
import { computeStreak, badges } from './lib/stats.js';
import { entitlementsFor, effectivePlan } from './lib/plans.js';

export const MB = 1024 * 1024;

export function entitlementsOf(repo, userId) {
  return entitlementsFor(effectivePlan(repo.billing.subscription(userId)));
}

/** 継続日数・バッジなど、複数の画面で使う集計 */
export function userStats(repo, userId, today = jstDate()) {
  const counts = repo.entries.countsByDate(userId);
  const streak = computeStreak(counts.keys(), today);
  const totalEntries = repo.entries.total(userId);
  const goalsDone = repo.goals.countDone(userId);
  return {
    today,
    counts,
    streak,
    totalEntries,
    activeDays: counts.size,
    goalsDone,
    badges: badges({ bestStreakDays: streak.best, totalEntries, goalsDone }),
  };
}

/** /api/me 等で返すユーザー情報（パスワードハッシュ等は含めない） */
export function publicMe(repo, user) {
  const ent = entitlementsOf(repo, user.id);
  const month = jstMonth();
  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      weeklyTarget: user.weekly_target,
      createdAt: user.created_at,
    },
    plan: { id: ent.plan, label: ent.label, features: ent.features, limits: ent.limits },
    usage: {
      month,
      aiEntryInsights: repo.billing.usage(user.id, month, 'ai_entry_insights'),
      storageBytes: repo.billing.usage(user.id, 'all', 'storage_bytes'),
      activeGoals: repo.goals.countActive(user.id),
    },
    ai: { enabled: null }, // app.js で上書き
  };
}

// ---- 成長分析（プロ機能） ----
export const GROWTH_MIN_ENTRIES = 3;

/** 成長レポート（レベル・6軸・推移・足りないもの）。ユーザー本人のデータだけで計算する */
export function growthReport(repo, user, today = jstDate()) {
  const since = addDays(today, -(28 + 7 * 7));
  const entries = repo.db.prepare(`SELECT e.local_date, e.body, e.mood,
      (SELECT COUNT(*) FROM media m WHERE m.entry_id = e.id) AS media_count
    FROM entries e WHERE e.user_id = ? AND e.local_date >= ?`).all(user.id, since);
  const goals = repo.db.prepare(`SELECT target_value, current_value, start_date, due_date, status, completed_at
    FROM goals WHERE user_id = ? AND status != 'archived'`).all(user.id);
  const goalLogs = repo.db.prepare('SELECT local_date FROM goal_logs WHERE user_id = ? AND local_date >= ?').all(user.id, since);
  const goalLogTotal = repo.db.prepare('SELECT COUNT(*) AS c FROM goal_logs WHERE user_id = ?').get(user.id).c;
  const stats = userStats(repo, user.id, today);

  const input = { entries, goals, goalLogs, weeklyTarget: user.weekly_target, end: today };
  const scores = axisScores(input);
  const prev = axisScores({ ...input, end: addDays(today, -28) });
  const overall = overallOf(scores);
  return {
    ready: stats.totalEntries >= GROWTH_MIN_ENTRIES,
    needEntries: Math.max(0, GROWTH_MIN_ENTRIES - stats.totalEntries),
    level: levelOf(experience({
      totalEntries: stats.totalEntries, activeDays: stats.activeDays, goalLogs: goalLogTotal,
      goalsDone: stats.goalsDone, bestStreak: stats.streak.best,
    })),
    overall,
    overallPrev: overallOf(prev),
    rank: rankOf(overall),
    axes: AXES.map((a) => ({ ...a, score: scores[a.key], prev: prev[a.key] })),
    scores,
    trend: trendOf(input),
    gaps: gapsOf(scores),
    strengths: strengthsOf(scores),
  };
}
