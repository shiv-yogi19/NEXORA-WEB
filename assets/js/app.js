// NEXORA app shell: boot, intro, navigation, guards, offline/update awareness — Created By Shiv Yogi
import * as api from './api.js';
import * as auth from './auth.js';
import { APP_NAME, APP_VERSION } from './config.js';
import { el, mount, $, clear } from './utils.js';
import { icon, toast, emptyState } from './ui.js';
import { defineRoute, setGuard, setNotFound, setView, startRouter, navigate } from './router.js';
import { applyPrefs, loadLocalPrefs, syncPrefsFromServer, connectScreen, settingsScreen, securityScreen, aboutScreen } from './settings.js';
import { dashboardScreen } from './dashboard.js';
import { libraryScreen, favoritesScreen, watchlistScreen, searchScreen } from './media.js';
import { historyScreen } from './favorites.js';
import { viewScreen, createMiniPlayer } from './player.js';
import { filesScreen } from './files.js';
import { sharesScreen, publicShareScreen } from './sharing.js';
import { diagnosticsScreen, storageScreen } from './diagnostics.js';
import { gameScreen } from './game.js';
import { quickSearch } from './search.js';

applyPrefs(loadLocalPrefs());

/* ---------- navigation model ---------- */
const NAV = [
  { path: '/', label: 'Home', icon: 'home', group: 'Browse' },
  { path: '/library', label: 'Library', icon: 'library', group: 'Browse' },
  { path: '/files', label: 'Files', icon: 'folder', group: 'Browse' },
  { path: '/search', label: 'Search', icon: 'search', group: 'Browse' },
  { path: '/favorites', label: 'Favorites', icon: 'heart', group: 'Yours' },
  { path: '/watchlist', label: 'Watchlist', icon: 'bookmark', group: 'Yours' },
  { path: '/history', label: 'History', icon: 'history', group: 'Yours' },
  { path: '/shares', label: 'Shares', icon: 'share', group: 'Manage', admin: true },
  { path: '/storage', label: 'Storage', icon: 'drive', group: 'Manage' },
  { path: '/diagnostics', label: 'Diagnostics', icon: 'pulse', group: 'Manage', admin: true },
  { path: '/settings', label: 'Settings', icon: 'settings', group: 'Account' },
  { path: '/security', label: 'Security', icon: 'shield', group: 'Account' },
  { path: '/connect', label: 'Connection', icon: 'plug', group: 'Account' },
  { path: '/game', label: 'Offline game', icon: 'game', group: 'More' },
  { path: '/about', label: 'About', icon: 'info', group: 'More' },
];
const TABS = [['/', 'Home', 'home'], ['/library', 'Library', 'library'], ['/files', 'Files', 'folder'], ['/search', 'Search', 'search'], ['/more', 'More', 'more']];
const TITLES = Object.fromEntries(NAV.map((n) => [n.path, n.label]));

/* ---------- shell ---------- */
const view = el('div', { id: 'view' });
const banner = el('div', { id: 'banner', class: 'stack' });
const sideNav = el('nav', { class: 'side-nav', 'aria-label': 'Main' });
const connDot = el('span', { class: 'dot', 'aria-hidden': 'true' });
const connText = el('span', { class: 'grow truncate' }, 'Not connected');
const sideConn = el('a', { class: 'statusbar', href: '#/connect', 'aria-label': 'Server connection status' }, connDot, connText);
const sidebar = el('aside', { class: 'sidebar', 'aria-label': 'Sidebar' },
  el('a', { class: 'brand', href: '#/', 'aria-label': 'NEXORA home', style: { textDecoration: 'none', color: 'inherit' } }, auth.brandMark(), el('div', {}, el('div', { class: 'brand-name' }, APP_NAME), el('div', { class: 'brand-sub' }, 'Created By Shiv Yogi'))),
  el('form', { role: 'search', onsubmit: (e) => { e.preventDefault(); quickSearch(e.target.q.value); e.target.reset(); } },
    el('input', { class: 'input', name: 'q', type: 'search', placeholder: 'Search library', 'aria-label': 'Search library' })),
  sideNav, sideConn, el('div', { class: 'side-foot' }, APP_NAME + ' ' + APP_VERSION));
