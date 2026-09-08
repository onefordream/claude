import PhoneFrame from "../ui/PhoneFrame";
import Icon, { IconName } from "../ui/Icon";
import Divider from "../ui/Divider";
import { ScrSub, ScrGoal, ScrField, ScrRow } from "../ui/ScreenParts";

const tags: { icon: IconName; label: string }[] = [
  { icon: "notebook", label: "LESSON" },
  { icon: "refresh", label: "PRACTICE" },
  { icon: "target", label: "GOAL" },
  { icon: "chart", label: "RESULT" },
  { icon: "chat", label: "AI COACH" },
];

export default function Solution() {
  return (
    <section className="section band-accent-dark">
      <div className="wrap">
        <p className="eyebrow justify-center">SOLUTION</p>
        <h2 className="h2 center">
          レッスンの「その後」まで
          <br />
          つながる成長ノート。
        </h2>
        <p className="lead center">
          レッスンだけじゃない。自主練習も。目標も。成果も。
          <br />
          全部ひとつの場所へ。
        </p>

        <div className="solution-stage">
          <PhoneFrame className="side">
            <ScrSub>PRACTICE</ScrSub>
            <ScrField label="9/07" text="素振り 100回" />
          </PhoneFrame>
          <PhoneFrame>
            <ScrSub>HOME</ScrSub>
            <ScrGoal label="GOAL" text="スコアの安定化" color="var(--accent-main)" />
            <ScrRow label="レッスン記録" time="今日" />
            <ScrRow label="自主練習" time="昨日" />
          </PhoneFrame>
          <PhoneFrame className="side">
            <ScrSub>RESULT</ScrSub>
            <ScrGoal label="9/06" text="89" color="var(--ink)" size={20} />
          </PhoneFrame>
        </div>

        <div className="flex flex-wrap justify-center gap-2.5 mt-9 solution-tags">
          {tags.map((t) => (
            <span key={t.label}>
              <Icon name={t.icon} size={14} />
              {t.label}
            </span>
          ))}
        </div>
      </div>
      <Divider fill="var(--white)" d="M0,35 C 480,-5 960,65 1440,15 L1440,60 L0,60 Z" />
    </section>
  );
}
