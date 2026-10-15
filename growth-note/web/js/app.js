import { api } from './api.js';
import { html, mount, $, toast } from './ui.js';
import { icon } from './icons.js';
import * as authView from './views/auth.js';
import * as homeView from './views/home.js';
import * as writeView from './views/write.js';
import * as entriesView from './views/entries.js';
import * as entryView from './views/entry.js';
import * as goalsView from './views/goals.js';
import * as goalView from './views/goal.js';
import * as meView from './views/me.js';
import * as linksView from './views/links.js';
import * as storeView from './views/store.js';
import * as growthView from './views/growth.js';
import * as pricingView from './views/pricing.js';
import * as golfView from './views/golf.js';
import * as golfRoundView from './views/golf-round.js';
import * as welcomeView from './views/welcome.js';
import * as legalView from './views/legal.js';
import * as adminView from './views/admin.js';

// アプリ全体の状態（ログインユーザーなど）
export const state = { me: null };

const routes = [
  { re: /^\/welcome$/, view: welcomeView, public: true },
  { re: /^\/login$/, view: authView, public: true, params: () => ({ mode: 'login' }) },
  { re: /^\/signup$/, view: authView, public: true, params: () => ({ mode: 'signup' }) },
  { re: /^\/forgot$/, view: authView, public: true, params: () => ({ mode: 'forgot' }) },
  // パスワード再設定と法務ページは、ログインしていてもいなくても開ける
  { re: /^\/reset$/, view: authView, open: true, params: () => ({ mode: 'reset' }) },
  { re: /^\/legal\/(terms|privacy|tokushoho)$/, view: legalView, open: true, tab: 'me', params: (m) => ({ page: m[1] }) },
  { re: /^\/admin$/, view: adminView, tab: 'me' },
  { re: /^\/$/, view: homeView, tab: 'home' },
  { re: /^\/write$/, view: writeView, tab: 'write', hideTabs: true },
  { re: /^\/entries$/, view: entriesView, tab: 'entries' },
  { re: /^\/entries\/([\w-]+)$/, view: entryView, tab: 'entries', params: (m) => ({ id: m[1] }) },
  { re: /^\/goals$/, view: goalsView, tab: 'goals' },
  { re: /^\/goals\/new$/, view: goalView, tab: 'goals', params: () => ({ id: null }) },
  { re: /^\/goals\/([\w-]+)$/, view: goalView, tab: 'goals', params: (m) => ({ id: m[1] }) },
  { re: /^\/me$/, view: meView, tab: 'me' },
  { re: /^\/growth$/, view: growthView, tab: 'home' },
  { re: /^\/golf$/, view: golfView, tab: 'home' },
  { re: /^\/golf\/new$/, view: golfRoundView, tab: 'home', hideTabs: true, params: () => ({ id: null }) },
  { re: /^\/golf\/rounds\/([\w-]+)$/, view: golfRoundView, tab: 'home', hideTabs: true, params: (m) => ({ id: m[1] }) },
  { re: /^\/pricing$/, view: pricingView, tab: 'me', params: () => ({ page: 'pricing' }) },
  { re: /^\/billing$/, view: pricingView, tab: 'me', params: () => ({ page: 'billing' }) },
  { re: /^\/billing\/success$/, view: pricingView, tab: 'me', params: () => ({ page: 'success' }) },
  { re: /^\/links\/new$/, view: linksView, tab: 'me', params: () => ({ id: null }) },
  { re: /^\/links\/([\w-]+)$/, view: linksView, tab: 'me', params: (m) => ({ id: m[1] }) },
  { re: /^\/store$/, view: storeView, tab: 'me', params: () => ({ id: null }) },
  { re: /^\/store\/([\w-]+)$/, view: storeView, tab: 'me', params: (m) => ({ id: m[1] }) },
];

const TABS = [
  { id: 'home', href: '#/', icon: 'house', label: '今日' },
  { id: 'entries', href: '#/entries', icon: 'notebook', label: '記録' },
  { id: 'write', href: '#/write', icon: 'plus', label: '追加' },
  { id: 'goals', href: '#/goals', icon: 'target', label: '目標' },
  { id: 'me', href: '#/me', icon: 'user', label: 'マイページ' },
];

