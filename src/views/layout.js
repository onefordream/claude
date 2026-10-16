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

const STUDENT_BOTTOM_NAV = [
  { href: '/dashboard', key: 'dashboard', icon: '🏠', label: 'ホーム' },
  { href: '/records', key: 'records', icon: '📘', label: '成長ノート' },
  { href: '/practice', key: 'practice', icon: '✍️', label: '自主練' },
  { href: '/rounds', key: 'rounds', icon: '⛳', label: 'ラウンド' },
  { href: '/videos', key: 'videos', icon: '🎬', label: '動画' },
];

function studentBottomNav(active) {
  const [left, right] = [STUDENT_BOTTOM_NAV.slice(0, 2), STUDENT_BOTTOM_NAV.slice(2)];
  const item = (i) => `
    <a href="${i.href}" class="bottom-nav-item ${active === i.key ? 'active' : ''}">
      <span class="bottom-nav-icon">${i.icon}</span>
      <span class="bottom-nav-label">${i.label}</span>
    </a>`;

  return `
    <nav class="bottom-nav">
      ${left.map(item).join('')}
      <button type="button" class="bottom-nav-fab" id="record-fab" aria-label="記録を追加">+</button>
      ${right.map(item).join('')}
    </nav>
    <div class="record-sheet-overlay" id="record-sheet-overlay" hidden>
      <div class="record-sheet">
        <p class="record-sheet-title">何を記録しますか？</p>
        <a href="/records/new" class="record-sheet-option">📘 レッスンの記録</a>
        <a href="/practice/new" class="record-sheet-option">✍️ 自主練・自習の記録</a>
        <a href="/rounds" class="record-sheet-option">⛳ ラウンドの記録</a>
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
              <a href="/videos" class="${active === 'videos' ? 'active' : ''}">レッスン動画</a>
              <a href="/admin/instructors" class="${active === 'instructors' ? 'active' : ''}">指導者管理</a>
            `
            : ''}
          <span class="nav-user">${escapeHtml(user.name)}さん${user.role === 'instructor' ? '（指導者）' : ''}</span>
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
