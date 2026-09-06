import { layout, escapeHtml, nl2br } from './layout.js';

export function videoLibraryPage({ user, flash, videos, values = {} }) {
  const isInstructor = user.role === 'instructor';

  const uploadForm = isInstructor
    ? `
      <div class="card">
        <h2>動画をアップロードする</h2>
        <p class="muted">生徒がいつでも見返して学べる、お手本・解説動画などを登録できます(1ファイル60MBまで)。</p>
        <form method="post" action="/videos" enctype="multipart/form-data" class="form">
          <label>タイトル
            <input type="text" name="title" required placeholder="例）ドライバーの正しい構え方" value="${escapeHtml(values.title || '')}">
          </label>
          <label>説明(任意)
            <textarea name="description" rows="3" placeholder="どんな内容の動画か簡単に説明してください">${escapeHtml(values.description || '')}</textarea>
          </label>
          <label>動画ファイル
            <input type="file" name="video" accept="video/*" required>
          </label>
          <button type="submit" class="btn btn-primary">アップロードする</button>
        </form>
      </div>`
    : '';

  const videosHtml = videos.length
    ? `<div class="video-library-grid">${videos
        .map(
          (v) => `
      <div class="card video-library-card">
        <video controls preload="metadata" src="/media/${encodeURIComponent(v.filename)}"></video>
        <h3>${escapeHtml(v.title)}</h3>
        ${v.description ? `<p class="muted">${nl2br(v.description)}</p>` : ''}
        ${
          isInstructor
            ? `<form method="post" action="/videos/${v.id}/delete" class="inline-form" onsubmit="return confirm('この動画を削除しますか？');">
                 <button type="submit" class="link-button link-button-danger">削除</button>
               </form>`
            : ''
        }
      </div>`
        )
        .join('')}</div>`
    : `<p class="muted">まだ動画が登録されていません。</p>`;

  return layout({
    title: 'レッスン動画',
    user,
    active: 'videos',
    flash,
    body: `
      <h1>レッスン動画</h1>
      <p class="muted">いつでも見返して勉強できる、お手本・解説動画のライブラリです。</p>
      ${uploadForm}
      ${videosHtml}
    `,
  });
}
