# CRAFTORY リール広告（Remotion）

縦型 1080×1920 / 30fps / 15秒 の Instagram リール広告テンプレートです。

## コマンド

```sh
npm i                     # 初回のみ
npx remotion studio       # プレビュー（http://localhost:3000）
NODE_USE_ENV_PROXY=1 npx remotion render CraftoryReel out/craftory-reel.mp4   # MP4 書き出し
```

※ `NODE_USE_ENV_PROXY=1` はプロキシ環境（クラウドセッション）でのみ必要です。

## 量産のしかた

文章・価格・色・業種サイトはすべて `src/Root.tsx` の `defaultProps` にまとまっています。
Studio 右側の Props パネルからも編集できます。

- 価格：`scene3.price`（数値。カウントアップの終点）
- 文言：`scene1`〜`scene6` の各テキスト
- 色：`colors.navy / blue / pale`
- 業種サイト：`scene1.sites`（`image` に `public/` 内のパスか URL を入れると写真に差し替え）

別バージョンを作るときは `<Composition>` を複製して `id` と `defaultProps` を変えるか、
`--props=./props.json` で上書きしてレンダリングします。

## 構成

```
src/
├── Root.tsx            コンポジション登録 + 既定の文言/価格
├── CraftoryReel.tsx    6シーンを TransitionSeries で連結
├── schema.ts           Props の型（zod）
├── scenes/             Scene1Hero 〜 Scene6Cta（シーン単位のコンポーネント）
├── components/         ブラウザ / PC / スマホ / AI / グラフ / テキスト演出 / トランジション
└── lib/                フォント・テーマ・アニメーション共通処理
public/fonts/           Noto Sans JP・Inter（SIL OFL）
```

リールの UI（上部ヘッダー、右側ボタン、下部キャプション）に重ならないよう、
主要要素は y=260〜1460px、x=90〜950px の範囲に配置しています。
