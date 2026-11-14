import { PageHeader, SectionTitle } from "@/components/ui";
import { CtaBand } from "@/components/site";

export const metadata = { title: "入会資格・審査制度" };

const STEPS = [
  ["入会申請", "申請フォームから会社情報・ご連絡先などをご登録ください。ご登録のメールアドレスに確認メールをお送りします。"],
  ["審査", "運営事務局にて申請内容を確認します。必要に応じて追加情報の提出をお願いすることがあります。"],
  ["審査結果のご連絡", "審査結果をメールでお知らせします。申請状況はログイン後の画面でも確認できます。"],
  ["お支払い手続き", "承認された方のみ決済画面にお進みいただけます。入会金と初月会費をお支払いいただきます。"],
  ["ご入会", "お支払い完了で正式会員となります。会員証とオリジナルネームプレートをご登録住所へ発送します。"],
];

export default function MembershipPage() {
  return (
    <>
      <PageHeader en="MEMBERSHIP" title="入会資格・審査制度" />
      <div className="mx-auto max-w-3xl space-y-16 px-4 py-16">
        <section>
          <SectionTitle en="ELIGIBILITY" ja="入会資格" />
          <ul className="mt-6 list-disc space-y-2 pl-5 text-sm leading-loose">
            <li>会社経営者・代表取締役・CEO・法人オーナーの方</li>
            <li>当クラブの入会規約および個人情報保護方針に同意いただける方</li>
          </ul>
          <p className="mt-4 text-xs text-mute">※審査基準の詳細は公開しておりません。審査結果の理由についてはお答えいたしかねます。</p>
        </section>
        <section>
          <SectionTitle en="FLOW" ja="入会までの流れ" />
          <ol className="mt-8 space-y-6">
            {STEPS.map(([t, b], i) => (
              <li key={t} className="grid grid-cols-[3rem_1fr] gap-4">
                <span className="font-serif text-2xl text-gold">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="font-serif text-lg">{t}</h3>
                  <p className="mt-1 text-sm text-mute">{b}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
      <CtaBand />
    </>
  );
}
