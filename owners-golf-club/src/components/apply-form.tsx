"use client";

import Link from "next/link";
import { useActionState } from "react";
import { applyAction } from "@/actions/auth";
import { Alert, Field, btn, inputCls } from "./ui";
import { SubmitButton } from "./forms";

type Def = { name: string; label: string; required?: boolean; type?: string; hint?: string; textarea?: boolean; auto?: string; placeholder?: string; max?: number };

const SECTIONS: { title: string; fields: Def[] }[] = [
  {
    title: "ご本人について",
    fields: [
      { name: "name", label: "氏名", required: true, auto: "name", max: 100 },
      { name: "email", label: "メールアドレス", required: true, type: "email", auto: "email", hint: "確認メールをお送りします。ログインIDになります。", max: 254 },
      { name: "phone", label: "電話番号", required: true, type: "tel", auto: "tel", placeholder: "090-1234-5678", max: 20 },
    ],
  },
  {
    title: "会社について",
    fields: [
      { name: "companyName", label: "会社名", required: true, auto: "organization", max: 200 },
      { name: "companyAddress", label: "会社所在地", required: true, max: 300 },
      { name: "position", label: "役職", required: true, auto: "organization-title", placeholder: "代表取締役", max: 100 },
      { name: "industry", label: "業種", required: true, max: 100 },
      { name: "businessDescription", label: "事業内容", required: true, textarea: true, max: 2000 },
      { name: "website", label: "会社Webサイト", required: true, type: "url", placeholder: "https://", max: 300 },
      { name: "sns", label: "SNSアカウント", hint: "URLまたはアカウント名", max: 300 },
    ],
  },
  {
    title: "ゴルフについて",
    fields: [
      { name: "golfHistory", label: "ゴルフ歴", placeholder: "例：10年", max: 100 },
      { name: "averageScore", label: "平均スコア", placeholder: "例：95", max: 50 },
    ],
  },
  {
    title: "会員証の発送先",
    fields: [
      { name: "postalCode", label: "郵便番号", required: true, auto: "postal-code", placeholder: "123-4567", max: 8 },
      { name: "mailingAddress", label: "郵送先住所", required: true, auto: "street-address", max: 300 },
      { name: "cardDisplayName", label: "会員証・ネームプレート用表記名", required: true, hint: "会員証とネームプレートに記載するお名前（ローマ字表記なども可）", max: 40 },
    ],
  },
];

export function ApplyForm() {
  const [state, action] = useActionState(applyAction, null);
  const v = state?.values ?? {};
  return (
    <form action={action} className="space-y-10" key={JSON.stringify(v)}>
      {state?.error ? <Alert kind="error">{state.error}</Alert> : null}
      {SECTIONS.map((s) => (
        <fieldset key={s.title} className="space-y-5">
          <legend className="mb-4 w-full border-b border-line pb-2 font-serif text-lg">{s.title}</legend>
          {s.fields.map((f) => (
            <Field key={f.name} label={f.label} name={f.name} required={f.required} hint={f.hint}>
              {f.textarea ? (
                <textarea id={f.name} name={f.name} required={f.required} rows={4} maxLength={f.max} defaultValue={v[f.name]} className={inputCls} />
              ) : (
                <input
                  id={f.name}
                  name={f.name}
                  type={f.type ?? "text"}
                  required={f.required}
                  autoComplete={f.auto}
                  placeholder={f.placeholder}
                  maxLength={f.max}
                  defaultValue={v[f.name]}
                  className={inputCls}
                />
              )}
            </Field>
          ))}
        </fieldset>
      ))}
      <fieldset className="space-y-5">
        <legend className="mb-4 w-full border-b border-line pb-2 font-serif text-lg">ログイン用パスワード</legend>
        <Field label="パスワード" name="password" required hint="10文字以上、英字と数字を含めてください">
          <input id="password" name="password" type="password" required minLength={10} maxLength={128} autoComplete="new-password" className={inputCls} />
        </Field>
        <Field label="パスワード（確認）" name="passwordConfirm" required>
          <input id="passwordConfirm" name="passwordConfirm" type="password" required minLength={10} maxLength={128} autoComplete="new-password" className={inputCls} />
        </Field>
      </fieldset>
      <div className="space-y-3 border border-line bg-cream p-5 text-sm">
        <label className="flex items-start gap-2">
          <input type="checkbox" name="agreeTerms" required className="mt-1" />
          <span><Link href="/terms" target="_blank" className={btn.link}>入会規約</Link>に同意する</span>
        </label>
        <label className="flex items-start gap-2">
          <input type="checkbox" name="agreePrivacy" required className="mt-1" />
          <span><Link href="/privacy" target="_blank" className={btn.link}>個人情報保護方針</Link>に同意する</span>
        </label>
        <p className="text-xs text-mute">※申請時点で料金は発生しません。審査で承認された方のみ決済のご案内をいたします。</p>
      </div>
      <SubmitButton className={`${btn.primary} w-full`}>入会を申請する</SubmitButton>
    </form>
  );
}
