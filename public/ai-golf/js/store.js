// 端末内保存（localStorage）。将来はアカウント＋クラウド同期に置き換える想定。
const KEY = 'aigolf.v1';

const empty = () => ({ sessions: [], pass: null, trialUsed: false, units: 'yd' });

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    return { ...empty(), ...JSON.parse(raw) };
  } catch {
    return empty();
  }
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
