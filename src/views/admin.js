import { layout, escapeHtml, nl2br, icon } from './layout.js';
import { goalCard } from './student.js';
import { renderAbilityRadar } from './chart.js';
import { SCORE_BAND_LABELS, scoreBandForAverage } from '../lib/golfStats.js';

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
  const isOwner = Boolean(user.is_owner);
  const rows = students.length
    ? students
        .map(
          (s) => `
      <li class="list-item">
        <a href="/admin/students/${s.id}">
          <span class="list-title">${escapeHtml(s.name)}${s.furigana ? ` <span class="muted furigana">(${escapeHtml(s.furigana)})</span>` : ''}</span>
          <span class="muted">${escapeHtml(s.email)}</span>
          ${s.is_suspended ? '<span class="badge badge-warn">停止中</span>' : ''}
          <span class="badge">記録 ${s.record_count}件</span>
          <span class="list-date">${s.last_date ? '最終: ' + s.last_date : '記録なし'}</span>
          ${s.avgScore !== null ? `<span class="badge">平均 ${s.avgScore}</span>` : ''}
          ${s.last_round_date ? `<span class="muted">最新ラウンド: ${s.last_round_date}</span>` : ''}
          ${s.topGrowthLabel ? `<span class="badge badge-warn">伸びしろ: ${escapeHtml(s.topGrowthLabel)}</span>` : ''}
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
        ${isOwner ? `<a href="/admin/export" class="btn btn-secondary">全データをエクスポート</a>` : ''}
      </div>
      <p class="muted">生徒がこれまでどんなレッスン・練習をしてきたかを確認できます。</p>
      ${isOwner && usage ? usageSummary(usage) : ''}
      <form method="get" action="/admin" class="search-form">
        <input type="text" name="q" placeholder="名前・フリガナで検索" value="${escapeHtml(q)}">
        <button type="submit" class="btn btn-secondary">検索</button>
        ${q ? `<a href="/admin" class="clear-search">クリア</a>` : ''}
      </form>
      <div class="card"><ul class="list">${rows}</ul></div>
    `,
  });
}

export function studentDetailPage({ user, flash, student, records, practiceRecords, rounds, analysis, goal }) {
  const isOwner = Boolean(user.is_owner);
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
        <a href="/admin/students/${student.id}/rounds/${r.id}">
          <span class="list-date">${r.play_date}</span>
          <span class="list-title">${escapeHtml(r.course_name)}${r.total_score ? ' / スコア ' + r.total_score : ''}</span>
          ${r.status === 'in_progress' ? '<span class="badge badge-warn">入力中</span>' : ''}
        </a>
      </li>`
        )
        .join('')
    : `<li class="empty">まだラウンド記録がありません。</li>`;

  const { combined, abilityScores, growth } = analysis;
  const analysisHtml = combined
    ? `
      <div class="stat-row">
        <div class="stat-card"><div class="stat-num">${combined.avgScorePer18}</div><div class="stat-label">平均スコア(18H換算)</div></div>
        <div class="stat-card"><div class="stat-num">${combined.bestScore18 ?? '-'}</div><div class="stat-label">ベストスコア</div></div>
        <div class="stat-card"><div class="stat-num">${SCORE_BAND_LABELS[scoreBandForAverage(combined.avgScorePer18)]}</div><div class="stat-label">現在のスコア帯</div></div>
      </div>
      ${abilityScores.length ? renderAbilityRadar(abilityScores) : ''}
      ${
        growth.items.length
          ? `
      <ul class="growth-list">
        ${growth.items
          .slice(0, 3)
          .map((g, i) => `<li class="growth-item"><span class="growth-rank">${i + 1}</span><span class="growth-label">${escapeHtml(g.label)}</span><span class="growth-gain">約${g.gain}打</span></li>`)
          .join('')}
      </ul>
      <p class="muted">合計で約${growth.totalGain}打縮まる見込みです。</p>`
          : `<p class="muted">目標の水準に届いている項目が多く、大きな伸びしろは見つかりませんでした。</p>`
      }
    `
    : `<p class="muted">まだ完了したラウンドがありません。</p>`;

  return layout({
    title: `${student.name}さんの記録`,
    user,
    active: 'admin',
    flash,
    body: `
      <div class="page-header">
        <h1>${escapeHtml(student.name)}さんの記録${student.is_suspended ? ' <span class="badge badge-warn">停止中</span>' : ''}</h1>
        <a href="/admin" class="back-link">${icon('chevronLeft', { size: 14 })}<span>生徒一覧に戻る</span></a>
      </div>
      <p class="muted">${escapeHtml(student.email)}</p>

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

      <div class="card">
        <h2>ラウンド分析</h2>
        ${analysisHtml}
        ${
          combined
            ? `
        <div class="ai-coach-card">
          <button id="ask-round-ai-btn" class="btn btn-secondary" data-endpoint="/admin/students/${student.id}/round-coach">AIコーチの分析を見る</button>
          <div id="round-ai-result" class="ai-result" hidden></div>
        </div>`
            : ''
        }
      </div>

      ${
        isOwner
          ? `
      <div class="card account-tools">
        <h2>アカウント管理</h2>
        <p class="muted">生徒がパスワードを忘れた場合、ここで新しいパスワードを発行できます。発行後、表示されたパスワードを生徒本人に伝えてください。</p>
        <form method="post" action="/admin/students/${student.id}/reset-password" onsubmit="return confirm('${escapeHtml(student.name)}さんの新しいパスワードを発行しますか？現在のパスワードは使えなくなります。');">
          <button type="submit" class="btn btn-secondary">パスワードを再発行する</button>
        </form>

        <h2 style="margin-top:1.1rem">アカウントの停止・削除</h2>
        <p class="muted">停止すると、解除するまでログインできなくなります(記録は残ります)。削除は元に戻せません。</p>
        <div class="account-actions">
          <form method="post" action="/admin/students/${student.id}/suspend" onsubmit="return confirm('${escapeHtml(student.name)}さんのアカウントを${student.is_suspended ? '復帰' : '停止'}しますか？');" class="inline-form">
            <button type="submit" class="btn btn-secondary">${student.is_suspended ? '停止を解除する' : 'アカウントを停止する'}</button>
          </form>
          <form method="post" action="/admin/students/${student.id}/delete" onsubmit="return confirm('${escapeHtml(student.name)}さんのアカウントと全ての記録を完全に削除します。この操作は元に戻せません。本当によろしいですか？');" class="inline-form">
            <button type="submit" class="link-button link-button-danger">アカウントを削除する</button>
          </form>
        </div>
      </div>`
          : ''
      }
    `,
  });
}
