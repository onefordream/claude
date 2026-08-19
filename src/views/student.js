import { layout, escapeHtml, nl2br } from './layout.js';
import { renderScoreChart } from './chart.js';

function fmtDate(d) {
  return d || '';
}

function aiStatusBadge(record) {
  if (record.ai_status === 'done') return `<span class="badge badge-ok">AI要約済み</span>`;
  if (record.ai_status === 'unavailable') return `<span class="badge badge-warn">AI未設定</span>`;
  if (record.ai_status === 'error') return `<span class="badge badge-warn">AI要約エラー</span>`;
  return `<span class="badge">要約待ち</span>`;
}

function typeBadge(record) {
  return record.record_type === 'self_practice'
    ? `<span class="type-badge type-badge-practice">自主練</span>`
    : `<span class="type-badge type-badge-lesson">レッスン</span>`;
}

function practiceMeta(record) {
  const parts = [];
  if (record.duration_minutes) parts.push(`${record.duration_minutes}分`);
  if (record.ball_count) parts.push(`${record.ball_count}球`);
  return parts.length ? `<span class="muted">(${parts.join(' / ')})</span>` : '';
}

export function dashboardPage({ user, flash, stats, recentRecords, recentPractice, recentRounds }) {
  const recordsHtml = recentRecords.length
    ? recentRecords
        .map(
          (r) => `
        <li class="list-item">
          <a href="/records/${r.id}">
            <span class="list-date">${fmtDate(r.record_date)}</span>
            <span class="list-title">${escapeHtml(r.content.slice(0, 40))}${r.content.length > 40 ? '…' : ''}</span>
            ${aiStatusBadge(r)}
          </a>
        </li>`
        )
        .join('')
    : `<li class="empty">まだレッスン記録がありません。最初の記録を書いてみましょう。</li>`;

  const practiceHtml = recentPractice.length
    ? recentPractice
        .map(
          (r) => `
        <li class="list-item">
          <a href="/records/${r.id}">
            <span class="list-date">${fmtDate(r.record_date)}</span>
            <span class="list-title">${escapeHtml(r.content.slice(0, 40))}${r.content.length > 40 ? '…' : ''}</span>
            ${practiceMeta(r)}
          </a>
        </li>`
        )
        .join('')
    : `<li class="empty">まだ自主練の記録がありません。</li>`;

  const roundsHtml = recentRounds.length
    ? recentRounds
        .map(
          (r) => `
        <li class="list-item">
          <span class="list-date">${fmtDate(r.round_date)}</span>
          <span class="list-title">${escapeHtml(r.course_name)}${r.score ? ' / スコア ' + r.score : ''}</span>
        </li>`
        )
        .join('')
    : `<li class="empty">まだラウンド記録がありません。</li>`;

  return layout({
    title: 'ホーム',
    user,
    active: 'dashboard',
    flash,
    body: `
      <div class="page-header">
        <h1>${escapeHtml(user.name)}さんのゴルフライフ</h1>
        <div class="header-actions">
          <a href="/records/new" class="btn btn-primary">＋ レッスンを記録する</a>
          <a href="/practice/new" class="btn btn-secondary">＋ 自主練を記録する</a>
        </div>
      </div>

      <div class="stat-row">
        <div class="stat-card"><div class="stat-num">${stats.recordCount}</div><div class="stat-label">レッスン記録</div></div>
        <div class="stat-card"><div class="stat-num">${stats.practiceCount}</div><div class="stat-label">自主練記録</div></div>
        <div class="stat-card"><div class="stat-num">${stats.roundCount}</div><div class="stat-label">ラウンド記録</div></div>
        <div class="stat-card"><div class="stat-num">${stats.lastDate || '-'}</div><div class="stat-label">直近の記録日</div></div>
      </div>

      <div class="card ai-card">
        <h2>🤖 AIコーチに相談する</h2>
        <p class="muted">これまでのレッスン内容とラウンド記録をもとに、今日一人で練習するときのメニューを提案します。</p>
        <button id="ask-ai-btn" class="btn btn-secondary">今日の練習メニューを聞く</button>
        <div id="ai-result" class="ai-result" hidden></div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header">
            <h2>最近のレッスンカルテ</h2>
            <a href="/records">すべて見る</a>
          </div>
          <ul class="list">${recordsHtml}</ul>
        </div>
        <div class="card">
          <div class="card-header">
            <h2>最近の自主練</h2>
            <a href="/practice">すべて見る</a>
          </div>
          <ul class="list">${practiceHtml}</ul>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h2>最近のラウンド記録</h2>
          <a href="/rounds">すべて見る</a>
        </div>
        <ul class="list">${roundsHtml}</ul>
      </div>
    `,
  });
}

