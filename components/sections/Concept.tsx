import Icon from "../ui/Icon";
import Divider from "../ui/Divider";

export default function Concept() {
  return (
    <section className="section band-white">
      <div className="wrap">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.05fr] gap-10 items-center">
          <div>
            <p className="eyebrow">CONCEPT</p>
            <h2 className="h2">
              そこで、
              <br />
              考え方を変えました。
            </h2>
            <div className="concept-shift">
              <span className="old">先生が記録する</span>
              <span className="arrow">→</span>
              <span className="accent-text">生徒自身が記録する</span>
            </div>
            <span className="concept-output">
              <Icon name="arrow" size={14} />
              OUTPUT
            </span>
            <p className="lead">
              教えてもらったことを、自分の言葉で振り返る。
              <br />
              その記録が積み重なり、自分だけの成長ノートになる。
            </p>
          </div>
          <div className="flex justify-center">
            <svg width="320" height="280" viewBox="0 0 320 280" fill="none" className="max-w-full" aria-hidden="true">
              <circle cx="105" cy="60" r="24" stroke="var(--line)" strokeWidth="2" />
              <path d="M70 140c8-28 25-42 35-42s27 14 35 42" stroke="var(--line)" strokeWidth="2" strokeLinecap="round" />
              <circle cx="225" cy="90" r="22" stroke="var(--accent-main)" strokeWidth="2" />
              <path d="M192 165c7-26 24-38 33-38s26 12 33 38" stroke="var(--accent-main)" strokeWidth="2" strokeLinecap="round" />
              <rect x="196" y="150" width="26" height="42" rx="5" stroke="var(--accent-main)" strokeWidth="2" fill="var(--white)" />
              <line x1="203" y1="180" x2="215" y2="180" stroke="var(--accent-main)" strokeWidth="2" strokeLinecap="round" />
              <path d="M140 100c18 6 30 20 34 34" stroke="var(--accent-main)" strokeWidth="2" strokeLinecap="round" strokeDasharray="1 8" />
              <path d="M168 128l6 8 10-14" stroke="var(--accent-main)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="40" y="200" width="240" height="2" fill="var(--line)" />
            </svg>
          </div>
        </div>
      </div>
      <Divider fill="var(--accent-dark)" d="M0,10 C 400,55 1040,-5 1440,35 L1440,60 L0,60 Z" />
    </section>
  );
}
