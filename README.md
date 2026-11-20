# DAILY GOLF — PRIVATE OFFER

デイリー社グループ（関西）4コースのシークレットプランへ案内する、1ページ完結の限定ページです。
ビルド不要の静的サイト（HTML / CSS / JavaScript のみ）です。

## ディレクトリ構成

```
public/               ← 公開ディレクトリ（このフォルダをそのまま公開）
├── index.html        ページ本体（title / description もここ）
├── css/style.css     デザイン
├── js/courses.js     ★ ゴルフ場の名前・画像・予約URLの設定
├── js/main.js        カード描画
├── images/           ★ コース写真
└── favicon.svg
```

## 予約リンク（アフィリエイトURL）の変更

`public/js/courses.js` の `url` を書き換えるだけです。

```js
{
  name: "デイリー信楽カントリー倶楽部",
  image: "images/daily-shigaraki.jpg",
  url: "https://..."   // ← ここ
},
```

- `https://` で始まらない値（初期値の `AFFILIATE_URL_...`）は未設定とみなし、クリックしても遷移しません。
- リンクには `rel="sponsored noopener noreferrer"` が自動で付きます。
- 新しいタブで開きたい場合は `GOLF_OPEN_IN_NEW_TAB = true` に変更（Instagram 内ブラウザでは `false` 推奨）。

## 写真の差し替え

`public/images/` 内の同名ファイルを上書きするだけで反映されます。

| ゴルフ場 | ファイル |
| --- | --- |
| デイリー信楽カントリー倶楽部 | `daily-shigaraki.webp` |
| 名阪ロイヤルゴルフクラブ | `meihan-royal.jpg` |
| 京阪カントリー倶楽部 | `keihan-country.jpg` |
| 吉川ロイヤルゴルフクラブ | `yokawa-royal.webp` |

- 推奨：横長 2:1（例 1600×800px）、JPG または WebP、200KB 前後に圧縮。
- 被写体はやや中央下寄り（画像下部には文字が重なり、暗めのグラデーションがかかります）。
- 別のファイル名にする場合は `courses.js` の `image` を変更してください。

## ローカル確認

```sh
npx serve public
```

## 公開

### GitHub Pages（設定済み）

`main` ブランチに push すると `.github/workflows/pages.yml` が `public/` を自動で公開します。
初回のみ GitHub の Settings → Pages → Build and deployment → Source を **GitHub Actions** にしてください。

公開URL：https://onefordream.github.io/claude/

### その他のホスティング

`public/` を公開ディレクトリとして、任意の静的ホスティングに配置してください。

- Netlify：Publish directory を `public`
- Vercel：Output Directory を `public`（ビルドコマンドなし）
- Cloudflare Pages：Build output directory を `public`

---

# AI GOLF LAB（試作版）

`public/ai-golf/` にある、スマホのスロー動画でゴルフの弾道を測り、AIコーチが課題と練習メニューを出すアプリの試作版です。

- 公開URL（main に反映後）：https://onefordream.github.io/claude/ai-golf/
- 商品化プラン：[`docs/ai-golf-plan.md`](docs/ai-golf-plan.md)

```
public/ai-golf/
├── index.html
├── css/app.css
└── js/
    ├── app.js       画面・フロー
    ├── measure.js   動画からの計測（タップ方式）
    ├── physics.js   弾道シミュレーション
    ├── coach.js     スコア・診断・練習メニュー・伸び代
    ├── charts.js    推移グラフ・弾道グラフ
    ├── clubs.js     クラブ別の基準値
    ├── pass.js      AIパス（買い切り）
    └── store.js     端末内保存
```
