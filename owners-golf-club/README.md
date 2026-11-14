# OWNERS GOLF CLUB ウェブアプリ

会社経営者・法人オーナー向け 完全審査制の会員制ゴルフ＆ビジネスコミュニティのWebアプリです。

- Next.js 15（App Router）+ TypeScript / Tailwind CSS v4
- Prisma 6 + PostgreSQL
- 自前認証（bcrypt・DBセッション・署名付き httpOnly Cookie）
- Stripe（Checkout subscription モード / Webhook / Customer Portal）。未設定時はモック決済モード

> 正本仕様は `system-spec.md`（運営側管理）。本READMEはセットアップと運用手順をまとめたものです。

---

## セットアップ

```sh
cd owners-golf-club
cp .env.example .env        # 値を設定（下記「環境変数」参照）
npm install                 # postinstall で prisma generate が走ります
npm run db:migrate          # 開発DBにマイグレーション適用（本番は npm run db:deploy）
npm run db:seed             # 管理者アカウント＋サンプルデータ作成
npm run dev                 # http://localhost:3000
```

ローカルの PostgreSQL が無い場合は Docker で起動できます。

```sh
docker run -d --name ogc-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=ogc -p 5432:5432 postgres:16
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ogc"
```

## 環境変数

| 変数 | 必須 | 説明 |
| --- | --- | --- |
| `DATABASE_URL` | ✔ | PostgreSQL 接続文字列（Supabase / Neon 等） |
| `SESSION_SECRET` | ✔ | セッションCookie署名用。32文字以上のランダム文字列（`openssl rand -base64 48`） |
| `APP_URL` | ✔ | 公開URL。メール内リンクと Stripe のリダイレクト先に使用（例 `https://example.com`） |
| `STRIPE_SECRET_KEY` | | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | | `whsec_...` |
| `STRIPE_PRICE_ENTRY_FEE` | | 入会金（税込 11,000円・一回払い）の Price ID |
| `STRIPE_PRICE_MONTHLY` | | 月会費（税込 2,178円・月次）の Price ID |
| `SEED_ADMIN_EMAIL` | seed時 | 初期管理者のメールアドレス |
| `SEED_ADMIN_PASSWORD` | seed時 | 初期管理者のパスワード（12文字以上） |
| `SEED_SAMPLE_DATA` | | `false` でサンプルデータを作らない |

Stripe の4変数が **すべて** 揃うと実決済モード、1つでも欠けると **モック決済モード** になります（管理画面上部に表示）。

## 管理者ログイン

1. `.env` に `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` を設定
2. `npm run db:seed` を実行（既存の同メールアカウントがあればパスワードを上書きし ADMIN 化）
3. `/login` からログイン → `/admin`

パスワードはコードに直書きしていません。本番では seed 実行後に環境変数から削除して構いません。

## Stripe テストモードの設定

1. Stripe ダッシュボード（テストモード）→ 商品カタログで2つの価格を作成
   - 「入会金」: **一回限り**、**11,000円**（税込額で登録。Stripe Tax は使わない）
   - 「月会費」: **継続・月次**、**2,178円**（税込額で登録）
2. それぞれの Price ID（`price_...`）を `STRIPE_PRICE_ENTRY_FEE` / `STRIPE_PRICE_MONTHLY` に設定
3. API キー（`sk_test_...`）を `STRIPE_SECRET_KEY` に設定
4. 設定 → Billing → カスタマーポータル を有効化（カード変更・請求書履歴を許可）
5. Webhook のローカル転送（Stripe CLI）

   ```sh
   stripe login
   stripe listen --forward-to localhost:3000/api/stripe/webhook \
     --events checkout.session.completed,invoice.paid,invoice.payment_failed,customer.subscription.updated,customer.subscription.deleted
   # 表示された whsec_... を STRIPE_WEBHOOK_SECRET に設定して dev サーバーを再起動
   ```

6. 本番では Stripe ダッシュボードで `https://<APP_URL>/api/stripe/webhook` に上記5イベントのエンドポイントを登録

テストカード: `4242 4242 4242 4242`（有効期限は未来の任意日付、CVC 任意）。支払い失敗の確認は `4000 0000 0000 0341`（登録は成功し、請求時に失敗）。

### 課金の仕組み

- Checkout（`mode: subscription`）1回で「月会費サブスクリプション＋入会金（初回のみの一回払い項目）」を決済
- 初回請求 = 13,178円（税込）。以後、決済完了日を起算日として毎月同日に 2,178円（日割りなし）【仮決め】
- 会員化は `checkout.session.completed`（または success_url での Stripe 照会）で冪等に実行
- 決済記録は `invoice.paid` / `invoice.payment_failed` から作成（Invoice ID で一意）
- Webhook は署名検証必須。イベントIDを `StripeEvent` に記録して二重処理を防止。生ペイロードは保存・ログ出力しない
- カード情報は DB・ログに一切保存しない（Stripe の customer / subscription / invoice / payment_intent の ID と状態のみ）

