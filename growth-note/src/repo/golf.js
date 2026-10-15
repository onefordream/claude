import { randomUUID } from 'node:crypto';
import { nowIso } from '../lib/date.js';

// ゴルフのラウンド記録。すべて userId で絞り込む。

const parse = (s, fb) => {
  try {
    return s ? JSON.parse(s) : fb;
  } catch {
    return fb;
  }
};

function shapeRound(r) {
  if (!r) return null;
  return { ...r, pars: parse(r.pars, []), totals: parse(r.totals, null) };
}

export function createGolfRepos(db, { tx }) {
  const q = (sql) => db.prepare(sql);

  const golf = {
    courses(userId) {
      return q('SELECT id, name, pars, last_used_at FROM golf_courses WHERE user_id = ? ORDER BY last_used_at DESC LIMIT 30')
        .all(userId).map((c) => ({ ...c, pars: parse(c.pars, []) }));
    },
    rememberCourse(userId, name, pars) {
      const now = nowIso();
      q(`INSERT INTO golf_courses (id, user_id, name, pars, last_used_at, created_at) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, name) DO UPDATE SET pars = excluded.pars, last_used_at = excluded.last_used_at`)
        .run(randomUUID(), userId, name, JSON.stringify(pars), now, now);
    },
    create(userId, { playedOn, courseName, tee, holesCount, pars, mode }) {
      const id = randomUUID();
      const now = nowIso();
      tx(() => {
        q(`INSERT INTO golf_rounds (id, user_id, played_on, course_name, tee, holes_count, pars, mode, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(id, userId, playedOn, courseName, tee, holesCount, JSON.stringify(pars), mode, now, now);
        if (mode === 'hole') {
          const ins = q('INSERT INTO golf_holes (round_id, user_id, hole_no, par, updated_at) VALUES (?, ?, ?, ?, ?)');
          for (let i = 0; i < holesCount; i++) ins.run(id, userId, i + 1, pars[i], now);
        }
      });
      return golf.get(userId, id);
    },
    get(userId, id) {
      return shapeRound(q('SELECT * FROM golf_rounds WHERE id = ? AND user_id = ?').get(id, userId));
    },
    holes(userId, roundId) {
      return q('SELECT * FROM golf_holes WHERE round_id = ? AND user_id = ? ORDER BY hole_no').all(roundId, userId);
    },
    saveHole(userId, roundId, holeNo, h) {
      q(`UPDATE golf_holes SET par = ?, score = ?, putts = ?, fairway = ?, ob = ?, bunker = ?, penalty = ?, updated_at = ?
         WHERE round_id = ? AND user_id = ? AND hole_no = ?`)
        .run(h.par, h.score, h.putts, h.fairway, h.ob, h.bunker ? 1 : 0, h.penalty, nowIso(), roundId, userId, holeNo);
      golf.touch(userId, roundId);
    },
    update(userId, id, f) {
      const r = golf.get(userId, id);
      if (!r) return null;
      q(`UPDATE golf_rounds SET played_on = ?, course_name = ?, tee = ?, pars = ?, totals = ?, drive_distance = ?, note = ?, updated_at = ?
         WHERE id = ? AND user_id = ?`).run(
        f.playedOn ?? r.played_on, f.courseName ?? r.course_name, f.tee ?? r.tee, JSON.stringify(f.pars ?? r.pars),
        f.totals !== undefined ? JSON.stringify(f.totals) : r.totals ? JSON.stringify(r.totals) : null,
        f.driveDistance !== undefined ? f.driveDistance : r.drive_distance, f.note ?? r.note, nowIso(), id, userId,
      );
      if (f.pars) {
        const up = q('UPDATE golf_holes SET par = ? WHERE round_id = ? AND user_id = ? AND hole_no = ?');
        f.pars.forEach((p, i) => up.run(p, id, userId, i + 1));
      }
      return golf.get(userId, id);
    },
    finish(userId, id, entryId) {
      q(`UPDATE golf_rounds SET status = 'done', entry_id = COALESCE(?, entry_id), finished_at = COALESCE(finished_at, ?), updated_at = ?
         WHERE id = ? AND user_id = ?`).run(entryId, nowIso(), nowIso(), id, userId);
    },
    touch(userId, id) {
      q('UPDATE golf_rounds SET updated_at = ? WHERE id = ? AND user_id = ?').run(nowIso(), id, userId);
    },
    list(userId, { status = null, limit = 50 } = {}) {
      const rows = status
        ? q('SELECT * FROM golf_rounds WHERE user_id = ? AND status = ? ORDER BY played_on DESC, created_at DESC LIMIT ?').all(userId, status, limit)
        : q('SELECT * FROM golf_rounds WHERE user_id = ? ORDER BY played_on DESC, created_at DESC LIMIT ?').all(userId, limit);
      return rows.map(shapeRound);
    },
    holesFor(userId, roundIds) {
      if (!roundIds.length) return [];
      const ph = roundIds.map(() => '?').join(',');
      return q(`SELECT * FROM golf_holes WHERE user_id = ? AND round_id IN (${ph}) ORDER BY hole_no`).all(userId, ...roundIds);
    },
    byEntries(entryIds) {
      if (!entryIds.length) return [];
      const ph = entryIds.map(() => '?').join(',');
      return q(`SELECT * FROM golf_rounds WHERE entry_id IN (${ph})`).all(...entryIds).map(shapeRound);
    },
    remove(userId, id) {
      return Number(q('DELETE FROM golf_rounds WHERE id = ? AND user_id = ?').run(id, userId).changes) > 0;
    },
    countDone(userId) {
      return q(`SELECT COUNT(*) AS c FROM golf_rounds WHERE user_id = ? AND status = 'done'`).get(userId).c;
    },
  };

  return { golf };
}
