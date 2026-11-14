import { PageHeader, Field, inputCls, btn } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { submitContact } from "@/actions/public";

export const metadata = { title: "お問い合わせ" };

export default function ContactPage() {
  return (
    <>
      <PageHeader en="CONTACT" title="お問い合わせ" />
      <div className="mx-auto max-w-2xl px-4 py-16">
        <ActionForm action={submitContact} resetOnSuccess>
          <Field label="お名前" name="name" required>
            <input id="name" name="name" required maxLength={100} className={inputCls} autoComplete="name" />
          </Field>
          <Field label="メールアドレス" name="email" required>
            <input id="email" name="email" type="email" required maxLength={254} className={inputCls} autoComplete="email" />
          </Field>
          <Field label="会社名" name="company">
            <input id="company" name="company" maxLength={200} className={inputCls} autoComplete="organization" />
          </Field>
          <Field label="お問い合わせ内容" name="message" required>
            <textarea id="message" name="message" required rows={6} maxLength={4000} className={inputCls} />
          </Field>
          <input type="text" name="website_hp" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
          <p className="text-xs text-mute">送信いただいた情報は、個人情報保護方針に従って取り扱います。</p>
          <SubmitButton className={`${btn.primary} w-full`}>送信する</SubmitButton>
        </ActionForm>
      </div>
    </>
  );
}
