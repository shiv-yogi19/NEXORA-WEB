// NEXORA UI primitives: icons, toasts, dialogs, menus, states — Created By Shiv Yogi
import { el, append, clear } from './utils.js';

const P = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>',
  library: '<rect x="3" y="4" width="7" height="7" rx="2"/><rect x="14" y="4" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20z"/>',
  bookmark: '<path d="M6.5 4h11v16.5L12 16.8 6.5 20.5z"/>',
  history: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5"/><path d="M3.5 4v4.5H8"/><path d="M12 8v4.5l3 1.8"/>',
  share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6"/>',
  drive: '<rect x="3" y="13" width="18" height="7" rx="2"/><path d="M5 13 7.5 5h9L19 13"/><circle cx="7.5" cy="16.5" r=".6"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6"/>',
  shield: '<path d="M12 3 5 6v5.5c0 4.3 3 7.6 7 9.5 4-1.9 7-5.2 7-9.5V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
  pulse: '<path d="M3 12h4l2.5-6 4 12 2.5-6H21"/>',
  game: '<rect x="3" y="7" width="18" height="11" rx="4"/><path d="M8 10.5v4M6 12.5h4"/><circle cx="15.5" cy="11.5" r=".8"/><circle cx="17.8" cy="13.5" r=".8"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.1"/>',
  plug: '<path d="M9 3v5M15 3v5"/><path d="M6.5 8h11v3.5a5.5 5.5 0 0 1-11 0z"/><path d="M12 17v4"/>',
  play: '<path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/>',
  pause: '<rect x="6.5" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="13.5" y="5" width="4" height="14" rx="1" fill="currentColor"/>',
  volume: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  mute: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>',
  fullscreen: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  download: '<path d="M12 4v11"/><path d="m7.5 11 4.5 4.5 4.5-4.5"/><path d="M4.5 19.5h15"/>',
  upload: '<path d="M12 16V5"/><path d="m7.5 9 4.5-4.5L16.5 9"/><path d="M4.5 19.5h15"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7"/><path d="M6.5 7l.8 12.5h9.4L17.5 7"/><path d="M10 11v5M14 11v5"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5"/>',
  move: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 13h6m-2.5-2.5L15 13l-2.5 2.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  alert: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17v.1"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="3"/><path d="m16 10.5 5-3v9l-5-3z"/>',
  music: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  image: '<rect x="3" y="4.5" width="18" height="15" rx="3"/><circle cx="8.5" cy="10" r="1.6"/><path d="m4 17 5-4.5 3.5 3L16 12l5 5"/>',
  file: '<path d="M6 3.5h8l4.5 4.5v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-15.5a1 1 0 0 1 1-1z"/><path d="M14 3.5V8h4.5"/>',
  grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
  list: '<path d="M8 6.5h12M8 12h12M8 17.5h12"/><circle cx="4.5" cy="6.5" r=".8"/><circle cx="4.5" cy="12" r=".8"/><circle cx="4.5" cy="17.5" r=".8"/>',
  chevR: '<path d="m9.5 5.5 6.5 6.5-6.5 6.5"/>',
  chevL: '<path d="m14.5 5.5-6.5 6.5 6.5 6.5"/>',
  more: '<circle cx="5.5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18.5" cy="12" r="1.3"/>',
  logout: '<path d="M10 4.5H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 19.5h4"/><path d="M15 8l4 4-4 4M19 12H9.5"/>',
  refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4h-4"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  offline: '<path d="M3 3l18 18"/><path d="M8.5 16.5a5 5 0 0 1 4.8-1.3M5 12.8a10 10 0 0 1 3.2-2M15.2 9.5A10 10 0 0 1 19 12.8M12 20h.01"/>',
  skipB: '<path d="M7 5v14" /><path d="M19 5.5v13L9 12z" fill="currentColor"/>',
  skipF: '<path d="M17 5v14"/><path d="M5 5.5v13L15 12z" fill="currentColor"/>',
  repeat: '<path d="M4 11V9a3 3 0 0 1 3-3h11l-2.5-2.5M20 13v2a3 3 0 0 1-3 3H6l2.5 2.5"/>',
  shuffle: '<path d="M3 7h3.5c5 0 6 10 11 10H21M3 17h3.5c1.8 0 3-1 4-2.4M13.5 9.4C14.5 8 15.700 7 17.500 7H21"/><path d="m18.500 4 2.500 3-2.500 3M18.500 14l2.500 3-2.500 3"/>',
  zoom: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.200-4.200M11 8v6M8 11h6"/>',
  rewind: '<path d="M11 6 4 12l7 6zM20 6l-7 6 7 6z"/>',
  forward: '<path d="m13 6 7 6-7 6zM4 6l7 6-7 6z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.400 1.400M18.400 5.600 17 7M7 17l-1.400 1.400"/>',
  scan: '<path d="M4 8V5.5A1.500 1.500 0 0 1 5.500 4H8M16 4h2.500A1.500 1.500 0 0 1 20 5.500V8M20 16v2.500a1.500 1.500 0 0 1-1.500 1.500H16M8 20H5.500A1.500 1.500 0 0 1 4 18.500V16M4 12h16"/>',
};

