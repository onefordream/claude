import { api } from '../api.js';
import { html, mount, $, toast } from '../ui.js';

function hero(lead) {
  return html`<div class="auth-hero">
    <a class="auth-logo" href="#/welcome" aria-label="Growth Note のご紹介">🌱</a>
    <h1 class="auth-title">Growth Note</h1>
    <p class="auth-lead">${lead}</p>
  </div>`;
}

const legalLinks = html`<p class="auth-legal">
  <a href="#/legal/terms">利用規約</a><a href="#/legal/privacy">プライバシーポリシー</a><a href="#/legal/tokushoho">特定商取引法に基づく表記</a></p>`;

async function submitWith(form, fn) {
  const errEl = $('.form-error', form);
  const btn = $('button[type=submit]', form);
  errEl.hidden = true;
  btn.disabled = true;
  btn.classList.add('loading');
  try {
    await fn(Object.fromEntries(new FormData(form).entries()));
  } catch (err) {
    errEl.textContent = err.message;
    errEl.hidden = false;
  } finally {
    btn.disabled = false;
    btn.classList.remove('loading');
  }
}

export async function render(root, { mode, query }, { state, navigate, takeReturnTo }) {
  // ---- パスワードを忘れたとき ----
  if (mode === 'forgot') {
    mount(root, html`<section class="auth">
      ${hero('パスワードの再設定')}
      <form class="card auth-card" novalidate>
        <p class="muted small">登録したメールアドレスに、パスワードを再設定するためのリンクを送ります。</p>
        <label class="field"><span class="field-label">メールアドレス</span>
          <input class="input" id="forgot-email" name="email" type="email" inputmode="email" autocomplete="email" required placeholder="you@example.com"></label>
        <p class="form-error" role="alert" hidden></p>
        <button class="btn btn-primary btn-block btn-lg" type="submit">再設定のリンクを送る</button>
      </form>
      <div class="sent card" hidden><p class="sent-title">メールを確認してください</p>
        <p class="muted small">登録されているメールアドレスなら、再設定のリンクを送りました。届かないときは迷惑メールフォルダもご確認ください。リンクの有効期限は1時間です。</p></div>
      <p class="auth-switch"><a href="#/login">ログインに戻る</a></p>
    </section>`);
    const form = $('form', root);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submitWith(form, async (v) => {
        await api('/auth/password/forgot', { method: 'POST', body: { email: v.email } });
        form.hidden = true;
        $('.sent', root).hidden = false;
      });
    });
    return;
  }

  // ---- メールのリンクから新しいパスワードを設定 ----
  if (mode === 'reset') {
    const token = query.get('token') || '';
    mount(root, html`<section class="auth">
      ${hero('新しいパスワードを設定')}
      <form class="card auth-card" novalidate>
        <label class="field"><span class="field-label">新しいパスワード（8文字以上）</span>
          <input class="input" id="reset-password" name="password" type="password" minlength="8" autocomplete="new-password" required></label>
        <p class="form-error" role="alert" ${token ? 'hidden' : ''}>${token ? '' : 'リンクが正しくありません。メールのリンクをもう一度開いてください。'}</p>
        <button class="btn btn-primary btn-block btn-lg" type="submit" ${token ? '' : 'disabled'}>パスワードを変更する</button>
      </form>
      <p class="auth-switch"><a href="#/forgot">リンクを送り直す</a></p>
    </section>`);
    const form = $('form', root);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submitWith(form, async (v) => {
        state.me = await api('/auth/password/reset', { method: 'POST', body: { token, password: v.password } });
        toast('パスワードを変更しました');
        navigate('/', { replace: true });
      });
    });
    return;
  }

  // ---- ログイン・新規登録 ----
  const isSignup = mode === 'signup';
  mount(root, html`
    <section class="auth">
      ${hero(html`毎日のひとことが、<br>あなたの成長の資産になる。`)}

      ${isSignup ? html`
        <ul class="auth-points">
          <li><span>✏️</span>一言・写真・声で、30秒で記録</li>
          <li><span>✨</span>AIが要約して、次の一歩を提案</li>
          <li><span>🔥</span>続けた日数と成長が目に見える</li>
        </ul>` : ''}

      <form class="card auth-card" novalidate>
        <h2 class="auth-card-title">${isSignup ? '無料ではじめる' : 'おかえりなさい'}</h2>
        ${isSignup ? html`
          <label class="field">
            <span class="field-label">ニックネーム</span>
            <input class="input" id="auth-name" name="displayName" maxlength="30" autocomplete="nickname" placeholder="例: みなみ">
          </label>` : ''}
        <label class="field">
          <span class="field-label">メールアドレス</span>
          <input class="input" id="auth-email" name="email" type="email" inputmode="email" autocomplete="email" required placeholder="you@example.com">
        </label>
        <label class="field">
          <span class="field-label">パスワード${isSignup ? '（8文字以上）' : ''}</span>
          <input class="input" id="auth-password" name="password" type="password" minlength="8" autocomplete="${isSignup ? 'new-password' : 'current-password'}" required>
        </label>
        ${isSignup ? html`<label class="agree">
          <input type="checkbox" id="auth-agree" name="agree">
          <span><a href="#/legal/terms" target="_blank">利用規約</a>と<a href="#/legal/privacy" target="_blank">プライバシーポリシー</a>に同意します</span>
        </label>` : ''}
        <p class="form-error" role="alert" hidden></p>
        <button class="btn btn-primary btn-block btn-lg" type="submit">${isSignup ? '同意して無料ではじめる' : 'ログイン'}</button>
        ${isSignup ? '' : html`<a class="link block" href="#/forgot">パスワードを忘れた方</a>`}
      </form>

      <p class="auth-switch">
        ${isSignup
          ? html`すでにアカウントをお持ちの方は <a href="#/login">ログイン</a>`
          : html`はじめての方は <a href="#/signup">新規登録（無料）</a>`}
      </p>
      ${legalLinks}
    </section>`);

  const form = $('form', root);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submitWith(form, async (v) => {
      if (isSignup && !form.agree.checked) throw new Error('利用規約とプライバシーポリシーへの同意が必要です');
      state.me = await api(isSignup ? '/auth/signup' : '/auth/login', {
        method: 'POST',
        body: { ...v, agree: isSignup ? form.agree.checked : undefined },
      });
      const back = takeReturnTo();
      navigate(back || (isSignup ? '/write?welcome=1' : '/'), { replace: true });
    });
  });
}
