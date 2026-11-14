import Link from "next/link";
import { PageHeader, btn } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { verifyEmailAction } from "@/actions/auth";

export const metadata = { title: "メールアドレスの確認" };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return (
    <>
      <PageHeader en="VERIFY" title="メールアドレスの確認" />
      <div className="mx-auto max-w-md px-4 py-12">
        <ActionForm action={verifyEmailAction} success={<Link href="/apply/status" className={`${btn.primary} w-full`}>申請状況を確認する</Link>}>
          <input type="hidden" name="token" value={token} />
          <p className="text-sm">下のボタンを押して、メールアドレスの確認を完了してください。</p>
          <SubmitButton className={`${btn.primary} w-full`}>メールアドレスを確認する</SubmitButton>
        </ActionForm>
      </div>
    </>
  );
}
