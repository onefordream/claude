// 画面描画の小さなヘルパー。
// html`...` はテンプレートに埋め込む値を自動でエスケープする（XSS 対策）。
// エスケープしたくない HTML 断片は raw() / html`` で包んで渡す。

class Safe {
  constructor(s) {
    this.s = s;
  }
  toString() {
    return this.s;
  }
}
export const raw = (s) => new Safe(String(s));

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ESC[c]);

function renderValue(v) {
  if (v === null || v === undefined || v === false) return '';
  if (v instanceof Safe) return v.s;
  if (Array.isArray(v)) return v.map(renderValue).join('');
  return esc(v);
}

export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += renderValue(values[i]) + strings[i + 1];
  return new Safe(out);
}

export function mount(el, content) {
  el.innerHTML = renderValue(content);
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** data-action="name" の要素のクリックを1か所で受ける */
export function onAction(root, handlers) {
  const listener = (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || !root.contains(el)) return;
    const fn = handlers[el.dataset.action];
    if (fn) {
      e.preventDefault();
      fn(el, e);
    }
  };
  root.addEventListener('click', listener);
  return () => root.removeEventListener('click', listener);
}

let toastTimer;
export function toast(message, { type = 'info', ms = 2600 } = {}) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.className = 'toast';
  }, ms);
}

// ---- 日付（表示もすべて日本時間） ----
const JST = 'Asia/Tokyo';
export function jstToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: JST }).format(new Date());
}
export function addDays(ymd, n) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
const WD = ['日', '月', '火', '水', '木', '金', '土'];
export function fmtDate(ymd, { weekday = true, year = false } = {}) {
  const [y, m, d] = ymd.split('-').map(Number);
  const wd = WD[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${year ? `${y}年` : ''}${m}月${d}日${weekday ? `(${wd})` : ''}`;
}
export function fmtRelDate(ymd) {
  const today = jstToday();
  if (ymd === today) return '今日';
  if (ymd === addDays(today, -1)) return '昨日';
  return fmtDate(ymd, { year: ymd.slice(0, 4) !== today.slice(0, 4) });
}
export function fmtTime(iso) {
  return new Intl.DateTimeFormat('ja-JP', { timeZone: JST, hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}
export function fmtBytes(n) {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))}KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)}MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)}GB`;
}
export const fmtNum = (n) => (Number.isInteger(n) ? n.toLocaleString('ja-JP') : Number(n.toFixed(2)).toLocaleString('ja-JP'));

export const MOODS = [
  { v: 1, emoji: '😣', label: 'つらい' },
  { v: 2, emoji: '😕', label: 'いまいち' },
  { v: 3, emoji: '😐', label: 'ふつう' },
  { v: 4, emoji: '🙂', label: 'よい' },
  { v: 5, emoji: '😄', label: 'さいこう' },
];
export const moodEmoji = (v) => MOODS.find((m) => m.v === v)?.emoji || '';

/** 進捗バー */
export function progressBar(ratio, { cls = '' } = {}) {
  const pct = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
  return html`<div class="progress ${cls}" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar" style="--p:${pct}%"></div></div>`;
}

/** 紙吹雪（達成時の小さなお祝い） */
export function celebrate() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const layer = document.createElement('div');
  layer.className = 'confetti';
  const colors = ['#2E7D5B', '#5CB88A', '#F4A53C', '#F7C873', '#7FB3E6', '#E88FA7'];
  for (let i = 0; i < 70; i++) {
    const p = document.createElement('i');
    p.style.left = `${Math.random() * 100}%`;
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = `${Math.random() * 0.4}s`;
    p.style.animationDuration = `${1.6 + Math.random() * 1.2}s`;
    p.style.setProperty('--x', `${(Math.random() - 0.5) * 160}px`);
    p.style.setProperty('--r', `${Math.random() * 720 - 360}deg`);
    layer.appendChild(p);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 3200);
}

/** 確認ダイアログ（ボトムシート） */
export function confirmSheet({ title, message = '', ok = 'OK', danger = false, input = null }) {
  return new Promise((resolve) => {
    const root = document.getElementById('overlay-root');
    const wrap = document.createElement('div');
    wrap.className = 'sheet-backdrop';
    mount(wrap, html`
      <div class="sheet" role="dialog" aria-modal="true" aria-label="${title}">
        <div class="sheet-handle"></div>
        <h3 class="sheet-title">${title}</h3>
        ${message ? html`<p class="sheet-text">${message}</p>` : ''}
        ${input ? html`<input class="input" type="${input.type || 'text'}" placeholder="${input.placeholder || ''}" autocomplete="${input.autocomplete || 'off'}">` : ''}
        <div class="sheet-actions">
          <button class="btn btn-ghost" data-r="cancel">キャンセル</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-r="ok">${ok}</button>
        </div>
      </div>`);
    const done = (v) => {
      wrap.classList.add('closing');
      setTimeout(() => wrap.remove(), 180);
      resolve(v);
    };
    wrap.addEventListener('click', (e) => {
      if (e.target === wrap) return done(null);
      const r = e.target.closest('[data-r]')?.dataset.r;
      if (r === 'cancel') done(null);
      if (r === 'ok') done(input ? $('input', wrap).value : true);
    });
    root.appendChild(wrap);
    $('input', wrap)?.focus();
  });
}
