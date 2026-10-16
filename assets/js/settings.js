// NEXORA settings, security, connection and about screens — Created By Shiv Yogi
import * as api from './api.js';
import { APP_NAME, APP_VERSION, CREATOR, KEYS, PROJECT_URL } from './config.js';
import { el, mount, fmtBytes, fmtDate, relTime, lsGet, lsSet, lsDel } from './utils.js';
import { icon, toast, confirmDialog, formDialog, infoDialog, emptyState, errorState, skeletonList } from './ui.js';
import * as auth from './auth.js';
import { navigate } from './router.js';

/* ---- local (non-sensitive) display preferences, applied before sign-in too ---- */
export function applyPrefs(p) {
  const r = document.documentElement;
  r.dataset.theme = p.theme || 'aurora';
  r.dataset.motion = p.motion === 'reduced' ? 'reduced' : (p.motion === 'full' ? 'full' : 'system');
  if (p.reduce_transparency) r.dataset.flat = '1'; else delete r.dataset.flat;
  const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = p.theme === 'daylight' ? '#eaf0fb' : '#070b18';
}
export function loadLocalPrefs() { try { return JSON.parse(lsGet(KEYS.prefs, '{}')) || {}; } catch { return {}; } }
function saveLocalPrefs(p) { lsSet(KEYS.prefs, JSON.stringify({ theme: p.theme, motion: p.motion, reduce_transparency: !!p.reduce_transparency })); }
export async function syncPrefsFromServer() {
  try { const p = await api.get('/preferences'); auth.session.prefs = p; saveLocalPrefs(p); applyPrefs(p); return p; } catch { return null; }
}

/* ============================== CONNECT ============================== */
const ladderRow = (state, title, detail) => el('li', { class: 'row', style: { flexWrap: 'nowrap', alignItems: 'flex-start' } },
  el('span', { class: 'dot ' + state, style: { marginTop: '7px' }, 'aria-hidden': 'true' }), el('div', { class: 'grow' }, el('div', { style: { fontWeight: '560' } }, title, el('span', { class: 'sr-only' }, ' — ' + (state === 'ok' ? 'working' : state === 'bad' ? 'problem' : 'not checked'))), detail ? el('div', { class: 'tiny' }, detail) : null));

