import PhoneFrame from "../ui/PhoneFrame";
import Icon, { IconName } from "../ui/Icon";
import { ScrSub, ScrGoal, ScrField } from "../ui/ScreenParts";

const schools = [
  { tag: "GOLF SCHOOL", accent: "#0F6E5F", schoolName: "GOLF STUDIO", goal: "スイングの再現性", task: "素振り 50回" },
  { tag: "TENNIS SCHOOL", accent: "#1D5A8A", schoolName: "TENNIS ACADEMY", goal: "サーブの確率を上げる", task: "トス位置の確認" },
  { tag: "SOCCER SCHOOL", accent: "#B3541E", schoolName: "SOCCER CLUB", goal: "逆足の精度を上げる", task: "逆足シュート 30本" },
];

const customizeIcons: { icon: IconName; label: string }[] = [
  { icon: "sparkle", label: "LOGO" },
  { icon: "target", label: "COLOR" },
  { icon: "monitor", label: "DESIGN" },
  { icon: "notebook", label: "LESSON" },
  { icon: "calendar", label: "RECORD" },
  { icon: "target", label: "GOAL" },
  { icon: "book", label: "CONTENT" },
  { icon: "chat", label: "AI" },
  { icon: "refresh", label: "FUNCTION" },
];

export default function Customize() {
  return (
    <section className="section band-accent-verylight" id="customize">
      <div className="wrap">
        <div className="customize-hero text-center max-w-[720px] mx-auto">
          <p className="eyebrow justify-center">CUSTOMIZE</p>
          <p className="not">これは、CRAFTORYの成長ノートではありません。</p>
          <h2 className="h2 mt-3.5">
            「<span className="accent-text">あなたのスクール</span>の
            <br />
            成長ノート」になります。
          </h2>
          <p className="lead center">指導方法は、スクールによって違う。だから成長ノートも、同じである必要はありません。</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-11 mt-14 justify-items-center">
          {schools.map((s) => (
            <div key={s.tag} className="text-center">
              <PhoneFrame>
                <ScrSub>{s.schoolName}</ScrSub>
                <ScrGoal label="GOAL" text={s.goal} color={s.accent} size={12} />
                <ScrField label="NEXT ACTION" text={s.task} />
              </PhoneFrame>
              <p className="school-tag" style={{ color: s.accent }}>{s.tag}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-2.5 mt-14">
          {customizeIcons.map((c) => (
            <span key={c.label} className="chip">
              <Icon name={c.icon} size={14} />
              {c.label}
            </span>
          ))}
        </div>

        <div className="cta-row center" style={{ marginTop: 48 }}>
          <a href="#contact" className="btn btn-primary">自社専用の成長ノートを相談する</a>
        </div>
      </div>
    </section>
  );
}
