import PhoneFrame from "../ui/PhoneFrame";
import { HomeScreen } from "../ui/screens";

const rows = [
  { label: "GOAL", text: "ラウンドスコアの安定化" },
  { label: "LESSON", text: "週1回のレッスンを記録・蓄積" },
  { label: "PRACTICE", text: "自主練習内容を自分で記録" },
  { label: "ROUND", text: "ラウンド結果と課題を記録" },
  { label: "CHALLENGE", text: "ショートゲームの精度" },
  { label: "AI COACH", text: "記録をもとに次の練習内容を相談" },
];

export default function CaseStudy() {
  return (
    <section className="section-pad">
      <div className="container-narrow">
        <p className="section-label">CASE STUDY</p>
        <h2 className="text-[26px] sm:text-3xl font-bold text-ink leading-snug">
          GOLF STUDIO SHADOW
        </h2>
        <p className="mt-4 text-[14px] text-muted leading-relaxed max-w-xl">
          {/* TODO: 実際の導入スクリーンショット・素材に差し替え */}
          ゴルフスクールでの活用イメージです。指導方針に合わせて、
          記録項目やAIコーチの設計をカスタマイズしています。
        </p>

        <div className="mt-12 grid lg:grid-cols-2 gap-10 items-center">
          <div className="flex justify-center">
            <PhoneFrame>
              <HomeScreen
                schoolName="GOLF STUDIO SHADOW"
                goal="ラウンドスコアの安定化"
                task="ショートゲーム練習 30分"
              />
            </PhoneFrame>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {rows.map((r) => (
              <div key={r.label} className="card p-5">
                <p className="text-[10px] font-bold tracking-[0.1em] text-accent mb-1">
                  {r.label}
                </p>
                <p className="text-[13px] text-ink leading-relaxed">{r.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10">
          <a href="#contact" className="btn-primary">
            実際のデモを見る
          </a>
        </div>
      </div>
    </section>
  );
}