export async function connectScreen(root) {
  const ladder = el('ul', { class: 'stack', style: { listStyle: 'none', padding: 0, margin: 0 } });
  const input = el('input', { class: 'input', id: 'backend', type: 'url', inputmode: 'url', placeholder: 'https://your-address.ngrok-free.app', value: api.getBackend(), autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false', 'aria-describedby': 'backend-err' });
  const err = el('div', { class: 'field-error', id: 'backend-err', role: 'alert' });
  const last = el('div', { class: 'tiny' });
  let gone = false;

  async function test(showToast) {
    mount(ladder, ladderRow('warn', 'Checking…'));
    const h = await api.checkHealth();
    if (gone) return;
    const c = api.conn, rows = [];
    rows.push(ladderRow('ok', 'Web app loaded', 'You are using NEXORA ' + APP_VERSION + ' from ' + location.host + '.'));
    rows.push(ladderRow(c.configured ? 'ok' : 'bad', 'Server address saved', c.configured ? api.getBackend() : 'No address saved yet. Paste the https address from ngrok below.'));
    if (!c.configured) { rows.push(ladderRow('warn', 'Server reachable', 'Not checked: no address.')); }
    else if (h.ok) rows.push(ladderRow('ok', 'Server reachable', 'NEXORA server ' + c.version + ' answered in ' + c.latencyMs + ' ms.' + (c.setupRequired ? ' It still needs its owner account (setup).' : '')));
    else rows.push(ladderRow('bad', 'Server not reachable', h.message + (h.reason === 'network' || h.reason === 'not_nexora' || h.reason === 'timeout' ? ' If you restarted ngrok, the address changed: copy the new one from ngrok and save it here.' : '')));
    const signed = !!auth.session.user;
    rows.push(ladderRow(signed ? 'ok' : (h.ok ? 'warn' : 'warn'), 'Signed in', signed ? 'You are signed in as ' + auth.session.user.username + '.' : 'Not signed in.'));
    let storageRow = ladderRow('warn', 'Media storage available', 'Checked after you sign in.');
    if (h.ok && signed) {
      try {
        const s = await api.get('/system/storage');
        const okRoots = s.roots.filter((r) => r.available && r.readable);
        storageRow = ladderRow(okRoots.length ? 'ok' : 'bad', 'Media storage available', okRoots.length ? okRoots.length + ' of ' + s.roots.length + ' media folder(s) readable' + (s.roots.some((r) => r.writable) ? ', writable.' : ', read-only.') : 'No media folder is readable. Check the folder path and Android storage permission.');
      } catch (e) { storageRow = ladderRow('bad', 'Media storage available', e.message); }
    }
    rows.push(storageRow);
    mount(ladder, rows);
    last.textContent = c.lastCheckAt ? 'Last check: ' + new Date(c.lastCheckAt).toLocaleTimeString() + (c.lastOkAt ? ' · last success: ' + new Date(c.lastOkAt).toLocaleTimeString() : ' · no successful check yet') : '';
    if (showToast) toast(h.ok ? 'Server reachable.' : 'Server not reachable.', h.ok ? 'ok' : 'error');
    return h;
  }

  async function save() {
    err.textContent = ''; input.removeAttribute('aria-invalid');
    try {
      const before = api.getBackend();
      const url = api.setBackend(input.value);
      if (before && before !== url) { auth.dropSession(); }
      input.value = url; toast('Address saved.', 'ok');
      const h = await test(false);
      if (h && h.ok) { const u = await auth.restore().catch(() => null); if (u) await test(false); setTimeout(() => navigate('/'), 600); }
    } catch (e) { err.textContent = e.message; input.setAttribute('aria-invalid', 'true'); input.focus(); }
  }
  async function clearUrl() {
    if (!(await confirmDialog({ title: 'Clear the server address?', message: 'You will be signed out on this device. Nothing on the server changes.', confirmText: 'Clear address' }))) return;
    api.clearBackend(); auth.dropSession(); input.value = ''; toast('Address cleared.', 'info'); test(false);
  }
  async function resetAll() {
    if (!(await confirmDialog({ title: 'Reset connection settings?', message: 'Clears the saved address, signs you out and forgets display preferences on this device. Server data is untouched.', confirmText: 'Reset', danger: true }))) return;
    api.clearBackend(); auth.dropSession(); lsDel(KEYS.prefs); lsDel(KEYS.view); applyPrefs({}); input.value = ''; toast('Connection settings reset.', 'ok'); test(false);
  }

  mount(root, el('div', { class: 'page' },
    el('div', { class: 'page-head' }, el('h1', {}, 'Server connection'), el('p', { class: 'sub' }, 'This web app is only the front. Your files and account live on your phone, reached through a tunnel address.')),
    el('div', { class: 'split' },
      el('div', { class: 'stack' },
        el('div', { class: 'glass card stack' }, el('h2', {}, 'Server address'),
          el('div', { class: 'field' }, el('label', { for: 'backend' }, 'HTTPS address from ngrok'), input, err, el('div', { class: 'field-hint' }, 'Only the address is stored on this device. Passwords and sign-in tokens never are.')),
          el('div', { class: 'row' }, el('button', { class: 'btn primary', type: 'button', onclick: save }, 'Save and test'), el('button', { class: 'btn', type: 'button', onclick: () => test(true) }, icon('refresh'), 'Test connection'),
            el('button', { class: 'btn danger', type: 'button', onclick: clearUrl }, 'Clear address'))),
        el('div', { class: 'glass card stack' }, el('h2', {}, 'Status'), ladder, last)),
      el('div', { class: 'stack' },
        el('div', { class: 'glass card stack' }, el('h2', {}, 'How to connect'),
          el('ol', { class: 'stack', style: { paddingLeft: '20px', margin: 0, gap: '6px' } },
            el('li', {}, 'In Pydroid 3, run run.py and choose “Start server”.'), el('li', {}, 'In ngrok, run: ngrok http 8765'), el('li', {}, 'Copy the https:// address ngrok prints and paste it here.'), el('li', {}, 'Choose Save and test, then sign in.')),
          el('p', { class: 'tiny' }, 'Free ngrok addresses change every time the tunnel restarts. When this page says the server is not reachable, copy the new address.')),
        el('div', { class: 'glass card stack' }, el('h2', {}, 'Reset'), el('p', { class: 'muted' }, 'Forget the address, sign out and clear display preferences on this device.'), el('div', {}, el('button', { class: 'btn', type: 'button', onclick: resetAll }, 'Reset connection settings')))))));
  test(false);
  const onConn = () => { /* status ladder refreshes on explicit test only: no polling */ };
  return () => { gone = true; void onConn; };
}

/* ============================== SETTINGS ============================== */
function seg(options, value, onPick) {
  const wrap = el('div', { class: 'seg', role: 'group' }, options.map(([v, l]) => el('button', { type: 'button', 'aria-pressed': String(v === value), dataset: { v }, onclick: () => { wrap.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === v))); onPick(v); } }, l)));
  return wrap;
}
const setting = (label, hint, control) => el('div', { class: 'row', style: { justifyContent: 'space-between', flexWrap: 'wrap', padding: '6px 0' } }, el('div', { style: { flex: '1 1 220px' } }, el('div', {}, label), hint ? el('div', { class: 'tiny' }, hint) : null), control);

