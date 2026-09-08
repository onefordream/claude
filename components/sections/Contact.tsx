"use client";

import { useState } from "react";

const industries = ["ゴルフ", "テニス", "サッカー", "野球", "フィットネス", "学習塾", "その他"];
const interests = [
  "デモを見たい",
  "導入について聞きたい",
  "料金を聞きたい",
  "カスタマイズについて相談したい",
  "その他",
];

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <section id="contact" className="section-pad pb-32 sm:pb-28">
      <div className="container-narrow max-w-xl">
        <p className="section-label">CONTACT</p>
        <h2 className="text-[24px] sm:text-3xl font-bold text-ink leading-snug">
          デモ・導入のご相談
        </h2>
        <p className="mt-4 text-[14px] text-muted leading-relaxed">
          1分ほどで送信できます。担当より折り返しご連絡いたします。
        </p>

        {submitted ? (
          <div className="mt-10 card p-8 text-center">
            <p className="text-[15px] font-semibold text-ink">
              お問い合わせありがとうございます。
            </p>
            <p className="mt-2 text-[13px] text-muted">
              担当より2営業日以内にご連絡いたします。
            </p>
          </div>
        ) : (
          <form
            className="mt-10 space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(true);
            }}
          >
            <Field label="スクール / 会社名" name="company" required />
            <Field label="お名前" name="name" required />
            <Field label="メールアドレス" name="email" type="email" required />

            <div>
              <label className="block text-[12px] font-semibold text-ink mb-2">
                業種
              </label>
              <select
                name="industry"
                required
                className="w-full rounded-xl border border-line bg-white px-4 py-3 text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
                defaultValue=""
              >
                <option value="" disabled>
                  選択してください
                </option>
                {industries.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-ink mb-2">
                相談内容
              </label>
              <div className="space-y-2">
                {interests.map((i) => (
                  <label
                    key={i}
                    className="flex items-center gap-3 text-[14px] text-ink"
                  >
                    <input
                      type="checkbox"
                      name="interest"
                      value={i}
                      className="w-4 h-4 rounded border-line accent-ink"
                    />
                    {i}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-ink mb-2">
                自由記載（例：こんな使い方できますか？）
              </label>
              <textarea
                name="message"
                rows={4}
                className="w-full rounded-xl border border-line bg-white px-4 py-3 text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
              />
            </div>

            <button type="submit" className="btn-primary w-full">
              送信する
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-ink mb-2">
        {label}
      </label>
      <input
        type={type}
        name={name}
        required={required}
        className="w-full rounded-xl border border-line bg-white px-4 py-3 text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
      />
    </div>
  );
}