let cleanup = null;
let renderSeq = 0;

export function navigate(path, { replace = false } = {}) {
  const hash = '#' + path;
  if (replace) history.replaceState(null, '', hash);
  else if (location.hash !== hash) {
    location.hash = hash;
    return; // hashchange で render される
  }
  render();
}

function currentPath() {
  const h = location.hash.replace(/^#/, '');
  const [path, query = ''] = h.split('?');
  return { path: path || '/', query: new URLSearchParams(query) };
}

function renderTabs(active, hidden) {
  const bar = document.getElementById('tabbar');
  bar.hidden = hidden;
  if (hidden) return;
  mount(bar, html`<div class="tabbar-inner">
    <a class="tabbar-brand" href="#/">Growth Note</a>
    ${TABS.map((t) => html`<a class="tab ${active === t.id ? 'active' : ''}" href="${t.href}" ${active === t.id ? html`aria-current="page"` : ''}>
      ${icon(t.icon, { size: 20 })}<span>${t.label}</span></a>`)}
  </div>`);
}

export async function render() {
  const seq = ++renderSeq;
  const { path, query } = currentPath();
  const match = routes.map((r) => ({ r, m: r.re.exec(path) })).find((x) => x.m);
  if (!match) return navigate('/', { replace: true });
  const { r, m } = match;

  if (!r.public && !r.open && !state.me) {
    // ログイン後に元のページ（店舗の招待リンクなど）へ戻れるように覚えておく
    if (path !== '/') setReturnTo(location.hash.slice(1));
    return navigate(path === '/' ? '/welcome' : '/login', { replace: true });
  }
  if (r.public && state.me) return navigate('/', { replace: true });

  if (cleanup) {
    try {
      cleanup();
    } catch {
      /* noop */
    }
    cleanup = null;
  }
  renderTabs(r.tab, !!r.public || !!r.hideTabs || !state.me);
  const root = document.getElementById('app');
  root.className = `app view-${r.tab || 'auth'}${r.public || !state.me ? ' is-public' : ''}${r.hideTabs ? ' is-focus' : ''}`;
  document.body.classList.toggle('has-nav', !r.public && !r.hideTabs && !!state.me);
  window.scrollTo(0, 0);
  try {
    const result = await r.view.render(root, { ...(r.params ? r.params(m) : {}), query }, { state, navigate, refreshMe, takeReturnTo });
    if (seq !== renderSeq) {
      result?.();
      return;
    }
    cleanup = typeof result === 'function' ? result : null;
  } catch (err) {
    if (seq !== renderSeq) return;
    console.error(err);
    if (err.status === 401) return;
    mount(root, html`<div class="empty">
      <p>${err.message || '読み込みに失敗しました'}</p>
      <a class="btn btn-secondary" href="/">再読み込み</a>
    </div>`);
  }
}

const RETURN_KEY = 'gn:return-to';
function setReturnTo(path) {
  try {
    sessionStorage.setItem(RETURN_KEY, path);
  } catch {
    /* noop */
  }
}
/** ログイン・登録のあとに戻る先（なければホーム） */
export function takeReturnTo() {
  try {
    const v = sessionStorage.getItem(RETURN_KEY);
    sessionStorage.removeItem(RETURN_KEY);
    return v && v.startsWith('/') && !v.startsWith('//') ? v : null;
  } catch {
    return null;
  }
}

export async function refreshMe() {
  try {
    state.me = await api('/me');
  } catch (err) {
    if (err.status === 401) state.me = null;
    else throw err;
  }
  return state.me;
}

window.addEventListener('hashchange', render);
window.addEventListener('gn:unauthorized', () => {
  if (!state.me) return;
  state.me = null;
  toast('ログインの有効期限が切れました。もう一度ログインしてください');
  navigate('/login', { replace: true });
});

(async function boot() {
  try {
    await refreshMe();
  } catch {
    mount($('#app'), html`<div class="empty"><p>サーバーに接続できませんでした。</p>
      <a class="btn btn-secondary" href="/">再読み込み</a></div>`);
    return;
  }
  render();
})();
