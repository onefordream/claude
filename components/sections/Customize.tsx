import PhoneFrame from "../ui/PhoneFrame";
import { HomeScreen } from "../ui/screens";

const customizeItems = [
  "LOGO",
  "COLOR",
  "DESIGN",
  "LESSON ITEM",
  "GOAL",
  "RECORD",
  "COACH COMMENT",
  "AI",
  "CONTENT",
  "FUNCTION",
];

const schools = [
  {
    tag: "GOLF SCHOOL",
    accent: "#2E5E4E",
    schoolName: "GOLF STUDIO",
    goal: "スイングの再現性を上げる",
    task: "素振り 50回 / 動画チェック",
  },
  {
    tag: "TENNIS SCHOOL",
    accent: "#1D4E89",
    schoolName: "TENNIS ACADEMY",
    goal: "サーブの確率を上げる",
    task: "トス位置の確認 / フォーム動画",
  },
  {
    tag: "SOCCER SCHOOL",
    accent: "#B3441E",
    schoolName: "SOCCER CLUB",
    goal: "利き足以外の精度を上げる",
    task: "逆足シュート 30本 / 動画確認",
  },
];

export default function Customize() {
  return (
    <section className="section-pad">
      <div className="container-narrow">
        <p className="section-label">CUSTOMIZE</p>
        <h2 className="text-[26px] sm:text-3xl font-bold text-ink leading-snug">
          あなたのスクール専用に。
        </h2>
        <p className="mt-5 text-[15px] text-muted leading-relaxed max-w-xl">
          ロゴを変えるだけではありません。
          <br />
          スクールの指導方法に合わせて、成長ノートそのものをカスタマイズできます。
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          {customizeItems.map((c) => (
            <span
              key={c}
              className="text-[11px] font-semibold text-ink border border-line rounded-full px-4 py-2 bg-white"
            >
              {c}
            </span>
          ))}
        </div>

        <div className="mt-14 grid sm:grid-cols-3 gap-8">
          {schools.map((s) => (
            <div key={s.tag} className="flex flex-col items-center">
              <PhoneFrame className="scale-90 sm:scale-100">
                <HomeScreen
                  accent={s.accent}
                  schoolName={s.schoolName}
                  goal={s.goal}
                  task={s.task}
                />
              </PhoneFrame>
              <p
                className="mt-4 text-[11px] font-bold tracking-[0.15em]"
                style={{ color: s.accent }}
              >
                {s.tag}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
