export function ScrSub({ children }: { children: React.ReactNode }) {
  return <div className="scr-sub">{children}</div>;
}

export function ScrGoal({
  label,
  text,
  color = "var(--accent-main)",
  size,
}: {
  label: string;
  text: string;
  color?: string;
  size?: number;
}) {
  return (
    <div className="scr-goal" style={{ background: color }}>
      <div className="lbl">{label}</div>
      <div className="txt" style={size ? { fontSize: size } : undefined}>
        {text}
      </div>
    </div>
  );
}

export function ScrField({ label, text }: { label: string; text: string }) {
  return (
    <div className="scr-field">
      <div className="lbl">{label}</div>
      <div className="txt">{text}</div>
    </div>
  );
}

export function ScrRow({ label, time }: { label: string; time: string }) {
  return (
    <div className="scr-row">
      <span>{label}</span>
      <span className="t">{time}</span>
    </div>
  );
}

export function Bubble({ from, children }: { from: "me" | "ai"; children: React.ReactNode }) {
  return <div className={`bubble ${from}`}>{children}</div>;
}