export async function settingsScreen(root) {
  mount(root, el('div', { class: 'page' }, skeletonList(5)));
  let prefs, sys = null;
  try { prefs = await api.get('/preferences'); } catch (e) { mount(root, el('div', { class: 'page' }, errorState(e, () => settingsScreen(root)))); return; }
  const admin = auth.isAdmin();
  if (admin) { try { sys = await api.get('/system/settings'); } catch { sys = null; } }
  const savePref = async (patch) => {
    try { prefs = await api.put('/preferences', patch); auth.session.prefs = prefs; saveLocalPrefs(prefs); applyPrefs(prefs); toast('Saved.', 'ok', 1500); } catch (e) { toast(e.message, 'error'); }
  };
  const toggle = (key, label, hint) => {
    const cb = el('input', { type: 'checkbox', checked: !!prefs[key], style: { width: '22px', height: '22px', accentColor: 'var(--accent)' }, 'aria-label': label, onchange: () => savePref({ [key]: cb.checked }) });
    return setting(label, hint, cb);
  };
  const speed = el('select', { class: 'input', style: { width: 'auto' }, 'aria-label': 'Default playback speed', onchange: () => savePref({ default_speed: Number(speed.value) }) }, [0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => el('option', { value: s, selected: s === prefs.default_speed }, s + '×')));
  const vol = el('input', { class: 'seek', type: 'range', min: '0', max: '1', step: '0.05', value: String(prefs.default_volume), style: { width: '140px' }, 'aria-label': 'Default volume', onchange: () => savePref({ default_volume: Number(vol.value) }) });
  const view = lsGet(KEYS.view, 'grid');

  const sections = [
    el('div', { class: 'glass card stack' }, el('h2', {}, 'Appearance'),
      setting('Theme', null, seg([['aurora', 'Aurora'], ['midnight', 'Midnight'], ['daylight', 'Daylight']], prefs.theme, (v) => savePref({ theme: v }))),
      setting('Motion', 'System follows your device’s reduce-motion setting.', seg([['system', 'System'], ['reduced', 'Reduced'], ['full', 'Full']], prefs.motion, (v) => savePref({ motion: v }))),
      toggle('reduce_transparency', 'Reduce transparency', 'Turns off background blur. Helps on older phones.')),
    el('div', { class: 'glass card stack' }, el('h2', {}, 'Playback and library'),
      setting('Default library view', null, seg([['grid', 'Grid'], ['list', 'List']], view, (v) => { lsSet(KEYS.view, v); toast('Saved.', 'ok', 1500); })),
      toggle('autoplay', 'Autoplay when opened'), toggle('resume_playback', 'Resume where I left off'), setting('Default speed', null, speed), setting('Default volume', null, vol)),
    el('div', { class: 'glass card stack' }, el('h2', {}, 'Privacy'),
      toggle('record_history', 'Remember what I watch', 'When off, new items are not added to History.'),
      el('div', { class: 'row' },
        el('button', { class: 'btn', type: 'button', onclick: async () => { if (await confirmDialog({ title: 'Clear viewing history?', message: 'Removes your list of recently viewed items. Favorites and watchlist stay.', confirmText: 'Clear history' })) { try { await api.del('/history'); toast('History cleared.', 'ok'); } catch (e) { toast(e.message, 'error'); } } } }, 'Clear history'),
        el('button', { class: 'btn', type: 'button', onclick: async () => { if (await confirmDialog({ title: 'Clear resume positions too?', message: 'Removes saved playback positions and viewing history, so “Continue watching” empties.', confirmText: 'Clear both', danger: true })) { try { await api.del('/history', { query: { include_progress: '1' } }); toast('History and positions cleared.', 'ok'); } catch (e) { toast(e.message, 'error'); } } } }, 'Clear history and positions'),
        el('button', { class: 'btn', type: 'button', onclick: async () => { try { await api.del('/activity'); toast('Activity cleared.', 'ok'); } catch (e) { toast(e.message, 'error'); } } }, 'Clear activity'))),
  ];
  if (admin && sys) {
    const num = (key, label, hint, min, max) => {
      const i = el('input', { class: 'input', type: 'number', min, max, value: sys[key], style: { width: '120px' }, 'aria-label': label });
      i.onchange = async () => { try { sys = await api.put('/system/settings', { [key]: Number(i.value) }); i.value = sys[key]; toast('Saved.', 'ok', 1500); } catch (e) { toast(e.message, 'error'); i.value = sys[key]; } };
      return setting(label, hint, i);
    };
    sections.push(el('div', { class: 'glass card stack' }, el('h2', {}, 'Server limits'),
      num('max_upload_mb', 'Largest upload (MB)', 'Bigger files are refused and nothing is kept.', 1, 102400),
      num('history_limit', 'History entries kept', null, 10, 5000),
      num('session_hours', 'Stay signed in when idle (hours)', 'Applies to new sign-ins.', 1, 168)));
    sections.push(backupCard());
  }
  sections.push(el('div', { class: 'glass card stack' }, el('h2', {}, 'More'), el('div', { class: 'row' },
    el('a', { class: 'btn', href: '#/connect' }, icon('plug'), 'Server connection'), el('a', { class: 'btn', href: '#/security' }, icon('shield'), 'Account security'), el('a', { class: 'btn', href: '#/about' }, icon('info'), 'About'))));
  mount(root, el('div', { class: 'page' }, el('div', { class: 'page-head' }, el('h1', {}, 'Settings')), el('div', { class: 'grid cols-2' }, sections)));
}

