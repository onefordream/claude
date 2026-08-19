import { layout, escapeHtml, nl2br } from './layout.js';
import { goalCard } from './student.js';

export function studentListPage({ user, flash, students, q = '' }) {
  const rows = students.length
    ? students
        .map(
          (s) => `
      <li class="list-item">
        <a href="/admin/students/${s.id}">
          <span class="list-title">${escapeHtml(s.name)}${s.furigana ? ` <span class="muted furigana">(${escapeHtml(s.furigana)})</span>` : ''}</span>
          <span class="muted">${escapeHtml(s.email)}</span>
          <span class="badge">記録 ${s.record_count}件</span>
          <span class="list-date">${s.last_date ? '最終: ' + s.last_date : '記録なし'}</span>
        </a>
      </li>`
        )
        .join('')
    : `<li class="empty">${q ? '該当する生徒が見つかりません。' : 'まだ生徒が登録されていません。'}</li>`;

  return layout({
    title: '生徒一覧',
    user,
    active: 'admin',
    flash,
    body: `
      <h1>生徒一覧</h1>
      <p class="muted">生徒がこれまでどんなレッスン・練習をしてきたかを確認できます。</p>
      <form method="get" action="/admin" class="search-form">
        <input type="text" name="q" placeholder="名前・フリガナで検索" value="${escapeHtml(q)}">
        <button type="submit" class="btn btn-secondary">検索</button>
        ${q ? `<a href="/admin" class="clear-search">クリア</a>` : ''}
      </form>
      <div class="card"><ul class="list">${rows}</ul></div>
    `,
  });
}

export function studentDetailPage({ user, flash, student, records, practiceRecords, rounds, goal }) {
  const recordsHtml = records.length
    ? records
        .map(
          (r) => `
      <li class="list-item">
        <a href="/records/${r.id}">
          <span class="list-date">${r.record_date}</span>
          <span class="list-title">${escapeHtml(r.content.slice(0, 50))}${r.content.length > 50 ? '…' : ''}</span>
          ${r.ai_status === 'done' ? '<span class="badge badge-ok">AI要約済み</span>' : '<span class="badge">要約待ち</span>'}
        </a>
      </li>`
        )
        .join('')
    : `<li class="empty">まだレッスン記録がありません。</li>`;

  const practiceHtml = practiceRecords.length
    ? practiceRecords
        .map(
          (r) => `
      <li class="list-item">
        <a href="/records/${r.id}">
          <span class="list-date">${r.record_date}</span>
          <span class="list-title">${escapeHtml(r.content.slice(0, 50))}${r.content.length > 50 ? '…' : ''}</span>
        </a>
      </li>`
        )
        .join('')
    : `<li class="empty">まだ自主練の記録がありません。</li>`;

  const roundsHtml = rounds.length
    ? rounds
        .map(
          (r) => `
      <li class="list-item round-item">
        <span class="list-date">${r.round_date}</span>
        <span class="list-title">${escapeHtml(r.course_name)}${r.score ? ' / スコア ' + r.score : ''}${r.putts ? ' / パット ' + r.putts : ''}</span>
        ${r.issues ? `<div class="round-issues">課題: ${escapeHtml(r.issues)}</div>` : ''}
      </li>`
        )
        .join('')
    : `<li class="empty">まだラウンド記録がありません。</li>`;

  return layout({
    title: `${student.name}さんの記録`,
    user,
    active: 'admin',
    flash,
    body: `
      <div class="page-header">
        <h1>${escapeHtml(student.name)}さんの記録</h1>
        <a href="/admin">← 生徒一覧に戻る</a>
      </div>
      <p class="muted">${escapeHtml(student.email)}</p>

      ${goalCard(goal, { readOnly: true })}

      <div class="grid-2">
        <div class="card">
          <h2>レッスンカルテ</h2>
          <ul class="list">${recordsHtml}</ul>
        </div>
        <div class="card">
          <h2>自主練記録</h2>
          <ul class="list">${practiceHtml}</ul>
        </div>
      </div>
      <div class="card">
        <h2>ラウンド記録</h2>
        <ul class="list">${roundsHtml}</ul>
      </div>
    `,
  });
}
