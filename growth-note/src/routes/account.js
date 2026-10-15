import { HttpError, sendJson } from '../lib/http.js';
import { jstDate, jstMonth, addDays } from '../lib/date.js';
import { PRICING } from '../lib/plans.js';
import { golfRoundsWithStats } from '../services.js';

export function registerAccountRoutes(router, app) {
  const { repo, db } = app;
  const q = (sql) => db.prepare(sql);

  /**
   * 自分のデータの書き出し（JSON）。記録・目標・ゴルフ・コメントまで、本人のものをすべて含める。
   * 写真・動画は容量が大きいため一覧のみ（アプリから個別に保存できる）。
   */
  router.get('/api/me/export', async (ctx) => {
    const user = ctx.user;
    const rows = q('SELECT * FROM entries WHERE user_id = ? ORDER BY local_date, created_at').all(user.id);
    const entries = repo.entries.enrich(user.id, rows).map((e) => ({
      date: e.localDate,
      createdAt: e.createdAt,
      body: e.body,
      mood: e.mood,
      goal: e.goal?.title ?? null,
      media: e.media.map((m) => ({ kind: m.kind, mime: m.mime, size: m.size, createdAt: m.created_at })),
      aiReflection: e.insight && !e.insight.locked && e.insight.status === 'done'
        ? { summary: e.insight.summary, ...e.insight.data } : null,
      sharedWith: e.shares.map((s) => s.storeName),
      comments: e.comments.map((c) => ({ store: c.storeName, author: c.authorName, body: c.body, createdAt: c.createdAt })),
    }));
    const goals = q('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at').all(user.id).map((g) => ({
      title: g.title, icon: g.icon, target: g.target_value, current: g.current_value, unit: g.unit,
      startDate: g.start_date, dueDate: g.due_date, status: g.status, completedAt: g.completed_at,
      logs: repo.goals.logs(user.id, g.id, 10000).map((l) => ({ date: l.local_date, delta: l.delta, note: l.note })),
    }));
    const golf = golfRoundsWithStats(repo, user.id, { limit: 10000 }).map(({ round, stats }) => ({
      date: round.played_on, course: round.course_name, holes: round.holes_count, mode: round.mode, status: round.status,
      pars: round.pars, totals: round.totals, driveDistance: round.drive_distance, note: round.note,
      holeScores: round.mode === 'hole' ? repo.golf.holes(user.id, round.id).map((h) => ({
        hole: h.hole_no, par: h.par, score: h.score, putts: h.putts, teeShot: h.fairway, ob: h.ob, bunker: !!h.bunker, penalty: h.penalty,
      })) : null,
      stats: { score: stats.score, toPar: stats.toPar, putts: stats.putts, fwPct: stats.fwPct, girPct: stats.girPct, scramblePct: stats.scramblePct, sandPct: stats.sandPct, ob: stats.ob },
    }));
    const data = {
      exportedAt: new Date().toISOString(),
      service: 'Growth Note',
      user: { email: user.email, displayName: user.display_name, createdAt: user.created_at, weeklyTarget: user.weekly_target },
      entries,
      goals,
      golfRounds: golf,
      stores: repo.links.forUser(user.id).map((l) => ({ name: l.store_name, status: l.status, shareMode: l.share_mode, since: l.created_at })),
    };
    const body = JSON.stringify(data, null, 2);
    ctx.res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="growth-note-${jstDate()}.json"`,
      'Content-Length': Buffer.byteLength(body),
      'Cache-Control': 'no-store',
    });
    ctx.res.end(body);
  });

  // ---------- 運営者向けの数字（ADMIN_EMAILS に登録したアカウントだけ） ----------
  router.get('/api/admin/stats', async (ctx) => {
    if (!app.isAdmin(ctx.user)) throw new HttpError(404, 'not_found', '見つかりません');
    const today = jstDate();
    const d7 = addDays(today, -6);
    const d30 = addDays(today, -29);
    const iso = (ymd) => `${addDays(ymd, -1)}T15:00:00.000Z`; // JST 0時
    const now = new Date().toISOString();
    const count = (sql, ...args) => q(sql).get(...args).c;

    const subs = q(`SELECT plan, status, billing_interval, cancel_at_period_end, current_period_end, provider FROM subscriptions WHERE plan = 'pro'`).all()
      .filter((s) => !s.current_period_end || s.current_period_end > now);
    const paying = subs.filter((s) => s.status === 'active' || s.status === 'past_due');
    const mrr = paying.filter((s) => s.provider === 'stripe').reduce((sum, s) => sum + (s.billing_interval === 'year' ? PRICING.year.amount / 12 : PRICING.month.amount), 0);
    const signups = q(`SELECT substr(datetime(created_at, '+9 hours'), 1, 10) AS d, COUNT(*) AS c FROM users WHERE created_at >= ? GROUP BY d ORDER BY d`).all(iso(addDays(today, -13)));
    const month = jstMonth();

    sendJson(ctx.res, 200, {
      today,
      users: {
        total: count('SELECT COUNT(*) AS c FROM users'),
        new7d: count('SELECT COUNT(*) AS c FROM users WHERE created_at >= ?', iso(d7)),
        new30d: count('SELECT COUNT(*) AS c FROM users WHERE created_at >= ?', iso(d30)),
        active7d: count('SELECT COUNT(DISTINCT user_id) AS c FROM entries WHERE local_date >= ?', d7),
        active30d: count('SELECT COUNT(DISTINCT user_id) AS c FROM entries WHERE local_date >= ?', d30),
        signupsByDay: Array.from({ length: 14 }, (_, i) => {
          const d = addDays(today, i - 13);
          return { date: d, count: signups.find((x) => x.d === d)?.c ?? 0 };
        }),
      },
      billing: {
        paying: paying.length,
        payingStripe: paying.filter((s) => s.provider === 'stripe').length,
        trialing: subs.filter((s) => s.status === 'trialing').length,
        pastDue: subs.filter((s) => s.status === 'past_due').length,
        cancelScheduled: subs.filter((s) => s.cancel_at_period_end).length,
        yearly: paying.filter((s) => s.billing_interval === 'year').length,
        mrr: Math.round(mrr),
      },
      activity: {
        entries7d: count('SELECT COUNT(*) AS c FROM entries WHERE local_date >= ?', d7),
        golfRounds30d: count(`SELECT COUNT(*) AS c FROM golf_rounds WHERE status = 'done' AND played_on >= ?`, d30),
        stores: count('SELECT COUNT(*) AS c FROM stores'),
        activeLinks: count(`SELECT COUNT(*) AS c FROM store_links WHERE status = 'active'`),
      },
      ai: {
        month,
        entryInsights: count(`SELECT COALESCE(SUM(value), 0) AS c FROM usage_counters WHERE period = ? AND key = 'ai_entry_insights'`, month),
        trialInsights: count(`SELECT COALESCE(SUM(value), 0) AS c FROM usage_counters WHERE period = 'all' AND key = 'ai_trial_used'`),
        selfAnalyses: count(`SELECT COALESCE(SUM(value), 0) AS c FROM usage_counters WHERE period = ? AND key = 'ai_self_analysis'`, month),
        golfCoach: count(`SELECT COALESCE(SUM(value), 0) AS c FROM usage_counters WHERE period = ? AND key = 'ai_golf_coach'`, month),
        enabled: app.ai.enabled,
      },
      system: {
        jobsQueued: count(`SELECT COUNT(*) AS c FROM jobs WHERE status = 'queued'`),
        jobsFailed24h: count(`SELECT COUNT(*) AS c FROM jobs WHERE status = 'failed' AND updated_at >= ?`, new Date(Date.now() - 86400000).toISOString()),
        mailEnabled: app.mailer.enabled,
        billingMode: app.config.stripe.secretKey ? 'stripe' : app.config.billingDemo ? 'demo' : 'unavailable',
      },
    });
  });
}
