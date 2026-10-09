import { layout, escapeHtml, nl2br } from './layout.js';
import { goalCard } from './student.js';

function usageSummary({ studentCount, videoTotal, dataDirConfigured, diskFree, diskUsedPercent }) {
  const diskWarning = diskUsedPercent !== null && diskUsedPercent >= 85;
  return `
    <section class="stat-strip">
      <div class="stat-pill"><span class="stat-pill-num">${studentCount}</span><span class="stat-pill-label">生徒数</span></div>
      <div class="stat-pill"><span class="stat-pill-num">${videoTotal}</span><span class="stat-pill-label">動画保存容量(合計)</span></div>
      ${
        diskFree !== null
          ? `<div class="stat-pill"><span class="stat-pill-num">${diskFree}</span><span class="stat-pill-label">ディスク空き容量</span></div>`
          : ''
      }
    </section>
    ${
      !dataDirConfigured
        ? `<div class="flash flash-error">永続ディスク(DATA_DIR)が設定されていないようです。このままだと、再デプロイのたびにデータと動画が消える可能性があります。Renderの設定を確認してください。</div>`
        : ''
    }
    ${
      diskWarning
        ? `<div class="flash flash-error">ディスクの使用率が${diskUsedPercent}%に達しています。動画の整理や、ディスク容量の追加をご検討ください。</div>`
        : ''
    }
  `;
}

export function instructorListPage({ user, flash, instructors }) {
  const rows = instructors
    .map(
      (i) => `
      <li class="list-item">
        <span class="list-title">${escapeHtml(i.name)}${i.id === user.id ? ' <span class="muted">(自分)</span>' : ''}</span>
        <span class="muted">${escapeHtml(i.email)}</span>
        <span class="account-actions">
          <form method="post" action="/admin/instructors/${i.id}/reset-password" onsubmit="return confirm('${escapeHtml(i.name)}さんの新しいパスワードを発行しますか？現在のパスワードは使えなくなります。');" class="inline-form">
            <button type="submit" class="link-button">パスワード再発行</button>
          </form>
          ${
            instructors.length > 1 && i.id !== user.id
              ? `
          <form method="post" action="/admin/instructors/${i.id}/delete" onsubmit="return confirm('${escapeHtml(i.name)}さんを指導者から削除しますか？');" class="inline-form">
            <button type="submit" class="link-button link-button-danger">削除</button>
          </form>`
              : ''
          }
        </span>
      </li>`
    )
    .join('');

  return layout({
    title: '指導者管理',
    user,
    active: 'instructors',
    flash,
    body: `
      <h1>指導者管理</h1>
      <p class="muted">このスタジオを運営する指導者アカウントを管理します。</p>
      <div class="card"><ul class="list">${rows}</ul></div>

      <div class="card">
        <h2>新しい指導者を追加</h2>
        <form method="post" action="/admin/instructors" class="form">
          <label>名前
            <input type="text" name="name" required>
          </label>
          <label>メールアドレス
            <input type="email" name="email" required>
          </label>
          <button type="submit" class="btn btn-primary">追加する</button>
        </form>
        <p class="muted">追加すると、ログイン用の初期パスワードがその場で表示されます。そのパスワードを本人に伝えてください。</p>
      </div>
    `,
  });
}

export function studentListPage({ user, flash, students, q = '', usage = null }) {
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
      <div class="page-header">
        <h1>生徒一覧</h1>
        <a href="/admin/export" class="btn btn-secondary">全データをエクスポート</a>
      </div>
      <p class="muted">生徒がこれまでどんなレッスン・練習をしてきたかを確認できます。</p>
      ${usage ? usageSummary(usage) : ''}
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

      <div class="card account-tools">
        <h2>アカウント管理</h2>
        <p class="muted">生徒がパスワードを忘れた場合、ここで新しいパスワードを発行できます。発行後、表示されたパスワードを生徒本人に伝えてください。</p>
        <form method="post" action="/admin/students/${student.id}/reset-password" onsubmit="return confirm('${escapeHtml(student.name)}さんの新しいパスワードを発行しますか？現在のパスワードは使えなくなります。');">
          <button type="submit" class="btn btn-secondary">パスワードを再発行する</button>
        </form>
      </div>

      ${goalCard(goal, { readOnly: true })}

      <div class="grid-2">
        <div class="card">
          <h2>ゴルフ成長ノート</h2>
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
