import { jstDate, jstMonth, addDays } from './lib/date.js';
import { entitlementsOf, userStats, growthReport, golfAnalysisData } from './services.js';

// AI 分析などの重い処理を、リクエストとは切り離して順番に実行する常駐ワーカー。
// 記録の保存自体はすぐ終わり、AI の結果はあとから画面に反映される。

const MAX_ATTEMPTS = 3;

export function createWorker({ repo, ai, storage, intervalMs = 1500, log = console, reportError = () => {}, db = null, concurrency = 4, backup = null }) {
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

      const saveLocal = (note, extra = {}) => {
        const mediaCounts = { image: 0, video: 0, audio: 0 };
        for (const m of media) mediaCounts[m.kind]++;
        const data = { ...ai.local.entryInsight({ entry, mediaCounts, goal, streak: streak.current }), ...extra };
        repo.insights.setResult(userId, insightId, { status: 'done', provider: 'local', note, summary: data.summary, data });
      };

      // 無料プランは体験回数だけAIふりかえりを使える。使い切ったら「ロック」して中身は見せない
      const hasAccess = ent.can('aiEntryInsight');
      const trialLeft = ent.limit('aiTrialCredits') - repo.billing.usage(userId, 'all', 'ai_trial_used');
      const useTrial = !hasAccess && trialLeft > 0;
      const trialNote = useTrial ? `無料体験のAIふりかえりです（残り${trialLeft - 1}回）` : null;
      const countUse = () => {
        if (useTrial) repo.billing.addUsage(userId, 'all', 'ai_trial_used', 1);
        else repo.billing.addUsage(userId, month, 'ai_entry_insights', 1);
      };

      if (!hasAccess && !useTrial) {
        saveLocal(null, { locked: true });
      } else if (hasAccess && used >= ent.limit('aiEntryInsightsPerMonth')) {
        saveLocal('今月のAI分析の上限に達したため、簡易分析を表示しています。');
      } else if (!ai.enabled) {
        repo.tx(() => {
          saveLocal(trialNote);
          countUse();
        });
      } else {
        try {
          const { provider, data } = await ai.entryInsight(input);
          repo.tx(() => {
            repo.insights.setResult(userId, insightId, { status: 'done', provider, note: trialNote, summary: data.summary, data });
            countUse();
          });
        } catch (err) {
          if (err.retryable && job.attempts < MAX_ATTEMPTS) throw err;
          log.error?.(`[worker] entry_insight 失敗のため簡易分析に切り替え: ${err.message}`);
          saveLocal('AI分析を完了できなかったため、簡易分析を表示しています。');
        }
      }
      repo.entries.reindex(userId, entryId);
    },

    async golf_coach(job) {
      const { userId } = job;
      const { insightId } = job.payload;
      const data = golfAnalysisData(repo, userId);
      if (!data) {
        repo.insights.setResult(userId, insightId, { status: 'failed', error: 'no rounds' });
        return;
      }
      try {
        const { provider, data: out } = await ai.golfCoach(data);
        repo.insights.setResult(userId, insightId, { status: 'done', provider, summary: out.summary, data: out });
      } catch (err) {
        if (err.retryable && job.attempts < MAX_ATTEMPTS) throw err;
        const out = ai.local.golfCoach(data);
        repo.insights.setResult(userId, insightId, {
          status: 'done', provider: 'local', note: 'AI分析を完了できなかったため、簡易分析を表示しています。', summary: out.summary, data: out,
        });
      }
    },

    async self_analysis(job) {
      const { userId } = job;
      const { insightId } = job.payload;
      const user = repo.users.get(userId);
      if (!user) return;
      const report = growthReport(repo, user);
      const entries = repo.entries.recent(userId, 30);
      try {
        const { provider, data } = await ai.selfAnalysis({ report, entries });
        repo.insights.setResult(userId, insightId, { status: 'done', provider, summary: data.summary, data });
      } catch (err) {
        if (err.retryable && job.attempts < MAX_ATTEMPTS) throw err;
        const data = ai.local.selfAnalysis({ report });
        repo.insights.setResult(userId, insightId, {
          status: 'done', provider: 'local', note: 'AI分析を完了できなかったため、簡易分析を表示しています。', summary: data.summary, data,
        });
      }
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
        reportError(`ジョブ失敗 ${job.type} #${job.id}: ${err.message}`);
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
    await dailyBackup();
  }

  /**
   * 1日1回、データベースを丸ごとコピーして残す（VACUUM INTO は書き込み中でも一貫したコピーを作れる）。
   * 古いものは keepDays 日分を残して消す。写真・動画のファイルは別途バックアップが必要。
   */
  async function dailyBackup() {
    if (!backup || !db) return;
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    await fs.mkdir(backup.dir, { recursive: true });
    const today = jstDate();
    const file = path.join(backup.dir, `growth-note-${today}.db`);
    try {
      await fs.access(file);
    } catch {
      try {
        db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
        log.info?.(`[backup] ${file}`);
      } catch (err) {
        reportError(`バックアップ失敗: ${err.message}`);
        return;
      }
    }
    const keepFrom = addDays(today, -(backup.keepDays - 1));
    for (const name of await fs.readdir(backup.dir)) {
      const m = /^growth-note-(\d{4}-\d{2}-\d{2})\.db$/.exec(name);
      if (m && m[1] < keepFrom) await fs.rm(path.join(backup.dir, name), { force: true });
    }
  }

  async function tick() {
    if (running) return;
    running = true;
    try {
      // 複数のジョブを同時に処理する（AI の応答待ちで後ろの人が待たされないように）
      const lane = async () => {
        while (await runOne()) { /* キューが空になるまで続ける */ }
      };
      await Promise.all(Array.from({ length: Math.max(1, concurrency) }, lane));
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
    dailyBackup,
  };
}

export function weekRange(today = jstDate()) {
  return { from: addDays(today, -6), to: today };
}
