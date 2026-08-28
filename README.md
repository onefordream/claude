# 第2回 SHADOW LADIES PRO-AM TOURNAMENT — 公式サイト

女子プロと夢の18ホール。2026年12月3日（木）、デイリー信楽カントリー倶楽部にて開催。

## 技術構成

このサイトは **外部パッケージ依存ゼロ**（npm install不要）で動作します。Node.js 標準モジュールのみを使用したサーバーサイドレンダリング（SSR）構成です。

- ランタイム: Node.js 18+ の標準モジュールのみ（`http` / `fs` / `zlib` / `crypto`）
- レンダリング: リクエスト毎にテンプレート関数でHTMLを組み立てるSSR（ビルドステップ不要。データを編集したら即座に反映されます）
- スタイル: 素のCSS（`public/css/main.css`）。デザイントークン（カラー・タイポグラフィ・余白）を`:root`で一元管理
- フロントJS: 依存ゼロのバニラES Modules（`public/js/*.js`）
- データ永続化: `data/store/*.json`（エントリー・お問い合わせ）をファイルベースで管理

なぜこの構成か: 本番相当のNext.js/React環境を検討しましたが、このセッションの実行環境ではnpmレジストリへの外部アクセスがネットワークポリシーで遮断されており、パッケージインストールができませんでした。そのため、依存ゼロで動く高速・軽量・保守しやすい構成を採用しています。将来的にNext.js等へ移行する場合も、`src/data/*.mjs`のデータ層とテンプレート層はほぼそのまま流用できるよう分離設計しています。

## セットアップ・起動

```bash
node server.mjs
# または開発時（ファイル変更で自動再起動）
node --watch server.mjs
```

`http://localhost:3000` で起動します。ポートは環境変数 `PORT` で変更可能です。

初回起動時、`public/images/placeholders/` のプレースホルダー画像とfavicon/OGP画像が未生成の場合は以下で再生成できます。

```bash
node scripts/gen-placeholders.mjs   # セクション用プレースホルダーSVG
node scripts/gen-images.mjs         # favicon / OGP画像（PNG）
```

## コンテンツの更新方法（コードを触らずに更新できる項目）

すべて `src/data/*.mjs` を編集するだけで、サーバー再起動なしに反映されます（リクエスト毎にファイルを読み込むため）。

| 内容 | ファイル |
|---|---|
| 大会名・開催日・会場・料金など基本情報 | `src/data/site.mjs` |
| 出場プロ一覧（追加・削除・並び替え・COMING SOON切替） | `src/data/players.mjs` |
| スペシャルMC | `src/data/mc.mjs` |
| 賞金・賞品（プロ／アマチュア／参加賞） | `src/data/prizes.mjs` |
| 当日スケジュール | `src/data/schedule.mjs` |
| スポンサー企業（ランク別） | `src/data/sponsors.mjs` |
| NEWS / お知らせ | `src/data/news.mjs` |
| FAQ | `src/data/faq.mjs` |
| ギャラリー（第1回／第2回） | `src/data/gallery.mjs` |
| 競技規則 | `src/data/rules.mjs` |
| 主催者メッセージ | `src/data/organizer.mjs` |

### 出場プロを1名追加する例

`src/data/players.mjs` の配列に以下を追加するだけです。

```js
{
  id: "player-13",
  status: "announced",
  name: "〇〇 〇〇",
  nameKana: "〇〇 〇〇",
  affiliation: "〇〇ゴルフ倶楽部",
  instagram: "https://www.instagram.com/xxxxx/",
  profile: "プロフィール文章。",
  achievements: ["20XX年 〇〇オープン 優勝"],
  photo: "/images/players/player-13.jpg",
},
```

`status: "comingSoon"` のオブジェクトは削除するか `announced` に変更してください。

### 画像の差し替え

現時点で写真素材がない箇所は、ブランドカラーのプレースホルダーSVG（`/public/images/placeholders/`）を表示しています。実写真が届いたら、`public/images/`以下に配置し、対応する `src/data/*.mjs` の `photo` / `src` パスを新しい画像パスに書き換えるだけで反映されます。

置き換えが必要な主な箇所：`HERO_IMAGE`（トップ写真）、`PRO_PLAYER_IMAGE`（出場プロ）、`SPECIAL_MC_IMAGE`、`FIRST_TOURNAMENT_GALLERY`、`SPONSOR_LOGO`、`ORGANIZER_IMAGE`、`VENUE_IMAGE`。

## エントリー・お問い合わせシステム

- `POST /api/entry` — エントリー登録。プロ40名／アマチュア120名の定員をそれぞれ独立して管理し、定員到達後は自動的にキャンセル待ち（`status: "waitlist"`）として記録します。
- `GET /api/capacity` — プロ／アマチュアの残り枠をJSONで返却（トップページのエントリーセクションがこれを使ってリアルタイム表示・更新します）。
- `POST /api/contact` — お問い合わせ登録。
- データは `data/store/entries.json` / `data/store/contacts.json` に保存されます（`.gitignore`対象。本番運用前に定期バックアップの仕組みを用意してください）。

### 自動返信メールについて

`src/lib/mail-hook.mjs` で [Resend](https://resend.com) のAPIを使って送信しています。環境変数 `RESEND_API_KEY` を設定すると、①応募者本人への自動返信、②管理者（`ADMIN_NOTIFY_EMAIL`、未設定時は `onefordream72@gmail.com`）への新規エントリー・お問い合わせ通知、の両方が有効になります。`RESEND_API_KEY` 未設定時は何も送信せず静かにno-opします。

送信元アドレスは環境変数 `RESEND_FROM_EMAIL` で変更可能です（未設定時は Resend のテスト用アドレス `onboarding@resend.dev` を使用）。独自ドメインのメールアドレスから送りたい場合は、Resend側でドメインを検証してから設定してください。

### 定員・締切の変更

`src/lib/store.mjs` の `CAPACITY`（プロ40名／アマチュア120名）と `ENTRY_DEADLINE`（2026-11-30）を編集してください。

## 本番運用前チェックリスト

- [ ] `src/data/site.mjs` の `venue.address` / `venue.mapUrl` を正式なアクセス情報に更新
- [ ] `src/data/site.mjs` の `seo.siteUrl` を実際の公開ドメインに変更（`public/robots.txt` / `public/sitemap.xml` も合わせて更新）
- [ ] 出場プロ・スポンサー・写真素材を本番データに差し替え
- [ ] `data/store/` を定期バックアップする運用を用意（もしくはDBへの移行を検討）
- [ ] HTTPS配信（リバースプロキシ等）の設定

## デプロイ

依存パッケージがないため、Node.js が動く環境であればどこでも `node server.mjs` を実行するだけで動作します（Render / Railway / Fly.io / 自前VPS など）。`PORT`環境変数に対応済みです。
