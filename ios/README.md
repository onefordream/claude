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
    ├── Store/                  AIパスの購入（StoreKit 2）
    └── Live/                   カメラ（240fps）とライブ計測画面
```

## AIパスの課金（App Store）

AIパスは **非更新サブスクリプション**（自動更新なしの期間パス）として販売します。

| Web 側の ID | 製品 ID | 日数 | 価格（案） |
|---|---|---|---|
| day1 | `com.example.aigolflab.pass.day1` | 1 | ¥160 |
| day3 | `com.example.aigolflab.pass.day3` | 3 | ¥360 |
| day7 | `com.example.aigolflab.pass.day7` | 7 | ¥600 |

- 期限は購入履歴から計算します（`AIGolfLab/Store/PassStore.swift`）。有効期間中に買い足すと期限が延びます。
- 購入履歴は同じ Apple ID の端末間で同期されるので、機種変更や再インストールでも「購入を復元」で戻せます。

### Xcode 上で購入を試す（App Store Connect 不要）

`xcodegen` で作ったスキームには `StoreKit/AIGolfLab.storekit` が設定済みです。そのまま ▶︎ で実行し、AIパス画面で購入すると、テスト用の購入画面が出ます（実際の請求はされません）。

- 購入履歴の確認・削除：Xcode メニュー Debug > StoreKit > Manage Transactions
- 期限切れを試す：Manage Transactions で購入を削除すると、パスが無効に戻ります

### 本番に向けて

1. Bundle ID を決め、`PassStore.productPrefix` と `.storekit` の製品 ID をそれに合わせる
2. App Store Connect で「非更新サブスクリプション」を3つ登録し、価格・説明・審査用スクリーンショットを用意する
3. 有料アプリ契約（銀行口座・税務情報）を済ませる
4. TestFlight のサンドボックス環境で購入・復元を確認する

将来アカウント機能を入れる場合は、購入の検証と期限の管理をサーバーに移すと、Android 版や Web 版とパスを共有できます。

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
- [ ] AIパスの購入・期限切れ・復元（StoreKit 設定で確認）
- [ ] 計測値をレーダー式計測器（練習場の弾道計測器など）と比べて誤差を確認
