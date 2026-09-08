import Icon, { IconName } from "../ui/Icon";
import Divider from "../ui/Divider";

const items: { no: string; icon: IconName; title: string; text: string }[] = [
  { no: "01", icon: "pencil", title: "レッスン内容を先生が毎回記録している", text: "生徒が増えるほど、記録する時間も増えていく。" },
  { no: "02", icon: "help", title: "前回教えたことを生徒が忘れてしまう", text: "次のレッスンは、思い出すところから始まる。" },
  { no: "03", icon: "search", title: "自主練習で何をしているか分からない", text: "レッスンの外での取り組みが見えない。" },
  { no: "04", icon: "trend-flat", title: "生徒自身が成長を実感しにくい", text: "何がどれだけ変わったのか、残っていない。" },
  { no: "05", icon: "unlink", title: "レッスンとレッスンの間に接点がなくなる", text: "週1回の指導が、単発で終わってしまう。" },
];

export default function Problem() {
  return (
    <section className="section band-accent-verylight" id="problem">
      <div className="wrap">
        <p className="eyebrow justify-center">PROBLEM</p>
        <h2 className="h2 center">
          こんなこと、
          <br />
          ありませんか？
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-11">
          {items.map((it) => (
            <div key={it.no} className="card problem-item">
              <div className="badge">
                <Icon name={it.icon} />
              </div>
              <div>
                <div className="no">{it.no}</div>
                <h3>{it.title}</h3>
                <p>{it.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="cta-row center" style={{ marginTop: 52 }}>
          <a href="#situation" className="btn btn-secondary btn-sm">続きを見る ↓</a>
        </div>
      </div>
      <Divider fill="var(--lightgray)" d="M0,40 C 480,-10 960,70 1440,20 L1440,60 L0,60 Z" />
    </section>
  );
}
