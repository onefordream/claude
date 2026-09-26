# Growth Note（成長記録ノート・個人向け）

自分で決めた成長・習慣・目標を、短文・写真・動画・音声で気軽に記録し、
AI が要約・気づき・次の一歩を返してくれる、個人向けの成長記録 Web サービスです。

- **依存パッケージ 0**（Node.js 22 の標準機能 `node:http` / `node:sqlite` / `node:crypto` / `fetch` のみ）
- 複数ユーザーが 1 つのシステムを共有する SaaS 型（データはユーザーごとに分離）
- モバイルファーストの SPA（ビルド不要の素の JavaScript）

## 起動

```bash
cd growth-note
npm start            # http://localhost:3000
npm test             # テスト（node:test）
```

Node.js 22.5 以上が必要です（`node:sqlite` を使うため）。

### 環境変数

| 変数 | 既定値 | 説明 |
|---|---|---|
| `PORT` / `HOST` | `3000` / `0.0.0.0` | 待ち受け |
| `DATA_DIR` | `./data` | SQLite とアップロードファイルの保存先（永続ボリュームを割り当てる） |
| `ANTHROPIC_API_KEY` | なし | 設定すると Claude API で AI 分析。未設定なら簡易分析（ルールベース）で動作 |
| `AI_MODEL` | `claude-opus-5` | 使用するモデル |
| `AI_EFFORT` | `medium` | 推論の深さ（空文字で指定なし） |
| `NODE_ENV=production` | – | Cookie に `Secure` を付与（HTTPS 必須） |
| `COOKIE_SECURE` | – | `1`/`0` で Secure 属性を明示的に指定 |
| `TRUST_PROXY` | – | `1` でリバースプロキシの `X-Forwarded-*` を信頼 |

### プランの手動切り替え（決済実装までの開発用）

```bash
npm run set-plan -- you@example.com pro
npm run set-plan -- you@example.com free
```

## 構成

```
server.js              起動
src/
  app.js               HTTP サーバー、ルーティング、CSRF/認証、静的配信
  config.js            環境変数
  db.js                SQLite 接続とマイグレーション（PRAGMA user_version）
  repo/index.js        データアクセス（すべて userId 必須）
  services.js          継続日数・プラン判定など共通処理
  worker.js            AI 分析などを裏で順番に実行するジョブワーカー
  lib/
    date.js            JST の日付計算（サーバーの TZ に依存しない）
    stats.js           継続日数・週間活動・カレンダー・バッジ
    auth.js            scrypt パスワード、セッショントークン、レート制限
    plans.js           ★ 無料/有料プランの機能差（ここだけ変えれば機能差を調整できる）
    storage.js         アップロードのストリーム保存（S3 等へ差し替え可能な形）
    ai.js              Claude API 呼び出し（fetch）
    ai-local.js        APIキー未設定・上限超過時の簡易分析
  routes/              auth / entries / goals / media / home
web/                   フロントエンド（SPA）
  js/views/            home / write / entries / entry / goals / goal / me / auth
  css/app.css          デザイントークンとスタイル（ダークモード対応）
test/                  日付・継続日数・API（データ分離、アップロード上限、CSRF など）
```

## 設計メモ

- **認証**: メール＋パスワード（scrypt）。サーバー側セッション（DB にはトークンの SHA-256 のみ保存）、
  `HttpOnly; SameSite=Lax` Cookie、30 日スライディング。書き込み系 API は Origin を検証（CSRF 対策）。
  ログイン・登録は IP / メール単位でレート制限。
- **データ分離**: すべてのテーブルに `user_id`。リポジトリ関数は userId を必須にし、
  他人の ID を指定しても 404 になる。メディアも認証付き URL からのみ配信。
- **JST**: 時刻は UTC で保存し、記録には JST の日付 `local_date` を別に保存。継続日数・週間集計は `local_date` だけで判定。
- **アップロード**: 1 ファイル＝生ボディの `POST /api/media`。`Content-Length` を見て**ボディを読む前に**上限・容量チェック、
  通ればストリームのままディスクへ書き込む（メモリに載せない）。写真はブラウザ側で長辺 1600px に縮小。
  動画・音声は Range リクエストに対応。記録に添付されないまま 24 時間経ったファイルは自動削除。
- **AI**: 記録の保存は即時完了し、AI 分析はジョブキュー（`jobs` テーブル）で非同期実行。画面は結果をポーリングして表示。
  失敗時はリトライし、それでも失敗したら簡易分析に切り替え、ユーザーに何も返らない状態を作らない。
  月ごとの利用回数を `usage_counters` で数え、プランの上限を超えたら簡易分析になる。
- **課金の見据え方**: `subscriptions` テーブル（plan / status / current_period_end / provider_*）と `lib/plans.js` の
  エンタイトルメント（`can()` / `limit()`）。決済を導入する際は、Stripe 等の Webhook で `subscriptions` を更新するだけで機能差が有効になる。

## 本番運用の前にやること（未実装）

- パスワード再設定（メール送信の仕組みが必要）
- 決済（Stripe Checkout + Webhook → `subscriptions` 更新）
- HTTPS 終端（リバースプロキシ / PaaS）と `NODE_ENV=production`
- DB・アップロードのバックアップ
- オフライン対応（Service Worker）
