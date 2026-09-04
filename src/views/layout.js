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

export function layout({ title, user, active, body, flash }) {
  const nav = user
    ? `
      <nav class="nav">
        <a href="/dashboard" class="brand">${logoIcon(26)}<span>GOLF STUDIO SHADOW</span></a>
        <div class="nav-links">
          ${user.role === 'student'
            ? `
              <a href="/dashboard" class="${active === 'dashboard' ? 'active' : ''}">ホーム</a>
              <a href="/records" class="${active === 'records' ? 'active' : ''}">ゴルフ成長ノート</a>
              <a href="/practice" class="${active === 'practice' ? 'active' : ''}">自主練記録</a>
              <a href="/rounds" class="${active === 'rounds' ? 'active' : ''}">ラウンド記録</a>
            `
            : `
              <a href="/admin" class="${active === 'admin' ? 'active' : ''}">生徒一覧</a>
            `}
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
<title>${escapeHtml(title)} | GOLF STUDIO SHADOW ゴルフ成長AI記録ノート</title>
<link rel="stylesheet" href="/static/style.css">
</head>
<body>
${nav}
<main class="container">
${flashHtml}
${body}
</main>
<script src="/static/client.js"></script>
</body>
</html>`;
}
