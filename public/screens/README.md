# 商品画面アセットの差し替えガイド

現在、すべての商品画面（スマホ／PC管理画面）は `components/ui/PhoneFrame.tsx` と
`components/ui/BrowserFrame.tsx` を使った CSS/HTML の仮モックアップです。
実際のスクリーンショットが用意でき次第、以下の対応でここに配置した画像へ差し替えられます。

## 差し替え手順（例：HOME画面）

1. 実際のスクリーンショットをこのフォルダに保存する
   例: `public/screens/home.png`
2. 差し替えたいセクションの `<PhoneFrame>...</PhoneFrame>` を
   `<PhoneFrame><img src="/screens/home.png" alt="HOME画面" /></PhoneFrame>` に置き換える
   （`PhoneFrame` はスマホの枠だけを描画するので、中身を画像に差し替えるだけで枠はそのまま使えます）
3. PC管理画面（`BrowserFrame`）も同様に、`components/ui/BrowserFrame.tsx` の
   `children` を実画像に差し替え可能です。

## 想定ファイル名（未作成・プレースホルダー）

- `home.png` — HOME（目標・最近の記録）
- `lesson.png` — レッスン記録
- `practice.png` — 自主練習
- `result.png` — 成果記録（ラウンド・試合・テスト）
- `ai-coach.png` — AIコーチ
- `admin-dashboard.png` — 先生・管理者用ダッシュボード（PC）
- `casestudy-*.png` — GOLF STUDIO SHADOW 導入事例用（HOME/LESSON/ROUND/AI COACHの4枚）

## 差し替え箇所（コンポーネント別）

| セクション | ファイル | 内容 |
|---|---|---|
| Hero | `components/sections/Hero.tsx` | PC管理画面＋スマホ2台 |
| Function 01〜04 | `components/sections/ProductFeatures.tsx` | レッスン/自主練習/成果/目標の4画面 |
| Solution | `components/sections/Solution.tsx` | スマホ3台（PRACTICE/HOME/RESULT） |
| AI Coach | `components/sections/AICoach.tsx` | AIチャット画面 |
| Customize | `components/sections/Customize.tsx` | ゴルフ/テニス/サッカーの3校 |
| Case Study | `components/sections/CaseStudy.tsx` | GOLF STUDIO SHADOWの4画面 |

画像化する際は、スマホ枠のアスペクト比（9:19.3）に合わせて書き出すと綺麗に収まります。