function backupCard() {
  const list = el('div', { class: 'stack' });
  async function load() { try { const b = await api.get('/system/backups'); mount(list, b.length ? el('ul', { class: 'stack tiny', style: { listStyle: 'none', padding: 0, margin: 0 } }, b.slice(0, 5).map((x) => el('li', {}, x.name + ' · ' + fmtBytes(x.size) + ' · ' + relTime(x.created_at)))) : el('p', { class: 'tiny' }, 'No backups yet.')); } catch { mount(list); } }
  load();
  return el('div', { class: 'glass card stack' }, el('h2', {}, 'Backup'),
    el('p', { class: 'muted' }, 'Copies the account and library database (not your media files) into the NEXORA data folder on the phone.'),
    el('div', { class: 'row' }, el('button', { class: 'btn primary', type: 'button', onclick: async () => { try { const d = await api.post('/system/backup'); toast('Backup saved: ' + d.name, 'ok'); load(); } catch (e) { toast(e.message, 'error'); } } }, 'Back up now'),
      el('button', { class: 'btn', type: 'button', onclick: () => infoDialog('Restore a backup', el('ol', { class: 'stack', style: { paddingLeft: '20px', gap: '6px' } }, el('li', {}, 'Stop the server in Pydroid 3.'), el('li', {}, 'Run run.py and choose “Restore the database from a backup”.'), el('li', {}, 'Enter the backup file path (see the backups folder inside the NEXORA data folder) and type RESTORE.')), el('p', { class: 'tiny' }, 'Restoring needs the server stopped, so it cannot be done from this page. A safety copy of the current database is kept automatically.')) }, 'How to restore')), list);
}

