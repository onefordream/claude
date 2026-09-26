import { DatabaseSync } from 'node:sqlite';

// マイグレーションは追記のみ。PRAGMA user_version で適用済みの番号を管理する。
const MIGRATIONS = [
  `
  CREATE TABLE users (
    id            TEXT PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    display_name  TEXT NOT NULL,
    timezone      TEXT NOT NULL DEFAULT 'Asia/Tokyo',
    weekly_target INTEGER NOT NULL DEFAULT 4,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
  );

  CREATE TABLE sessions (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash   TEXT NOT NULL UNIQUE,
    user_agent   TEXT,
    expires_at   TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    created_at   TEXT NOT NULL
  );
  CREATE INDEX sessions_user ON sessions(user_id);

  CREATE TABLE goals (
    id            TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title         TEXT NOT NULL,
    icon          TEXT NOT NULL DEFAULT '🎯',
    target_value  REAL NOT NULL,
    unit          TEXT NOT NULL DEFAULT '回',
    current_value REAL NOT NULL DEFAULT 0,
    start_date    TEXT NOT NULL,
    due_date      TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'active', -- active | done | archived
    completed_at  TEXT,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
  );
  CREATE INDEX goals_user ON goals(user_id, status);

  CREATE TABLE entries (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body       TEXT NOT NULL DEFAULT '',
    mood       INTEGER,
    goal_id    TEXT REFERENCES goals(id) ON DELETE SET NULL,
    local_date TEXT NOT NULL,             -- JST の日付 YYYY-MM-DD（継続日数などはこれだけで判定）
    created_at TEXT NOT NULL,             -- UTC ISO8601
    updated_at TEXT NOT NULL
  );
  CREATE INDEX entries_user_date ON entries(user_id, local_date DESC, created_at DESC);

  CREATE TABLE media (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entry_id   TEXT REFERENCES entries(id) ON DELETE CASCADE,
    kind       TEXT NOT NULL,              -- image | video | audio
    mime       TEXT NOT NULL,
    size       INTEGER NOT NULL,
    path       TEXT NOT NULL,              -- データディレクトリからの相対パス
    created_at TEXT NOT NULL
  );
  CREATE INDEX media_entry ON media(entry_id);
  CREATE INDEX media_user ON media(user_id, created_at);

  CREATE TABLE ai_insights (
    id            TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entry_id      TEXT UNIQUE REFERENCES entries(id) ON DELETE CASCADE,
    scope         TEXT NOT NULL,           -- entry | weekly
    status        TEXT NOT NULL,           -- pending | done | failed
    provider      TEXT,                    -- claude | local
    note          TEXT,                    -- 例: 上限到達のため簡易分析
    summary       TEXT,
    data          TEXT,                    -- JSON（insights / next_actions など）
    error         TEXT,
    period_start  TEXT,
    period_end    TEXT,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
  );
  CREATE INDEX ai_insights_user ON ai_insights(user_id, scope, created_at DESC);

  CREATE TABLE goal_logs (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_id    TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    entry_id   TEXT REFERENCES entries(id) ON DELETE SET NULL,
    delta      REAL NOT NULL,
    note       TEXT,
    local_date TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX goal_logs_goal ON goal_logs(goal_id, created_at DESC);

  CREATE TABLE jobs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT REFERENCES users(id) ON DELETE CASCADE,
    type       TEXT NOT NULL,
    payload    TEXT NOT NULL DEFAULT '{}',
    status     TEXT NOT NULL DEFAULT 'queued', -- queued | running | done | failed
    attempts   INTEGER NOT NULL DEFAULT 0,
    run_after  TEXT NOT NULL,
    last_error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX jobs_queue ON jobs(status, run_after);

  -- 課金: 決済プロバイダ（Stripe など）の Webhook がこの行を更新する想定
  CREATE TABLE subscriptions (
    user_id                  TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    plan                     TEXT NOT NULL DEFAULT 'free',
    status                   TEXT NOT NULL DEFAULT 'active', -- active | trialing | past_due | canceled
    current_period_end       TEXT,
    provider                 TEXT,
    provider_customer_id     TEXT,
    provider_subscription_id TEXT,
    updated_at               TEXT NOT NULL
  );

  CREATE TABLE usage_counters (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period  TEXT NOT NULL,  -- 'YYYY-MM'（JST）または 'all'
    key     TEXT NOT NULL,
    value   INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, period, key)
  );

  -- 日本語の部分一致検索のため trigram トークナイザを使う
  CREATE VIRTUAL TABLE entries_fts USING fts5(
    entry_id UNINDEXED, user_id UNINDEXED, body, summary, tokenize = 'trigram'
  );
  `,
];

export function openDb(file) {
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
  `);
  migrate(db);
  return db;
}

function migrate(db) {
  const current = db.prepare('PRAGMA user_version').get().user_version;
  for (let v = current; v < MIGRATIONS.length; v++) {
    tx(db, () => {
      db.exec(MIGRATIONS[v]);
      db.exec(`PRAGMA user_version = ${v + 1}`);
    });
  }
}

const depth = new WeakMap();

/** トランザクション。入れ子で呼ばれた場合は外側のトランザクションに参加する。 */
export function tx(db, fn) {
  const d = depth.get(db) || 0;
  if (d > 0) return fn();
  db.exec('BEGIN IMMEDIATE');
  depth.set(db, 1);
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  } finally {
    depth.set(db, 0);
  }
}
