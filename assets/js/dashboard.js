// NEXORA dashboard — Created By Shiv Yogi
import * as api from './api.js';
import { el, mount, fmtBytes, relTime } from './utils.js';
import { icon, emptyState, errorState, skeletonGrid } from './ui.js';
import * as auth from './auth.js';
import { mediaCard } from './media.js';

function rail(title, items, refresh, more) {
  return el('section', { class: 'stack', 'aria-label': title }, el('div', { class: 'row', style: { justifyContent: 'space-between' } }, el('h2', {}, title), more ? el('a', { href: more, class: 'btn small ghost' }, 'See all', icon('chevR')) : null),
    el('div', { class: 'media-grid' }, items.map((i) => mediaCard(i, refresh))));
}
const ACTION_TEXT = { login: 'Signed in', upload: 'Uploaded', mkdir: 'Created folder', rename: 'Renamed', move: 'Moved', copy: 'Copied', delete: 'Deleted', share_created: 'Shared', share_revoked: 'Revoked a share', scan_started: 'Started a library scan', backup: 'Backed up the database', password_changed: 'Changed password', settings_changed: 'Changed settings', history_cleared: 'Cleared history' };

export async function dashboardScreen(root) {
  const body = el('div', { class: 'stack', style: { gap: 'var(--s-5)' } }, skeletonGrid(4));
  const user = auth.session.user;
  const hour = new Date().getHours();
  mount(root, el('div', { class: 'page' }, el('div', { class: 'page-head' }, el('h1', {}, (hour < 5 ? 'Late night' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening') + ', ' + user.username), el('p', { class: 'sub' }, 'Here is what is happening in your library.')), body));
  let gone = false;
  const load = async () => {
    try {
      const [storage, cont, recent, added, acts] = await Promise.all([
        api.get('/system/storage'), api.get('/progress/continue'), api.get('/history', { query: { per_page: 6 } }),
        api.get('/library/items', { query: { sort: 'added', order: 'desc', per_page: 6 } }), api.get('/activity', { query: { limit: 6 } })]);
      if (gone) return;
      const files = storage.roots.reduce((n, r) => n + r.indexed_files, 0), bytes = storage.roots.reduce((n, r) => n + r.indexed_bytes, 0);
      const free = storage.roots.filter((r) => r.free_bytes != null)[0];
      const usedPct = free ? Math.round(((free.total_bytes - free.free_bytes) / free.total_bytes) * 100) : null;
      const tiles = el('div', { class: 'grid cols-3' },
        el('div', { class: 'glass stat' }, el('span', { class: 'v' }, String(files)), el('span', { class: 'l' }, 'Indexed files')),
        el('div', { class: 'glass stat' }, el('span', { class: 'v' }, fmtBytes(bytes)), el('span', { class: 'l' }, 'Library size')),
        el('div', { class: 'glass stat' }, el('span', { class: 'v' }, free ? fmtBytes(free.free_bytes) : '—'), el('span', { class: 'l' }, 'Free on phone'),
          usedPct != null ? el('div', { class: 'meter' + (usedPct > 90 ? ' hot' : ''), role: 'img', 'aria-label': usedPct + '% of storage used' }, el('i', { style: { width: usedPct + '%' } })) : null));
      const parts = [tiles];
      if (!storage.roots.length) parts.push(el('div', { class: 'banner warn' }, icon('alert'), el('span', { class: 'grow' }, 'No media folder is configured on the server yet.'), el('a', { class: 'btn small', href: '#/diagnostics' }, 'Diagnostics')));
      else if (!files && auth.isAdmin()) parts.push(el('div', { class: 'banner' }, icon('scan'), el('span', { class: 'grow' }, 'Your library is empty. Scan your media folders to index what is already on the phone.'), el('a', { class: 'btn small primary', href: '#/storage' }, 'Open Storage')));
      if (cont.items.length) parts.push(rail('Continue watching', cont.items, load));
      if (recent.items.length) parts.push(rail('Recently viewed', recent.items, load, '#/history'));
      if (added.items.length) parts.push(rail('Recently added', added.items, load, '#/library'));
      if (!cont.items.length && !recent.items.length && !added.items.length && files === 0 && storage.roots.length) parts.push(emptyState('library', 'Nothing to show yet', 'Add or scan media and it will appear here.'));
      if (acts.length) parts.push(el('section', { class: 'glass card stack', 'aria-label': 'Recent activity' }, el('h2', {}, 'Recent activity'), el('ul', { class: 'stack', style: { listStyle: 'none', padding: 0, margin: 0, gap: '6px' } },
        acts.map((a) => el('li', { class: 'row', style: { flexWrap: 'nowrap' } }, el('span', { class: 'grow truncate' }, (ACTION_TEXT[a.action] || a.action) + (a.detail && a.action !== 'login' ? ' · ' + a.detail : '')), el('span', { class: 'tiny' }, relTime(a.created_at)))))));
      mount(body, parts);
    } catch (e) { if (!gone) mount(body, errorState(e, load)); }
  };
  load();
  return () => { gone = true; };
}
