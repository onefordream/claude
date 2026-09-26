import { HttpError, sendJson } from '../lib/http.js';
import { jstDate, jstHour, addDays, diffDays } from '../lib/date.js';
import { weekActivity, calendar } from '../lib/stats.js';
import { userStats, entitlementsOf } from '../services.js';
import { presentGoal } from './goals.js';
import { weekRange } from '../worker.js';

// 特定ジャンルに偏らない「今日の問いかけ」。日付ごとに入れ替わる。
const DAILY_PROMPTS = [
  '今日、少しでも前に進めたことは？',
  '今日いちばん集中できた時間は？',
  '昨日の自分より、できるようになったことは？',
  '今日の「うまくいったこと」をひとつ教えてください',
  '今日つまずいたことと、次に試したいことは？',
  '今日の自分に、ひとことかけるとしたら？',
  '今日やってみて、気づいたことは？',
  '明日の自分に引き継ぎたいことは？',
  '今日、続けられた小さな習慣は？',
  '今日の気分と、その理由は？',
];

const FALLBACK_STEPS = [
  '5分だけ、今日取り組みたいことに手をつけてみる',
  '今日の記録を、ひとことだけ残してみる',
  '明日やることを1つだけ決めておく',
  '最近の記録を1つ読み返して、変化を見つける',
];

function greeting(hour) {
  if (hour < 4) return 'こんばんは';
  if (hour < 11) return 'おはようございます';
  if (hour < 18) return 'こんにちは';
  return 'こんばんは';
}

export function registerHomeRoutes(router, app) {
  const { repo, worker } = app;

  router.get('/api/home', async (ctx) => {
    const user = ctx.user;
    const today = jstDate();
    const stats = userStats(repo, user.id, today);
    const dayIndex = diffDays('2024-01-01', today);
    const goals = repo.goals.list(user.id, 'active').map((g) => presentGoal(g, today));

    // 「今日の一歩」: 直近のAI提案 → 目標 → 汎用の順に選ぶ
    const latest = repo.insights.latest(user.id, 'entry');
    let todayStep = null;
    if (latest?.data?.next_actions?.length && latest.created_at >= addDays(today, -3)) {
      todayStep = { text: latest.data.next_actions[0], source: latest.provider === 'claude' ? 'ai' : 'hint', entryId: latest.entry_id };
    } else if (goals.length) {
      const g = goals.find((x) => x.pace === 'behind') || goals[0];
      todayStep = { text: `「${g.title}」を少しだけ進める`, source: 'goal', goalId: g.id };
    } else {
      todayStep = { text: FALLBACK_STEPS[dayIndex % FALLBACK_STEPS.length], source: 'hint' };
    }

    const mediaCounts = repo.media.counts(user.id);
    sendJson(ctx.res, 200, {
      today,
      greeting: greeting(jstHour()),
      displayName: user.display_name,
      prompt: DAILY_PROMPTS[dayIndex % DAILY_PROMPTS.length],
      recordedToday: stats.streak.recordedToday,
      todayCount: stats.counts.get(today) || 0,
      streak: stats.streak,
      week: weekActivity(stats.counts, today, user.weekly_target),
      todayStep,
      goals: goals.slice(0, 3),
      goalsTotal: goals.length,
      latestInsight: latest ? { entryId: latest.entry_id, summary: latest.summary, data: latest.data, provider: latest.provider, createdAt: latest.created_at } : null,
      totals: {
        entries: stats.totalEntries,
        activeDays: stats.activeDays,
        media: mediaCounts.image + mediaCounts.video + mediaCounts.audio,
        goalsDone: stats.goalsDone,
      },
    });
  });

  /** マイページ用の「成長資産」 */
  router.get('/api/stats', async (ctx) => {
    const today = jstDate();
    const stats = userStats(repo, ctx.user.id, today);
    const mediaCounts = repo.media.counts(ctx.user.id);
    const totalChars = repo.db.prepare('SELECT COALESCE(SUM(LENGTH(body)), 0) AS n FROM entries WHERE user_id = ?').get(ctx.user.id).n;
    const first = repo.db.prepare('SELECT MIN(local_date) AS d FROM entries WHERE user_id = ?').get(ctx.user.id).d;
    sendJson(ctx.res, 200, {
      today,
      streak: stats.streak,
      totals: { entries: stats.totalEntries, activeDays: stats.activeDays, goalsDone: stats.goalsDone, chars: totalChars, ...mediaCounts },
      since: first,
      calendar: calendar(stats.counts, today, 15),
      badges: stats.badges,
    });
  });

  router.get('/api/insights/weekly', async (ctx) => {
    const latest = repo.insights.latestAny(ctx.user.id, 'weekly');
    sendJson(ctx.res, 200, { review: latest });
  });

  router.post('/api/insights/weekly', async (ctx) => {
    const userId = ctx.user.id;
    const ent = entitlementsOf(repo, userId);
    if (!ent.can('weeklyReview')) {
      throw new HttpError(402, 'plan_required', 'AIによる週間ふりかえりはプロプランの機能です');
    }
    const latest = repo.insights.latestAny(userId, 'weekly');
    if (latest?.status === 'pending') throw new HttpError(409, 'pending', 'ふりかえりを作成中です');
    const { from, to } = weekRange();
    const review = repo.tx(() => {
      const insightId = repo.insights.createPending(userId, { scope: 'weekly', periodStart: from, periodEnd: to });
      repo.jobs.enqueue(userId, 'weekly_review', { insightId, from, to });
      return repo.insights.get(userId, insightId);
    });
    worker.kick();
    sendJson(ctx.res, 202, { review });
  });
}