export function icon(name, cls = '') {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('class', ('ico ' + cls).trim());
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('focusable', 'false');
  s.innerHTML = P[name] || P.file;   // static constants only, never user data
  return s;
}
export const kindIcon = (k) => ({ video: 'video', audio: 'music', image: 'image', folder: 'folder' }[k] || 'file');

/* ---- toasts ---- */
let toastHost;
export function toast(message, kind = 'info', ms = 3600) {
  if (!toastHost) { toastHost = el('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' }); document.body.append(toastHost); }
  const t = el('div', { class: 'toast ' + kind }, icon(kind === 'ok' ? 'check' : kind === 'error' ? 'alert' : 'info'), el('span', { class: 'grow' }, message));
  toastHost.append(t);
  setTimeout(() => t.remove(), kind === 'error' ? Math.max(ms, 5500) : ms);
  while (toastHost.children.length > 4) toastHost.firstChild.remove();
}

/* ---- dialogs ---- */
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
function openModal(content, { sheet = false, label = 'Dialog', dismissible = true } = {}) {
  const prev = document.activeElement;
  const dlg = el('div', { class: 'dialog glass', role: 'dialog', 'aria-modal': 'true', 'aria-label': label }, content);
  const scrim = el('div', { class: 'scrim' + (sheet ? ' sheet' : '') }, dlg);
  document.body.append(scrim);
  document.body.style.overflow = 'hidden';
  let closed = false;
  const close = (result) => {
    if (closed) return; closed = true;
    document.removeEventListener('keydown', onKey, true);
    scrim.remove(); document.body.style.overflow = '';
    if (prev && prev.focus) { try { prev.focus(); } catch { /* ignore */ } }
    resolve(result);
  };
  let resolve; const promise = new Promise((r) => { resolve = r; });
  function onKey(e) {
    if (e.key === 'Escape' && dismissible) { e.stopPropagation(); close(null); }
    if (e.key === 'Tab') {
      const f = Array.from(dlg.querySelectorAll(FOCUSABLE)); if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  document.addEventListener('keydown', onKey, true);
  if (dismissible) scrim.addEventListener('pointerdown', (e) => { if (e.target === scrim) close(null); });
  setTimeout(() => { const f = dlg.querySelector('[data-autofocus]') || dlg.querySelector(FOCUSABLE); if (f) f.focus(); }, 30);
  return { close, promise, dlg };
}

export function confirmDialog({ title, message, confirmText = 'Confirm', danger = false, cancelText = 'Cancel', extra = null }) {
  let m;
  const body = [el('h2', {}, title), el('p', { class: 'muted' }, message)];
  if (extra) body.push(extra);
  body.push(el('div', { class: 'actions' },
    el('button', { class: 'btn', type: 'button', onclick: () => m.close(false) }, cancelText),
    el('button', { class: 'btn ' + (danger ? 'danger' : 'primary'), type: 'button', 'data-autofocus': '', onclick: () => m.close(true) }, confirmText)));
  m = openModal(body, { label: title });
  return m.promise.then((v) => v === true);
}

/** fields: [{name,label,type,value,hint,required,options,min,max,placeholder,autocomplete}] */
export function formDialog({ title, intro, fields, submitText = 'Save', onSubmit, sheet = false }) {
  let m;
  const errorEl = el('div', { class: 'field-error', role: 'alert' });
  const inputs = {};
  const rows = fields.map((f, i) => {
    const id = 'f-' + f.name + '-' + i;
    let input;
    if (f.type === 'select') {
      input = el('select', { class: 'input', id, name: f.name }, f.options.map((o) => el('option', { value: o.value, selected: String(o.value) === String(f.value) }, o.label)));
    } else if (f.type === 'checkbox') {
      input = el('input', { type: 'checkbox', id, name: f.name, checked: !!f.value });
    } else {
      input = el('input', { class: 'input', id, name: f.name, type: f.type || 'text', value: f.value ?? '', placeholder: f.placeholder || '', autocomplete: f.autocomplete || 'off', min: f.min, max: f.max, required: f.required ? true : false, 'data-autofocus': i === 0 ? '' : false, 'aria-describedby': f.hint ? id + '-hint' : false });
    }
    inputs[f.name] = input;
    if (f.type === 'checkbox') return el('label', { class: 'check', for: id }, input, f.label);
    return el('div', { class: 'field' }, el('label', { for: id }, f.label), input, f.hint ? el('div', { class: 'field-hint', id: id + '-hint' }, f.hint) : null);
  });
  const submit = el('button', { class: 'btn primary', type: 'submit' }, submitText);
  const form = el('form', { class: 'stack', novalidate: true },
    el('h2', {}, title), intro ? el('p', { class: 'muted' }, intro) : null, rows, errorEl,
    el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', onclick: () => m.close(null) }, 'Cancel'), submit));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';
    Object.values(inputs).forEach((i) => i.removeAttribute('aria-invalid'));
    const values = {};
    for (const f of fields) {
      const i = inputs[f.name];
      values[f.name] = f.type === 'checkbox' ? i.checked : i.value;
      if (f.required && f.type !== 'checkbox' && !String(values[f.name]).trim()) {
        i.setAttribute('aria-invalid', 'true'); errorEl.textContent = f.label + ' is required.'; i.focus(); return;
      }
    }
    submit.disabled = true;
    try {
      const r = await onSubmit(values);
      m.close(r === undefined ? true : r);
    } catch (err) {
      errorEl.textContent = err && err.message ? err.message : 'Something went wrong.';
      submit.disabled = false;
    }
  });
  m = openModal(form, { sheet, label: title });
  return m.promise;
}

export function infoDialog(title, ...kids) {
  let m;
  m = openModal([el('h2', {}, title), ...kids, el('div', { class: 'actions' }, el('button', { class: 'btn primary', type: 'button', 'data-autofocus': '', onclick: () => m.close(true) }, 'Done'))], { label: title });
  return m.promise;
}

/** Context menu: items [{label, icon, danger, onClick}] anchored to an element. */
export function openMenu(anchor, items) {
  document.querySelectorAll('.menu').forEach((m) => m.remove());
  const r = anchor.getBoundingClientRect();
  const menu = el('div', { class: 'menu glass', role: 'menu' }, items.filter(Boolean).map((it) =>
    el('button', { role: 'menuitem', class: it.danger ? 'danger' : '', type: 'button', onclick: () => { cleanup(); it.onClick(); } }, icon(it.icon || 'file'), it.label)));
  document.body.append(menu);
  const w = menu.offsetWidth, h = menu.offsetHeight;
  menu.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w)) + 'px';
  const below = r.bottom + 6 + h < window.innerHeight;
  menu.style.top = (below ? r.bottom + 6 : Math.max(8, r.top - h - 6)) + 'px';
  const off = (e) => { if (!menu.contains(e.target)) cleanup(); };
  const key = (e) => { if (e.key === 'Escape') { cleanup(); anchor.focus(); } };
  function cleanup() { menu.remove(); document.removeEventListener('pointerdown', off, true); document.removeEventListener('keydown', key, true); }
  setTimeout(() => { document.addEventListener('pointerdown', off, true); document.addEventListener('keydown', key, true); }, 0);
  const f = menu.querySelector('button'); if (f) f.focus();
}