const tabbar = el('nav', { class: 'tabbar', 'aria-label': 'Primary' });
const mini = createMiniPlayer();
const main = el('main', { class: 'main', id: 'main', tabindex: '-1' }, banner, view);
const app = el('div', { id: 'app' }, el('a', { class: 'skip-link', href: '#main', onclick: (e) => { e.preventDefault(); main.focus(); } }, 'Skip to content'), sidebar, main, tabbar, mini.node);
let shellOn = false;

function buildNav() {
  const admin = auth.isAdmin();
  const items = NAV.filter((n) => !n.admin || admin);
  const groups = [...new Set(items.map((n) => n.group))];
  mount(sideNav, groups.map((g) => [el('div', { class: 'side-group' }, g), items.filter((n) => n.group === g).map((n) => el('a', { class: 'nav-item', href: '#' + n.path, dataset: { path: n.path } }, icon(n.icon), n.label))]));
  mount(tabbar, TABS.map(([p, l, i]) => el('a', { class: 'tab', href: '#' + p, dataset: { path: p }, 'aria-label': l }, icon(i), l)));
}
function setShell(on) {
  if (on === shellOn && sideNav.childElementCount) return;
  shellOn = on;
  sidebar.style.display = on ? '' : 'none'; tabbar.style.display = on ? '' : 'none';
  main.style.marginLeft = on ? '' : '0'; main.style.padding = on ? '' : '0';
  if (on) buildNav();
  if (!on) mini.node.hidden = true;
}
function markCurrent(path) {
  const base = path === '/' ? '/' : '/' + path.split('/')[1];
  document.querySelectorAll('[data-path]').forEach((a) => { if (a.dataset.path === base || (base === '/view' && false)) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  mini.setRoute(path);
}

function paintConn() {
  const c = api.conn;
  const state = !c.configured ? 'warn' : c.reachable === true ? 'ok' : c.reachable === false ? 'bad' : 'warn';
  connDot.className = 'dot ' + state;
  connText.textContent = !c.configured ? 'No server set' : c.reachable === true ? 'Server online' : c.reachable === false ? 'Server unreachable' : 'Server not checked';
  paintBanner();
}
function paintBanner() {
  const c = api.conn; const rows = [];
  if (!navigator.onLine) rows.push(el('div', { class: 'banner warn', role: 'status' }, icon('offline'), el('span', { class: 'grow' }, 'You are offline. The app opens, but your library needs the server.'), el('a', { class: 'btn small', href: '#/game' }, 'Play the game')));
  else if (shellOn && c.configured && c.reachable === false) rows.push(el('div', { class: 'banner bad', role: 'status' }, icon('offline'), el('span', { class: 'grow' }, 'Can’t reach your server. If you restarted ngrok, the address has changed.'), el('a', { class: 'btn small', href: '#/connect' }, 'Fix connection')));
  if (updateReady) rows.push(el('div', { class: 'banner', role: 'status' }, icon('refresh'), el('span', { class: 'grow' }, 'A new version of NEXORA is ready.'), el('button', { class: 'btn small primary', type: 'button', onclick: applyUpdate }, 'Reload')));
  mount(banner, rows);
}
api.bus.addEventListener('conn', paintConn);
window.addEventListener('online', paintBanner); window.addEventListener('offline', paintBanner);
api.bus.addEventListener('auth:expired', () => {
  auth.dropSession(); toast('You were signed out. Please sign in again.', 'info'); navigate('/login', { replace: true });
});

/* ---------- routes ---------- */
const guarded = (fn, meta = {}) => [fn, meta];
defineRoute('/', dashboardScreen, {});
defineRoute('/library', libraryScreen, {});
defineRoute('/files', filesScreen, {});
defineRoute('/search', searchScreen, {});
defineRoute('/favorites', favoritesScreen, {});
defineRoute('/watchlist', watchlistScreen, {});
defineRoute('/history', historyScreen, {});
defineRoute('/shares', sharesScreen, { admin: true });
defineRoute('/storage', storageScreen, {});
defineRoute('/diagnostics', diagnosticsScreen, { admin: true });
defineRoute('/settings', settingsScreen, {});
defineRoute('/security', securityScreen, {});
defineRoute('/view/:id', viewScreen, {});
defineRoute('/more', (root) => {
  const admin = auth.isAdmin();
  mount(root, el('div', { class: 'page' }, el('div', { class: 'page-head' }, el('h1', {}, 'More')),
    el('div', { class: 'glass card' }, el('div', { class: 'list' }, NAV.filter((n) => (!n.admin || admin) && !TABS.some((t) => t[0] === n.path)).map((n) => el('a', { class: 'list-row', href: '#' + n.path }, el('span', { class: 'thumb-s' }, icon(n.icon)), el('span', { class: 'info' }, el('span', { class: 'name' }, n.label)), icon('chevR')))
      .concat(el('button', { class: 'list-row', type: 'button', onclick: async () => { await auth.logout(); navigate('/login', { replace: true }); } }, el('span', { class: 'thumb-s' }, icon('logout')), el('span', { class: 'info' }, el('span', { class: 'name' }, 'Sign out'))))))));
}, {});
// reachable without an account
defineRoute('/connect', connectScreen, { public: true });
defineRoute('/game', gameScreen, { public: true });
defineRoute('/about', aboutScreen, { public: true });
defineRoute('/s/:token', publicShareScreen, { public: true, bare: true });
defineRoute('/login', (root) => { auth.renderAuth(root, { mode: 'login' }); }, { public: true, bare: true });
defineRoute('/setup', (root) => { auth.renderAuth(root, { mode: 'setup' }); }, { public: true, bare: true });
defineRoute('/offline', (root) => {
  const run = async () => { const h = await api.checkHealth(); if (h.ok) navigate('/', { replace: true }); else toast(h.message || 'Still not reachable.', 'error'); };
  mount(root, el('div', { class: 'auth-wrap' }, el('div', { class: 'auth-card glass' },
    el('div', { class: 'state' }, icon('offline'), el('h2', {}, 'Can’t reach your server'), el('p', {}, api.conn.lastError || 'The server did not answer.'),
      el('p', { class: 'tiny' }, 'Check that the server is running in Pydroid 3 and that ngrok is up. Free ngrok addresses change when ngrok restarts.')),
    el('div', { class: 'row', style: { justifyContent: 'center' } }, el('button', { class: 'btn primary', type: 'button', onclick: run }, icon('refresh'), 'Try again'), el('a', { class: 'btn', href: '#/connect' }, icon('plug'), 'Change address'), el('a', { class: 'btn', href: '#/game' }, icon('game'), 'Play offline')))));
}, { public: true, bare: true });
setNotFound((root, path) => { mount(root, el('div', { class: 'page' }, emptyState('search', 'Page not found', 'There is nothing at ' + path + '.', el('a', { class: 'btn primary', href: '#/' }, 'Go home')))); });

/* ---------- guard ---------- */
setGuard(async (hit, path) => {
  const meta = hit ? hit.route.meta : {};
  const bare = !!meta.bare;
  if (hit && path.startsWith('/s/')) { setShell(false); return null; }
  if (!api.getBackend()) {
    if (path === '/connect' || path === '/game' || path === '/about') { setShell(false); return null; }
    setShell(false); return '/connect';
  }
  if (!auth.session.checked || (api.getToken() && !auth.session.user)) {
    const h = await api.checkHealth();
    if (!h.ok) { setShell(false); return meta.public && path !== '/login' && path !== '/setup' ? null : '/offline'; }
    try { await auth.restore(); } catch { setShell(false); return '/offline'; }
    if (auth.session.user) syncPrefsFromServer();
  }
  if (!auth.session.user) {
    if (api.conn.reachable === null) await api.checkHealth();
    if (api.conn.setupRequired && path !== '/setup') { setShell(false); return meta.public && !bare ? (setShell(false), null) : '/setup'; }
    if (path === '/login' || path === '/setup') { setShell(false); return null; }
    if (meta.public && !bare) { setShell(false); return null; }
    setShell(false); return api.conn.setupRequired ? '/setup' : '/login';
  }
  // signed in
  if (path === '/login' || path === '/setup' || path === '/offline') { return '/'; }
  if (meta.admin && !auth.isAdmin()) { toast('Only the owner can open that page.', 'error'); return '/'; }
  setShell(!bare);
  return null;
});

document.addEventListener('route:rendered', (e) => {
  const { path } = e.detail;
  markCurrent(path);
  const base = '/' + (path.split('/')[1] || '');
  document.title = (path === '/' ? '' : (TITLES[path === '/' ? '/' : base] || (path.startsWith('/view') ? 'Now viewing' : '')) + (TITLES[base] || path.startsWith('/view') ? ' · ' : '')) + APP_NAME;
  paintBanner();
  if (!e.detail.meta.bare) { const h = view.querySelector('h1'); if (h) { h.setAttribute('tabindex', '-1'); } }
});
auth.onSession((s) => { if (s.user) { if (!sideNav.childElementCount || shellOn) buildNav(); } });

/* ---------- intro: one orchestrated moment per full page load ---------- */
function intro() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduced';
  const word = el('div', { class: 'intro-word', 'aria-hidden': 'true' }, 'NEXORA'.split('').map((ch, i) => el('span', { style: { '--i': String(i) } }, ch)));
  const credit = el('div', { class: 'intro-credit', 'aria-hidden': 'true' }, 'Created By ', el('b', {}, 'Shiv Yogi'));
  const node = el('div', { class: 'intro', role: 'img', 'aria-label': 'NEXORA. Created By Shiv Yogi.', onclick: () => finish() }, el('div', { class: 'intro-stage' }, word, credit), el('span', { class: 'intro-skip' }, 'Tap to skip'));
  document.body.append(node);
  let done = false;
  function finish() { if (done) return; done = true; node.classList.add('leave'); setTimeout(() => node.remove(), 800); }
  if (reduce) { word.style.display = 'none'; credit.style.cssText = 'opacity:1;transform:none;animation:none'; setTimeout(finish, 900); }
  else setTimeout(finish, 3700);
}

/* ---------- service worker + update awareness ---------- */
let updateReady = false, waitingWorker = null;
function applyUpdate() { if (waitingWorker) waitingWorker.postMessage({ type: 'SKIP_WAITING' }); else location.reload(); }
async function registerSW() {
  if (!('serviceWorker' in navigator) || !/^https:|^http:\/\/localhost|^http:\/\/127\./.test(location.href)) return;
  try {
    const hadController = !!navigator.serviceWorker.controller;   // first install must NOT reload the page
    const reg = await navigator.serviceWorker.register('service-worker.js');
    const watch = (w) => { w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) { waitingWorker = w; updateReady = true; paintBanner(); } }); };
    if (reg.waiting && navigator.serviceWorker.controller) { waitingWorker = reg.waiting; updateReady = true; }
    reg.addEventListener('updatefound', () => reg.installing && watch(reg.installing));
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloaded || !hadController) return; reloaded = true; location.reload(); });
  } catch (e) { console.warn('Service worker not registered:', e.message); }
}

/* ---------- boot ---------- */
setView(view);
document.body.prepend(app);
setShell(false);
paintConn();
intro();
registerSW();
startRouter();
window.__nexora = { api, auth };   // read-only handle for diagnostics in the console
