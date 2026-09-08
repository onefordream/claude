"use client";

import { useState } from "react";

const industries = ["ゴルフ", "テニス", "サッカー", "野球", "フィットネス", "学習塾", "その他"];
const interests = ["デモを見たい", "導入について聞きたい", "料金を聞きたい", "カスタマイズについて相談したい", "その他"];

const inputClass =
  "w-full rounded-xl border px-4 py-3 text-sm bg-[var(--white)] text-[var(--ink)] focus:outline-none focus:ring-2";

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <section id="contact" className="section band-white">
      <div className="wrap max-w-[560px]">
        <p className="eyebrow">CONTACT</p>
        <h2 className="h2">デモ・導入のご相談</h2>
        <p className="lead">1分ほどで送信できます。担当より折り返しご連絡いたします。</p>

        {submitted ? (
          <div className="card mt-9 p-9 text-center">
            <p className="font-bold text-[15px]" style={{ fontFamily: "var(--font-display)" }}>お問い合わせありがとうございます。</p>
            <p className="mt-2 text-[13px]" style={{ color: "var(--muted)" }}>担当より2営業日以内にご連絡いたします。</p>
          </div>
        ) : (
          <form
            className="mt-9 flex flex-col gap-6"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(true);
            }}
          >
            <Field label="スクール / 会社名" name="company" required />
            <Field label="お名前" name="name" required />
            <Field label="メールアドレス" name="email" type="email" required />

            <div>
              <label className="block text-xs font-bold mb-2" style={{ fontFamily: "var(--font-display)" }}>業種</label>
              <select name="industry" required defaultValue="" className={inputClass} style={{ borderColor: "var(--line)" }}>
                <option value="" disabled>選択してください</option>
                {industries.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold mb-2" style={{ fontFamily: "var(--font-display)" }}>相談内容</label>
              <div className="flex flex-col gap-2.5">
                {interests.map((i) => (
                  <label key={i} className="flex items-center gap-2.5 text-sm">
                    <input type="checkbox" name="interest" value={i} className="w-4 h-4" style={{ accentColor: "var(--ink)" }} />
                    {i}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-2" style={{ fontFamily: "var(--font-display)" }}>自由記載（例：こんな使い方できますか？）</label>
              <textarea name="message" rows={4} className={inputClass} style={{ borderColor: "var(--line)", resize: "vertical" }} />
            </div>

            <button type="submit" className="btn btn-primary w-full">送信する</button>
          </form>
        )}
      </div>
    </section>
  );
}

function Field({ label, name, type = "text", required }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-bold mb-2" style={{ fontFamily: "var(--font-display)" }}>{label}</label>
      <input type={type} name={name} required={required} className={inputClass} style={{ borderColor: "var(--line)" }} />
    </div>
  );
}
