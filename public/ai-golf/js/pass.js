// 買い切り型の「利用権」（カラオケアプリ型）。自動更新はしない。
// 本番では App Store「非更新サブスクリプション」/ Google Play「消費型アイテム」で販売し、
// レシート検証をサーバーで行う。ここではデモとして端末内で期限を付与する。
export const PASSES = [
  { id: 'day1', days: 1, price: 160, label: '1日パス', note: '練習日だけ使いたい方に' },
  { id: 'day3', days: 3, price: 360, label: '3日パス', note: '週末＋1日の集中練習に' },
  { id: 'day7', days: 7, price: 600, label: '7日パス', note: '1週間しっかり改善したい方に', best: true },
];

export function passActive(state, now = Date.now()) {
  return !!(state.pass && state.pass.until > now);
}

export function grantPass(state, passId, now = Date.now()) {
  const p = PASSES.find((x) => x.id === passId);
  if (!p) return state;
  // 有効期間中に追加購入した場合は期限を延長する
  const base = passActive(state, now) ? state.pass.until : now;
  state.pass = { id: p.id, until: base + p.days * 86400000, boughtAt: now };
  return state;
}

export function remainingText(state, now = Date.now()) {
  if (!passActive(state, now)) return '';
  const ms = state.pass.until - now;
  const h = Math.floor(ms / 3600000);
  if (h >= 24) return `残り${Math.floor(h / 24)}日${h % 24}時間`;
  return `残り${h}時間${Math.floor((ms % 3600000) / 60000)}分`;
}
