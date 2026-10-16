// NEXORA temporary sharing — Created By Shiv Yogi
import * as api from './api.js';
import { API_PREFIX } from './config.js';
import { el, mount, fmtBytes, fmtDate, relTime, copyText } from './utils.js';
import { icon, toast, formDialog, infoDialog, confirmDialog, emptyState, errorState, skeletonList } from './ui.js';
import { brandMark } from './auth.js';

const EXPIRY = [['1', '1 hour'], ['24', '24 hours'], ['168', '7 days'], ['720', '30 days'], ['', 'Never expires']];

export function shareLink(token) {
  const page = location.origin + location.pathname;
  return page + '#/s/' + token + '?b=' + encodeURIComponent(api.currentBackend());
}

export async function createShareDialog(item) {
  const made = await formDialog({
    title: 'Share “' + item.name + '”', submitText: 'Create link',
    intro: 'Anyone with the link can download this one file until it expires or you revoke it. The server must be running for the link to work.',
    fields: [
      { name: 'expires', label: 'Expires after', type: 'select', value: '24', options: EXPIRY.map(([value, label]) => ({ value, label })) },
      { name: 'max', label: 'Download limit (optional)', type: 'number', min: '1', hint: 'Leave empty for no limit.' },
      { name: 'password', label: 'Password (optional)', type: 'password', autocomplete: 'new-password', hint: 'The recipient must enter it before downloading.' },
      { name: 'label', label: 'Note for yourself (optional)', placeholder: 'e.g. Sent to Asha' }],
    onSubmit: async (v) => {
      const body = { media_id: item.id, label: v.label.trim() };
      if (v.expires) body.expires_hours = Number(v.expires);
      if (v.max) body.max_downloads = Number(v.max);
      if (v.password) body.password = v.password;
      return api.post('/shares', body);
    } });
  if (!made || made === true) return;
  const link = shareLink(made.token);
  const field = el('input', { class: 'input mono', readonly: true, value: link, 'aria-label': 'Share link', onfocus: (e) => e.target.select() });
  const copy = async () => { toast((await copyText(link)) ? 'Link copied.' : 'Copy failed. Select the link and copy it manually.', 'ok'); };
  const canShare = navigator.share && window.isSecureContext;
  await infoDialog('Link ready',
    el('p', { class: 'muted' }, 'Copy it now. For safety the server keeps only a fingerprint of the link, so it cannot be shown again.'),
    el('div', { class: 'stack' }, field, el('div', { class: 'row' },
      el('button', { class: 'btn primary', type: 'button', onclick: copy }, icon('copy'), 'Copy link'),
      canShare ? el('button', { class: 'btn', type: 'button', onclick: () => navigator.share({ title: item.name, url: link }).catch(() => {}) }, icon('share'), 'Send…') : null)),
    made.share.has_password ? el('p', { class: 'tiny' }, 'Tell the recipient the password separately.') : null);
}

const STATUS = { active: ['ok', 'Active'], expired: ['warn', 'Expired'], exhausted: ['warn', 'Limit reached'], revoked: ['bad', 'Revoked'] };

export async function sharesScreen(root) {
  const list = el('div', { class: 'stack' });
  let gone = false;
  async function load() {
    mount(list, skeletonList(4));
    try {
      const rows = await api.get('/shares');
      if (gone) return;
      if (!rows.length) { mount(list, emptyState('share', 'No share links yet', 'Open any file’s “⋯” menu and choose Share to create a temporary link.', el('a', { class: 'btn', href: '#/library' }, 'Browse library'))); return; }
      mount(list, rows.map(card));
    } catch (e) { if (!gone) mount(list, errorState(e, load)); }
  }
  function card(s) {
    const [tone, label] = STATUS[s.status] || ['', s.status];
    return el('div', { class: 'glass card stack', style: { gap: '8px' } },
      el('div', { class: 'row', style: { flexWrap: 'nowrap' } }, icon('link'), el('div', { class: 'grow' }, el('div', { class: 'truncate', style: { fontWeight: '600' } }, s.name), s.label ? el('div', { class: 'tiny truncate' }, s.label) : null), el('span', { class: 'chip ' + tone }, label)),
      el('div', { class: 'row tiny' },
        el('span', {}, 'Created ' + relTime(s.created_at)), el('span', {}, s.expires_at ? (s.status === 'expired' ? 'Expired ' : 'Expires ') + fmtDate(s.expires_at) : 'No expiry'),
        el('span', {}, s.download_count + (s.max_downloads ? ' of ' + s.max_downloads : '') + ' downloads'), el('span', {}, s.accesses + ' visits'),
        s.has_password ? el('span', { class: 'chip' }, icon('lock'), 'Password') : null, s.file_missing ? el('span', { class: 'chip bad' }, 'File missing') : null),
      el('div', { class: 'row' },
        el('button', { class: 'btn small', type: 'button', onclick: () => showAccess(s) }, 'Access log'),
        s.status === 'active' ? el('button', { class: 'btn small danger', type: 'button', onclick: () => revoke(s) }, 'Revoke') : null));
  }
  async function revoke(s) {
    if (!(await confirmDialog({ title: 'Revoke this link?', message: 'It stops working immediately for everyone who has it.', confirmText: 'Revoke link', danger: true }))) return;
    try { await api.del('/shares/' + s.id); toast('Link revoked.', 'ok'); load(); } catch (e) { toast(e.message, 'error'); }
  }
  async function showAccess(s) {
    let rows = [];
    try { rows = await api.get('/shares/' + s.id + '/access'); } catch (e) { toast(e.message, 'error'); return; }
    await infoDialog('Access log', rows.length ? el('div', { class: 'table-wrap' }, el('table', { class: 't' }, el('thead', {}, el('tr', {}, ['When', 'Result', 'From'].map((h) => el('th', {}, h)))),
      el('tbody', {}, rows.map((r) => el('tr', {}, el('td', {}, fmtDate(r.accessed_at)), el('td', {}, r.outcome), el('td', { class: 'mono' }, r.ip || '—')))))) : el('p', { class: 'muted' }, 'Nobody has opened this link yet.'));
  }
  async function purge() {
    if (!(await confirmDialog({ title: 'Remove inactive links?', message: 'Revoked, expired and used-up links are removed from this list. They already grant no access.', confirmText: 'Remove' }))) return;
    try { const d = await api.del('/shares'); toast(d.removed + ' removed.', 'ok'); load(); } catch (e) { toast(e.message, 'error'); }
  }
  mount(root, el('div', { class: 'page' }, el('div', { class: 'page-head' }, el('h1', {}, 'Shares'), el('button', { class: 'btn', type: 'button', onclick: purge }, icon('trash'), 'Clear inactive'),
    el('p', { class: 'sub' }, 'Temporary links you created. Revoking is instant.')), list));
  load();
  return () => { gone = true; };
}

