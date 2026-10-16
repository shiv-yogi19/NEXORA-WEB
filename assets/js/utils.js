// NEXORA utilities — Created By Shiv Yogi
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Build DOM safely: text is always inserted as text nodes, never parsed as HTML. */
export function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k === 'class') n.className = v;
    else if (k === 'dataset') Object.assign(n.dataset, v);
    else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value') n.value = v;
    else if (k === 'checked' || k === 'disabled' || k === 'selected') n[k] = !!v;
    else n.setAttribute(k, v === true ? '' : String(v));
  }
  append(n, kids);
  return n;
}
export function append(parent, kids) {
  for (const k of [].concat(kids)) {
    if (k == null || k === false) continue;
    if (Array.isArray(k)) append(parent, k);
    else parent.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
  return parent;
}
export function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }
export function mount(node, ...kids) { clear(node); append(node, kids); return node; }

export function fmtBytes(n) {
  if (n == null || isNaN(n)) return '—';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0, v = Number(n);
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return (i === 0 || v >= 100 ? Math.round(v) : v.toFixed(1)) + ' ' + u[i];
}
export function fmtTime(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0');
}
export function fmtDate(iso) {
  if (!iso) return '—';
  const d = typeof iso === 'number' ? new Date(iso * 1000) : new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
export function relTime(iso) {
  const d = new Date(iso); if (isNaN(d)) return '';
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 45) return 'just now';
  if (s < 3600) return Math.round(s / 60) + ' min ago';
  if (s < 86400) return Math.round(s / 3600) + ' h ago';
  if (s < 86400 * 14) return Math.round(s / 86400) + ' d ago';
  return fmtDate(iso);
}
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export function debounce(fn, ms = 250) {
  let t; const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; d.cancel = () => clearTimeout(t); return d;
}
export function joinPath(a, b) { return a ? a + '/' + b : b; }
export function parentPath(p) { return p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : ''; }
export function kindLabel(k) { return { video: 'Video', audio: 'Audio', image: 'Image', other: 'File', folder: 'Folder' }[k] || 'File'; }
export function enc(s) { return encodeURIComponent(s); }
export function qs(obj) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj || {})) if (v !== undefined && v !== null && v !== '') p.set(k, v);
  const s = p.toString(); return s ? '?' + s : '';
}
export function lsGet(key, fallback = null) { try { const v = localStorage.getItem(key); return v === null ? fallback : v; } catch { return fallback; } }
export function lsSet(key, val) { try { localStorage.setItem(key, val); return true; } catch { return false; } }
export function lsDel(key) { try { localStorage.removeItem(key); } catch { /* ignore */ } }
export function ssGet(key) { try { return sessionStorage.getItem(key); } catch { return null; } }
export function ssSet(key, val) { try { sessionStorage.setItem(key, val); } catch { /* ignore */ } }
export function ssDel(key) { try { sessionStorage.removeItem(key); } catch { /* ignore */ } }
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* fall through */ }
  const ta = el('textarea', { style: { position: 'fixed', opacity: '0' } }); ta.value = text; document.body.append(ta); ta.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch { ok = false; } ta.remove(); return ok;
}
