import { randomUUID } from 'node:crypto';
import { tx } from '../db.js';
import { nowIso } from '../lib/date.js';

// データアクセスはすべてここを通す。
// ユーザーのデータを扱う関数は必ず userId を第1引数に取り、SQL に user_id 条件を含める。

const newId = () => randomUUID();
const parseJson = (s, fallback) => {
  if (!s) return fallback;
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
};

export function createRepos(db) {
  const q = (sql) => db.prepare(sql);

  const users = {
    create({ email, passwordHash, displayName }) {
      const id = newId();
      const now = nowIso();
      tx(db, () => {
        q(`INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`).run(id, email, passwordHash, displayName, now, now);
        q(`INSERT INTO subscriptions (user_id, plan, status, updated_at) VALUES (?, 'free', 'active', ?)`).run(id, now);
      });
      return users.get(id);
    },
    get(id) {
      return q('SELECT * FROM users WHERE id = ?').get(id);
    },
    findByEmail(email) {
      return q('SELECT * FROM users WHERE email = ?').get(email);
    },
    update(id, { displayName, weeklyTarget }) {
      q(`UPDATE users SET display_name = COALESCE(?, display_name), weekly_target = COALESCE(?, weekly_target),
         updated_at = ? WHERE id = ?`).run(displayName ?? null, weeklyTarget ?? null, nowIso(), id);
      return users.get(id);
    },
    remove(id) {
      q('DELETE FROM entries_fts WHERE user_id = ?').run(id);
      q('DELETE FROM users WHERE id = ?').run(id);
    },
  };

  const sessions = {
    create(userId, tokenHash, expiresAt, userAgent) {
      const now = nowIso();
      q(`INSERT INTO sessions (id, user_id, token_hash, user_agent, expires_at, last_seen_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`).run(newId(), userId, tokenHash, userAgent?.slice(0, 200) ?? null, expiresAt, now, now);
    },
    findValid(tokenHash) {
      return q('SELECT * FROM sessions WHERE token_hash = ? AND expires_at > ?').get(tokenHash, nowIso());
    },
    touch(id, expiresAt) {
      q('UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE id = ?').run(nowIso(), expiresAt, id);
    },
    removeByHash(tokenHash) {
      q('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
    },
    removeExpired() {
      q('DELETE FROM sessions WHERE expires_at <= ?').run(nowIso());
    },
  };

  const billing = {
    subscription(userId) {
      return q('SELECT * FROM subscriptions WHERE user_id = ?').get(userId);
    },
    setPlan(userId, { plan, status = 'active', currentPeriodEnd = null, provider = null }) {
      q(`INSERT INTO subscriptions (user_id, plan, status, current_period_end, provider, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET plan = excluded.plan, status = excluded.status,
           current_period_end = excluded.current_period_end, provider = excluded.provider,
           updated_at = excluded.updated_at`).run(userId, plan, status, currentPeriodEnd, provider, nowIso());
    },
    usage(userId, period, key) {
      return q('SELECT value FROM usage_counters WHERE user_id = ? AND period = ? AND key = ?').get(userId, period, key)?.value ?? 0;
    },
    addUsage(userId, period, key, delta) {
      q(`INSERT INTO usage_counters (user_id, period, key, value) VALUES (?, ?, ?, MAX(0, ?))
         ON CONFLICT(user_id, period, key) DO UPDATE SET value = MAX(0, value + ?)`).run(userId, period, key, delta, delta);
    },
  };

  const media = {
    create(userId, { id, kind, mime, size, path }) {
      q(`INSERT INTO media (id, user_id, kind, mime, size, path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(id, userId, kind, mime, size, path, nowIso());
      return media.get(userId, id);
    },
    get(userId, id) {
      return q('SELECT * FROM media WHERE id = ? AND user_id = ?').get(id, userId);
    },
    /** 未添付のメディアだけを記録に紐づける（他人のメディアや添付済みのものは無視される） */
    attach(userId, entryId, ids) {
      const stmt = q('UPDATE media SET entry_id = ? WHERE id = ? AND user_id = ? AND entry_id IS NULL');
      let n = 0;
      for (const id of ids) n += Number(stmt.run(entryId, id, userId).changes);
      return n;
    },
    forEntries(userId, entryIds) {
      if (!entryIds.length) return [];
      const ph = entryIds.map(() => '?').join(',');
      return q(`SELECT id, entry_id, kind, mime, size, created_at FROM media
                WHERE user_id = ? AND entry_id IN (${ph}) ORDER BY created_at`).all(userId, ...entryIds);
    },
    filesForEntry(userId, entryId) {
      return q('SELECT id, path, size FROM media WHERE user_id = ? AND entry_id = ?').all(userId, entryId);
    },
    remove(userId, id) {
      q('DELETE FROM media WHERE id = ? AND user_id = ?').run(id, userId);
    },
    /** 下書きのまま放置されたメディア（全ユーザー横断：ワーカーの掃除用） */
    orphansOlderThan(iso) {
      return q('SELECT id, user_id, path, size FROM media WHERE entry_id IS NULL AND created_at < ?').all(iso);
    },
    counts(userId) {
      const rows = q(`SELECT kind, COUNT(*) AS c FROM media WHERE user_id = ? AND entry_id IS NOT NULL GROUP BY kind`).all(userId);
      const out = { image: 0, video: 0, audio: 0 };
      for (const r of rows) out[r.kind] = r.c;
      return out;
    },
  };

  const insights = {
    createPending(userId, { entryId = null, scope, periodStart = null, periodEnd = null }) {
      const id = newId();
      const now = nowIso();
      q(`INSERT INTO ai_insights (id, user_id, entry_id, scope, status, period_start, period_end, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?)`).run(id, userId, entryId, scope, periodStart, periodEnd, now, now);
      return id;
    },
    setResult(userId, id, { status, provider = null, note = null, summary = null, data = null, error = null }) {
      q(`UPDATE ai_insights SET status = ?, provider = ?, note = ?, summary = ?, data = ?, error = ?, updated_at = ?
         WHERE id = ? AND user_id = ?`).run(status, provider, note, summary, data ? JSON.stringify(data) : null, error, nowIso(), id, userId);
    },
    get(userId, id) {
      return shape(q('SELECT * FROM ai_insights WHERE id = ? AND user_id = ?').get(id, userId));
    },
    forEntries(userId, entryIds) {
      if (!entryIds.length) return [];
      const ph = entryIds.map(() => '?').join(',');
      return q(`SELECT * FROM ai_insights WHERE user_id = ? AND entry_id IN (${ph})`).all(userId, ...entryIds).map(shape);
    },
    latest(userId, scope, { status = 'done' } = {}) {
      return shape(q(`SELECT * FROM ai_insights WHERE user_id = ? AND scope = ? AND status = ?
                      ORDER BY created_at DESC LIMIT 1`).get(userId, scope, status));
    },
    latestAny(userId, scope) {
      return shape(q(`SELECT * FROM ai_insights WHERE user_id = ? AND scope = ? ORDER BY created_at DESC LIMIT 1`).get(userId, scope));
    },
  };
  function shape(row) {
    if (!row) return null;
    const { data, user_id, error, ...rest } = row;
    return { ...rest, data: parseJson(data, {}) };
  }

  const goals = {
    create(userId, { title, icon, targetValue, unit, startDate, dueDate }) {
      const id = newId();
      const now = nowIso();
      q(`INSERT INTO goals (id, user_id, title, icon, target_value, unit, start_date, due_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, userId, title, icon, targetValue, unit, startDate, dueDate, now, now);
      return goals.get(userId, id);
    },
    get(userId, id) {
      return q('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(id, userId);
    },
    list(userId, status) {
      if (status) {
        return q(`SELECT * FROM goals WHERE user_id = ? AND status = ? ORDER BY due_date, created_at`).all(userId, status);
      }
      return q(`SELECT * FROM goals WHERE user_id = ? AND status != 'archived'
                ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, due_date, created_at`).all(userId);
    },
    countActive(userId) {
      return q(`SELECT COUNT(*) AS c FROM goals WHERE user_id = ? AND status = 'active'`).get(userId).c;
    },
    countDone(userId) {
      return q(`SELECT COUNT(*) AS c FROM goals WHERE user_id = ? AND status = 'done'`).get(userId).c;
    },
    update(userId, id, { title, icon, targetValue, unit, dueDate, status }) {
      const g = goals.get(userId, id);
      if (!g) return null;
      const next = {
        title: title ?? g.title,
        icon: icon ?? g.icon,
        target: targetValue ?? g.target_value,
        unit: unit ?? g.unit,
        due: dueDate ?? g.due_date,
        status: status ?? g.status,
      };
      // 目標値を変えた結果、達成・未達成が切り替わる場合も反映する
      if (!status && g.status !== 'archived') next.status = g.current_value >= next.target ? 'done' : 'active';
      const completedAt = next.status === 'done' ? (g.completed_at ?? nowIso()) : null;
      q(`UPDATE goals SET title = ?, icon = ?, target_value = ?, unit = ?, due_date = ?, status = ?, completed_at = ?, updated_at = ?
         WHERE id = ? AND user_id = ?`).run(next.title, next.icon, next.target, next.unit, next.due, next.status, completedAt, nowIso(), id, userId);
      return goals.get(userId, id);
    },
    remove(userId, id) {
      return Number(q('DELETE FROM goals WHERE id = ? AND user_id = ?').run(id, userId).changes) > 0;
    },
    /** 進捗を記録。達成したら status を done にする。戻り値に「今回で達成したか」を含む */
    addProgress(userId, goalId, { delta, entryId = null, note = null, localDate }) {
      return tx(db, () => {
        const g = goals.get(userId, goalId);
        if (!g) return null;
        q(`INSERT INTO goal_logs (id, user_id, goal_id, entry_id, delta, note, local_date, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(newId(), userId, goalId, entryId, delta, note, localDate, nowIso());
        const current = Math.max(0, g.current_value + delta);
        const reached = current >= g.target_value;
        const status = g.status === 'archived' ? 'archived' : reached ? 'done' : 'active';
        const completedAt = status === 'done' ? (g.completed_at ?? nowIso()) : null;
        q(`UPDATE goals SET current_value = ?, status = ?, completed_at = ?, updated_at = ? WHERE id = ? AND user_id = ?`)
          .run(current, status, completedAt, nowIso(), goalId, userId);
        return { goal: goals.get(userId, goalId), justCompleted: g.status === 'active' && status === 'done' };
      });
    },
    logs(userId, goalId, limit = 50) {
      return q(`SELECT l.id, l.delta, l.note, l.local_date, l.created_at, l.entry_id
                FROM goal_logs l WHERE l.user_id = ? AND l.goal_id = ? ORDER BY l.created_at DESC LIMIT ?`).all(userId, goalId, limit);
    },
  };

  const entries = {
    create(userId, { body, mood, goalId, localDate }) {
      const id = newId();
      const now = nowIso();
      q(`INSERT INTO entries (id, user_id, body, mood, goal_id, local_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, userId, body, mood, goalId, localDate, now, now);
      entries.reindex(userId, id);
      return id;
    },
    get(userId, id) {
      return q('SELECT * FROM entries WHERE id = ? AND user_id = ?').get(id, userId);
    },
    update(userId, id, { body, mood }) {
      q(`UPDATE entries SET body = COALESCE(?, body), mood = CASE WHEN ? THEN ? ELSE mood END, updated_at = ?
         WHERE id = ? AND user_id = ?`).run(body ?? null, mood !== undefined ? 1 : 0, mood ?? null, nowIso(), id, userId);
      entries.reindex(userId, id);
      return entries.get(userId, id);
    },
    remove(userId, id) {
      q('DELETE FROM entries_fts WHERE entry_id = ? AND user_id = ?').run(id, userId);
      return Number(q('DELETE FROM entries WHERE id = ? AND user_id = ?').run(id, userId).changes) > 0;
    },
    /** 全文検索インデックスを本文＋AI要約で更新 */
    reindex(userId, id) {
      q('DELETE FROM entries_fts WHERE entry_id = ? AND user_id = ?').run(id, userId);
      q(`INSERT INTO entries_fts (entry_id, user_id, body, summary)
         SELECT e.id, e.user_id, e.body, COALESCE(i.summary, '') || ' ' || COALESCE(json_extract(i.data, '$.tags'), '')
         FROM entries e LEFT JOIN ai_insights i ON i.entry_id = e.id AND i.status = 'done'
         WHERE e.id = ? AND e.user_id = ?`).run(id, userId);
    },
    /**
     * 一覧・検索。新しい順。cursor は前ページ最後の「local_date|created_at」。
     */
    list(userId, { q: query = '', cursor = null, limit = 20, goalId = null } = {}) {
      const where = ['e.user_id = ?'];
      const args = [userId];
      const text = query.trim();
      if (text) {
        if ([...text].length >= 3) {
          // trigram は3文字以上で使える。フレーズとして扱い、特殊文字は無害化する
          where.push(`e.id IN (SELECT entry_id FROM entries_fts WHERE entries_fts MATCH ? AND user_id = ?)`);
          args.push(`"${text.replace(/"/g, '""')}"`, userId);
        } else {
          const like = `%${text.replace(/[\\%_]/g, (c) => '\\' + c)}%`;
          where.push(`(e.body LIKE ? ESCAPE '\\' OR e.id IN (SELECT entry_id FROM ai_insights WHERE user_id = ? AND summary LIKE ? ESCAPE '\\'))`);
          args.push(like, userId, like);
        }
      }
      if (goalId) {
        where.push('e.goal_id = ?');
        args.push(goalId);
      }
      if (cursor) {
        const [d, c] = String(cursor).split('|');
        where.push('(e.local_date, e.created_at) < (?, ?)');
        args.push(d, c);
      }
      const rows = q(`SELECT e.* FROM entries e WHERE ${where.join(' AND ')}
                      ORDER BY e.local_date DESC, e.created_at DESC LIMIT ?`).all(...args, limit + 1);
      const hasMore = rows.length > limit;
      const page = rows.slice(0, limit);
      const last = page[page.length - 1];
      return { items: entries.enrich(userId, page), nextCursor: hasMore && last ? `${last.local_date}|${last.created_at}` : null };
    },
    /** メディア・AI分析・目標をまとめて付与 */
    enrich(userId, rows) {
      const ids = rows.map((r) => r.id);
      const mediaRows = media.forEntries(userId, ids);
      const insightRows = insights.forEntries(userId, ids);
      const goalIds = [...new Set(rows.map((r) => r.goal_id).filter(Boolean))];
      const goalMap = new Map(goalIds.map((gid) => [gid, goals.get(userId, gid)]).filter(([, g]) => g));
      return rows.map((r) => ({
        id: r.id,
        body: r.body,
        mood: r.mood,
        localDate: r.local_date,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        goal: r.goal_id && goalMap.get(r.goal_id)
          ? { id: r.goal_id, title: goalMap.get(r.goal_id).title, icon: goalMap.get(r.goal_id).icon }
          : null,
        media: mediaRows.filter((m) => m.entry_id === r.id).map(({ entry_id, ...m }) => ({ ...m, url: `/api/media/${m.id}` })),
        insight: insightRows.find((i) => i.entry_id === r.id) || null,
      }));
    },
    recent(userId, limit = 5, { excludeId = null } = {}) {
      return q(`SELECT e.*, i.summary AS ai_summary FROM entries e
                LEFT JOIN ai_insights i ON i.entry_id = e.id AND i.status = 'done'
                WHERE e.user_id = ? AND e.id != COALESCE(?, '')
                ORDER BY e.local_date DESC, e.created_at DESC LIMIT ?`).all(userId, excludeId, limit);
    },
    between(userId, from, to) {
      return q(`SELECT e.*, i.summary AS ai_summary FROM entries e
                LEFT JOIN ai_insights i ON i.entry_id = e.id AND i.status = 'done'
                WHERE e.user_id = ? AND e.local_date BETWEEN ? AND ?
                ORDER BY e.local_date, e.created_at`).all(userId, from, to);
    },
    /** JST 日付ごとの記録件数 */
    countsByDate(userId) {
      const rows = q('SELECT local_date, COUNT(*) AS c FROM entries WHERE user_id = ? GROUP BY local_date').all(userId);
      return new Map(rows.map((r) => [r.local_date, r.c]));
    },
    total(userId) {
      return q('SELECT COUNT(*) AS c FROM entries WHERE user_id = ?').get(userId).c;
    },
  };

  const jobs = {
    enqueue(userId, type, payload = {}, runAfter = new Date()) {
      const now = nowIso();
      q(`INSERT INTO jobs (user_id, type, payload, status, run_after, created_at, updated_at)
         VALUES (?, ?, ?, 'queued', ?, ?, ?)`).run(userId, type, JSON.stringify(payload), runAfter.toISOString(), now, now);
    },
    /** 実行可能なジョブを1件取り出して running にする（1プロセス前提） */
    claim() {
      const row = q(`UPDATE jobs SET status = 'running', attempts = attempts + 1, updated_at = ?
                     WHERE id = (SELECT id FROM jobs WHERE status = 'queued' AND run_after <= ? ORDER BY run_after, id LIMIT 1)
                     RETURNING *`).get(nowIso(), nowIso());
      return row ? { ...row, payload: parseJson(row.payload, {}) } : null;
    },
    done(id) {
      q(`UPDATE jobs SET status = 'done', updated_at = ? WHERE id = ?`).run(nowIso(), id);
    },
    retry(id, error, runAfter) {
      q(`UPDATE jobs SET status = 'queued', last_error = ?, run_after = ?, updated_at = ? WHERE id = ?`)
        .run(String(error).slice(0, 500), runAfter.toISOString(), nowIso(), id);
    },
    fail(id, error) {
      q(`UPDATE jobs SET status = 'failed', last_error = ?, updated_at = ? WHERE id = ?`).run(String(error).slice(0, 500), nowIso(), id);
    },
    /** 起動時: 前回のプロセスが実行途中で落ちたジョブを再キューする */
    requeueStale() {
      q(`UPDATE jobs SET status = 'queued' WHERE status = 'running'`).run();
    },
    purgeOld(beforeIso) {
      q(`DELETE FROM jobs WHERE status IN ('done', 'failed') AND updated_at < ?`).run(beforeIso);
    },
  };

  return { db, users, sessions, billing, media, insights, goals, entries, jobs, tx: (fn) => tx(db, fn) };
}
