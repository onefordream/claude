import PhoneFrame from "../ui/PhoneFrame";
import { AICoachScreen } from "../ui/screens";

const questions = [
  "今日何を練習したらいい？",
  "最近の課題は？",
  "目標まであと何が必要？",
  "前回のレッスン内容を教えて",
  "最近できるようになったことは？",
];

export default function AICoach() {
  return (
    <section className="section-pad bg-ink text-white overflow-hidden">
      <div className="container-narrow grid lg:grid-cols-2 gap-14 items-center">
        <div>
          <p className="text-xs tracking-[0.25em] font-semibold text-white/50 mb-4">
            AI COACH
          </p>
          <h2 className="text-[24px] sm:text-3xl font-bold leading-snug">
            記録が増えるほど、
            <br />
            AIがあなたを理解していく。
          </h2>
          <p className="mt-6 text-[15px] text-white/60 leading-relaxed max-w-md">
            レッスン履歴、自主練習、目標、課題、試合やラウンドの結果、過去の振り返り。
            蓄積された記録をもとに、AIが今日やるべきことや振り返りのヒントを提案します。
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            {questions.map((q) => (
              <span
                key={q}
                className="text-[12px] text-white/80 border border-white/15 rounded-full px-4 py-2"
              >
                {q}
              </span>
            ))}
          </div>

          <p className="mt-8 text-[12px] text-white/40 leading-relaxed max-w-md">
            AIの回答はあくまで補助的なものです。専門的な指導や判断は、
            先生・コーチによる指導を前提としています。AIは、先生の指導を
            生徒の日常につなげる存在です。
          </p>
        </div>

        <div className="flex justify-center lg:justify-end">
          <PhoneFrame>
            <AICoachScreen />
          </PhoneFrame>
        </div>
      </div>
    </section>
  );
}
