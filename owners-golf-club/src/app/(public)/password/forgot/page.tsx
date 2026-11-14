import { PageHeader, Field, inputCls, btn } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { forgotPasswordAction } from "@/actions/auth";

export const metadata = { title: "パスワード再設定" };

export default function ForgotPage() {
  return (
    <>
      <PageHeader en="PASSWORD" title="パスワード再設定" lead="ご登録のメールアドレスに、再設定用のリンクをお送りします（有効期限60分）。" />
      <div className="mx-auto max-w-md px-4 py-12">
        <ActionForm action={forgotPasswordAction}>
          <Field label="メールアドレス" name="email" required>
            <input id="email" name="email" type="email" required autoComplete="email" className={inputCls} />
          </Field>
          <SubmitButton className={`${btn.primary} w-full`}>再設定メールを送る</SubmitButton>
        </ActionForm>
      </div>
    </>
  );
}
