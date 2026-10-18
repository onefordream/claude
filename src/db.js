import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// When DATA_DIR is set (e.g. a Render persistent disk mounted at /var/data),
// the database lives there so it survives redeploys. Falls back to a local
// folder for development, where losing it on redeploy doesn't matter.
const dataDir = process.env.DATA_DIR ? join(process.env.DATA_DIR, 'db') : join(__dirname, '..', 'data');
mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(join(dataDir, 'app.sqlite'));

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('student', 'instructor')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS lesson_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    record_date TEXT NOT NULL,
    content TEXT NOT NULL,
    notes TEXT,
    ai_summary TEXT,
    ai_next_issues TEXT,
    ai_status TEXT NOT NULL DEFAULT 'pending',
    record_type TEXT NOT NULL DEFAULT 'lesson',
    duration_minutes INTEGER,
    ball_count INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_record_id INTEGER NOT NULL REFERENCES lesson_records(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS round_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    round_date TEXT NOT NULL,
    course_name TEXT NOT NULL,
    score INTEGER,
    putts INTEGER,
    issues TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    holes INTEGER NOT NULL,
    pars TEXT NOT NULL,
    last_used_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, name)
  );

  CREATE TABLE IF NOT EXISTS rounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    play_date TEXT NOT NULL,
    course_name TEXT NOT NULL,
    holes INTEGER NOT NULL CHECK (holes IN (9, 18)),
    pars TEXT NOT NULL,
    entry_mode TEXT NOT NULL CHECK (entry_mode IN ('hole', 'total')),
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'complete')),
    driver_avg_yards INTEGER,
    notes TEXT,
    photo_filename TEXT,
    total_score INTEGER,
    putts_total INTEGER,
    fw_keep_count INTEGER,
    gir_count INTEGER,
    three_putt_count INTEGER,
    ob_total INTEGER,
    penalty_total INTEGER,
    bunker_count INTEGER,
    bunker_save_count INTEGER,
    migrated_from_round_record_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS round_holes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    round_id INTEGER NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    hole_no INTEGER NOT NULL,
    par INTEGER NOT NULL,
    strokes INTEGER,
    putts INTEGER,
    tee_shot TEXT CHECK (tee_shot IN ('fw', 'left', 'right') OR tee_shot IS NULL),
    ob_count INTEGER NOT NULL DEFAULT 0,
    penalty_count INTEGER NOT NULL DEFAULT 0,
    bunker INTEGER NOT NULL DEFAULT 0,
    UNIQUE(round_id, hole_no)
  );

  CREATE TABLE IF NOT EXISTS round_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    round_id INTEGER NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    target_date TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    achieved_at TEXT
  );

  CREATE TABLE IF NOT EXISTS library_videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_lesson_records_user ON lesson_records(user_id, record_date);
  CREATE INDEX IF NOT EXISTS idx_round_records_user ON round_records(user_id, round_date);
  CREATE INDEX IF NOT EXISTS idx_videos_record ON videos(lesson_record_id);
  CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id, status);
  CREATE INDEX IF NOT EXISTS idx_courses_user ON courses(user_id);
  CREATE INDEX IF NOT EXISTS idx_rounds_user ON rounds(user_id, play_date);
  CREATE INDEX IF NOT EXISTS idx_round_holes_round ON round_holes(round_id);
  CREATE INDEX IF NOT EXISTS idx_round_comments_round ON round_comments(round_id);
`);

// Additive migrations for columns introduced after the initial release.
// CREATE TABLE IF NOT EXISTS doesn't touch tables that already exist, so an
// already-deployed database needs these added explicitly.
function ensureColumn(table, column, ddl) {
  const existing = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  if (!existing.includes(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
  }
}

ensureColumn('lesson_records', 'record_type', "TEXT NOT NULL DEFAULT 'lesson'");
ensureColumn('lesson_records', 'duration_minutes', 'INTEGER');
ensureColumn('lesson_records', 'ball_count', 'INTEGER');
ensureColumn('round_records', 'putts', 'INTEGER');
ensureColumn('users', 'furigana', 'TEXT');
ensureColumn('users', 'is_owner', 'INTEGER NOT NULL DEFAULT 0');
ensureColumn('users', 'is_suspended', 'INTEGER NOT NULL DEFAULT 0');

// One-time migration: the old simple round form (round_records: course name,
// score, putts only) is replaced by the full rounds/round_holes feature.
// Existing entries are carried over as 'total' mode rounds with everything
// beyond score/putts left null ("no data"), so they keep showing up in the
// student's round history and in analysis instead of disappearing. Runs on
// every boot but is idempotent via migrated_from_round_record_id.
function migrateLegacyRoundRecords() {
  const legacyRows = db.prepare(`SELECT * FROM round_records`).all();
  if (!legacyRows.length) return;
  const migratedIds = new Set(
    db
      .prepare(`SELECT migrated_from_round_record_id AS id FROM rounds WHERE migrated_from_round_record_id IS NOT NULL`)
      .all()
      .map((r) => r.id)
  );
  const defaultPars18 = [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5];
  const insert = db.prepare(`
    INSERT INTO rounds (user_id, play_date, course_name, holes, pars, entry_mode, status, notes, total_score, putts_total, migrated_from_round_record_id)
    VALUES (?, ?, ?, 18, ?, 'total', 'complete', ?, ?, ?, ?)
  `);
  for (const row of legacyRows) {
    if (migratedIds.has(row.id)) continue;
    const notes = [row.issues ? `課題: ${row.issues}` : null, row.notes || null].filter(Boolean).join('\n') || null;
    insert.run(row.user_id, row.round_date, row.course_name, JSON.stringify(defaultPars18), notes, row.score, row.putts, row.id);
  }
}
migrateLegacyRoundRecords();

export function run(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.run(...params);
}

export function get(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.get(...params);
}

export function all(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.all(...params);
}
