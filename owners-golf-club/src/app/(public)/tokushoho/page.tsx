import { PageHeader, DL, Alert } from "@/components/ui";
import { ENTRY_FEE, ENTRY_FEE_INCL, MONTHLY_FEE, MONTHLY_FEE_INCL } from "@/lib/constants";
import { yen } from "@/lib/format";

export const metadata = { title: "特定商取引法に基づく表記" };

export default function TokushohoPage() {
  return (
    <>
      <PageHeader en="LEGAL NOTICE" title="特定商取引法に基づく表記" />
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-16">
        <Alert kind="warn">事業者情報は確定後に差し替えてください。</Alert>
        <DL
          items={[
            ["販売事業者", "【未確定】"],
            ["運営責任者", "【未確定】"],
            ["所在地", "【未確定】"],
            ["電話番号", "【未確定】"],
            ["メールアドレス", "【未確定】"],
            ["販売価格", `入会金 ${yen(ENTRY_FEE)}（税込${yen(ENTRY_FEE_INCL)}）／月会費 ${yen(MONTHLY_FEE)}（税込${yen(MONTHLY_FEE_INCL)}）`],
            ["商品代金以外の必要料金", "【未確定】"],
            ["支払方法", "クレジットカード決済"],
            ["支払時期", "入会金・初月会費：審査承認後の決済手続き時。月会費：決済完了日を起算日として毎月同日に自動請求。"],
            ["サービス提供時期", "決済完了後、直ちに会員サービスをご利用いただけます。"],
            ["返品・キャンセル・解約", "退会は会員情報管理ページから申請できます。運営確認後、現在の請求期間の末日をもって退会となります。入会金の返金はいたしません。【未確定】"],
          ]}
        />
      </div>
    </>
  );
}
