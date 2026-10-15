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

## 無料プランとプロプラン（サブスクリプション）

入口は無料で、記録すること自体には一切制限をかけません。AI と分析に課金します。

| | フリー | プロ（月¥580 / 年¥5,800） |
|---|---|---|
| 記録（文章・写真・動画・音声）・継続日数・目標・検索・店舗連携 | ✓ | ✓ |
| ひとことフィードバック（AI なし） | ✓ | ✓ |
| AI のふりかえり（記録ごと） | 3回まで体験 | 毎回（月600回まで） |
| 成長レベル・6つの指標・推移・足りないもの | ぼかし表示（強みの名前だけ見える） | ✓ |
| AI 自己分析 | — | 月8回 |
| AI の週間ふりかえり | — | ✓ |

- 機能差は `src/lib/plans.js`（`PLANS` と表示用の `PRICING`）に集約しています。
- **ぼかしは見本データで作っています。** 無料の人には本人の分析結果をサーバーから送らないので、開発者ツールでも見えません。
- 6つの指標（継続力・行動量・振り返り力・目標推進力・挑戦・改善・コンディション）は `src/lib/growth.js` で、直近4週間の記録から計算します。
- プロへの導線: 記録後のAIふりかえり（ぼかし）、ホームの成長レベルカード、ふりかえり一覧の「成長分析」、マイページ、料金ページ（`/#/pricing`）

### 決済（Stripe）

| 環境変数 | 内容 |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe のシークレットキー |
| `STRIPE_WEBHOOK_SECRET` | Webhook の署名シークレット（エンドポイント: `/api/billing/webhook`） |
| `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_YEARLY` | 月額・年額の Price ID |
| `APP_URL` | 公開URL（決済後の戻り先） |
| `BILLING_DEMO` | `1` で Stripe なしのデモ決済（実際の請求なし）。本番以外では既定で有効 |

- 申し込みは Stripe Checkout（初回のみ7日間の無料体験）、解約・カード変更は Stripe のカスタマーポータル。
- Webhook で受け取るイベント: `checkout.session.completed` / `customer.subscription.created` / `updated` / `deleted`。
  署名を検証し、同じイベントは1回だけ反映します。支払い失敗のリトライ中（past_due）はプロのまま使えます。

## ゴルフのラウンド記録とスコア分析

**入力（無料）** — `/#/golf`
- コース名・日付・ホール数を選ぶだけで開始。コースのパーは一度入れれば次回から自動で入る
- **ホールごと**: 最初から「パー・2パット・OBなし」が入っているので、パーで2パットならティーショットの方向を押して「次へ」だけ。
  入力するのは スコア・パット・ティーショット（左／FW／右）・OB・池などのペナルティ・バンカー。ホールを移るたびに自動保存（途中で閉じても続きから）
- **合計だけ**: スコアカードを見ながら合計値（スコア・パット・FWキープ・パーオン・OBなど）を入れる
- パーオン・寄せワン・サンドセーブ（目安：バンカーに入ったホールでパー以内）は入力から自動計算
- 終えると成長ノートの記録になり（写真・メモ・気分つき）、通っている教室に共有すればコーチも成績を見られる
- スコアカード（バーディ○・ボギー□）、FWキープ率・パーオン率・寄せワン率・サンドセーブ率・OB、Par3/4/5 別の平均

**分析（プロ）**
- スコアの推移（18ホール換算）と目標ライン
- 能力チャート: パター・方向性・OB回避・ショット精度・アプローチ・バンカー・大叩き回避・飛距離
- スコアアップの伸びしろ: ひとつ上のスコア帯の水準に近づけると、どの項目で何打縮むか（`src/lib/golf.js` の `BRACKETS` は一般的なアマチュアの傾向をもとにした推定値）
- AIコーチ: 弱点・強み・優先する練習メニュー・次のラウンドのコースマネジメント（月10回）

## 教室・お店（店舗）との連携

レッスンに通っている教室・スクール・ジムなどと、**店舗ID** で連携できます。

