/** 指定タイムゾーンでの日付 YYYY-MM-DD */
export function dateInTz(tz: string, d: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** YYYY-MM-DD 同士の日数差（b - a） */
export function dayDiff(a: string, b: string): number {
  const pa = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
  const pb = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10));
  return Math.round((pb - pa) / 86400000);
}

/** 連続出社日数の更新 */
export function nextStreak(last: string | null, today: string, current: number) {
  if (!last) return { streak: 1, isNewDay: true };
  const diff = dayDiff(last, today);
  if (diff <= 0) return { streak: Math.max(1, current), isNewDay: false };
  if (diff === 1) return { streak: current + 1, isNewDay: true };
  return { streak: 1, isNewDay: true };
}

/** タイムゾーン上の「今日の0時」「今月1日0時」をUTCのISO文字列で返す（利用量集計用） */
export function periodStartsUtc(tz: string, now: Date = new Date()) {
  const today = dateInTz(tz, now);
  const offsetMin = tzOffsetMinutes(tz, now);
  const dayStart = new Date(Date.parse(`${today}T00:00:00Z`) - offsetMin * 60000);
  const monthStart = new Date(Date.parse(`${today.slice(0, 7)}-01T00:00:00Z`) - offsetMin * 60000);
  return { today, dayStart: dayStart.toISOString(), monthStart: monthStart.toISOString() };
}

function tzOffsetMinutes(tz: string, d: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(d);
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second"));
  return Math.round((asUtc - (d.getTime() - d.getMilliseconds())) / 60000);
}
