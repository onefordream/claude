import Icon, { IconName } from "../ui/Icon";
import Divider from "../ui/Divider";

const cases: { icon: IconName; en: string; ja: string }[] = [
  { icon: "flag", en: "GOLF", ja: "ゴルフ" },
  { icon: "ball", en: "TENNIS", ja: "テニス" },
  { icon: "ball", en: "SOCCER", ja: "サッカー" },
  { icon: "ball", en: "BASEBALL", ja: "野球" },
  { icon: "dumbbell", en: "FITNESS", ja: "トレーナー" },
  { icon: "person", en: "DANCE", ja: "ダンス" },
  { icon: "music", en: "MUSIC", ja: "音楽教室" },
  { icon: "book", en: "EDUCATION", ja: "学習塾" },
];

export default function UseCase() {
  return (
    <section className="section band-white">
      <div className="wrap">
        <p className="eyebrow justify-center">FOR EVERY COACH</p>
        <h2 className="h2 center">
          「教える」があるところに、
          <br />
          成長ノートを。
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-11">
          {cases.map((c) => (
            <div key={c.en} className="card p-5 text-center">
              <div className="usecase-badge">
                <Icon name={c.icon} />
              </div>
              <div className="text-[10.5px] font-bold tracking-wide" style={{ fontFamily: "var(--font-mono)", color: "var(--accent-main)" }}>
                {c.en}
              </div>
              <div className="text-sm font-bold mt-1" style={{ fontFamily: "var(--font-display)" }}>{c.ja}</div>
            </div>
          ))}
        </div>
        <p className="lead center mt-7" style={{ maxWidth: 520 }}>
          中心にあるのは、いつも「人の成長を支援するスクール・コーチ」です。
        </p>
      </div>
      <Divider fill="var(--dark)" d="M0,15 C 420,60 1020,-10 1440,25 L1440,60 L0,60 Z" />
    </section>
  );
}
