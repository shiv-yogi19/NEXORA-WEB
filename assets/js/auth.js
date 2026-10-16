// NEXORA authentication state and screens — Created By Shiv Yogi
import * as api from './api.js';
import { el, mount } from './utils.js';
import { icon, toast, formDialog } from './ui.js';
import { navigate } from './router.js';

export const session = { user: null, prefs: null, checked: false };
const listeners = new Set();
export const onSession = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const notify = () => listeners.forEach((f) => f(session));

export const isAdmin = () => !!(session.user && session.user.is_admin);

/** Validate a stored session token with the server. Safe to call repeatedly. */
export async function restore() {
  session.checked = false;
  if (!api.getToken()) { session.user = null; session.checked = true; notify(); return null; }
  try {
    const d = await api.get('/auth/session', { keepSession: true });
    session.user = d.user;
  } catch (e) {
    if (e.status === 401) api.clearToken();
    if (!e.network) session.user = null;
    if (e.network) { session.checked = true; notify(); throw e; }
  }
  session.checked = true; notify();
  return session.user;
}

async function finishLogin(d) {
  api.setToken(d.token); session.user = d.user; session.checked = true; notify();
}
export async function login(username, password) { await finishLogin(await api.post('/auth/login', { username, password }, { auth: false })); }
export async function setup(username, password, setup_code) { await finishLogin(await api.post('/auth/setup', { username, password, setup_code }, { auth: false })); }
export async function register(username, password) { await finishLogin(await api.post('/auth/register', { username, password }, { auth: false })); }
export async function logout() {
  try { await api.post('/auth/logout', {}, { keepSession: true }); } catch { /* the token is dropped locally regardless */ }
  api.clearToken(); session.user = null; session.prefs = null; notify();
}
export function dropSession() { api.clearToken(); session.user = null; notify(); }

const brandMark = () => {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 40 40'); s.setAttribute('class', 'brand-mark'); s.setAttribute('aria-hidden', 'true');
  s.innerHTML = '<defs><linearGradient id="bm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6fb7ff"/><stop offset="1" stop-color="#8d7bff"/></linearGradient></defs><rect x="2" y="2" width="36" height="36" rx="11" fill="url(#bm)" opacity=".25" stroke="url(#bm)" stroke-width="1.5"/><path d="M12 29V11l16 18V11" fill="none" stroke="#ffb36b" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>';
  return s;
};
export { brandMark };

function passwordField(id, label, autocomplete) {
  const input = el('input', { class: 'input', id, name: id, type: 'password', autocomplete, required: true, minlength: '10' });
  const toggle = el('button', { class: 'btn small ghost', type: 'button', 'aria-label': 'Show password', 'aria-pressed': 'false', onclick: () => {
    const show = input.type === 'password'; input.type = show ? 'text' : 'password'; toggle.setAttribute('aria-pressed', String(show)); toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  } }, 'Show');
  return { input, node: el('div', { class: 'field' }, el('label', { for: id }, label), el('div', { class: 'row', style: { flexWrap: 'nowrap' } }, el('div', { class: 'grow' }, input), toggle)) };
}

/** Sign-in or first-time setup, depending on what the server says. */
export function renderAuth(root, { mode }) {
  const isSetup = mode === 'setup';
  const err = el('div', { class: 'field-error', role: 'alert', 'aria-live': 'assertive' });
  const user = el('input', { class: 'input', id: 'username', name: 'username', autocomplete: 'username', required: true, autocapitalize: 'none', spellcheck: 'false', 'data-autofocus': '' });
  const pw = passwordField('password', isSetup ? 'Choose a password' : 'Password', isSetup ? 'new-password' : 'current-password');
  const code = isSetup ? el('input', { class: 'input mono', id: 'setup_code', name: 'setup_code', autocomplete: 'off', required: true, placeholder: 'XXXX-XXXX-XXXX', autocapitalize: 'characters', spellcheck: 'false' }) : null;
  const btn = el('button', { class: 'btn primary', type: 'submit', style: { minHeight: '46px' } }, isSetup ? 'Create owner account' : 'Sign in');
  const form = el('form', { class: 'stack', novalidate: true,
    onsubmit: async (e) => {
      e.preventDefault(); err.textContent = '';
      if (!user.value.trim() || !pw.input.value || (code && !code.value.trim())) { err.textContent = 'Fill in every field.'; return; }
      if (isSetup && pw.input.value.length < 10) { err.textContent = 'Use at least 10 characters for the password.'; pw.input.focus(); return; }
      btn.disabled = true; btn.textContent = isSetup ? 'Creating…' : 'Signing in…';
      try {
        if (isSetup) await setup(user.value.trim(), pw.input.value, code.value.trim()); else await login(user.value.trim(), pw.input.value);
        pw.input.value = '';
        toast(isSetup ? 'Owner account created.' : 'Welcome back.', 'ok');
        navigate('/', { replace: true });
      } catch (ex) {
        err.textContent = ex.message; btn.disabled = false; btn.textContent = isSetup ? 'Create owner account' : 'Sign in';
        if (ex.network) err.append(' ', el('a', { href: '#/connect' }, 'Check connection'));
      }
    } },
    el('div', { class: 'field' }, el('label', { for: 'username' }, isSetup ? 'Owner username' : 'Username'), user),
    pw.node,
    isSetup ? el('div', { class: 'field' }, el('label', { for: 'setup_code' }, 'Setup code'), code,
      el('div', { class: 'field-hint' }, 'Shown in the Pydroid console when the server starts, and saved in SETUP_CODE.txt inside the NEXORA data folder. It proves you own this server.')) : null,
    err, btn);
  mount(root, el('div', { class: 'auth-wrap' }, el('main', { class: 'auth-card glass', id: 'main' },
    el('div', { class: 'brand' }, brandMark(), el('div', {}, el('div', { class: 'brand-name' }, 'NEXORA'), el('div', { class: 'brand-sub' }, 'Your personal media universe'))),
    el('h1', { style: { textAlign: 'center', fontSize: 'var(--fs-lg)' } }, isSetup ? 'Set up your server' : 'Sign in'),
    isSetup ? el('p', { class: 'muted', style: { textAlign: 'center' } }, 'This server has no owner yet. Create the account that will manage every file.') : null,
    form,
    el('div', { class: 'row', style: { justifyContent: 'space-between' } },
      el('a', { href: '#/connect', class: 'tiny' }, 'Server connection'), el('a', { href: '#/game', class: 'tiny' }, 'Play the offline game')),
    el('p', { class: 'tiny', style: { textAlign: 'center' } }, 'Created By Shiv Yogi'))));
}
