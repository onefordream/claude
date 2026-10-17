import { brand } from '../config.js';

export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function nl2br(value) {
  return escapeHtml(value).replace(/\n/g, '<br>');
}

// Small icon mark (green mound + flag) for compact spots like the nav bar.
export function logoIcon(size = 28) {
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 64 64" class="logo-icon" aria-hidden="true">
      <ellipse cx="32" cy="47" rx="27" ry="10" fill="currentColor" />
      <ellipse cx="32" cy="47" rx="4.5" ry="2.2" fill="#fff" />
      <line x1="32" y1="47" x2="32" y2="9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
      <path d="M33,9 C46,9 53,12.5 53,15 C53,17.5 46,17.5 33,21 Z" fill="#c0392b" />
    </svg>
  `;
}

// A small set of hand-drawn line icons (24x24, single stroke weight) used
// throughout the student UI in place of emoji — emoji render inconsistently
// across platforms and read as a default/unstyled choice rather than a
// considered one.
const ICON_PATHS = {
  home: '<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9a1 1 0 0 0 1 1h3v-5h4v5h3a1 1 0 0 0 1-1v-9"/>',
  note: '<path d="M12 6.5c-1.6-1.2-3.8-1.8-6.2-1.5A1 1 0 0 0 5 6v12a1 1 0 0 0 1.2 1c2-.3 3.9.2 5.3 1.3 1.4-1.1 3.3-1.6 5.3-1.3a1 1 0 0 0 1.2-1V6a1 1 0 0 0-.8-1c-2.4-.3-4.6.3-6.2 1.5Z"/><path d="M12 6.5V20"/>',
  pencil: '<path d="M4 20l1-4.2L15.6 5.2a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L8.2 19 4 20Z"/><path d="M14 7l3 3"/>',
  flag: '<path d="M6 21V4"/><path d="M6 4.5 16 7 6 9.5Z" fill="currentColor" stroke="none"/>',
  play: '<circle cx="12" cy="12" r="8.5"/><path d="M10 9l5 3-5 3V9Z" fill="currentColor" stroke="none"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  flame: '<path d="M12 3.5c.6 2.4-1.8 3.6-2.6 5.6A3.6 3.6 0 0 0 9 11a3 3 0 0 0 6 0c0-.9-.3-1.5-.7-2 1 .6 2.7 2.1 2.7 4.8A5 5 0 0 1 7 14.3C7 9.6 11 7.2 12 3.5Z"/>',
  chat: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9A1.5 1.5 0 0 1 18.5 16H9l-4 4v-4H5.5A1.5 1.5 0 0 1 4 14.5v-9Z"/><circle cx="9" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="12.5" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="10" r="1" fill="currentColor" stroke="none"/>',
  chevronRight: '<path d="M9 5l7 7-7 7"/>',
  chevronLeft: '<path d="M15 5l-7 7 7 7"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>',
  sparkle: '<path d="M12 3l1.8 5.4L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.6L12 3Z" fill="currentColor" stroke="none"/>',
  person: '<circle cx="12" cy="8.5" r="3.5"/><path d="M4.5 20c0-3.6 3.4-6.2 7.5-6.2s7.5 2.6 7.5 6.2"/>',
};

export function icon(name, { size = 20, className = '' } = {}) {
  const paths = ICON_PATHS[name];
  if (!paths) return '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="icon ${className}" aria-hidden="true">${paths}</svg>`;
}

// Plus button is first, My Page is last — everything else keeps its order
// in between. All seven items share one flat, compact visual treatment
// (no raised FAB) per the "コンパクトに統一感重視" direction.
const STUDENT_BOTTOM_NAV = [
  { href: '/records', key: 'records', icon: 'note', label: 'ノート' },
  { href: '/practice', key: 'practice', icon: 'pencil', label: '自主練' },
  { href: '/rounds', key: 'rounds', icon: 'flag', label: 'ラウンド' },
  { href: '/videos', key: 'videos', icon: 'play', label: '動画' },
];

