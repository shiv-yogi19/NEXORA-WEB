// NEXORA diagnostics and storage/scanner screens — Created By Shiv Yogi
import * as api from './api.js';
import { el, mount, fmtBytes, fmtDate, relTime } from './utils.js';
import { icon, toast, errorState, skeletonList, progressBar, emptyState } from './ui.js';
import * as auth from './auth.js';

const chip = (ok, yes, no) => el('span', { class: 'chip ' + (ok ? 'ok' : 'bad') }, ok ? yes : no);

export async function diagnosticsScreen(root) {
  const body = el('div', { class: 'stack' });
  let gone = false;
  async function load() {
    mount(body, skeletonList(4));
    const h = await api.checkHealth();
    if (gone) return;
    if (!h.ok) { mount(body, errorState(new api.ApiError(h.message || 'Server not reachable.', { code: h.reason, network: true }), load)); return; }
    try {
      const d = await api.get('/system/diagnostics');
      if (gone) return;
      const c = api.conn;
      mount(body,
        el('div', { class: 'grid cols-2' },
          el('div', { class: 'glass card stack' }, el('h2', {}, 'Connection'), el('dl', { class: 'kv' },
            el('dt', {}, 'Server'), el('dd', {}, d.app + ' ' + d.version + ' · Python ' + d.python), el('dt', {}, 'Address'), el('dd', { class: 'mono' }, api.getBackend()),
            el('dt', {}, 'Reachable'), el('dd', {}, chip(true, 'Yes · ' + c.latencyMs + ' ms', 'No')), el('dt', {}, 'Last success'), el('dd', {}, c.lastOkAt ? new Date(c.lastOkAt).toLocaleTimeString() : '—'),
            el('dt', {}, 'Signed in as'), el('dd', {}, auth.session.user.username + ' (owner)'))),
          el('div', { class: 'glass card stack' }, el('h2', {}, 'Database'), el('dl', { class: 'kv' },
            el('dt', {}, 'Integrity'), el('dd', {}, chip(d.database.ok, 'OK', 'Problem: ' + (d.database.detail || []).join('; '))), el('dt', {}, 'Schema'), el('dd', {}, 'v' + d.database.schema_version + ' of v' + d.database.latest_version),
            el('dt', {}, 'Accounts'), el('dd', {}, String(d.database.users)), el('dt', {}, 'Indexed files'), el('dd', {}, String(d.database.indexed_files)), el('dt', {}, 'Data folder'), el('dd', { class: 'mono' }, d.data_dir)))),
        d.config_problems.length ? el('div', { class: 'banner warn', role: 'alert' }, icon('alert'), el('div', {}, el('strong', {}, 'Configuration needs attention'), el('ul', { style: { margin: '6px 0 0', paddingLeft: '18px' } }, d.config_problems.map((p) => el('li', {}, p))))) : null,
        el('div', { class: 'glass card stack' }, el('h2', {}, 'Media folders'),
          d.roots.length ? el('div', { class: 'table-wrap' }, el('table', { class: 't' }, el('thead', {}, el('tr', {}, ['Name', 'Available', 'Readable', 'Writable', 'Free', 'Note'].map((x) => el('th', {}, x)))),
            el('tbody', {}, d.roots.map((r) => el('tr', {}, el('td', {}, r.name), el('td', {}, chip(r.available, 'Yes', 'No')), el('td', {}, chip(r.readable, 'Yes', 'No')), el('td', {}, chip(r.writable, 'Yes', 'No')), el('td', {}, r.free_bytes != null ? fmtBytes(r.free_bytes) : '—'), el('td', { class: 'tiny' }, r.error || '')))))) : el('p', { class: 'muted' }, 'No media folder configured. In Pydroid 3, run run.py and choose “Add a media folder”.')),
        el('div', { class: 'glass card stack' }, el('h2', {}, 'Features'), el('div', { class: 'row' },
          ...[['Streaming', d.features.library_streaming], ['Uploads', d.features.uploads], ['Sharing', d.features.shares], ['Authentication', d.features.authentication]].map(([n, v]) => el('span', { class: 'chip ' + (v ? 'ok' : 'bad') }, n + ': ' + (v ? 'working' : 'unavailable'))),
          el('span', { class: 'chip' }, 'Registration: ' + (d.features.registration_enabled ? 'open' : 'closed')), el('span', { class: 'chip' }, 'Scanner: ' + d.features.scanner)),
          el('p', { class: 'tiny' }, 'Allowed web origins: ' + d.features.cors_origins.join(', '))),
        el('div', { class: 'glass card stack' }, el('h2', {}, 'Recent events'), d.events.length ? el('div', { class: 'table-wrap' }, el('table', { class: 't' }, el('thead', {}, el('tr', {}, ['When', 'Level', 'Event'].map((x) => el('th', {}, x)))),
          el('tbody', {}, d.events.map((e) => el('tr', {}, el('td', {}, relTime(e.created_at)), el('td', {}, el('span', { class: 'chip ' + (e.level === 'error' ? 'bad' : e.level === 'warn' ? 'warn' : '') }, e.level)), el('td', {}, e.message)))))) : el('p', { class: 'muted' }, 'No events yet.'),
          el('p', { class: 'tiny' }, 'Events never contain passwords or tokens.')));
    } catch (e) { if (!gone) mount(body, errorState(e, load)); }
  }
  mount(root, el('div', { class: 'page' }, el('div', { class: 'page-head' }, el('h1', {}, 'Diagnostics'), el('button', { class: 'btn', type: 'button', onclick: load }, icon('refresh'), 'Run checks'), el('p', { class: 'sub' }, 'Checked once when you open this page. No background polling.')), body));
  load();
  return () => { gone = true; };
}