/** Public page for recipients: #/s/<token>?b=<server address>. No account needed. */
export async function publicShareScreen(root, ctx) {
  const token = ctx.params.token;
  if (ctx.query.b) { try { api.useTemporaryBackend(ctx.query.b); } catch (e) { mount(root, wrap(el('div', { class: 'state error' }, icon('alert'), el('h3', {}, 'This link is damaged'), el('p', {}, 'The server address in it is not valid.')))); return; } }
  if (!api.currentBackend()) { mount(root, wrap(el('div', { class: 'state error' }, icon('alert'), el('h3', {}, 'No server address'), el('p', {}, 'This link does not say which server holds the file.')))); return; }
  const box = el('div', { class: 'stack' });
  mount(root, wrap(box));
  mount(box, skeletonList(2));
  async function load() {
    try {
      const m = await api.get('/public/share/' + encodeURIComponent(token), { auth: false });
      const pw = el('input', { class: 'input', type: 'password', autocomplete: 'off', 'aria-label': 'Password', placeholder: 'Password' });
      const msg = el('div', { class: 'field-error', role: 'alert' });
      const btn = el('button', { class: 'btn primary', type: 'button', style: { minHeight: '46px' } }, icon('download'), 'Download');
      const url = api.absolute(API_PREFIX + '/public/share/' + encodeURIComponent(token) + '/file');
      btn.onclick = async () => {
        msg.textContent = '';
        if (!m.requires_password) { const a = el('a', { href: url, download: m.name || '' }); document.body.append(a); a.click(); a.remove(); toast('Download started.', 'ok'); return; }
        if (!pw.value) { msg.textContent = 'Enter the password you were given.'; pw.focus(); return; }
        btn.disabled = true;
        try {
          const blob = await api.fetchBlob('/public/share/' + encodeURIComponent(token) + '/file', { 'X-Share-Password': pw.value });
          const u = URL.createObjectURL(blob); const a = el('a', { href: u, download: m.name || 'download' }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 60000);
          toast('Download started.', 'ok');
        } catch (e) { msg.textContent = e.message; } finally { btn.disabled = false; }
      };
      mount(box, el('div', { class: 'state' }, icon(m.requires_password ? 'lock' : 'file'),
        el('h2', {}, m.requires_password ? 'This file is password protected' : m.name),
        m.requires_password ? null : el('p', {}, fmtBytes(m.size) + ' · ' + m.kind),
        m.expires_at ? el('p', { class: 'tiny' }, 'Available until ' + fmtDate(m.expires_at)) : null,
        m.downloads_left != null ? el('p', { class: 'tiny' }, m.downloads_left + ' download' + (m.downloads_left === 1 ? '' : 's') + ' left') : null,
        m.requires_password ? pw : null, msg, btn,
        el('p', { class: 'tiny' }, 'If your browser shows an ngrok warning page first, choose “Visit Site”.')));
    } catch (e) {
      mount(box, el('div', { class: 'state error', role: 'alert' }, icon(e.network ? 'offline' : 'alert'), el('h3', {}, e.network ? 'The server isn’t reachable' : 'This link can’t be used'), el('p', {}, e.message),
        e.network ? el('button', { class: 'btn', type: 'button', onclick: load }, icon('refresh'), 'Try again') : null));
    }
  }
  load();
  return () => api.useTemporaryBackend(null);
}
function wrap(inner) {
  return el('div', { class: 'auth-wrap' }, el('main', { class: 'auth-card glass', id: 'main' },
    el('div', { class: 'brand' }, brandMark(), el('div', {}, el('div', { class: 'brand-name' }, 'NEXORA'), el('div', { class: 'brand-sub' }, 'Shared with you'))), inner, el('p', { class: 'tiny', style: { textAlign: 'center' } }, 'Created By Shiv Yogi')));
}
