import { HttpError, readJson, sendJson, str, num } from '../lib/http.js';
import { jstDate, addDays, diffDays, isValidYmd } from '../lib/date.js';
import { entitlementsOf } from '../services.js';

export function presentGoal(g, today = jstDate()) {
  const progress = g.target_value > 0 ? Math.min(1, g.current_value / g.target_value) : 0;
  const totalDays = Math.max(1, diffDays(g.start_date, g.due_date));
  const elapsed = Math.min(totalDays, Math.max(0, diffDays(g.start_date, today)));
  const daysLeft = diffDays(today, g.due_date);
  // 期間の経過割合と比べて、ペースが順調かどうか
  const expected = elapsed / totalDays;
  const pace = g.status === 'done' ? 'done' : daysLeft < 0 ? 'overdue' : progress + 0.05 >= expected ? 'on_track' : 'behind';
  return {
    id: g.id,
    title: g.title,
    icon: g.icon,
    targetValue: g.target_value,
    currentValue: g.current_value,
    unit: g.unit,
    startDate: g.start_date,
    dueDate: g.due_date,
    status: g.status,
    completedAt: g.completed_at,
    progress,
    daysLeft,
    pace,
  };
}

function goalInput(body, { partial = false } = {}) {
  const out = {};
  if (!partial || body.title !== undefined) out.title = str(body.title, { min: 1, max: 60, field: '目標' });
  if (!partial || body.icon !== undefined) out.icon = str(body.icon || '🎯', { min: 1, max: 8, field: 'アイコン' });
  if (!partial || body.targetValue !== undefined) out.targetValue = num(body.targetValue, { min: 0.01, max: 1e7, field: '目標値' });
  if (!partial || body.unit !== undefined) out.unit = str(body.unit ?? '回', { max: 10, field: '単位' });
  if (!partial || body.dueDate !== undefined) {
    if (!isValidYmd(body.dueDate)) throw new HttpError(400, 'invalid_input', '期限の日付が正しくありません');
    out.dueDate = body.dueDate;
  }
  return out;
}

export function registerGoalRoutes(router, app) {
  const { repo } = app;

  function load(userId, id) {
    const g = repo.goals.get(userId, id);
    if (!g) throw new HttpError(404, 'not_found', '目標が見つかりません');
    return g;
  }

  router.get('/api/goals', async (ctx) => {
    const status = ctx.query.get('status');
    const today = jstDate();
    const list = repo.goals.list(ctx.user.id, ['active', 'done', 'archived'].includes(status) ? status : null);
    sendJson(ctx.res, 200, { goals: list.map((g) => presentGoal(g, today)) });
  });

  router.get('/api/goals/:id', async (ctx) => {
    const g = load(ctx.user.id, ctx.params.id);
    sendJson(ctx.res, 200, { goal: presentGoal(g), logs: repo.goals.logs(ctx.user.id, g.id) });
  });

  router.post('/api/goals', async (ctx) => {
    const userId = ctx.user.id;
    const input = goalInput(await readJson(ctx.req));
    const today = jstDate();
    if (input.dueDate < today) throw new HttpError(400, 'invalid_input', '期限は今日以降の日付にしてください');
    if (input.dueDate > addDays(today, 365 * 5)) throw new HttpError(400, 'invalid_input', '期限は5年以内にしてください');
    const ent = entitlementsOf(repo, userId);
    const max = ent.limit('maxActiveGoals');
    if (repo.goals.countActive(userId) >= max) {
      throw new HttpError(402, 'plan_limit', `${ent.label}プランで同時に取り組める目標は${max}つまでです`, { limit: max });
    }
    const g = repo.goals.create(userId, { ...input, startDate: today });
    sendJson(ctx.res, 201, { goal: presentGoal(g, today) });
  });

  router.patch('/api/goals/:id', async (ctx) => {
    const userId = ctx.user.id;
    const g = load(userId, ctx.params.id);
    const body = await readJson(ctx.req);
    const input = goalInput(body, { partial: true });
    if (body.status !== undefined) {
      if (!['active', 'archived'].includes(body.status)) throw new HttpError(400, 'invalid_input', '状態の値が正しくありません');
      // アーカイブから戻すときは、達成済みなら done に戻す
      input.status = body.status === 'active' && g.current_value >= (input.targetValue ?? g.target_value) ? 'done' : body.status;
      if (input.status === 'active' && g.status === 'archived') {
        const ent = entitlementsOf(repo, userId);
        if (repo.goals.countActive(userId) >= ent.limit('maxActiveGoals')) {
          throw new HttpError(402, 'plan_limit', `同時に取り組める目標は${ent.limit('maxActiveGoals')}つまでです`);
        }
      }
    }
    const updated = repo.goals.update(userId, g.id, input);
    sendJson(ctx.res, 200, { goal: presentGoal(updated) });
  });

  router.post('/api/goals/:id/progress', async (ctx) => {
    const userId = ctx.user.id;
    const g = load(userId, ctx.params.id);
    if (g.status === 'archived') throw new HttpError(409, 'archived', 'アーカイブした目標には記録できません');
    const body = await readJson(ctx.req);
    const delta = num(body.delta, { min: -1e6, max: 1e6, field: '進捗' });
    if (delta === 0) throw new HttpError(400, 'invalid_input', '進捗の値を入力してください');
    const note = body.note ? str(body.note, { max: 200, field: 'メモ' }) : null;
    const result = repo.goals.addProgress(userId, g.id, { delta, note, localDate: jstDate() });
    sendJson(ctx.res, 200, { goal: presentGoal(result.goal), justCompleted: result.justCompleted });
  });

  router.delete('/api/goals/:id', async (ctx) => {
    if (!repo.goals.remove(ctx.user.id, ctx.params.id)) throw new HttpError(404, 'not_found', '目標が見つかりません');
    sendJson(ctx.res, 200, { ok: true });
  });
}
