import Icon, { IconName } from "../ui/Icon";
import Divider from "../ui/Divider";

const coach = [
  "毎回すべてを書く必要を減らす",
  "生徒の記録を確認できる",
  "必要なときだけコメントできる",
  "目標や課題を把握できる",
  "過去の記録を確認できる",
];
const student = [
  "学んだ内容をアウトプットできる",
  "自主練習を記録できる",
  "成長を振り返れる",
  "目標をいつでも確認できる",
  "次にやることを整理できる",
];

function BenefitCard({ icon, tag, title, items }: { icon: IconName; tag: string; title: string; items: string[] }) {
  return (
    <div className="card benefit-card p-7">
      <div className="benefit-head">
        <div className="badge">
          <Icon name={icon} />
        </div>
        <div>
          <p className="benefit-tag">{tag}</p>
          <h3 className="text-base font-bold" style={{ fontFamily: "var(--font-display)" }}>{title}</h3>
        </div>
      </div>
      <ul>
        {items.map((it) => (
          <li key={it}>
            <Icon name="check" />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Benefit() {
  return (
    <section className="section band-white">
      <div className="wrap">
        <p className="eyebrow justify-center">BENEFIT</p>
        <h2 className="h2 center">
          先生にも。
          <br />
          生徒にも。
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-12">
          <BenefitCard icon="monitor" tag="FOR COACH" title="先生・コーチ" items={coach} />
          <BenefitCard icon="phone" tag="FOR STUDENT" title="生徒" items={student} />
        </div>
      </div>
      <Divider fill="var(--accent-dark)" d="M0,15 C 420,60 1020,-10 1440,25 L1440,60 L0,60 Z" />
    </section>
  );
}
