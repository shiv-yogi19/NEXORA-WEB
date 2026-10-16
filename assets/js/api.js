// NEXORA API client — Created By Shiv Yogi
// One place for: backend URL, bearer token, timeouts, error mapping, connection state.
import { API_PREFIX, KEYS, NGROK_HEADER, NGROK_HOST_RE, REQUEST_TIMEOUT_MS, HEALTH_TIMEOUT_MS } from './config.js';
import { lsGet, lsSet, lsDel, ssGet, ssSet, ssDel, qs } from './utils.js';

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'error', network = false } = {}) {
    super(message); this.name = 'ApiError'; this.status = status; this.code = code; this.network = network;
  }
}

export const bus = new EventTarget();
const emit = (name, detail) => bus.dispatchEvent(new CustomEvent(name, { detail }));

/** Connection state the UI shows. "configured" is NOT "reachable". */
export const conn = {
  configured: false, reachable: null, lastOkAt: null, lastCheckAt: null, lastError: null,
  version: null, setupRequired: false, registrationOpen: false, latencyMs: null,
};

/* ---- backend URL ---- */
export function normalizeBackendUrl(input) {
  let s = String(input || '').trim();
  if (!s) throw new ApiError('Enter the address your server shows, for example https://abcd-12-34.ngrok-free.app');
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = 'https://' + s;
  let u;
  try { u = new URL(s); } catch { throw new ApiError('That does not look like a web address.'); }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new ApiError('Use an https:// address.');
  if (u.username || u.password) throw new ApiError('Remove the username/password from the address.');
  const host = u.hostname;
  const local = /^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(host);
  if (u.protocol === 'http:' && !local) throw new ApiError('Use https://. Plain http:// only works for localhost or a home-network address.');
  if (u.protocol === 'http:' && location.protocol === 'https:' && !/^(localhost|127\.|\[::1\])/.test(host)) {
    throw new ApiError('This page is served over https, so the browser blocks plain http:// servers. Use the https ngrok address.');
  }
  return u.origin;   // drops path, query and hash
}
export function getBackend() { return lsGet(KEYS.backend) || ''; }
export function setBackend(url) { const o = normalizeBackendUrl(url); lsSet(KEYS.backend, o); resetConn(); return o; }
export function clearBackend() { lsDel(KEYS.backend); clearToken(); resetConn(); }
function resetConn() { Object.assign(conn, { configured: !!getBackend(), reachable: null, lastError: null, version: null, setupRequired: false }); emit('conn', conn); }
resetConn();

/* A public share link carries its own server address, used without saving it. */
let override = null;
export function useTemporaryBackend(url) { override = url ? normalizeBackendUrl(url) : null; }
const base = () => override || getBackend();

/* ---- token (session only: gone when the tab closes; never in localStorage) ---- */
export const getToken = () => ssGet(KEYS.token) || '';
export const setToken = (t) => ssSet(KEYS.token, t);
export function clearToken() { ssDel(KEYS.token); }

function headersFor(url, extra, auth) {
  const h = { Accept: 'application/json', ...(extra || {}) };
  try { if (NGROK_HOST_RE.test(new URL(url).hostname)) h[NGROK_HEADER.name] = NGROK_HEADER.value; } catch { /* ignore */ }
  const t = getToken();
  if (auth && t) h.Authorization = 'Bearer ' + t;
  return h;
}

function markDown(err) {
  conn.reachable = false; conn.lastError = err.message; conn.lastCheckAt = Date.now(); emit('conn', conn);
}
function markUp(ms) {
  const was = conn.reachable; conn.reachable = true; conn.lastOkAt = Date.now(); conn.lastCheckAt = conn.lastOkAt; conn.lastError = null; if (ms != null) conn.latencyMs = ms;
  if (was !== true) emit('conn', conn);
}

/**
 * request(method, path, {json, form, query, timeout, auth, signal, headers})
 * Resolves with `data` from {ok:true,data}. Throws ApiError otherwise.
 */