/* ============================== SECURITY ============================== */
export async function securityScreen(root) {
  const sessionsBox = el('div', { class: 'stack' });
  async function loadSessions() {
    mount(sessionsBox, skeletonList(2));
    try {
      const rows = await api.get('/auth/sessions');
      mount(sessionsBox, rows.map((s) => el('div', { class: 'list-row' }, el('span', { class: 'thumb-s' }, icon('shield')),
        el('div', { class: 'info' }, el('span', { class: 'name truncate' }, (s.current ? 'This device' : 'Another device') + (s.user_agent ? ' · ' + s.user_agent.slice(0, 60) : '')), el('span', { class: 'tiny' }, 'Signed in ' + relTime(s.created_at) + ' · last active ' + relTime(s.last_seen_at))),
        s.current ? el('span', { class: 'chip ok' }, 'Current') : el('button', { class: 'btn small danger', type: 'button', onclick: async () => { try { await api.del('/auth/sessions/' + s.id); toast('Device signed out.', 'ok'); loadSessions(); } catch (e) { toast(e.message, 'error'); } } }, 'Sign out'))));
    } catch (e) { mount(sessionsBox, errorState(e, loadSessions)); }
  }
  const user = auth.session.user;
  mount(root, el('div', { class: 'page' }, el('div', { class: 'page-head' }, el('h1', {}, 'Account security')),
    el('div', { class: 'grid cols-2' },
      el('div', { class: 'glass card stack' }, el('h2', {}, 'Account'),
        el('dl', { class: 'kv' }, el('dt', {}, 'Username'), el('dd', {}, user.username), el('dt', {}, 'Role'), el('dd', {}, user.is_admin ? 'Owner' : 'Member'), el('dt', {}, 'Last sign-in'), el('dd', {}, fmtDate(user.last_login_at))),
        el('div', { class: 'row' },
          el('button', { class: 'btn primary', type: 'button', onclick: () => formDialog({ title: 'Change password', submitText: 'Change password', intro: 'Your other devices will be signed out.',
            fields: [{ name: 'current', label: 'Current password', type: 'password', autocomplete: 'current-password', required: true }, { name: 'next', label: 'New password', type: 'password', autocomplete: 'new-password', required: true, hint: 'At least 10 characters.' }, { name: 'again', label: 'Repeat new password', type: 'password', autocomplete: 'new-password', required: true }],
            onSubmit: async (v) => { if (v.next !== v.again) throw new Error('The new passwords do not match.'); await api.post('/auth/change-password', { current_password: v.current, new_password: v.next }); toast('Password changed.', 'ok'); loadSessions(); } }) }, icon('lock'), 'Change password'),
          el('button', { class: 'btn', type: 'button', onclick: async () => { await auth.logout(); navigate('/', { replace: true }); } }, icon('logout'), 'Sign out'))),
      el('div', { class: 'glass card stack' }, el('h2', {}, 'Devices signed in'), sessionsBox),
      el('div', { class: 'glass card stack' }, el('h2', {}, 'If you forget the password'),
        el('p', { class: 'muted' }, 'There is no public reset, on purpose. On the phone, run run.py in Pydroid 3 and choose “Reset a password”. Only someone with the phone can do that.')))));
  loadSessions();
}

/* ============================== ABOUT ============================== */
export function aboutScreen(root) {
  mount(root, el('div', { class: 'page' }, el('div', { class: 'page-head' }, el('h1', {}, 'About')),
    el('div', { class: 'glass card stack', style: { alignItems: 'flex-start' } }, el('div', { class: 'row' }, auth.brandMark(), el('div', {}, el('h2', {}, APP_NAME), el('div', { class: 'muted' }, 'Your personal media universe'))),
      el('dl', { class: 'kv' }, el('dt', {}, 'Version'), el('dd', {}, APP_VERSION), el('dt', {}, 'Created by'), el('dd', {}, CREATOR), el('dt', {}, 'Web app'), el('dd', {}, PROJECT_URL),
        el('dt', {}, 'Server'), el('dd', {}, api.conn.version ? 'NEXORA ' + api.conn.version : 'Not checked'), el('dt', {}, 'Server address'), el('dd', { class: 'mono' }, api.getBackend() || 'Not set')),
      el('p', { class: 'muted' }, 'NEXORA keeps your media on your own phone. This site is only the interface: it holds no files and no passwords.'),
      el('div', { class: 'row' }, el('a', { class: 'btn', href: '#/game' }, icon('game'), 'Offline game'), el('a', { class: 'btn', href: '#/diagnostics' }, icon('pulse'), 'Diagnostics')),
      el('p', { class: 'tiny' }, 'Created By Shiv Yogi'))));
}