function studentBottomNav(active) {
  const item = (i) => `
    <a href="${i.href}" class="bottom-nav-item ${active === i.key ? 'active' : ''}">
      <span class="bottom-nav-icon">${icon(i.icon, { size: 20 })}</span>
      <span class="bottom-nav-label">${i.label}</span>
    </a>`;

  return `
    <nav class="bottom-nav">
      <button type="button" class="bottom-nav-item bottom-nav-add" id="record-fab" aria-label="記録を追加">
        <span class="bottom-nav-icon">${icon('plus', { size: 20 })}</span>
        <span class="bottom-nav-label">記録</span>
      </button>
      <a href="/dashboard" class="bottom-nav-item ${active === 'dashboard' ? 'active' : ''}">
        <span class="bottom-nav-icon">${icon('home', { size: 20 })}</span>
        <span class="bottom-nav-label">ホーム</span>
      </a>
      ${STUDENT_BOTTOM_NAV.map(item).join('')}
      <a href="/mypage" class="bottom-nav-item ${active === 'mypage' ? 'active' : ''}">
        <span class="bottom-nav-icon">${icon('person', { size: 20 })}</span>
        <span class="bottom-nav-label">マイページ</span>
      </a>
    </nav>
    <div class="record-sheet-overlay" id="record-sheet-overlay" hidden>
      <div class="record-sheet">
        <p class="record-sheet-title">何を記録しますか</p>
        <a href="/records/new" class="record-sheet-option">${icon('note', { size: 18 })}<span>レッスンの記録</span></a>
        <a href="/practice/new" class="record-sheet-option">${icon('pencil', { size: 18 })}<span>自主練・自習の記録</span></a>
        <a href="/rounds" class="record-sheet-option">${icon('flag', { size: 18 })}<span>ラウンドの記録</span></a>
        <button type="button" class="record-sheet-cancel" id="record-sheet-cancel">キャンセル</button>
      </div>
    </div>`;
}

export function layout({ title, user, active, body, flash }) {
  const isStudent = user && user.role === 'student';

  const nav = user
    ? `
      <nav class="nav">
        <a href="/dashboard" class="brand">${logoIcon(26)}<span>${escapeHtml(brand.studioName)}</span></a>
        <div class="nav-links">
          ${!isStudent
            ? `
              <a href="/admin" class="${active === 'admin' ? 'active' : ''}">生徒一覧</a>
              ${
                user.is_owner
                  ? `
              <a href="/videos" class="${active === 'videos' ? 'active' : ''}">レッスン動画</a>
              <a href="/admin/instructors" class="${active === 'instructors' ? 'active' : ''}">指導者管理</a>
              `
                  : ''
              }
            `
            : ''}
          <span class="nav-user">${escapeHtml(user.name)}さん${user.role === 'instructor' ? (user.is_owner ? '（代表）' : '（指導者）') : ''}</span>
          <form method="post" action="/logout" class="inline-form">
            <button type="submit" class="link-button">ログアウト</button>
          </form>
        </div>
      </nav>`
    : '';

  const flashHtml = flash ? `<div class="flash flash-${flash.type}">${escapeHtml(flash.message)}</div>` : '';

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} | ${escapeHtml(brand.studioName)} ${escapeHtml(brand.tagline)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/static/style.css">
<style>
  :root {
    --green-900: ${brand.colors.dark};
    --green-700: ${brand.colors.base};
    --green-500: ${brand.colors.mid};
    --green-100: ${brand.colors.light};
  }
</style>
</head>
<body class="${isStudent ? 'has-bottom-nav' : ''}">
${nav}
<main class="container">
${flashHtml}
${body}
</main>
${isStudent ? studentBottomNav(active) : ''}
<script src="/static/client.js"></script>
</body>
</html>`;
}
