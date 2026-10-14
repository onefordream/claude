import { HttpError, sendJson } from '../lib/http.js';
import { jstMonth } from '../lib/date.js';
import { entitlementsOf, growthReport } from '../services.js';

export function registerGrowthRoutes(router, app) {
  const { repo, worker } = app;

  function analysisState(userId, ent) {
    const month = jstMonth();
    const limit = ent.limit('aiSelfAnalysesPerMonth');
    const used = repo.billing.usage(userId, month, 'ai_self_analysis');
    return { latest: repo.insights.latestAny(userId, 'analysis'), remaining: Math.max(0, limit - used), limit };
  }

  /**
   * 成長分析。プロでなければ数値を一切返さない（画面のぼかしは見本データで作る）。
   * 無料の人には「いちばんの強み」の名前だけを見せて、続きを見たくなる入口にする。
   */
  router.get('/api/growth', async (ctx) => {
    const user = ctx.user;
    const ent = entitlementsOf(repo, user.id);
    const report = growthReport(repo, user);
    if (!ent.can('growthAnalytics')) {
      sendJson(ctx.res, 200, {
        locked: true,
        ready: report.ready,
        needEntries: report.needEntries,
        teaser: report.ready ? { topStrength: report.strengths[0].label } : null,
      });
      return;
    }
    const { scores, ...rest } = report;
    sendJson(ctx.res, 200, { locked: false, ...rest, analysis: analysisState(user.id, ent) });
  });

  router.post('/api/growth/analysis', async (ctx) => {
    const user = ctx.user;
    const ent = entitlementsOf(repo, user.id);
    if (!ent.can('aiSelfAnalysis')) throw new HttpError(402, 'plan_required', 'AI自己分析はプロプランの機能です');
    const report = growthReport(repo, user);
    if (!report.ready) throw new HttpError(400, 'not_ready', `あと${report.needEntries}件記録すると分析できます`);
    const state = analysisState(user.id, ent);
    if (state.latest?.status === 'pending') throw new HttpError(409, 'pending', '自己分析を作成中です');
    if (state.remaining <= 0) throw new HttpError(429, 'limit', `今月のAI自己分析は${state.limit}回までです`);
    repo.tx(() => {
      const insightId = repo.insights.createPending(user.id, { scope: 'analysis' });
      repo.jobs.enqueue(user.id, 'self_analysis', { insightId });
      repo.billing.addUsage(user.id, jstMonth(), 'ai_self_analysis', 1);
    });
    worker.kick();
    sendJson(ctx.res, 202, { analysis: analysisState(user.id, ent) });
  });
}
