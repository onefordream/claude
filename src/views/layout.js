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

export function layout({ title, user, active, body, flash }) {
  const nav = user
    ? `
      <nav class="nav">
        <a href="/dashboard" class="brand">⛳ ゴルフスタジオシャドー</a>
        <div class="nav-links">
          ${user.role === 'student'
            ? `
              <a href="/dashboard" class="${active === 'dashboard' ? 'active' : ''}">ホーム</a>
              <a href="/records" class="${active === 'records' ? 'active' : ''}">レッスンカルテ</a>
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
<title>${escapeHtml(title)} | ゴルフスタジオシャドー デジタルカルテ</title>
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
