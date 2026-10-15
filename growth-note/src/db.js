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
  // v2: 店舗（レッスン先）との連携
  `
  CREATE TABLE stores (
    id               TEXT PRIMARY KEY,
    name             TEXT NOT NULL,
    category         TEXT NOT NULL DEFAULT '',
    description      TEXT NOT NULL DEFAULT '',
    code             TEXT NOT NULL UNIQUE,     -- 生徒が入力する店舗ID（例: K7QM-4XPA）
    staff_code       TEXT NOT NULL UNIQUE,     -- スタッフ招待用コード
    require_approval INTEGER NOT NULL DEFAULT 1,
    plan             TEXT NOT NULL DEFAULT 'free',
    created_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL
  );

  CREATE TABLE store_staff (
    store_id   TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role       TEXT NOT NULL DEFAULT 'staff',  -- owner | staff
    created_at TEXT NOT NULL,
    PRIMARY KEY (store_id, user_id)
  );
  CREATE INDEX store_staff_user ON store_staff(user_id);

  -- 生徒（個人ユーザー）と店舗のつながり。共有の可否はすべてこの行の status で決まる
  CREATE TABLE store_links (
    id          TEXT PRIMARY KEY,
    store_id    TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status      TEXT NOT NULL,                 -- pending | active | rejected | ended
    share_mode  TEXT NOT NULL DEFAULT 'selected', -- selected: 選んだ記録だけ / all: これからの記録すべて
    created_at  TEXT NOT NULL,
    approved_at TEXT,
    ended_at    TEXT,
    updated_at  TEXT NOT NULL,
    UNIQUE (store_id, user_id)
  );
  CREATE INDEX store_links_user ON store_links(user_id, status);
  CREATE INDEX store_links_store ON store_links(store_id, status);

  -- どの記録をどの店舗に見せるか（つながりが active の間だけ有効）
  CREATE TABLE entry_shares (
    entry_id   TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    store_id   TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    PRIMARY KEY (entry_id, store_id)
  );
  CREATE INDEX entry_shares_store ON entry_shares(store_id, created_at DESC);

  -- 先生・スタッフから記録へのコメント
  CREATE TABLE store_comments (
    id         TEXT PRIMARY KEY,
    store_id   TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    entry_id   TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    author_id  TEXT REFERENCES users(id) ON DELETE SET NULL,
    body       TEXT NOT NULL,
    read_at    TEXT,                           -- 生徒が読んだ時刻
    created_at TEXT NOT NULL
  );
  CREATE INDEX store_comments_entry ON store_comments(entry_id, created_at);
  `,
  // v3: サブスクリプション（Stripe）
  `
  ALTER TABLE subscriptions ADD COLUMN cancel_at_period_end INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE subscriptions ADD COLUMN trial_end TEXT;
  ALTER TABLE subscriptions ADD COLUMN trial_used INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE subscriptions ADD COLUMN billing_interval TEXT;
  CREATE INDEX subscriptions_customer ON subscriptions(provider_customer_id);

  -- Webhook の二重処理を防ぐ（同じイベントは1回だけ反映する）
  CREATE TABLE billing_events (
    id         TEXT PRIMARY KEY,
    type       TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  `,
  // v4: ゴルフのラウンド記録
  `
  -- 一度入力したコースのパーを覚えておき、次回から入力を省く
  CREATE TABLE golf_courses (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    pars         TEXT NOT NULL,              -- JSON 配列 [4,4,3,...]
    last_used_at TEXT NOT NULL,
    created_at   TEXT NOT NULL,
    UNIQUE (user_id, name)
  );

  CREATE TABLE golf_rounds (
    id             TEXT PRIMARY KEY,
    user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entry_id       TEXT REFERENCES entries(id) ON DELETE SET NULL, -- 成長ノートの記録
    played_on      TEXT NOT NULL,            -- JST 日付
    course_name    TEXT NOT NULL,
    tee            TEXT NOT NULL DEFAULT '',
    holes_count    INTEGER NOT NULL,         -- 9 | 18
    pars           TEXT NOT NULL,            -- JSON 配列
    mode           TEXT NOT NULL DEFAULT 'hole', -- hole: ホールごと / total: 合計だけ
    totals         TEXT,                     -- mode=total のときの合計値（JSON）
    drive_distance INTEGER,                  -- ドライバー平均飛距離（ヤード、任意）
    note           TEXT NOT NULL DEFAULT '',
    status         TEXT NOT NULL DEFAULT 'in_progress', -- in_progress | done
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL,
    finished_at    TEXT
  );
  CREATE INDEX golf_rounds_user ON golf_rounds(user_id, played_on DESC);
  CREATE INDEX golf_rounds_entry ON golf_rounds(entry_id);

  CREATE TABLE golf_holes (
    round_id   TEXT NOT NULL REFERENCES golf_rounds(id) ON DELETE CASCADE,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hole_no    INTEGER NOT NULL,
    par        INTEGER NOT NULL,
    score      INTEGER,
    putts      INTEGER,
    fairway    TEXT,                         -- fw | left | right（パー3は記録しない）
    ob         INTEGER NOT NULL DEFAULT 0,
    bunker     INTEGER NOT NULL DEFAULT 0,   -- グリーン周りのバンカーに入ったか
    penalty    INTEGER NOT NULL DEFAULT 0,   -- OB 以外のペナルティ（池など）
    updated_at TEXT NOT NULL,
    PRIMARY KEY (round_id, hole_no)
  );
  `,
  // v5: 利用規約への同意・パスワード再設定
  `
  ALTER TABLE users ADD COLUMN terms_version TEXT;
  ALTER TABLE users ADD COLUMN terms_accepted_at TEXT;

  CREATE TABLE password_resets (
    token_hash TEXT PRIMARY KEY,               -- メールで送るトークンのハッシュだけを保存
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    used_at    TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX password_resets_user ON password_resets(user_id);
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
