import { layout, escapeHtml, logoLockup } from './layout.js';

export function loginPage({ flash } = {}) {
  return layout({
    title: 'ログイン',
    user: null,
    flash,
    body: `
      <div class="auth-card">
        <div class="logo-wrap">${logoLockup()}</div>
        <p class="subtitle">ゴルフ成長AI記録ノート</p>
        <form method="post" action="/login" class="form">
          <label>メールアドレス
            <input type="email" name="email" required autofocus>
          </label>
          <label>パスワード
            <input type="password" name="password" required>
          </label>
          <button type="submit" class="btn btn-primary">ログイン</button>
        </form>
        <p class="auth-switch">アカウントをお持ちでない生徒の方は <a href="/register">新規登録</a></p>
      </div>
    `,
  });
}

export function registerPage({ flash, values = {} } = {}) {
  return layout({
    title: '新規登録',
    user: null,
    flash,
    body: `
      <div class="auth-card">
        <h1>新規登録</h1>
        <p class="subtitle">生徒アカウントの作成（指導者アカウントはスタジオにて発行します）</p>
        <form method="post" action="/register" class="form">
          <label>お名前
            <input type="text" name="name" required value="${escapeHtml(values.name || '')}">
          </label>
          <label>フリガナ（検索用・任意）
            <input type="text" name="furigana" placeholder="例）ヤマダ ハナコ" value="${escapeHtml(values.furigana || '')}">
          </label>
          <label>メールアドレス
            <input type="email" name="email" required value="${escapeHtml(values.email || '')}">
          </label>
          <label>パスワード（8文字以上）
            <input type="password" name="password" required minlength="8">
          </label>
          <button type="submit" class="btn btn-primary">登録する</button>
        </form>
        <p class="auth-switch">すでにアカウントをお持ちの方は <a href="/login">ログイン</a></p>
      </div>
    `,
  });
}