export async function storageScreen(root) {
  const body = el('div', { class: 'stack' });
  const scanBox = el('div', { class: 'glass card stack' });
  let gone = false, poll = null;
  const admin = auth.isAdmin();

  function drawScan(s, last) {
    const running = s.running;
    mount(scanBox, el('h2', {}, 'Library scanner'),
      el('p', { class: 'muted' }, 'Indexes what is on disk so it can be searched and played. Only your configured media folders are scanned, and nothing is ever deleted.'),
      running ? [el('p', { class: 'tiny', role: 'status' }, 'Scanning · ' + s.files_seen + ' files seen · ' + s.files_changed + ' new or changed' + (s.current ? ' · in ' + s.current : ''))] : null,
      !running && s.status !== 'idle' ? el('p', { class: 'tiny' }, 'Last scan ' + s.status + ': ' + s.files_seen + ' files, ' + s.files_changed + ' changed, ' + s.errors + ' problem(s).') : (!running && last ? el('p', { class: 'tiny' }, 'Last scan ' + relTime(last.started_at) + ' (' + last.status + ').') : null),
      s.error_samples && s.error_samples.length ? el('details', {}, el('summary', {}, s.errors + ' problem(s) while scanning'), el('ul', { class: 'tiny' }, s.error_samples.map((x) => el('li', {}, x)))) : null,
      admin ? el('div', { class: 'row' },
        el('button', { class: 'btn primary', type: 'button', disabled: running, onclick: start }, icon('scan'), running ? 'Scanning…' : 'Scan now'),
        running ? el('button', { class: 'btn', type: 'button', onclick: async () => { try { await api.post('/library/scan/cancel'); toast('Stopping after the current folder…', 'info'); } catch (e) { toast(e.message, 'error'); } } }, 'Stop') : null) : el('p', { class: 'tiny' }, 'Only the owner can start a scan.'));
  }
  async function refreshScan() {
    try {
      const d = await api.get('/library/scan'); if (gone) return;
      drawScan(d.scan, d.last_run);
      clearTimeout(poll);
      if (d.scan.running) poll = setTimeout(refreshScan, 1500);   // polls only while a scan is running
      else if (wasRunning) { wasRunning = false; load(); }
      wasRunning = d.scan.running;
    } catch (e) { if (!gone) mount(scanBox, errorState(e, refreshScan)); }
  }
  let wasRunning = false;
  async function start() { try { await api.post('/library/scan'); wasRunning = true; refreshScan(); } catch (e) { toast(e.message, 'error'); } }

  async function load() {
    try {
      const s = await api.get('/system/storage'); if (gone) return;
      if (!s.roots.length) { mount(body, emptyState('drive', 'No media folder configured', 'In Pydroid 3, run run.py and choose “Add a media folder”, then restart the server.')); return; }
      mount(body, el('div', { class: 'grid cols-2' }, s.roots.map((r) => {
        const used = r.total_bytes ? Math.round(((r.total_bytes - r.free_bytes) / r.total_bytes) * 100) : null;
        const kinds = Object.entries(r.by_kind || {});
        return el('div', { class: 'glass card stack' }, el('div', { class: 'row', style: { justifyContent: 'space-between' } }, el('h2', {}, r.name), chip(r.available && r.readable, r.writable ? 'Ready' : 'Read-only', 'Unavailable')),
          r.error ? el('p', { class: 'tiny', style: { color: 'var(--bad)' } }, r.error) : null,
          used != null ? [el('div', { class: 'meter' + (used > 90 ? ' hot' : ''), role: 'img', 'aria-label': used + '% of the phone storage is used' }, el('i', { style: { width: used + '%' } })), el('p', { class: 'tiny' }, fmtBytes(r.free_bytes) + ' free of ' + fmtBytes(r.total_bytes))] : null,
          el('dl', { class: 'kv' }, el('dt', {}, 'Indexed'), el('dd', {}, r.indexed_files + ' files · ' + fmtBytes(r.indexed_bytes)), kinds.map(([k, v]) => [el('dt', {}, k), el('dd', {}, v.count + ' · ' + fmtBytes(v.bytes))])),
          el('a', { class: 'btn small', href: '#/files?root=' + encodeURIComponent(r.name) }, icon('folder'), 'Browse'));
      })));
    } catch (e) { if (!gone) mount(body, errorState(e, load)); }
  }
  mount(root, el('div', { class: 'page' }, el('div', { class: 'page-head' }, el('h1', {}, 'Storage'), el('p', { class: 'sub' }, 'Where your media lives and how much space is left.')), body, scanBox));
  mount(body, skeletonList(2)); load(); refreshScan();
  return () => { gone = true; clearTimeout(poll); };
}
