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

// アプリ全体の状態（ログインユーザーなど）
export const state = { me: null };

const routes = [
  { re: /^\/login$/, view: authView, public: true, params: () => ({ mode: 'login' }) },
  { re: /^\/signup$/, view: authView, public: true, params: () => ({ mode: 'signup' }) },
  { re: /^\/$/, view: homeView, tab: 'home' },
  { re: /^\/write$/, view: writeView, tab: 'write', hideTabs: true },
  { re: /^\/entries$/, view: entriesView, tab: 'entries' },
  { re: /^\/entries\/([\w-]+)$/, view: entryView, tab: 'entries', params: (m) => ({ id: m[1] }) },
  { re: /^\/goals$/, view: goalsView, tab: 'goals' },
  { re: /^\/goals\/new$/, view: goalView, tab: 'goals', params: () => ({ id: null }) },
  { re: /^\/goals\/([\w-]+)$/, view: goalView, tab: 'goals', params: (m) => ({ id: m[1] }) },
  { re: /^\/me$/, view: meView, tab: 'me' },
];

const TABS = [
  { id: 'home', href: '#/', icon: 'home', label: 'ホーム' },
  { id: 'entries', href: '#/entries', icon: 'book', label: 'ふりかえり' },
  { id: 'write', href: '#/write', icon: 'plus', label: '記録', fab: true },
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
    ${TABS.map((t) =>
      t.fab
        ? html`<a class="tab tab-fab" href="${t.href}" aria-label="${t.label}"><span class="fab">${icon('plus', { size: 28, stroke: 2.4 })}</span></a>`
        : html`<a class="tab ${active === t.id ? 'active' : ''}" href="${t.href}" ${active === t.id ? html`aria-current="page"` : ''}>
            ${icon(t.icon, { size: 23 })}<span>${t.label}</span></a>`,
    )}
  </div>`);
}

export async function render() {
  const seq = ++renderSeq;
  const { path, query } = currentPath();
  const match = routes.map((r) => ({ r, m: r.re.exec(path) })).find((x) => x.m);
  if (!match) return navigate('/', { replace: true });
  const { r, m } = match;

  if (!r.public && !state.me) return navigate('/login', { replace: true });
  if (r.public && state.me) return navigate('/', { replace: true });

  if (cleanup) {
    try {
      cleanup();
    } catch {
      /* noop */
    }
    cleanup = null;
  }
  renderTabs(r.tab, !!r.public || !!r.hideTabs);
  const root = document.getElementById('app');
  root.className = `app view-${r.tab || 'auth'}`;
  window.scrollTo(0, 0);
  try {
    const result = await r.view.render(root, { ...(r.params ? r.params(m) : {}), query }, { state, navigate, refreshMe });
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
      <div class="empty-emoji">🌧️</div>
      <p>${err.message || '読み込みに失敗しました'}</p>
      <a class="btn btn-primary" href="/">再読み込み</a>
    </div>`);
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
    mount($('#app'), html`<div class="empty"><div class="empty-emoji">📡</div><p>サーバーに接続できませんでした</p>
      <a class="btn btn-primary" href="/">再読み込み</a></div>`);
    return;
  }
  render();
})();