export function recordsListPage({ user, flash, records }) {
  const rows = records.length
    ? records
        .map(
          (r) => `
      <li class="list-item">
        <a href="/records/${r.id}">
          <span class="list-date">${fmtDate(r.record_date)}</span>
          <span class="list-title">${escapeHtml(r.content.slice(0, 60))}${r.content.length > 60 ? '…' : ''}</span>
          ${aiStatusBadge(r)}
        </a>
      </li>`
        )
        .join('')
    : `<li class="empty">まだレッスン記録がありません。</li>`;

  return layout({
    title: 'レッスンカルテ',
    user,
    active: 'records',
    flash,
    body: `
      <div class="page-header">
        <h1>レッスンカルテ一覧</h1>
        <a href="/records/new" class="btn btn-primary">＋ 新しい記録</a>
      </div>
      <div class="card"><ul class="list">${rows}</ul></div>
    `,
  });
}

export function newRecordPage({ user, flash, values = {} }) {
  const today = new Date().toISOString().slice(0, 10);
  return layout({
    title: '新しいレッスンカルテ',
    user,
    active: 'records',
    flash,
    body: `
      <h1>今日のレッスンを記録する</h1>
      <p class="muted">レッスンが終わったら、どんな練習をしたか自分の言葉でまとめておきましょう。AIが自動で要約し、次回の課題を整理します。</p>
      <form method="post" action="/records" enctype="multipart/form-data" class="form card">
        <label>日付
          <input type="date" name="record_date" required value="${escapeHtml(values.record_date || today)}">
        </label>
        <label>練習・レッスン内容
          <textarea name="content" rows="6" required placeholder="例）アイアンのダウンスイングでの体重移動を練習した。コーチからは右肩が早く開くクセを指摘され、鏡を見ながら素振りを繰り返した。">${escapeHtml(values.content || '')}</textarea>
        </label>
        <label>気づき・メモ（任意）
          <textarea name="notes" rows="3" placeholder="例）夕方は特に右肩が開きやすい気がする">${escapeHtml(values.notes || '')}</textarea>
        </label>
        <label>動画を添付（任意・複数可、1ファイル60MBまで）
          <input type="file" name="videos" accept="video/*" multiple>
        </label>
        <button type="submit" class="btn btn-primary">記録を保存する</button>
      </form>
    `,
  });
}

export function practiceListPage({ user, flash, records }) {
  const rows = records.length
    ? records
        .map(
          (r) => `
      <li class="list-item">
        <a href="/records/${r.id}">
          <span class="list-date">${fmtDate(r.record_date)}</span>
          <span class="list-title">${escapeHtml(r.content.slice(0, 60))}${r.content.length > 60 ? '…' : ''}</span>
          ${practiceMeta(r)}
        </a>
      </li>`
        )
        .join('')
    : `<li class="empty">まだ自主練の記録がありません。</li>`;

  return layout({
    title: '自主練記録',
    user,
    active: 'practice',
    flash,
    body: `
      <div class="page-header">
        <h1>自主練記録一覧</h1>
        <a href="/practice/new" class="btn btn-primary">＋ 新しい記録</a>
      </div>
      <div class="card"><ul class="list">${rows}</ul></div>
    `,
  });
}

export function newPracticePage({ user, flash, values = {} }) {
  const today = new Date().toISOString().slice(0, 10);
  return layout({
    title: '新しい自主練記録',
    user,
    active: 'practice',
    flash,
    body: `
      <h1>自主練を記録する</h1>
      <p class="muted">一人で練習した内容も残しておきましょう。時間や球数を記録しておくと、後で振り返りやすくなります。</p>
      <form method="post" action="/practice" enctype="multipart/form-data" class="form card">
        <label>日付
          <input type="date" name="record_date" required value="${escapeHtml(values.record_date || today)}">
        </label>
        <label>練習内容
          <textarea name="content" rows="6" required placeholder="例）ドライビングレンジでアイアンの打ち込み練習をした。">${escapeHtml(values.content || '')}</textarea>
        </label>
        <div class="form-row">
          <label>練習時間（分・任意）
            <input type="number" name="duration_minutes" min="1" max="1440" placeholder="例）90" value="${escapeHtml(values.duration_minutes || '')}">
          </label>
          <label>打球数（球・任意）
            <input type="number" name="ball_count" min="1" max="5000" placeholder="例）150" value="${escapeHtml(values.ball_count || '')}">
          </label>
        </div>
        <label>気づきポイント・メモ（任意）
          <textarea name="notes" rows="3" placeholder="例）体重移動を意識したらミート率が上がった気がする">${escapeHtml(values.notes || '')}</textarea>
        </label>
        <label>動画を添付（任意・複数可、1ファイル60MBまで）
          <input type="file" name="videos" accept="video/*" multiple>
        </label>
        <button type="submit" class="btn btn-primary">記録を保存する</button>
      </form>
    `,
  });
}

