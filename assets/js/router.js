// NEXORA hash router — works from any GitHub Pages sub-path and survives refresh.
// Created By Shiv Yogi
import { clear } from './utils.js';

const routes = [];
let view = null, cleanup = null, token = 0, guard = null, notFound = null;

export function defineRoute(pattern, handler, meta = {}) {
  const keys = [];
  const rx = new RegExp('^' + pattern.replace(/\/:([a-z]+)/gi, (_, k) => { keys.push(k); return '/([^/]+)'; }) + '/?$');
  routes.push({ pattern, rx, keys, handler, meta });
}
export function setGuard(fn) { guard = fn; }
export function setNotFound(fn) { notFound = fn; }
export function setView(node) { view = node; }

export function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [pathPart, queryPart = ''] = raw.split('?');
  const query = Object.fromEntries(new URLSearchParams(queryPart));
  return { path: pathPart.startsWith('/') ? pathPart : '/' + pathPart, query };
}
export function navigate(path, { replace = false } = {}) {
  const target = '#' + path;
  if (location.hash === target) { render(); return; }
  if (replace) history.replaceState(null, '', target); else location.hash = target;
  if (replace) render();
}
export function currentRoute() { const { path } = parseHash(); return match(path); }
function match(path) {
  for (const r of routes) {
    const m = r.rx.exec(path);
    if (m) return { route: r, params: Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])) };
  }
  return null;
}

export async function render() {
  const my = ++token;
  const { path, query } = parseHash();
  if (typeof cleanup === 'function') { try { cleanup(); } catch { /* ignore */ } }
  cleanup = null;
  const hit = match(path);
  const redirect = guard ? await guard(hit, path) : null;
  if (my !== token) return;
  if (redirect) { navigate(redirect, { replace: true }); return; }
  if (!view) return;
  clear(view);
  window.scrollTo(0, 0);
  if (!hit) { if (notFound) cleanup = await notFound(view, path); return; }
  try {
    const c = await hit.route.handler(view, { params: hit.params, query, path });
    if (my !== token) { if (typeof c === 'function') c(); return; }
    cleanup = c;
  } catch (e) {
    console.error('route error', e);
  }
  document.dispatchEvent(new CustomEvent('route:rendered', { detail: { path, meta: hit.route.meta } }));
}
export function startRouter() {
  window.addEventListener('hashchange', render);
  return render();
}
