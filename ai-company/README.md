# AI COMPANY

**ゲームを始めたら、社長になっていた。** — Your Dream. Your Company.

AI秘書「ミオ」と会話するだけで自分だけの会社が誕生し、AI社員（秘書・企画・マーケ）と一緒に最初の仕事を始められる、会社経営ゲーム型Webアプリです。

> アプリ内の会社設立は仮想的なもので、法的な法人設立ではありません。

---

## 1. 技術構成

| 領域 | 採用技術 |
| --- | --- |
| フロント | Next.js 15（App Router）/ TypeScript / Tailwind CSS v4 / shadcn/ui 構成のUI部品（cva + tailwind-merge）/ Framer Motion |
| バックエンド | Next.js Route Handlers（`app/api/*`） |
| DB・認証 | Supabase PostgreSQL + Supabase Auth（メール＋パスワード）+ RLS |
| AI | OpenAI Chat Completions（既定 `gpt-4.1-mini`）。`lib/ai/provider.ts` で抽象化し、Claude/Gemini 等を追加可能 |
| 決済 | Stripe サブスクリプション（Checkout + 署名検証付き Webhook。**鍵未設定時は「準備中」表示**） |
| デプロイ | Vercel（Root Directory を `ai-company` に設定） |

## 2. フォルダ構成

```
ai-company/
├── app/
│   ├── page.tsx                 ランディング（ログイン済みなら社長室/面談へ）
│   ├── login/                   新規登録・ログイン
│   ├── onboarding/              オープニング → 秘書面談 → 事業案 → 設計確認・編集 → 設立演出
│   ├── office/                  社長室（メイン画面）
│   ├── employees/               AI社員一覧・人材採用センター / [id] 社員とのチャット・業務依頼
│   ├── meeting/                 AI社内会議
│   ├── missions/                今日のミッション・履歴
│   ├── company/                 会社プロフィール編集・実績バッジ・成果物・成長記録・実績シェア
│   ├── settings/                料金プラン・利用状況・会話/アカウント削除・ログアウト
│   ├── admin/                   管理者ダッシュボード（利用量・原価・異常検知・上限設定）
│   ├── terms/ privacy/          利用規約・プライバシーポリシー（雛形）
│   └── api/                     onboarding, chat, tasks, meeting, missions/*, company, artifacts,
│                                decisions, usage, conversations, account, admin/settings,
│                                stripe/checkout, stripe/webhook, auth/signout, dev-login
├── components/
│   ├── ui/                      Button / Input / Card などのデザインシステム
│   └── game/                    Avatar（オリジナルSVGキャラ）, CompanyLogo（自動生成SVG）, AppShell, Missions …
├── lib/
│   ├── ai/                      provider抽象・OpenAI・開発用モック・プロンプト・zodスキーマ
│   ├── game/                    レベル・日付/連続出社・ロゴ生成・社員テンプレート・バッジ
│   ├── server/                  認証・ストア（Supabase/メモリ）・AI利用量制御・面談・業務ロジック
│   └── supabase/                サーバー/ブラウザ用クライアント
├── supabase/migrations/0001_init.sql   スキーマ・RLS・サーバー専用関数
├── scripts/                     test-rls.sh（RLS検証）, e2e.mjs（E2E）
└── tests/                       Vitest ユニットテスト
```

## 3. データモデル

`supabase/migrations/0001_init.sql` に定義（全テーブル RLS 有効・外部キー・インデックス・`created_at`/`updated_at` 付き）。

| テーブル | 内容 | クライアントからの権限 |
| --- | --- | --- |
| profiles | ユーザー（auth.users と1:1、登録時トリガーで自動作成） | 本人のみ参照。`display_name` のみ更新可（plan/is_admin は不可） |
| companies | 会社（1ユーザー1社） | 本人のみ参照。プロフィール列のみ更新可（**xp/level/streak は不可**） |
| onboarding_sessions | 面談状態（回答・会話・事業案・設計案） | 本人のみ参照 |
| ai_employee_templates | 社員テンプレート11職種（初期3名＋将来8名） | 全ログインユーザー参照 |
| company_employees | 雇用中のAI社員 | オーナーのみ参照 |
| conversations / messages | チャット・会議の履歴（要約メモリ列あり） | オーナーのみ参照・削除 |
| company_goals / projects | 目標・プロジェクト | オーナーのみ |
| generated_artifacts | AI社員の成果物 | オーナーのみ参照・削除 |
| missions / mission_completions | ミッションと完了記録（成果物メモ・添付） | オーナーのみ参照（作成・完了はサーバー関数のみ） |
| company_activity_logs | 成長記録・重要な決定事項 | オーナーのみ参照 |
| ai_usage_logs | AI呼び出し・トークン・推定原価 | 本人のみ参照 |
| subscriptions | Stripe 契約状態（Webhook のみが書込） | 本人のみ参照 |
| app_settings | 料金・上限設定 | **クライアント不可**（サーバーのみ） |