export async function request(method, path, opts = {}) {
  const b = base();
  if (!b) throw new ApiError('No server address is set yet.', { code: 'not_configured', network: true });
  const url = b + API_PREFIX + path + qs(opts.query);
  const ctl = new AbortController();
  const timeout = opts.timeout ?? REQUEST_TIMEOUT_MS;
  const timer = timeout ? setTimeout(() => ctl.abort('timeout'), timeout) : null;
  if (opts.signal) opts.signal.addEventListener('abort', () => ctl.abort(opts.signal.reason), { once: true });
  const init = { method, signal: ctl.signal, headers: headersFor(url, opts.headers, opts.auth !== false), cache: 'no-store', credentials: 'omit' };
  if (opts.json !== undefined) { init.body = JSON.stringify(opts.json); init.headers['Content-Type'] = 'application/json'; }
  const t0 = performance.now();
  let res;
  try {
    res = await fetch(url, init);
  } catch (e) {
    if (timer) clearTimeout(timer);
    if (ctl.signal.aborted && ctl.signal.reason !== 'timeout') throw new ApiError('Cancelled.', { code: 'aborted' });
    const err = ctl.signal.aborted
      ? new ApiError('The server took too long to answer. Is it still running?', { code: 'timeout', network: true })
      : new ApiError('Can’t reach the server. Check that it is running and that the address is current.', { code: 'network', network: true });
    markDown(err); throw err;
  }
  if (timer) clearTimeout(timer);
  const ms = Math.round(performance.now() - t0);
  let body = null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) { try { body = await res.json(); } catch { body = null; } }
  if (!body && res.status !== 204) {
    // reachable, but not a NEXORA reply (wrong URL, ngrok interstitial, expired tunnel)
    const err = new ApiError('That address answered, but not like a NEXORA server. If you use ngrok, check the address is the current one.', { status: res.status, code: 'not_nexora', network: true });
    markDown(err); throw err;
  }
  markUp(ms);
  if (res.ok && body && body.ok) return body.data;
  const e = (body && body.error) || {};
  const err = new ApiError(e.message || 'Request failed (' + res.status + ').', { status: res.status, code: e.code || 'error' });
  if (res.status === 401 && opts.auth !== false && !opts.keepSession) { clearToken(); emit('auth:expired', err); }
  throw err;
}
export const get = (p, o) => request('GET', p, o);
export const post = (p, json, o) => request('POST', p, { ...o, json: json ?? {} });
export const put = (p, json, o) => request('PUT', p, { ...o, json: json ?? {} });
export const del = (p, o) => request('DELETE', p, o);

/** Upload with real progress (fetch cannot report upload progress). Returns {promise, abort}. */
export function upload(form, onProgress) {
  const b = base();
  const xhr = new XMLHttpRequest();
  const promise = new Promise((resolve, reject) => {
    if (!b) return reject(new ApiError('No server address is set yet.', { code: 'not_configured', network: true }));
    const url = b + API_PREFIX + '/files/upload';
    xhr.open('POST', url);
    xhr.timeout = 0;
    const h = headersFor(url, {}, true);
    for (const [k, v] of Object.entries(h)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded, e.total); };
    xhr.onload = () => {
      let body = null; try { body = JSON.parse(xhr.responseText); } catch { /* ignore */ }
      if (xhr.status >= 200 && xhr.status < 300 && body && body.ok) { markUp(); return resolve(body.data); }
      const e = (body && body.error) || {};
      if (xhr.status === 401) { clearToken(); emit('auth:expired'); }
      reject(new ApiError(e.message || 'Upload failed (' + xhr.status + ').', { status: xhr.status, code: e.code || 'error' }));
    };
    xhr.onerror = () => { const err = new ApiError('The connection dropped during the upload. Nothing was saved; try again.', { code: 'network', network: true }); markDown(err); reject(err); };
    xhr.onabort = () => reject(new ApiError('Upload cancelled. The partial file was discarded by the server.', { code: 'aborted' }));
    xhr.send(form);
  });
  return { promise, abort: () => xhr.abort() };
}

/** Health check used by the Connect and Diagnostics screens. Never throws. */
export async function checkHealth() {
  if (!base()) { conn.reachable = null; conn.configured = false; emit('conn', conn); return { ok: false, reason: 'not_configured' }; }
  conn.configured = true;
  try {
    const d = await request('GET', '/health', { auth: false, timeout: HEALTH_TIMEOUT_MS });
    conn.version = d.version; conn.setupRequired = !!d.setup_required; conn.registrationOpen = !!d.registration_open;
    emit('conn', conn);
    return { ok: true, data: d };
  } catch (err) {
    return { ok: false, reason: err.code, message: err.message };
  }
}

/** Absolute URL for a path returned by the server (stream tickets, public files). */
export function absolute(pathFromServer) { return base() + pathFromServer; }
export function currentBackend() { return base(); }

/** Fetch a protected resource as a Blob, with the right headers (used for password-protected shares). */
export async function fetchBlob(path, headers = {}) {
  const b = base(); const url = b + API_PREFIX + path;
  let res; try { res = await fetch(url, { headers: headersFor(url, headers, false), credentials: 'omit', cache: 'no-store' }); }
  catch { throw new ApiError('Can’t reach the server.', { code: 'network', network: true }); }
  if (!res.ok) {
    let e = {}; try { e = (await res.json()).error || {}; } catch { /* ignore */ }
    throw new ApiError(e.message || 'Download failed.', { status: res.status, code: e.code || 'error' });
  }
  return res.blob();
}
