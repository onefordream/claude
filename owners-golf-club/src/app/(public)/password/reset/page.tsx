import Link from "next/link";
import { PageHeader, Field, inputCls, btn } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { resetPasswordAction } from "@/actions/auth";

export const metadata = { title: "新しいパスワードの設定" };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return (
    <>
      <PageHeader en="PASSWORD" title="新しいパスワードの設定" />
      <div className="mx-auto max-w-md px-4 py-12">
        <ActionForm action={resetPasswordAction} success={<Link href="/login" className={`${btn.primary} w-full`}>ログインへ</Link>}>
                <input type="hidden" name="token" value={token} />
                <Field label="新しいパスワード" name="password" required hint="10文字以上、英字と数字を含めてください">
                  <input id="password" name="password" type="password" required minLength={10} autoComplete="new-password" className={inputCls} />
                </Field>
                <Field label="新しいパスワード（確認）" name="passwordConfirm" required>
                  <input id="passwordConfirm" name="passwordConfirm" type="password" required minLength={10} autoComplete="new-password" className={inputCls} />
                </Field>
                <SubmitButton className={`${btn.primary} w-full`}>パスワードを設定する</SubmitButton>
        </ActionForm>
      </div>
    </>
  );
}