サーバー専用関数（`service_role` のみ実行可）:
- `complete_mission` … 所有者確認・二重完了防止・XP付与・レベル判定・ログを1トランザクションで実行
- `reserve_ai_usage` … ユーザー単位のロックで毎分/日/月の上限と全体予算を判定し、利用枠を予約
- `company_checkin` … 連続出社日数の更新

## 4. 環境変数

`.env.example` を `.env.local` にコピーして設定します。**`NEXT_PUBLIC_` 以外はブラウザに公開されません。**

| 変数 | 必須 | 説明 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase プロジェクトURL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key（RLSで保護） |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | サーバー専用。XP付与・利用量記録・Webhook・アカウント削除に使用 |
| `OPENAI_API_KEY` | ✅ | サーバー専用。運営者負担のAI利用 |
| `OPENAI_MODEL` | | 既定 `gpt-4.1-mini`。高性能モデルへは値を変えるだけ |
| `AI_PRICE_INPUT_PER_MTOK` / `AI_PRICE_OUTPUT_PER_MTOK` | | 推定原価の計算単価（USD/100万トークン）。使用モデルの価格に合わせる |
| `AI_GLOBAL_DAILY_BUDGET_USD` | | 全ユーザー合計の1日の推定原価上限。到達でAI機能を停止 |
| `NEXT_PUBLIC_SITE_URL` | ✅(本番) | 本番URL（Stripeの戻り先） |
| `APP_TIMEZONE` | | 既定 `Asia/Tokyo`（ミッション・上限リセットの日付） |
| `ADMIN_EMAILS` | | 管理者ダッシュボードを使えるメール（カンマ区切り）。`profiles.is_admin=true` でも可 |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRO_PRICE_ID` | | Phase 2。未設定でも無料版は動作 |
| `DEV_LOCAL_MODE` / `DEV_SESSION_SECRET` | | ローカル開発専用（下記）。`VERCEL_ENV=production` では強制無効 |

## 5. セットアップ手順

### 5-1. Supabase
1. プロジェクトを作成し、SQL Editor で `supabase/migrations/0001_init.sql` を実行（または `supabase db push`）。
2. Authentication → URL Configuration
   - Site URL: 本番URL（例 `https://xxxx.vercel.app`）
   - Redirect URLs: `https://xxxx.vercel.app/auth/callback`、ローカル用 `http://localhost:3000/auth/callback`
3. Authentication → Providers → Email を有効化（メール確認の有無は運用方針に合わせて設定）。
4. Project Settings → API から URL / anon key / service_role key を控える。

### 5-2. ローカル起動
```bash
cd ai-company
npm install
cp .env.example .env.local   # 値を記入
npm run dev                  # http://localhost:3000
```

### 5-3. 鍵なしで試す「ローカル開発モード」
Supabase と OpenAI の鍵がなくても画面と流れを確認できます（**本番では使用不可**）。
```bash
DEV_LOCAL_MODE=1 DEV_SESSION_SECRET=local npm run dev
```
- データはサーバーのメモリに保存（再起動で消去）、ログインはメールアドレスのみ
- AIは開発用モックで、応答に「開発用モック」と明記されます（実際のAIではありません）
- 画面上部に開発モードの帯が表示されます

### 5-4. Vercel デプロイ
1. Vercel で本リポジトリをインポートし、**Root Directory を `ai-company`** に設定（Framework: Next.js）。
2. 上記の環境変数を Production / Preview に登録（`DEV_LOCAL_MODE` は設定しない）。
3. デプロイ後、Supabase の Site URL / Redirect URLs を本番URLに更新。
4. （Phase 2）Stripe で Product/Price を作成し `STRIPE_PRO_PRICE_ID` を設定、Webhook エンドポイント `https://<domain>/api/stripe/webhook` を登録（イベント: `checkout.session.completed`, `customer.subscription.created/updated/deleted`）。

