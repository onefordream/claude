import PhoneFrame from "../ui/PhoneFrame";
import {
  HomeScreen,
  LessonScreen,
  PracticeScreen,
  ResultScreen,
  GrowthScreen,
  AICoachScreen,
} from "../ui/screens";

const screens = [
  { name: "HOME", ja: "現在の目標・次回までの課題・最近の記録", node: <HomeScreen /> },
  { name: "LESSON", ja: "レッスン記録", node: <LessonScreen /> },
  { name: "PRACTICE", ja: "自主練習", node: <PracticeScreen /> },
  { name: "RESULT", ja: "試合 / ラウンド", node: <ResultScreen /> },
  { name: "GROWTH", ja: "成長履歴", node: <GrowthScreen /> },
  { name: "AI COACH", ja: "AI相談", node: <AICoachScreen /> },
];

export default function ProductUI() {
  return (
    <section className="section-pad bg-offwhite overflow-hidden">
      <div className="container-narrow">
        <p className="section-label">PRODUCT</p>
        <h2 className="text-[26px] sm:text-3xl font-bold text-ink leading-snug">
          実際の画面イメージ
        </h2>
        <p className="mt-4 text-[15px] text-muted leading-relaxed max-w-xl">
          生徒が毎日開きたくなる、シンプルなノート型アプリ。
        </p>
      </div>

      <div className="mt-12 -mx-6 sm:mx-0">
        <div className="flex gap-6 overflow-x-auto no-scrollbar px-6 sm:px-0 sm:grid sm:grid-cols-3 lg:grid-cols-6 sm:max-w-content sm:mx-auto">
          {screens.map((s) => (
            <div key={s.name} className="shrink-0 w-[220px] sm:w-auto">
              <PhoneFrame className="!w-full scale-[0.85] origin-top">
                {s.node}
              </PhoneFrame>
              <div className="text-center mt-3">
                <p className="text-[12px] font-bold text-ink tracking-wide">
                  {s.name}
                </p>
                <p className="text-[11px] text-muted mt-0.5">{s.ja}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
