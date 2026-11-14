export function yen(n: number): string {
  return `${n.toLocaleString("ja-JP")}円`;
}

const dtf = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const dttf = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function fmtDate(d: Date | null | undefined): string {
  return d ? dtf.format(d) : "—";
}
export function fmtDateTime(d: Date | null | undefined): string {
  return d ? dttf.format(d) : "—";
}

/** datetime-local 入力用（JST） */
export function toJstInput(d: Date | null | undefined): string {
  if (!d) return "";
  const j = new Date(d.getTime() + 9 * 3600 * 1000);
  return j.toISOString().slice(0, 16);
}
/** datetime-local 入力値（JST）→ Date */
export function fromJstInput(s: string): Date | null {
  if (!s) return null;
  const d = new Date(`${s}:00+09:00`);
  return isNaN(d.getTime()) ? null : d;
}
