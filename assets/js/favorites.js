// NEXORA favorites, watchlist and history — Created By Shiv Yogi
import * as api from './api.js';
import { el, mount, relTime, fmtDate } from './utils.js';
import { icon, toast, confirmDialog, emptyState, errorState, skeletonList } from './ui.js';
import { mediaRow } from './media.js';

export { favoritesScreen, watchlistScreen } from './media.js';

/** History (what you opened) and Activity (what you did) in one place. */
export async function historyScreen(root) {
  let tab = 'viewed', page = 1, gone = false;
  const body = el('div', { class: 'stack', 'aria-live': 'polite' });
  const seg = el('div', { class: 'seg', role: 'group', 'aria-label': 'History type' },
    [['viewed', 'Viewed'], ['activity', 'Activity']].map(([v, l]) => el('button', { type: 'button', 'aria-pressed': String(v === tab), dataset: { v }, onclick: () => { tab = v; page = 1; seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === tab))); load(); } }, l)));
  async function load() {
    mount(body, skeletonList(5));
    try {
      if (tab === 'viewed') {
        const d = await api.get('/history', { query: { page, per_page: 30 } });
        if (gone) return;
        if (!d.items.length) { mount(body, emptyState('history', 'Nothing viewed yet', 'Items you open will show up here, newest first.', el('a', { class: 'btn', href: '#/library' }, 'Browse library'))); return; }
        mount(body, el('div', { class: 'list' }, d.items.map((i) => mediaRow(i, load, relTime(i.last_viewed)))),
          d.pages > 1 ? el('div', { class: 'pager' }, el('button', { class: 'btn', type: 'button', disabled: page <= 1, onclick: () => { page--; load(); } }, 'Previous'), el('span', { class: 'tiny' }, 'Page ' + d.page + ' of ' + d.pages), el('button', { class: 'btn', type: 'button', disabled: page >= d.pages, onclick: () => { page++; load(); } }, 'Next')) : null);
      } else {
        const a = await api.get('/activity', { query: { limit: 100 } });
        if (gone) return;
        if (!a.length) { mount(body, emptyState('pulse', 'No activity recorded', 'Uploads, shares and other changes you make are listed here.')); return; }
        mount(body, el('div', { class: 'table-wrap glass card' }, el('table', { class: 't' }, el('thead', {}, el('tr', {}, ['When', 'What', 'Detail'].map((h) => el('th', {}, h)))),
          el('tbody', {}, a.map((r) => el('tr', {}, el('td', {}, fmtDate(r.created_at)), el('td', {}, r.action.replace(/_/g, ' ')), el('td', { class: 'mono' }, r.detail || '—')))))));
      }
    } catch (e) { if (!gone) mount(body, errorState(e, load)); }
  }
  async function clearAll() {
    const what = tab === 'viewed' ? 'viewing history' : 'activity log';
    if (!(await confirmDialog({ title: 'Clear ' + what + '?', message: tab === 'viewed' ? 'Favorites, watchlist and resume positions are kept.' : 'This only removes the list; no files change.', confirmText: 'Clear', danger: true }))) return;
    try { await api.del(tab === 'viewed' ? '/history' : '/activity'); toast('Cleared.', 'ok'); load(); } catch (e) { toast(e.message, 'error'); }
  }
  mount(root, el('div', { class: 'page' }, el('div', { class: 'page-head' }, el('h1', {}, 'History'), el('button', { class: 'btn', type: 'button', onclick: clearAll }, icon('trash'), 'Clear')), seg, body));
  load();
  return () => { gone = true; };
}