/* ---- loading / empty / error states ---- */
export function skeletonGrid(n = 8) { return el('div', { class: 'media-grid', 'aria-busy': 'true', 'aria-label': 'Loading' }, Array.from({ length: n }, () => el('div', { class: 'skeleton card-sk' }))); }
export function skeletonList(n = 6) { return el('div', { class: 'stack', 'aria-busy': 'true', 'aria-label': 'Loading' }, Array.from({ length: n }, () => el('div', { class: 'skeleton line', style: { height: '52px' } }))); }
export function emptyState(iconName, title, text, action) {
  return el('div', { class: 'state' }, icon(iconName), el('h3', {}, title), text ? el('p', {}, text) : null, action || null);
}
export function errorState(err, retry) {
  const offline = err && (err.network || err.code === 'network' || err.code === 'timeout');
  const title = offline ? 'Can’t reach your server' : err && err.status === 403 ? 'Not allowed' : 'Something went wrong';
  const text = (err && err.message) || 'Please try again.';
  return el('div', { class: 'state error', role: 'alert' }, icon(offline ? 'offline' : 'alert'), el('h3', {}, title), el('p', {}, text),
    el('div', { class: 'row' }, retry ? el('button', { class: 'btn', type: 'button', onclick: retry }, icon('refresh'), 'Try again') : null,
      offline ? el('a', { class: 'btn', href: '#/connect' }, icon('plug'), 'Check connection') : null));
}
export function progressBar(value) { return el('div', { class: 'meter', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(value)) }, el('i', { style: { width: Math.max(0, Math.min(100, value)) + '%' } })); }
export { clear, append };
