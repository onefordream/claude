import Link from "next/link";

export const metadata = { title: "プライバシーポリシー" };

// 注意：公開前に運営者情報・問い合わせ窓口等を記入し、専門家の確認を受けてください（雛形）。
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10 text-sm leading-relaxed">
      <Link href="/" className="text-xs text-muted">
        ← トップへ
      </Link>
      <h1 className="mb-2 mt-4 text-2xl font-black">プライバシーポリシー（ドラフト）</h1>
      <p className="mb-6 text-xs text-gold-soft">※ 本ページは雛形です。運営者名・連絡先等は公開前に確定させてください。</p>
      <div className="prose-ai space-y-4">
        <h2>1. 取得する情報</h2>
        <ul>
          <li>メールアドレス等のアカウント情報</li>
          <li>面談の回答、会社プロフィール、AI社員との会話、成果物などユーザーが入力・作成した情報</li>
          <li>AI利用回数・トークン数等の利用状況</li>
          <li>有料プラン利用時の決済状況（カード情報は決済代行会社が管理し、当サービスは保持しません）</li>
        </ul>
        <h2>2. 利用目的</h2>
        <p>本サービスの提供、AI応答の生成、利用上限の管理、不正利用の防止、品質改善のために利用します。</p>
        <h2>3. 外部サービスへの提供</h2>
        <p>AI応答の生成のため、入力内容と会社情報の一部をAI提供事業者（OpenAI等）のAPIへ送信します。データ保存にSupabase、ホスティングにVercel、決済にStripeを利用します。</p>
        <h2>4. 削除</h2>
        <p>設定画面から、会話履歴の削除、アカウントおよび全データの削除ができます。</p>
        <h2>5. 安全管理</h2>
        <p>データはユーザーごとに分離して保存し、他のユーザーから閲覧できないよう管理しています。APIキー等の秘密情報はサーバー側でのみ管理します。</p>
      </div>
    </main>
  );
}
