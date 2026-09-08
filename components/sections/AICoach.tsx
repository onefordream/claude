import PhoneFrame from "../ui/PhoneFrame";
import Divider from "../ui/Divider";
import { ScrSub, Bubble } from "../ui/ScreenParts";

const questions = [
  "最近の課題は？",
  "前回のレッスンは？",
  "最近できるようになったことは？",
  "次の試合まで何をすればいい？",
];

export default function AICoach() {
  return (
    <section className="section band-dark">
      <div className="wrap grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-12 items-center">
        <div>
          <p className="eyebrow">AI COACH</p>
          <h2 className="h2">
            そして、積み重ねた記録に
            <br />
            「<span className="accent-text">AI</span>」を。
          </h2>
          <div className="flex flex-wrap gap-2 mt-6 qchips">
            {questions.map((q) => (
              <span key={q}>{q}</span>
            ))}
          </div>
          <div className="disclaimer mt-6">
            <strong>AIが先生になるのではありません。</strong>
            <br />
            先生の指導を、生徒の日常につなげます。
          </div>
        </div>
        <div className="hero-visual">
          <PhoneFrame>
            <ScrSub>AI COACH</ScrSub>
            <Bubble from="me">今日何を練習したらいい？</Bubble>
            <Bubble from="ai">
              前回のレッスンではアプローチの距離感が課題でした。今日はまず30ヤード地点から取り組んでみましょう。
            </Bubble>
          </PhoneFrame>
        </div>
      </div>
      <Divider fill="var(--accent-verylight)" d="M0,15 C 420,60 1020,-10 1440,25 L1440,60 L0,60 Z" />
    </section>
  );
}
