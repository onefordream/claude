// Every date in this app (record dates, streaks, "today") is meant to mean
// "today in Japan," regardless of what timezone the server process itself
// runs in (Render defaults to UTC). Centralizing this avoids the mismatch
// where e.g. a record's default date and the dashboard's streak calculation
// disagree on what day it is between UTC midnight and JST midnight.

export function jstToday() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }); // sv-SE => YYYY-MM-DD
}

export function jstHour() {
  return Number(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo', hour: 'numeric', hour12: false }));
}

export function addDays(dateStr, delta) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}