※ リポジトリ直下の `public/`（既存のLP）と GitHub Pages ワークフローには影響しません。

## 6. テスト

```bash
npm run typecheck   # TypeScript
npm test            # Vitest（レベル/日付/ロゴ/スキーマ/プロンプト防御/面談ロジック/利用上限/ミッション）
npm run test:rls    # 使い捨てPostgreSQLにマイグレーションを適用し、RLS・権限・サーバー関数を検証
npm run build       # 本番ビルド
# E2E（スマホ表示）：開発モードでサーバー起動後
npm run build && DEV_LOCAL_MODE=1 DEV_SESSION_SECRET=x ADMIN_EMAILS=admin@example.com npx next start -p 3100 &
BASE_URL=http://localhost:3100 npm run test:e2e
```
GitHub Actions（`.github/workflows/ai-company-ci.yml`）で上記をすべて実行します。

## 7. セキュリティ設計

- **APIキーの秘匿**：OpenAI/Stripe/service_role はサーバー専用モジュール（`server-only`）でのみ参照。ビルド成果物（`.next/static`）に含まれないことを確認済み。
- **データ分離**：全テーブル RLS。他ユーザーの会社・会話・ミッションは参照・変更不可（`npm run test:rls` で検証）。
- **改ざん防止**：XP・レベル・ミッション・利用ログ・プランは列権限/関数権限でクライアントから変更不可。有料判定は Webhook が書き込む `subscriptions` のみを正とする。
- **利用量制御**：毎分・日・月の回数上限（機能別）、全体の1日予算、異常利用検知、トークン・推定原価の記録をサーバー側で実施。
- **入力検証**：全APIで zod 検証・本文サイズ上限・同一オリジン確認。AIの構造化出力も zod で検証後に保存。
- **プロンプトインジェクション対策**：ユーザー入力・会社データは `<data>` 区画に隔離し、指示として扱わないよう明示。タグ偽装を無効化。
- **外部操作の禁止**：AIは文章の提案・作成のみ。送信・投稿・購入・契約・支払いは実装しておらず、AIにも「実行した」と言わないよう指示。実績シェアは端末の共有シートを開くだけ。
- **削除機能**：会話履歴の一括削除、アカウントと全データの削除（カスケード）。

## 8. 実装状況

### 実装済み（Phase 1）
- 登録・ログイン（Supabase Auth）／ログアウト
- オープニング演出 → AI秘書との会話型面談（スキップ・途中終了可、回答に応じた深掘り、AI障害時は定型質問で継続）
- 事業未定時のAI事業アイデア3案 → 選択
- 会社設計（社名候補・コンセプト・理念・目標・主要事業・行動計画・推奨社員・初日ミッション）→ 確認・編集 → 設立
- 設立演出（社名登録→オフィス準備→社員配置→Congratulations、SVGロゴ自動生成）
- 社長室（会社情報・レベル/XP・社員稼働状況・今日のミッション・お知らせ・成長履歴・連続出社）
- AI社員3名と役割別チャット（会社情報・目標・決定事項・ミッション・要約メモリ・直近履歴をコンテキストに使用）
- 職種別の業務依頼（各3機能、成果物として自動保存）／チャット回答の成果物保存／決定事項の記録
- 毎日のミッション（AI生成・失敗時は定型）、成果物メモ/成果物添付による完了判定、XP・レベル
- AI社内会議（1回のAI呼び出しで3名の意見＋まとめ＋タスク、議事録保存）※無料は1日1回のお試し
- 人材採用センター（11職種のカード表示、追加採用は準備中）
- 実績バッジ・成長記録・実績シェア（共有シート）
- 料金ページ・利用状況、管理者ダッシュボード（利用量・原価・異常検知・上限/価格設定）
- 利用規約・プライバシーポリシー（雛形）

### 未実装 / 次フェーズ
- AI社員の追加採用・採用前面接（UIは「準備中」表示）
- Stripe 決済の実運用（コードは実装済みだが実際のStripeアカウントでの動作確認は未実施）
- 複数プロジェクト管理UI（`projects` テーブルのみ用意）、詳細な会社分析
- 事業進捗によるオフィスの見た目変化、外部サービス連携、多言語対応
- AI応答のストリーミング表示（現在は応答完了後に表示）
- 利用規約・プライバシーポリシーの正式版（運営者情報の記入と専門家確認が必要）
