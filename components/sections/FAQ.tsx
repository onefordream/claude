import Divider from "../ui/Divider";

const faqs = [
  { q: "個人のインストラクターでも使えますか？", a: "はい。個人で指導されているコーチ・インストラクターにも対応可能です。" },
  { q: "ロゴやカラーは変更できますか？", a: "可能です。スクールのブランドに合わせてロゴ・カラーを設定できます。" },
  { q: "記録項目は変更できますか？", a: "指導方法に合わせて自由に設計できます。" },
  { q: "AI機能は必須ですか？", a: "必須ではありません。必要な範囲に合わせて機能を選んでいただけます。" },
  { q: "生徒はアプリのインストールが必要ですか？", a: "ブラウザからそのままご利用いただけます。アプリのインストールは不要です。" },
  { q: "どんな業種に対応できますか？", a: "レッスン・指導・練習・成長記録があるサービスであれば、業種を問わずご相談いただけます。" },
  { q: "導入までどれくらいかかりますか？", a: "内容によって異なります。まずはヒアリングの上でスケジュールをご提案します。" },
  { q: "まだ仕様が決まっていなくても相談できますか？", a: "もちろんです。現在の指導方法を伺いながら、一緒に整理していきます。" },
];

export default function FAQ() {
  return (
    <section className="section band-accent-verylight" id="faq">
      <div className="wrap">
        <p className="eyebrow justify-center">Q&amp;A</p>
        <h2 className="h2 center">よくある質問</h2>

        <div className="flex flex-col gap-2.5 mt-11 max-w-[700px] mx-auto">
          {faqs.map((f) => (
            <details key={f.q} className="card faq-card" style={{ padding: "19px 22px" }}>
              <summary>
                {f.q}
                <span className="plus">+</span>
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
      <Divider fill="var(--dark)" d="M0,15 C 420,60 1020,-10 1440,25 L1440,60 L0,60 Z" />
    </section>
  );
}
