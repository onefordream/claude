import { PageHeader, Alert } from "@/components/ui";

export const metadata = { title: "個人情報保護方針" };

export default function PrivacyPage() {
  return (
    <>
      <PageHeader en="PRIVACY POLICY" title="個人情報保護方針" />
      <div className="prose-ogc mx-auto max-w-3xl px-4 py-16 text-sm leading-loose">
        <Alert kind="warn">【未確定】本方針は仮置きの文案です。正式な方針は運営・専門家の確認後に差し替えてください。</Alert>
        <h2>1. 取得する情報</h2>
        <p>入会申請・お問い合わせ・事前登録の際に、氏名、メールアドレス、電話番号、会社情報、郵送先住所などをお預かりします。</p>
        <h2>2. 利用目的</h2>
        <p>入会審査、会員サービスの提供、会員証等の発送、ご連絡、サービス改善のために利用します。</p>
        <h2>3. 決済情報</h2>
        <p>クレジットカード情報は決済代行会社（Stripe）が管理し、当クラブのシステムには保存しません。</p>
        <h2>4. 会員間での公開</h2>
        <p>会員企業・経営者紹介ページには、会員ご本人が公開に設定した項目のみを他の会員に表示します。</p>
        <h2>5. 第三者提供</h2>
        <p>法令に基づく場合を除き、ご本人の同意なく第三者に提供しません。【未確定】</p>
        <h2>6. お問い合わせ窓口</h2>
        <p>【未確定】</p>
      </div>
    </>
  );
}
