import test from 'node:test';
import assert from 'node:assert/strict';
import { jstDate, jstHour, addDays, diffDays, startOfWeek, isValidYmd, jstMonth } from '../src/lib/date.js';
import { computeStreak, bestStreak, weekActivity } from '../src/lib/stats.js';

test('JST の日付境界: UTC 14:59 は同日、15:00 は翌日', () => {
  assert.equal(jstDate(new Date('2026-09-25T14:59:59Z')), '2026-09-25');
  assert.equal(jstDate(new Date('2026-09-25T15:00:00Z')), '2026-09-26');
  assert.equal(jstHour(new Date('2026-09-25T15:00:00Z')), 0);
});

test('JST の月・年またぎ', () => {
  assert.equal(jstDate(new Date('2026-12-31T15:00:00Z')), '2027-01-01');
  assert.equal(jstMonth(new Date('2026-09-30T15:30:00Z')), '2026-10');
});

test('日付計算はサーバーの TZ に依存しない', () => {
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(addDays('2028-03-01', -1), '2028-02-29');
  assert.equal(diffDays('2026-09-01', '2026-10-01'), 30);
  assert.equal(startOfWeek('2026-09-27'), '2026-09-21'); // 日曜 → 前の月曜
  assert.equal(startOfWeek('2026-09-21'), '2026-09-21');
  assert.ok(isValidYmd('2026-02-28'));
  assert.ok(!isValidYmd('2026-02-30'));
});

test('継続日数: 今日記録あり / 今日まだ / 途切れ', () => {
  const today = '2026-09-25';
  assert.deepEqual(computeStreak(['2026-09-23', '2026-09-24', '2026-09-25'], today), { current: 3, recordedToday: true, best: 3 });
  // 今日まだ書いていなくても、昨日まで続いていれば継続中として扱う
  assert.deepEqual(computeStreak(['2026-09-23', '2026-09-24'], today), { current: 2, recordedToday: false, best: 2 });
  assert.equal(computeStreak(['2026-09-22', '2026-09-23'], today).current, 0);
  assert.equal(computeStreak([], today).current, 0);
});

test('最長継続日数', () => {
  assert.equal(bestStreak(new Set(['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-10', '2026-01-11'])), 3);
});

test('週の記録状況（月曜はじまり）', () => {
  const counts = new Map([['2026-09-21', 1], ['2026-09-23', 2]]);
  const w = weekActivity(counts, '2026-09-24', 4);
  assert.equal(w.days[0].date, '2026-09-21');
  assert.equal(w.activeDays, 2);
  assert.equal(w.days[3].isToday, true);
  assert.equal(w.days[4].isFuture, true);
});
