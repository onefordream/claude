import { jstDate, jstMonth, addDays } from './lib/date.js';
import { entitlementsOf, userStats } from './services.js';

// AI 分析などの重い処理を、リクエストとは切り離して順番に実行する常駐ワーカー。
// 記録の保存自体はすぐ終わり、AI の結果はあとから画面に反映される。

const MAX_ATTEMPTS = 3;

export function createWorker({ repo, ai, storage, intervalMs = 1500, log = console }) {
  let timer = null;
  let running = false;
  let lastCleanup = 0;

  const handlers = {
    async entry_insight(job) {
      const { userId } = job;
      const { entryId, insightId } = job.payload;
      const entry = repo.entries.get(userId, entryId);
      if (!entry) return; // 記録が削除済み
      const media = repo.db.prepare('SELECT * FROM media WHERE user_id = ? AND entry_id = ?').all(userId, entryId);
      const goal = entry.goal_id ? repo.goals.get(userId, entry.goal_id) : null;
      const goals = repo.goals.list(userId, 'active').slice(0, 5);
      const recent = repo.entries.recent(userId, 5, { excludeId: entryId });
      const { streak } = userStats(repo, userId);
      const ent = entitlementsOf(repo, userId);
      const month = jstMonth();
      const used = repo.billing.usage(userId, month, 'ai_entry_insights');
      const input = { entry, media, goal, goals, recent, streak: streak.current, allowImages: ent.can('aiImageReading'), storage };

      const saveLocal = (note) => {
        const mediaCounts = { image: 0, video: 0, audio: 0 };
        for (const m of media) mediaCounts[m.kind]++;
        const data = ai.local.entryInsight({ entry, mediaCounts, goal, streak: streak.current });
        repo.insights.setResult(userId, insightId, { status: 'done', provider: 'local', note, summary: data.summary, data });
      };

      if (!ai.enabled) {
        saveLocal(null);
      } else if (used >= ent.limit('aiEntryInsightsPerMonth')) {
        saveLocal('今月のAI分析の上限に達したため、簡易分析を表示しています。');
      } else {
        try {
          const { provider, data } = await ai.entryInsight(input);
          repo.tx(() => {
            repo.insights.setResult(userId, insightId, { status: 'done', provider, summary: data.summary, data });
            repo.billing.addUsage(userId, month, 'ai_entry_insights', 1);
          });
        } catch (err) {
          if (err.retryable && job.attempts < MAX_ATTEMPTS) throw err;
          log.error?.(`[worker] entry_insight 失敗のため簡易分析に切り替え: ${err.message}`);
          saveLocal('AI分析を完了できなかったため、簡易分析を表示しています。');
        }
      }
      repo.entries.reindex(userId, entryId);
    },

    async weekly_review(job) {
      const { userId } = job;
      const { insightId, from, to } = job.payload;
      const entries = repo.entries.between(userId, from, to);
      const activeDays = new Set(entries.map((e) => e.local_date)).size;
      const { streak } = userStats(repo, userId);
      const goals = repo.goals.list(userId, 'active').slice(0, 5);
      try {
        const { provider, data } = await ai.weeklyReview({ entries, activeDays, streak: streak.current, goals, from, to });
        repo.insights.setResult(userId, insightId, { status: 'done', provider, summary: data.summary, data });
      } catch (err) {
        if (err.retryable && job.attempts < MAX_ATTEMPTS) throw err;
        const data = ai.local.weeklyReview({ entries, activeDays, streak: streak.current });
        repo.insights.setResult(userId, insightId, {
          status: 'done', provider: 'local', note: 'AI分析を完了できなかったため、簡易分析を表示しています。', summary: data.summary, data,
        });
      }
    },
  };

  async function runOne() {
    const job = repo.jobs.claim();
    if (!job) return false;
    const job2 = { ...job, userId: job.user_id };
    try {
      const handler = handlers[job.type];
      if (!handler) throw new Error(`unknown job type: ${job.type}`);
      await handler(job2);
      repo.jobs.done(job.id);
    } catch (err) {
      if (err.retryable && job.attempts < MAX_ATTEMPTS) {
        const delay = 5000 * 2 ** (job.attempts - 1);
        repo.jobs.retry(job.id, err.message, new Date(Date.now() + delay));
      } else {
        log.error?.(`[worker] job ${job.id} (${job.type}) failed: ${err.stack || err.message}`);
        repo.jobs.fail(job.id, err.message);
        if (job.payload?.insightId && job.user_id) {
          repo.insights.setResult(job.user_id, job.payload.insightId, { status: 'failed', error: err.message });
        }
      }
    }
    return true;
  }

  async function cleanup() {
    // 記録に添付されないまま24時間経ったアップロードを削除
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    for (const m of repo.media.orphansOlderThan(cutoff)) {
      await storage.remove(m.path).catch(() => {});
      repo.tx(() => {
        repo.media.remove(m.user_id, m.id);
        repo.billing.addUsage(m.user_id, 'all', 'storage_bytes', -m.size);
      });
    }
    repo.sessions.removeExpired();
    repo.jobs.purgeOld(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
  }

  async function tick() {
    if (running) return;
    running = true;
    try {
      while (await runOne()) { /* キューが空になるまで続ける */ }
      if (Date.now() - lastCleanup > 60 * 60 * 1000) {
        lastCleanup = Date.now();
        await cleanup();
      }
    } catch (err) {
      log.error?.('[worker] tick error', err);
    } finally {
      running = false;
    }
  }

  return {
    start() {
      repo.jobs.requeueStale();
      timer = setInterval(tick, intervalMs);
      timer.unref();
      setImmediate(tick);
    },
    stop() {
      clearInterval(timer);
    },
    /** 新しいジョブが入ったらすぐ処理を始める */
    kick() {
      setImmediate(tick);
    },
    tick,
    cleanup,
  };
}

export function weekRange(today = jstDate()) {
  return { from: addDays(today, -6), to: today };
}