### モック決済モード

Stripe 未設定でも全フローが動きます。

- 承認済み申請者の決済画面 → モック決済画面 →「テスト決済を完了する」で会員化
- 管理画面の会員詳細から「月次課金（成功／失敗）」「期間末到来」をシミュレート可能
- カード変更ボタンはモック案内ページに遷移

## 業務フローと権限

```
入会申請(APPLIED) → [管理者] 承認(APPROVED) / 否認(REJECTED) / 追加情報依頼(NEEDS_INFO → 申請者提出で APPLIED)
APPROVED → 決済完了 → ACTIVE（会員番号採番・role=MEMBER・会員証発送レコード作成）
ACTIVE ⇄ PAST_DUE（支払い失敗／支払い回復：自動）
ACTIVE → CANCEL_REQUESTED（本人申請）→ [管理者] 承認＝Stripe で期間末解約 → 期間末 Webhook で CANCELLED
ACTIVE / PAST_DUE → SUSPENDED（管理者）
```

- ステータスの正本は `User.status`。遷移はすべて `StatusHistory`（誰が・いつ・from→to・メモ）に記録
- 決済画面・Checkout作成API は **サーバー側で APPROVED を検証**（`assertCanCheckout`）
- `/admin` は ADMIN のみ、`/member` は MEMBER かつ ACTIVE / PAST_DUE / CANCEL_REQUESTED のみ
  - PAST_DUE は会員情報管理（カード変更）のみ。その他の画面は支払い案内へ
  - CANCELLED・SUSPENDED は会員エリアに入れない（セッションも破棄）
- ロール判定は middleware（署名付きCookie）で一次判定し、各ページ・Server Action・Route Handler で DB を参照して再判定
- 会員番号: `OGC-` + 6桁連番。`Counter` テーブルで原子的に採番し、再利用しない【仮決め】

## セキュリティ

- パスワード: bcrypt（cost 12）。平文保存なし
- セッション: DB にトークンのハッシュを保存、Cookie は HMAC 署名・httpOnly・Secure（本番）・SameSite=Lax
- パスワード再設定トークン／メール確認トークン: 有効期限付き・1回限り・DB には SHA-256 ハッシュで保存
- レート制限（DB共有・固定ウィンドウ）: ログイン（IP・メール別）、パスワード再設定、入会申請、お問い合わせ、事前登録、メール確認、Checkout作成、注文
- CSRF: Server Action は Next.js の Origin 検証、それ以外の `/api/*` POST は middleware で Origin / Sec-Fetch-Site を検証（Webhook は署名検証で保護）
- 会員紹介: 本人が「公開」にした項目のみを `toPublicProfile()` で抽出。非公開項目は画面にも API（`/api/members/directory`）にも含まれない
- メール未確認の申請は審査一覧で「未確認」と表示・フィルタ可能

## メール送信

`src/lib/mail.ts` の `Mailer` インターフェース経由。開発時は `ConsoleMailer`（サーバーログに出力）。
本番では送信サービス（Resend / SendGrid / SES 等）の実装を追加して `getMailer()` を差し替えてください。

## Vercel へのデプロイ

- Root Directory: `owners-golf-club`
- Build Command: `npm run build`（`prisma generate` を含む）
- 環境変数を設定し、初回は `npm run db:deploy` と `npm run db:seed` をローカル等から本番DBに対して実行

## 未確定事項（【未確定】／【仮決め】表記）

- 特定商取引法表記の事業者情報、入会規約・個人情報保護方針の本文
- 入会金不返還・退会の詳細条件の正式文言
- 月会費の課金日ルール、退会フロー、会員番号形式（仮決めで実装済み）
- ストアの支払い方法（注文受付のみ実装。支払いは事務局から案内）
- 提携ゴルフ場・メーカー、優待内容、イベントの開催コース・参加費、商品価格（サンプルデータのみ）

## ディレクトリ構成

```
prisma/              schema.prisma / migrations / seed.ts
src/middleware.ts    ロール一次判定・CSRF
src/lib/             auth, session-token, billing(Stripe), status(遷移), rate-limit, mail, profile(公開範囲) など
src/actions/         Server Actions（auth / admin / member / public / mock）
src/app/(public)/    公開ページ・入会フロー
src/app/member/      会員エリア（(full) 配下は ACTIVE / CANCEL_REQUESTED のみ）
src/app/admin/       管理画面
src/app/api/         checkout / stripe webhook / billing portal / session refresh / logout / members directory
```
