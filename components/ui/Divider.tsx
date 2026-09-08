export default function Divider({
  fill,
  d = "M0,20 C 400,60 1040,0 1440,30 L1440,60 L0,60 Z",
}: {
  fill: string;
  d?: string;
}) {
  return (
    <div className="divider">
      <svg viewBox="0 0 1440 60" preserveAspectRatio="none">
        <path d={d} style={{ fill }} />
      </svg>
    </div>
  );
}