export function recordDetailPage({ user, flash, record, videos, readOnly = false, ownerName }) {
  const isPractice = record.record_type === 'self_practice';
  const videosHtml = videos.length
    ? videos
        .map(
          (v) => `
      <div class="video-item">
        <video controls preload="metadata" src="/media/${encodeURIComponent(v.filename)}"></video>
        <div class="video-name">${escapeHtml(v.original_name)}</div>
      </div>`
        )
        .join('')
    : `<p class="muted">添付動画はありません。</p>`;

  const aiSection =
    record.ai_status === 'done'
      ? `
      <div class="ai-box">
        <h3>🤖 AIによる要約</h3>
        <p>${nl2br(record.ai_summary)}</p>
        ${record.ai_next_issues ? `<h4>次回の課題</h4><p>${nl2br(record.ai_next_issues)}</p>` : ''}
      </div>`
      : record.ai_status === 'unavailable'
      ? `<div class="ai-box ai-box-muted"><p class="muted">AI機能は未設定のため、要約は生成されていません。</p></div>`
      : record.ai_status === 'error'
      ? `<div class="ai-box ai-box-muted"><p class="muted">AI要約の生成中にエラーが発生しました。</p></div>`
      : `<div class="ai-box ai-box-muted"><p class="muted">AI要約を処理中です。少し時間を置いて再読み込みしてください。</p></div>`;

  const backHref = readOnly ? `/admin/students/${record.user_id}` : isPractice ? '/practice' : '/records';
  const backLabel = readOnly ? '← 生徒ページに戻る' : '← 一覧に戻る';

  const metaLine = [];
  if (record.duration_minutes) metaLine.push(`練習時間: ${record.duration_minutes}分`);
  if (record.ball_count) metaLine.push(`打球数: ${record.ball_count}球`);

  return layout({
    title: `${fmtDate(record.record_date)} のカルテ`,
    user,
    active: isPractice ? 'practice' : 'records',
    flash,
    body: `
      <div class="page-header">
        <h1>${fmtDate(record.record_date)} の${isPractice ? '自主練記録' : '練習記録'}${readOnly ? `（${escapeHtml(ownerName)}さん）` : ''} ${typeBadge(record)}</h1>
        <a href="${backHref}">${backLabel}</a>
      </div>

      <div class="card">
        <h3>練習・レッスン内容</h3>
        <p>${nl2br(record.content)}</p>
        ${metaLine.length ? `<p class="muted">${metaLine.join(' / ')}</p>` : ''}
        ${record.notes ? `<h3>気づき・メモ</h3><p>${nl2br(record.notes)}</p>` : ''}
      </div>

      <div class="card">${aiSection}</div>

      <div class="card">
        <h3>添付動画</h3>
        <div class="video-grid">${videosHtml}</div>
      </div>
    `,
  });
}

export function roundsPage({ user, flash, rounds, stats, values = {} }) {
  const today = new Date().toISOString().slice(0, 10);
  const rows = rounds.length
    ? rounds
        .map(
          (r) => `
      <li class="list-item round-item">
        <span class="list-date">${fmtDate(r.round_date)}</span>
        <span class="list-title">${escapeHtml(r.course_name)}${r.score ? ' / スコア ' + r.score : ''}${r.putts ? ' / パット ' + r.putts : ''}</span>
        ${r.issues ? `<div class="round-issues">課題: ${escapeHtml(r.issues)}</div>` : ''}
        ${r.notes ? `<div class="round-notes">${nl2br(r.notes)}</div>` : ''}
      </li>`
        )
        .join('')
    : `<li class="empty">まだラウンド記録がありません。</li>`;

  return layout({
    title: 'ラウンド記録',
    user,
    active: 'rounds',
    flash,
    body: `
      <h1>ラウンド記録</h1>

      <div class="stat-row">
        <div class="stat-card"><div class="stat-num">${stats.bestScore ?? '-'}</div><div class="stat-label">ベストスコア</div></div>
        <div class="stat-card"><div class="stat-num">${stats.yearAvgScore ?? '-'}</div><div class="stat-label">今年の平均スコア</div></div>
        <div class="stat-card"><div class="stat-num">${stats.avgPutts ?? '-'}</div><div class="stat-label">平均パット数</div></div>
      </div>

      <div class="card">
        <h2>スコア推移</h2>
        ${renderScoreChart(rounds)}
      </div>

      <div class="card">
        <h2>ラウンドを記録する</h2>
        <form method="post" action="/rounds" class="form">
          <div class="form-row">
            <label>日付
              <input type="date" name="round_date" required value="${escapeHtml(values.round_date || today)}">
            </label>
            <label>コース名
              <input type="text" name="course_name" required value="${escapeHtml(values.course_name || '')}">
            </label>
            <label>スコア
              <input type="number" name="score" min="18" max="200" value="${escapeHtml(values.score || '')}">
            </label>
            <label>パター数
              <input type="number" name="putts" min="0" max="99" value="${escapeHtml(values.putts || '')}">
            </label>
          </div>
          <label>気づいた課題（任意）
            <input type="text" name="issues" placeholder="例）ドライバーの左へのミスが多かった" value="${escapeHtml(values.issues || '')}">
          </label>
          <label>メモ（任意）
            <textarea name="notes" rows="3">${escapeHtml(values.notes || '')}</textarea>
          </label>
          <button type="submit" class="btn btn-primary">保存する</button>
        </form>
      </div>
      <div class="card">
        <h2>ラウンド履歴</h2>
        <ul class="list">${rows}</ul>
      </div>
    `,
  });
}
