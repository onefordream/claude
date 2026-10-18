import { layout, escapeHtml, nl2br, icon } from './layout.js';
import { renderScoreChart } from './chart.js';
import { jstToday, addDays } from '../lib/date.js';

function fmtDate(d) {
  return d || '';
}

// "今日" / "昨日" / "9/20" — used in the recent-records feed on the home screen.
function formatRelativeDate(dateStr) {
  const today = jstToday();
  const yesterday = addDays(today, -1);
  if (dateStr === today) return '今日';
  if (dateStr === yesterday) return '昨日';
  const [, m, d] = dateStr.split('-');
  return `${Number(m)}/${Number(d)}`;
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

export function goalCard(goal, { readOnly = false } = {}) {
  if (!goal) {
    return readOnly
      ? `<div class="card goal-card goal-card-empty"><h2>${icon('target', { size: 20 })}現在の目標</h2><p class="muted">まだ目標が設定されていません。</p></div>`
      : `
        <div class="card goal-card goal-card-empty">
          <h2>${icon('target', { size: 20 })}目標を設定しましょう</h2>
          <p class="muted">「発表会で失敗しない」「毎週3回練習する」など、達成したい目標と期限を決めておくと、日々の記録にも目的が生まれます。</p>
          <a href="/goals/new" class="btn btn-primary">${icon('plus', { size: 16 })}目標を設定する</a>
        </div>`;
  }

  let dueLine = '';
  let progressBar = '';
  if (goal.target_date) {
    const todayStr = jstToday();
    const days = Math.ceil((new Date(goal.target_date) - new Date(todayStr)) / 86400000);
    if (days > 0) dueLine = `<span class="goal-due">期限まであと${days}日（${escapeHtml(goal.target_date)}）</span>`;
    else if (days === 0) dueLine = `<span class="goal-due goal-due-today">本日が期限です</span>`;
    else dueLine = `<span class="goal-due goal-due-over">期限を${-days}日超過しています</span>`;

    const createdStr = (goal.created_at || '').slice(0, 10) || todayStr;
    const total = new Date(goal.target_date) - new Date(createdStr);
    const elapsed = new Date(todayStr) - new Date(createdStr);
    const pct = total > 0 ? Math.max(2, Math.min(100, Math.round((elapsed / total) * 100))) : 100;
    progressBar = `
      <div class="goal-progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
        <div class="goal-progress-fill" style="width:${pct}%"></div>
      </div>`;
  }

  return `
    <div class="card goal-card">
      <h2>${icon('target', { size: 20 })}現在の目標</h2>
      <p class="goal-content">${escapeHtml(goal.content)}</p>
      ${progressBar}
      ${dueLine}
      ${
        readOnly
          ? ''
          : `<form method="post" action="/goals/${goal.id}/achieve" class="inline-form goal-achieve-form">
               <button type="submit" class="btn btn-primary">${icon('sparkle', { size: 16 })}目標達成</button>
             </form>`
      }
    </div>`;
}

export function newGoalPage({ user, flash, values = {} }) {
  return layout({
    title: '目標を設定する',
    user,
    active: 'dashboard',
    flash,
    body: `
      <h1>新しい目標を設定する</h1>
      <p class="muted">具体的で、期限のある目標にすると振り返りやすくなります。</p>
      <form method="post" action="/goals" class="form card">
        <label>目標
          <input type="text" name="content" required placeholder="例）1年以内に100切り / 飛距離+30ヤード" value="${escapeHtml(values.content || '')}">
        </label>
        <label>達成期限（任意）
          <input type="date" name="target_date" value="${escapeHtml(values.target_date || '')}">
        </label>
        <button type="submit" class="btn btn-primary">目標を設定する</button>
      </form>
    `,
  });
}

const RECORD_KIND = {
  lesson: { label: 'レッスン', icon: 'note', cls: 'kind-lesson' },
  self_practice: { label: '自主練・自習', icon: 'pencil', cls: 'kind-practice' },
};

function recentRecordCard(r) {
  const kind = RECORD_KIND[r.record_type] || RECORD_KIND.lesson;
  const snippet = r.content.length > 56 ? `${r.content.slice(0, 56)}…` : r.content;
  const meta = [];
  if (r.duration_minutes) meta.push(`${icon('clock', { size: 13 })}<span>${r.duration_minutes}分</span>`);
  if (r.ball_count) meta.push(`${icon('target', { size: 13 })}<span>${r.ball_count}球</span>`);
  if (r.video_count > 0)
    meta.push(`${icon('play', { size: 13 })}<span>動画${r.video_count > 1 ? ` ×${r.video_count}` : ''}</span>`);

  return `
    <a href="/records/${r.id}" class="record-card ${kind.cls}">
      <div class="record-card-top">
        <span class="record-kind-tag">${icon(kind.icon, { size: 14 })}${kind.label}</span>
        <span class="record-card-date">${formatRelativeDate(r.record_date)}</span>
      </div>
      <p class="record-card-snippet">${escapeHtml(snippet)}</p>
      <div class="record-card-bottom">
        ${meta.length ? `<span class="record-card-meta">${meta.join('')}</span>` : '<span></span>'}
        ${r.record_type === 'lesson' ? aiStatusBadge(r) : ''}
      </div>
    </a>`;
}

export function dashboardPage({
  user,
  flash,
  stats,
  goal,
  streak,
  weeklyCount,
  todayMessage,
  greeting,
  todayLabel,
  recentCombined,
}) {
  const recentHtml = recentCombined.length
    ? `<div class="record-card-grid">${recentCombined.map(recentRecordCard).join('')}</div>`
    : `
      <div class="empty-state">
        <div class="empty-state-icon">${icon('note', { size: 24 })}</div>
        <p class="empty-state-title">まだ記録がありません</p>
        <p class="muted">今日教わったこと、気づいたことを一言だけでも残してみましょう。<br>積み重ねが、あとで見返せる自分の資産になります。</p>
        <a href="/records/new" class="btn btn-primary">${icon('plus', { size: 16 })}最初の記録を書く</a>
      </div>`;

  return layout({
    title: 'ホーム',
    user,
    active: 'dashboard',
    flash,
    body: `
      <section class="hero">
        <div class="hero-main">
          <p class="hero-date">${escapeHtml(todayLabel)}</p>
          <h1 class="hero-greeting">${escapeHtml(greeting)}、${escapeHtml(user.name)}さん</h1>
          <p class="hero-message">${escapeHtml(todayMessage)}</p>
        </div>
        <div class="hero-streak">
          <div class="hero-streak-flame">${icon('flame', { size: 22 })}</div>
          <div class="hero-streak-num">${streak}</div>
          <div class="hero-streak-label">日連続</div>
        </div>
      </section>

      <section class="action-grid">
        <a href="/records/new" class="action-card action-card-lesson">
          <div class="action-icon">${icon('note', { size: 22 })}</div>
          <div class="action-body">
            <div class="action-title">レッスンを記録する</div>
            <div class="action-desc">教わったことをメモ・写真・動画で残す</div>
          </div>
          <div class="action-arrow">${icon('chevronRight', { size: 18 })}</div>
        </a>
        <a href="/practice/new" class="action-card action-card-practice">
          <div class="action-icon">${icon('pencil', { size: 22 })}</div>
          <div class="action-body">
            <div class="action-title">自主練・自習を記録する</div>
            <div class="action-desc">一人で取り組んだ内容を書き留める</div>
          </div>
          <div class="action-arrow">${icon('chevronRight', { size: 18 })}</div>
        </a>
      </section>

      ${goalCard(goal)}

      <div class="card ai-coach-card">
        <div class="ai-coach-head">
          <div class="ai-coach-avatar">${icon('chat', { size: 20 })}</div>
          <div>
            <h2>AIコーチに相談する</h2>
            <p class="muted">これまでの記録を踏まえて、今日やるべきことを一緒に考えます</p>
          </div>
        </div>
        <div class="ai-coach-prompts">
          <span class="ai-chip">今日は何をすればいい？</span>
          <span class="ai-chip">最近の課題を整理して</span>
          <span class="ai-chip">次の目標のヒントが欲しい</span>
        </div>
        <button id="ask-ai-btn" class="btn btn-primary">今日のおすすめを聞く</button>
        <div id="ai-result" class="ai-result" hidden></div>
      </div>

      <section class="stat-strip">
        <div class="stat-pill"><span class="stat-pill-num">${stats.recordCount}</span><span class="stat-pill-label">レッスン記録</span></div>
        <div class="stat-pill"><span class="stat-pill-num">${stats.practiceCount}</span><span class="stat-pill-label">自主練記録</span></div>
        <div class="stat-pill"><span class="stat-pill-num">${weeklyCount}</span><span class="stat-pill-label">今週の記録</span></div>
        <div class="stat-pill"><span class="stat-pill-num">${streak}</span><span class="stat-pill-label">連続記録日数</span></div>
      </section>

      <section>
        <div class="section-header">
          <h2>最近の記録</h2>
          <a href="/records">すべて見る</a>
        </div>
        ${recentHtml}
      </section>
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
    title: 'ゴルフ成長ノート',
    user,
    active: 'records',
    flash,
    body: `
      <div class="page-header">
        <h1>ゴルフ成長ノート</h1>
        <a href="/records/new" class="btn btn-primary">${icon('plus', { size: 16 })}新しい記録</a>
      </div>
      <div class="card"><ul class="list">${rows}</ul></div>
    `,
  });
}

export function newRecordPage({ user, flash, values = {} }) {
  const today = jstToday();
  return layout({
    title: 'ゴルフ成長ノートに記録する',
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
        <a href="/practice/new" class="btn btn-primary">${icon('plus', { size: 16 })}新しい記録</a>
      </div>
      <div class="card"><ul class="list">${rows}</ul></div>
    `,
  });
}

export function newPracticePage({ user, flash, values = {} }) {
  const today = jstToday();
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
        <h3>${icon('chat', { size: 17 })}AIによる要約</h3>
        <p>${nl2br(record.ai_summary)}</p>
        ${record.ai_next_issues ? `<h4>次回の課題</h4><p>${nl2br(record.ai_next_issues)}</p>` : ''}
      </div>`
      : record.ai_status === 'unavailable'
      ? `<div class="ai-box ai-box-muted"><p class="muted">AI機能は未設定のため、要約は生成されていません。</p></div>`
      : record.ai_status === 'error'
      ? `<div class="ai-box ai-box-muted"><p class="muted">AI要約の生成中にエラーが発生しました。</p></div>`
      : `<div class="ai-box ai-box-muted"><p class="muted">AI要約を処理中です。少し時間を置いて再読み込みしてください。</p></div>`;

  const backHref = readOnly ? `/admin/students/${record.user_id}` : isPractice ? '/practice' : '/records';
  const backLabel = `${icon('chevronLeft', { size: 14 })}<span>${readOnly ? '生徒ページに戻る' : '一覧に戻る'}</span>`;

  const metaLine = [];
  if (record.duration_minutes) metaLine.push(`練習時間: ${record.duration_minutes}分`);
  if (record.ball_count) metaLine.push(`打球数: ${record.ball_count}球`);

  return layout({
    title: `${fmtDate(record.record_date)} の記録`,
    user,
    active: isPractice ? 'practice' : 'records',
    flash,
    body: `
      <div class="page-header">
        <h1>${fmtDate(record.record_date)} の${isPractice ? '自主練記録' : '練習記録'}${readOnly ? `（${escapeHtml(ownerName)}さん）` : ''} ${typeBadge(record)}</h1>
        <a href="${backHref}" class="back-link">${backLabel}</a>
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
  const today = jstToday();
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

export function mypagePage({ user, flash, stats, memberSince }) {
  const initial = (user.name || '').trim().slice(0, 1).toUpperCase();
  return layout({
    title: 'マイページ',
    user,
    active: 'mypage',
    flash,
    body: `
      <h1>マイページ</h1>

      <div class="card mypage-profile">
        <div class="mypage-avatar">${escapeHtml(initial)}</div>
        <div>
          <div class="mypage-name">${escapeHtml(user.name)}${user.furigana ? ` <span class="muted furigana">(${escapeHtml(user.furigana)})</span>` : ''}</div>
          <div class="mypage-email">${escapeHtml(user.email)}</div>
        </div>
      </div>

      <div class="card">
        <h2>記録の状況</h2>
        <div class="mypage-row"><span class="mypage-row-label">レッスン記録</span><span class="mypage-row-value">${stats.recordCount}件</span></div>
        <div class="mypage-row"><span class="mypage-row-label">自主練記録</span><span class="mypage-row-value">${stats.practiceCount}件</span></div>
        <div class="mypage-row"><span class="mypage-row-label">連続記録日数</span><span class="mypage-row-value">${stats.streak}日</span></div>
        <div class="mypage-row"><span class="mypage-row-label">利用開始</span><span class="mypage-row-value">${escapeHtml(memberSince)}</span></div>
      </div>

      <div class="card">
        <h2>アカウント</h2>
        <p class="muted">パスワードを忘れた場合は、指導者にお申し出ください。</p>
        <form method="post" action="/logout">
          <button type="submit" class="btn btn-secondary">ログアウト</button>
        </form>
      </div>
    `,
  });
}