**生徒側（個人ユーザー）**
1. マイページ →「店舗IDで連携する」→ 店舗IDを入力（例: `K7QM-4XPA`。小文字・ハイフンなしでも可）
2. 店舗名を確認し、共有のしかたを選ぶ
   - 選んだ記録だけ共有（既定）／これからの記録をすべて共有
3. 承認制の店舗なら、先生が承認すると連携開始
4. 記録を書くとき・あとからでも、共有する店舗を選べる。先生のコメントはホームと記録の詳細に届く
5. 連携はいつでも解除でき、解除した瞬間から店舗は記録を見られなくなる

店舗に見えるのは「本人が共有した記録（本文・写真・動画・音声・気分）」「ニックネーム」「共有した記録から数えた継続日数」だけです。
共有していない記録・AI のふりかえり・目標・メールアドレスは見えません。

**店舗側（先生・スタッフ）**
- マイページ →「先生・スタッフの方」→ 店舗を登録すると店舗IDが発行される（招待リンク `/#/links/new?code=...` も作れる）
- 共有された記録の閲覧・コメント、メンバーの承認／解除、継続日数の確認
- オーナーはスタッフ招待コードで他の先生を追加でき、店舗IDの作り直しもできる
- 店舗側のプラン（メンバー数・スタッフ数の上限）は `src/lib/plans.js` の `STORE_PLANS`

データ: `stores` / `store_staff` / `store_links`（status: pending・active・rejected・ended）/ `entry_shares` / `store_comments`。
店舗側から記録・写真が見えるかは、毎回「つながりが active」かつ「共有されている」ことを SQL で確認しています。

## Render へのデプロイ

リポジトリ直下の `render.yaml`（Blueprint）で設定済みです。
Render ダッシュボード → **New → Blueprint** → このリポジトリとブランチを選ぶ → **Apply**。

- 無料プランは 15 分アクセスがないとスリープし、再起動するとデータ（SQLite・写真）が消えます。お試し用です。
- データを残すには `render.yaml` の `plan` を `starter` にし、`disk` と `DATA_DIR=/var/data` を有効にします。
- AI を使う場合は、サービスの Environment に `ANTHROPIC_API_KEY` を追加します。

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
  routes/              auth / entries / goals / media / home / stores（店舗連携）/ growth（成長分析）/ billing（課金）/ golf（ゴルフ）
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

## 販売前の設定（環境変数）

| 環境変数 | 内容 |
|---|---|
| `OPERATOR_NAME` / `OPERATOR_REPRESENTATIVE` / `OPERATOR_ADDRESS` / `OPERATOR_PHONE` / `OPERATOR_EMAIL` | 特定商取引法に基づく表記・プライバシーポリシーに表示（未設定だと【未設定】と表示される） |
| `RESEND_API_KEY` / `MAIL_FROM` | パスワード再設定メールの送信（未設定ならサーバーのログに出すだけ） |
| `APP_URL` | 公開URL（メールのリンク・決済の戻り先） |
| `ADMIN_EMAILS` | 運営ダッシュボード（`/#/admin`）を見られるメールアドレス（カンマ区切り） |
| `ERROR_WEBHOOK_URL` | サーバーエラーを Slack / Discord に通知 |
| `WORKER_CONCURRENCY` | AI 処理の同時実行数（既定 4） |
| `BACKUP_KEEP_DAYS` | 毎日のDBバックアップ（`DATA_DIR/backups`）を残す日数（既定 7） |

- 利用規約・プライバシーポリシー・特定商取引法に基づく表記は `web/js/views/legal.js`。**公開前に専門家の確認を推奨**。
  改定したら `src/lib/legal.js` の `TERMS_VERSION` を更新すると、ユーザーに再同意の案内が出る。
- 退会時は Stripe の契約を先に解約し（失敗したら退会させない）、オーナーの店舗はスタッフに引き継ぐ。

## 本番運用の前にやること（未実装）

- 決済（Stripe Checkout + Webhook → `subscriptions` 更新）
- HTTPS 終端（リバースプロキシ / PaaS）と `NODE_ENV=production`
- 写真・動画のバックアップ（DB は毎日自動でバックアップ済み）
- オフライン対応（Service Worker）
