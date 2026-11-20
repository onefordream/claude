# AI GOLF LAB（iPhone アプリ）

カメラを向けて打つだけで、打った瞬間に **ボール初速・打ち出し角・推定キャリー** を表示するアプリの試作版です。

- 240fps・シャッター 1/2000 秒で撮影
- ボールを自動で見つけて、止まったら「準備OK」（輪が緑）
- ボールが消えた瞬間をインパクトとして検知し、その後 0.07 秒分のコマから軌跡を解析
- 結果は読み上げ＋画面表示。次のボールを同じ場所に置けば、そのまま続けて測れる
- 診断・記録・グラフ・AIパスの画面は Web 版（`public/ai-golf/`）をアプリに同梱して使う

## 必要なもの

- Mac（Xcode 15 以上）
- iPhone（240fps 撮影に対応した機種。iPhone 8 以降ならほぼ対応）
- Apple ID（実機に入れるだけなら無料でも可）
- [XcodeGen](https://github.com/yonaskolb/XcodeGen)

## はじめかた

```sh
brew install xcodegen
cd ios
xcodegen            # AIGolfLab.xcodeproj が作られる
open AIGolfLab.xcodeproj
```

1. Xcode で左上の「AIGolfLab」ターゲット →「Signing & Capabilities」→ Team に自分の Apple ID を選ぶ
2. Bundle Identifier を自分用に変更（例：`com.<あなたの名前>.aigolflab`）
3. iPhone を USB でつなぎ、実行先に選んで ▶︎ で実行
4. 初回は iPhone の「設定 > 一般 > VPN とデバイス管理」で開発元を信頼する

## 計測アルゴリズムのテスト（Mac）

```sh
cd ios/GolfCore
swift test
```

合成した 240fps 映像（体の動き・クラブヘッド入り）で、ドライバー〜ウェッジの初速を ±3%、打ち出し角を ±0.5° 以内で測れることを確かめるテストです。

## 構成

```
ios/
├── project.yml                 XcodeGen 設定（Web 版を同梱する設定もここ）
├── GolfCore/                   計測アルゴリズム（Apple のフレームワークに依存しない）
│   ├── Sources/GolfCore/
│   │   ├── Image.swift         グレースケール画像
│   │   ├── BallFinder.swift    静止ボールの検出（中心・直径）
│   │   ├── ShotDetector.swift  検出 → 待機 → インパクト検知 → 解析 の状態機械
│   │   ├── ShotTracker.swift   インパクト後の軌跡から初速・打ち出し角（RANSAC）
│   │   └── Flight.swift        弾道シミュレーション
│   └── Tests/                  合成映像によるテスト
└── AIGolfLab/
    ├── App/                    起動・画面の向き
    ├── Web/                    Web 版を表示する WKWebView と JS 連携
    └── Live/                   カメラ（240fps）とライブ計測画面
```

## 撮り方のコツ（精度に直結）

- スマホは三脚などで固定し、**横向き（ホームボタン/充電口が右）**
- ボールの真横 2〜3m、飛球線と平行に構える（画面の水平計が緑になるように）
- ボールは画面の打つ方向と反対側の 1/4 あたりに置く（飛んでいく側に余白を）
- 明るい屋外ほど正確（シャッターを速くするため）

## 実機で確認が必要な点

- [ ] 240fps・1/2000 秒で撮れているか（画面左下に表示）
- [ ] 傾き補正の向き：わざと傾けて同じ球を打ち、打ち出し角が変わらないか
- [ ] 練習場マット・芝・屋内ネットそれぞれでボールを見つけられるか
- [ ] Web 版の記録（localStorage）がアプリを再起動しても残るか
- [ ] 計測値をレーダー式計測器（練習場の弾道計測器など）と比べて誤差を確認
