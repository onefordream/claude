// 日付はすべて日本時間(JST, UTC+9)で扱う。
// 日本には夏時間がないため、固定オフセットで確実に計算できる。
// サーバーのタイムゾーン設定(TZ)には一切依存しない。

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 指定時刻の JST 日付 'YYYY-MM-DD' */
export function jstDate(at = new Date()) {
  return new Date(at.getTime() + JST_OFFSET_MS).toISOString().slice(0, 10);
}

/** 指定時刻の JST の時(0-23) */
export function jstHour(at = new Date()) {
  return new Date(at.getTime() + JST_OFFSET_MS).getUTCHours();
}

/** JST の月 'YYYY-MM'（利用量カウンタの集計単位） */
export function jstMonth(at = new Date()) {
  return jstDate(at).slice(0, 7);
}

function toUtcMs(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** 'YYYY-MM-DD' に n 日足す（カレンダー計算のみ、時刻は関係しない） */
export function addDays(ymd, n) {
  return new Date(toUtcMs(ymd) + n * DAY_MS).toISOString().slice(0, 10);
}

/** b - a の日数 */
export function diffDays(a, b) {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / DAY_MS);
}

/** 曜日 0=日 ... 6=土 */
export function weekday(ymd) {
  return new Date(toUtcMs(ymd)).getUTCDay();
}

/** その日を含む週の月曜日 */
export function startOfWeek(ymd) {
  const wd = weekday(ymd);
  return addDays(ymd, wd === 0 ? -6 : 1 - wd);
}

export function isValidYmd(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return new Date(toUtcMs(s)).toISOString().slice(0, 10) === s;
}

export function nowIso() {
  return new Date().toISOString();
}
