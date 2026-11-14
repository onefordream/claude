import { PageHeader } from "@/components/ui";
import { CtaBand } from "@/components/site";
import { ENTRY_FEE, ENTRY_FEE_INCL, MONTHLY_FEE, MONTHLY_FEE_INCL } from "@/lib/constants";
import { yen } from "@/lib/format";

export const metadata = { title: "よくあるご質問" };

const FAQ: [string, string][] = [
  ["どのような人が入会できますか？", "会社経営者・代表取締役・CEO・法人オーナーの方が対象です。入会は審査制となります。"],
  ["審査にはどのくらい時間がかかりますか？", "審査期間は申請状況により異なります。審査結果はメールでお知らせし、ログイン後の申請状況画面でも確認できます。"],
  ["審査前に料金はかかりますか？", "かかりません。審査で承認された方のみ、決済画面にお進みいただけます。"],
  ["料金はいくらですか？", `入会金 ${yen(ENTRY_FEE)}（税込${yen(ENTRY_FEE_INCL)}）、月会費 ${yen(MONTHLY_FEE)}（税込${yen(MONTHLY_FEE_INCL)}）です。`],
  ["支払い方法は？", "クレジットカードでのお支払いです。カード情報は決済代行会社（Stripe）が管理し、当クラブのシステムには保存されません。"],
  ["ゴルフ初心者でも参加できますか？", "イベントごとの参加条件は会員エリアでご案内します。"],
  ["退会はできますか？", "会員情報管理ページから退会申請ができます。運営確認後、現在の請求期間の末日をもって退会となります。入会金の返金はいたしません。"],
  ["会社情報は他の会員に公開されますか？", "会員企業・経営者紹介ページへの掲載は任意で、公開する項目はご本人が設定できます。非公開に設定した項目は他の会員には表示されません。"],
];

export default function FaqPage() {
  return (
    <>
      <PageHeader en="FAQ" title="よくあるご質問" />
      <div className="mx-auto max-w-3xl divide-y divide-line border-y border-line px-4 my-16">
        {FAQ.map(([q, a]) => (
          <details key={q} className="group py-5">
            <summary className="flex cursor-pointer list-none items-start gap-3 font-medium [&::-webkit-details-marker]:hidden">
              <span className="font-serif text-gold">Q</span>
              <span className="flex-1">{q}</span>
              <span className="text-mute transition group-open:rotate-45">＋</span>
            </summary>
            <p className="mt-3 flex gap-3 text-sm text-mute">
              <span className="font-serif text-green">A</span>
              <span>{a}</span>
            </p>
          </details>
        ))}
      </div>
      <CtaBand />
    </>
  );
}
