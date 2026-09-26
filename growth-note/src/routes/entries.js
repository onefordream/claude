import { HttpError, readJson, sendJson, str, num } from '../lib/http.js';
import { jstDate, addDays, isValidYmd } from '../lib/date.js';
import { newlyEarned } from '../lib/stats.js';
import { userStats } from '../services.js';

const MAX_BODY = 5000;
const BACKDATE_DAYS = 6;

export function registerEntryRoutes(router, app) {
  const { repo, storage, worker } = app;

  function loadEntry(userId, id) {
    const row = repo.entries.get(userId, id);
    if (!row) throw new HttpError(404, 'not_found', '記録が見つかりません');
    return repo.entries.enrich(userId, [row])[0];
  }

  router.get('/api/entries', async (ctx) => {
    const limit = Math.min(50, Math.max(1, Number(ctx.query.get('limit')) || 20));
    const result = repo.entries.list(ctx.user.id, {
      q: (ctx.query.get('q') || '').slice(0, 100),
      cursor: ctx.query.get('cursor'),
      goalId: ctx.query.get('goalId'),
      limit,
    });
    sendJson(ctx.res, 200, result);
  });

  router.get('/api/entries/:id', async (ctx) => {
    sendJson(ctx.res, 200, { entry: loadEntry(ctx.user.id, ctx.params.id) });
  });

  router.post('/api/entries', async (ctx) => {
    const userId = ctx.user.id;
    const body = await readJson(ctx.req);
    const text = str(body.body, { max: MAX_BODY, field: '本文' });
    const mood = body.mood == null || body.mood === '' ? null : num(body.mood, { min: 1, max: 5, integer: true, field: '気分' });
    const mediaIds = Array.isArray(body.mediaIds) ? body.mediaIds.filter((x) => typeof x === 'string').slice(0, 10) : [];
    const today = jstDate();
    const localDate = body.date ?? today;
    if (!isValidYmd(localDate) || localDate > today || localDate < addDays(today, -BACKDATE_DAYS)) {
      throw new HttpError(400, 'invalid_input', `日付は今日から${BACKDATE_DAYS}日前までを選べます`);
    }
    if (!text && !mediaIds.length) throw new HttpError(400, 'invalid_input', 'ひとことか、写真などを添えて記録しましょう');

    let goal = null;
    let goalDelta = 0;
    if (body.goalId) {
      goal = repo.goals.get(userId, String(body.goalId));
      if (!goal) throw new HttpError(400, 'invalid_input', '目標が見つかりません');
      if (body.goalDelta != null && body.goalDelta !== '') goalDelta = num(body.goalDelta, { min: 0, max: 1e6, field: '進捗' });
    }

    const before = userStats(repo, userId, today);
    const { entryId, goalResult } = repo.tx(() => {
      const entryId = repo.entries.create(userId, { body: text, mood, goalId: goal?.id ?? null, localDate });
      repo.media.attach(userId, entryId, mediaIds);
      const goalResult = goal && goalDelta > 0 ? repo.goals.addProgress(userId, goal.id, { delta: goalDelta, entryId, localDate }) : null;
      const insightId = repo.insights.createPending(userId, { entryId, scope: 'entry' });
      repo.jobs.enqueue(userId, 'entry_insight', { entryId, insightId });
      return { entryId, goalResult };
    });
    worker.kick();

    const after = userStats(repo, userId, today);
    sendJson(ctx.res, 201, {
      entry: loadEntry(userId, entryId),
      celebration: {
        streak: after.streak.current,
        streakBefore: before.streak.current,
        firstToday: !before.streak.recordedToday && localDate === today,
        totalEntries: after.totalEntries,
        newBadges: newlyEarned(before.badges, after.badges),
        goalCompleted: goalResult?.justCompleted ? { id: goalResult.goal.id, title: goalResult.goal.title, icon: goalResult.goal.icon } : null,
      },
    });
  });

  router.patch('/api/entries/:id', async (ctx) => {
    const userId = ctx.user.id;
    loadEntry(userId, ctx.params.id);
    const body = await readJson(ctx.req);
    const patch = {};
    if (body.body !== undefined) patch.body = str(body.body, { max: MAX_BODY, field: '本文' });
    if (body.mood !== undefined) patch.mood = body.mood === null ? null : num(body.mood, { min: 1, max: 5, integer: true, field: '気分' });
    repo.entries.update(userId, ctx.params.id, patch);
    sendJson(ctx.res, 200, { entry: loadEntry(userId, ctx.params.id) });
  });

  /** AI分析をやり直す（本文を編集したあとなど） */
  router.post('/api/entries/:id/insight', async (ctx) => {
    const userId = ctx.user.id;
    const entry = loadEntry(userId, ctx.params.id);
    if (entry.insight?.status === 'pending') throw new HttpError(409, 'pending', 'AI分析中です');
    repo.tx(() => {
      if (entry.insight) repo.db.prepare('DELETE FROM ai_insights WHERE id = ? AND user_id = ?').run(entry.insight.id, userId);
      const insightId = repo.insights.createPending(userId, { entryId: entry.id, scope: 'entry' });
      repo.jobs.enqueue(userId, 'entry_insight', { entryId: entry.id, insightId });
    });
    worker.kick();
    sendJson(ctx.res, 202, { entry: loadEntry(userId, entry.id) });
  });

  router.delete('/api/entries/:id', async (ctx) => {
    const userId = ctx.user.id;
    const files = repo.media.filesForEntry(userId, ctx.params.id);
    const removed = repo.tx(() => {
      const ok = repo.entries.remove(userId, ctx.params.id);
      if (ok) repo.billing.addUsage(userId, 'all', 'storage_bytes', -files.reduce((s, f) => s + f.size, 0));
      return ok;
    });
    if (!removed) throw new HttpError(404, 'not_found', '記録が見つかりません');
    await Promise.all(files.map((f) => storage.remove(f.path).catch(() => {})));
    sendJson(ctx.res, 200, { ok: true });
  });
}
