import { api } from '../api.js';
import { html, mount, $ } from '../ui.js';

export async function render(root, { mode }, { state, navigate }) {
  const isSignup = mode === 'signup';
  mount(root, html`
    <section class="auth">
      <div class="auth-hero">
        <div class="auth-logo">🌱</div>
        <h1 class="auth-title">Growth Note</h1>
        <p class="auth-lead">毎日のひとことが、<br>あなたの成長の資産になる。</p>
      </div>

      ${isSignup ? html`
        <ul class="auth-points">
          <li><span>✏️</span>一言・写真・音声で、30秒で記録</li>
          <li><span>✨</span>AIが要約して、次の一歩を提案</li>
          <li><span>🔥</span>続けた日数と成長が目に見える</li>
        </ul>` : ''}

      <form class="card auth-card" novalidate>
        <h2 class="auth-card-title">${isSignup ? 'はじめる' : 'おかえりなさい'}</h2>
        ${isSignup ? html`
          <label class="field">
            <span class="field-label">ニックネーム</span>
            <input class="input" name="displayName" maxlength="30" autocomplete="nickname" placeholder="例: みなみ">
          </label>` : ''}
        <label class="field">
          <span class="field-label">メールアドレス</span>
          <input class="input" name="email" type="email" inputmode="email" autocomplete="email" required placeholder="you@example.com">
        </label>
        <label class="field">
          <span class="field-label">パスワード${isSignup ? '（8文字以上）' : ''}</span>
          <input class="input" name="password" type="password" minlength="8" autocomplete="${isSignup ? 'new-password' : 'current-password'}" required>
        </label>
        <p class="form-error" role="alert" hidden></p>
        <button class="btn btn-primary btn-block btn-lg" type="submit">${isSignup ? '無料ではじめる' : 'ログイン'}</button>
      </form>

      <p class="auth-switch">
        ${isSignup
          ? html`すでにアカウントをお持ちの方は <a href="#/login">ログイン</a>`
          : html`はじめての方は <a href="#/signup">新規登録（無料）</a>`}
      </p>
    </section>`);

  const form = $('form', root);
  const errEl = $('.form-error', root);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const btn = $('button[type=submit]', form);
    errEl.hidden = true;
    btn.disabled = true;
    btn.classList.add('loading');
    try {
      state.me = await api(isSignup ? '/auth/signup' : '/auth/login', {
        method: 'POST',
        body: Object.fromEntries(fd.entries()),
      });
      navigate(isSignup ? '/write?welcome=1' : '/', { replace: true });
    } catch (err) {
      errEl.textContent = err.message;
      errEl.hidden = false;
    } finally {
      btn.disabled = false;
      btn.classList.remove('loading');
    }
  });
}
