# AIコーチ サーバー（Cloudflare Workers）

アプリの計測データを受け取り、Claude（`claude-opus-5-5`）にその人向けの解説と練習プランを書いてもらうサーバーです。
API キーはこのサーバーにだけ置き、アプリには入れません。

- `POST /coach`：計測データ（数値のみ）を受け取り、指導を JSON で返す
- 入力は数値と決まった値だけに組み直してからモデルに渡す（利用者の自由な文章は渡さない）
- 構造化出力で、見出し・要約・優先順位（最大3つ）・伸び代コメント・次回チェックを返す
- 安全分類で断られたときは、サーバー側で自動的に別モデルに切り替える（`fallbacks: "default"`）
- IP ごとに 1 分 6 回までのレート制限

## はじめかた

```sh
cd server
npm install
npm test            # 単体テスト（モデルは呼ばない）
npm run typecheck
```

### ローカルで試す

```sh
echo 'ANTHROPIC_API_KEY=sk-ant-...' > .dev.vars   # Git には入らない
npm run dev                                       # http://localhost:8787/coach
```

### 公開する

```sh
npx wrangler login
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put APP_KEY        # 任意の長い文字列
npm run deploy                          # https://ai-golf-coach.<アカウント>.workers.dev
```

公開したら、`public/ai-golf/js/config.js` の `COACH_API_URL` に URL、`COACH_APP_KEY` に APP_KEY と同じ値を入れます。
空のままなら、アプリは数値基準の診断だけを表示します（今までどおり）。

## 費用の目安

1回の診断で、入力 約1,500トークン・出力（思考を含む）約1,000〜3,000トークン。
Claude Opus 5.5（入力 $4 / 出力 $20 per 100万トークン）で **1回あたり 約3〜9円**。
1日パス（¥160、Apple の手数料 15% を引いて約 ¥136）なら、1日 15 回診断しても赤字になりません。
診断結果は端末に保存し、同じ記録を開き直してもサーバーは呼びません。

## 公開前に必ずやること

- [ ] **購入の検証**：今は `APP_KEY`（アプリに埋め込む簡易キー）と IP のレート制限だけです。アプリを解析すればキーは取り出せるので、本番では StoreKit の購入情報（`Transaction.jwsRepresentation`）を送ってもらい、サーバーで Apple の署名を検証してから Claude を呼ぶようにする
- [ ] **1パスあたりの上限**：購入1件につき1日の診断回数に上限を設ける（費用の上限を固定する）
- [ ] 実際のデータで指導文を10件ほど読み、内容と口調を確認する（`src/coach.ts` の `SYSTEM_PROMPT`）
- [ ] Anthropic Console で月の利用上限を設定する
