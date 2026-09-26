import { jstDate, jstMonth } from './lib/date.js';
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
