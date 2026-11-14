import Link from "next/link";
import { PageHeader, Field, inputCls, btn, Alert } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { loginAction } from "@/actions/auth";

export const metadata = { title: "ログイン" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; logged_out?: string }> }) {
  const { next = "", logged_out } = await searchParams;
  return (
    <>
      <PageHeader en="LOGIN" title="ログイン" />
      <div className="mx-auto max-w-md space-y-6 px-4 py-12">
        {logged_out ? <Alert kind="info">ログアウトしました。</Alert> : null}
        <ActionForm action={loginAction}>
              <input type="hidden" name="next" value={next} />
              <Field label="メールアドレス" name="email" required>
                <input id="email" name="email" type="email" required autoComplete="email" className={inputCls} />
              </Field>
              <Field label="パスワード" name="password" required>
                <input id="password" name="password" type="password" required autoComplete="current-password" className={inputCls} />
              </Field>
              <SubmitButton className={`${btn.primary} w-full`}>ログイン</SubmitButton>
        </ActionForm>
        <div className="flex flex-col gap-2 text-sm">
          <Link href="/password/forgot" className={btn.link}>パスワードをお忘れの方</Link>
          <Link href="/apply" className={btn.link}>入会申請はこちら</Link>
        </div>
      </div>
    </>
  );
}
