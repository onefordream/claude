import Link from "next/link";
import { PageHeader, Field, inputCls, btn } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { submitPreRegistration } from "@/actions/public";

export const metadata = { title: "事前登録" };

export default function PreRegisterPage() {
  return (
    <>
      <PageHeader en="PRE-REGISTRATION" title="事前登録" lead="2027年3月の始動に向けて、最新情報をお届けします。事前登録は入会申請ではありません。" />
      <div className="mx-auto max-w-2xl px-4 py-16">
        <ActionForm action={submitPreRegistration} resetOnSuccess>
          <Field label="お名前" name="name" required>
            <input id="name" name="name" required maxLength={100} className={inputCls} autoComplete="name" />
          </Field>
          <Field label="メールアドレス" name="email" required>
            <input id="email" name="email" type="email" required maxLength={254} className={inputCls} autoComplete="email" />
          </Field>
          <Field label="会社名" name="company" required>
            <input id="company" name="company" required maxLength={200} className={inputCls} autoComplete="organization" />
          </Field>
          <Field label="役職" name="position">
            <input id="position" name="position" maxLength={100} className={inputCls} />
          </Field>
          <Field label="ご質問・ご要望" name="message">
            <textarea id="message" name="message" rows={4} maxLength={2000} className={inputCls} />
          </Field>
          <input type="text" name="website_hp" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="agree" required className="mt-1" />
            <span><Link href="/privacy" className={btn.link} target="_blank">個人情報保護方針</Link>に同意する</span>
          </label>
          <SubmitButton className={`${btn.primary} w-full`}>事前登録する</SubmitButton>
        </ActionForm>
      </div>
    </>
  );
}
