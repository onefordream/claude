const coach = [
  "毎回の記録作業を減らせる",
  "生徒の状態を確認できる",
  "必要なときだけコメントできる",
  "過去の指導内容を確認できる",
  "生徒ごとの目標を把握できる",
];

const student = [
  "学んだことをアウトプットできる",
  "自分の成長が残る",
  "自主練習を記録できる",
  "目標を常に確認できる",
  "過去を振り返れる",
  "次に何をすればいいか分かりやすくなる",
];

function List({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((t) => (
        <li key={t} className="flex items-start gap-3">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
          <span className="text-[14px] text-ink leading-relaxed">{t}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Benefit() {
  return (
    <section className="section-pad">
      <div className="container-narrow">
        <p className="section-label">BENEFIT</p>
        <h2 className="text-[26px] sm:text-3xl font-bold text-ink leading-snug">
          先生にも、生徒にも、
          <br className="sm:hidden" />
          意味のある仕組みへ。
        </h2>

        <div className="mt-12 grid sm:grid-cols-2 gap-6">
          <div className="card p-7">
            <p className="text-[11px] font-bold tracking-[0.15em] text-accent mb-1">
              FOR COACH
            </p>
            <p className="text-sm font-bold text-ink mb-5">先生・コーチ</p>
            <List items={coach} />
          </div>
          <div className="card p-7">
            <p className="text-[11px] font-bold tracking-[0.15em] text-accent mb-1">
              FOR STUDENT
            </p>
            <p className="text-sm font-bold text-ink mb-5">生徒</p>
            <List items={student} />
          </div>
        </div>
      </div>
    </section>
  );
}
