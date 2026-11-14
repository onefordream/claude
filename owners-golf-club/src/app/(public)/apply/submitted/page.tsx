import Link from "next/link";
import { PageHeader, Card, btn } from "@/components/ui";

export const metadata = { title: "申請受付完了" };

export default function SubmittedPage() {
  return (
    <>
      <PageHeader en="THANK YOU" title="入会申請を受け付けました" />
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-12 text-sm leading-loose">
        <Card>
          <p>OWNERS GOLF CLUBへの入会申請ありがとうございます。</p>
          <p className="mt-3">ご登録のメールアドレスに確認メールをお送りしました。メール内のリンクから<strong>メールアドレスの確認</strong>を完了してください。確認が完了した申請から順次審査いたします。</p>
          <p className="mt-3">審査結果はメールでお知らせします。申請状況はログイン後の画面でもご確認いただけます。</p>
        </Card>
        <Link href="/apply/status" className={`${btn.primary} w-full`}>申請状況を確認する</Link>
      </div>
    </>
  );
}
