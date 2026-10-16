// NEXORA media library: cards, rows, filters, pagination — Created By Shiv Yogi
import * as api from './api.js';
import { el, mount, clear, fmtBytes, fmtTime, debounce, lsGet, lsSet, relTime, fmtDate, qs, enc } from './utils.js';
import { icon, kindIcon, toast, openMenu, skeletonGrid, skeletonList, emptyState, errorState, infoDialog } from './ui.js';
import { KEYS } from './config.js';
import { isAdmin } from './auth.js';
import { navigate } from './router.js';

export const open = (item) => navigate('/view/' + item.id);

export async function toggleFavorite(item) {
  try {
    if (item.favorite) { await api.del('/favorites/' + item.id); item.favorite = false; toast('Removed from favorites.', 'info'); }
    else { await api.put('/favorites/' + item.id); item.favorite = true; toast('Added to favorites.', 'ok'); }
  } catch (e) { toast(e.message, 'error'); }
  return item.favorite;
}
export async function toggleWatchlist(item) {
  try {
    if (item.watchlist) { await api.del('/watchlist/' + item.id); item.watchlist = false; toast('Removed from watchlist.', 'info'); }
    else { await api.put('/watchlist/' + item.id); item.watchlist = true; toast('Added to watchlist.', 'ok'); }
  } catch (e) { toast(e.message, 'error'); }
  return item.watchlist;
}
export async function downloadItem(item) {
  try {
    const t = await api.post('/media/' + item.id + '/ticket');
    const a = el('a', { href: api.absolute(t.download), download: item.name, rel: 'noopener' });
    document.body.append(a); a.click(); a.remove();
    toast('Download started.', 'ok');
  } catch (e) { toast(e.message, 'error'); }
}
export function showDetails(item) {
  return infoDialog(item.name, el('dl', { class: 'kv' },
    el('dt', {}, 'Type'), el('dd', {}, item.kind + ' · ' + (item.mime || '')), el('dt', {}, 'Size'), el('dd', {}, fmtBytes(item.size)),
    el('dt', {}, 'Folder'), el('dd', { class: 'mono' }, item.root + '/' + (item.folder || '')), el('dt', {}, 'Modified'), el('dd', {}, fmtDate(item.mtime)),
    el('dt', {}, 'Status'), el('dd', {}, item.missing ? 'Missing on the server' : 'Available')));
}
export function itemMenu(item, anchor, refresh) {
  openMenu(anchor, [
    { label: 'Open', icon: 'play', onClick: () => open(item) },
    { label: item.favorite ? 'Remove favorite' : 'Add to favorites', icon: 'heart', onClick: async () => { await toggleFavorite(item); refresh && refresh(); } },
    { label: item.watchlist ? 'Remove from watchlist' : 'Add to watchlist', icon: 'bookmark', onClick: async () => { await toggleWatchlist(item); refresh && refresh(); } },
    isAdmin() && !item.missing ? { label: 'Share…', icon: 'share', onClick: () => import('./sharing.js').then((m) => m.createShareDialog(item)) } : null,
    !item.missing ? { label: 'Download', icon: 'download', onClick: () => downloadItem(item) } : null,
    { label: 'Details', icon: 'info', onClick: () => showDetails(item) },
  ]);
}

function pct(item) { return item.duration > 0 ? Math.min(100, (item.position / item.duration) * 100) : 0; }

export function mediaCard(item, refresh) {
  const fav = el('button', { class: 'btn icon small fav' + (item.favorite ? ' on' : ''), type: 'button', 'aria-pressed': String(!!item.favorite), 'aria-label': 'Favorite ' + item.name,
    onclick: async (e) => { e.stopPropagation(); const v = await toggleFavorite(item); fav.classList.toggle('on', v); fav.setAttribute('aria-pressed', String(v)); } }, icon('heart'));
  const more = el('button', { class: 'btn icon small', type: 'button', 'aria-label': 'More actions for ' + item.name, onclick: (e) => { e.stopPropagation(); itemMenu(item, more, refresh); } }, icon('more'));
  const main = el('button', { class: 'media-card', type: 'button', onclick: () => open(item), 'aria-label': (item.missing ? 'Unavailable: ' : 'Open ') + item.name },
    el('div', { class: 'thumb', 'data-kind': item.kind }, icon(kindIcon(item.kind)), item.ext ? el('span', { class: 'chip', style: { position: 'absolute', left: '8px', bottom: '8px' } }, item.ext) : null),
    pct(item) > 0 ? el('div', { class: 'progress-line' }, el('i', { style: { width: pct(item) + '%' } })) : null,
    el('div', { class: 'media-meta' }, el('span', { class: 'name truncate' }, item.name),
      el('span', { class: 'tiny' }, item.missing ? 'Missing on server' : fmtBytes(item.size) + (item.folder ? ' · ' + item.folder : ''))));
  if (item.missing) main.classList.add('missing');
  return el('div', { class: 'card-wrap', style: { position: 'relative' } }, main,
    el('div', { style: { position: 'absolute', top: '6px', right: '6px', display: 'flex', gap: '4px' } }, fav, more));
}

export function mediaRow(item, refresh, extra) {
  const more = el('button', { class: 'btn icon small ghost', type: 'button', 'aria-label': 'More actions for ' + item.name, onclick: (e) => { e.stopPropagation(); itemMenu(item, more, refresh); } }, icon('more'));
  return el('div', { class: 'list-row', style: { cursor: 'pointer' }, role: 'group' },
    el('button', { class: 'list-row', type: 'button', style: { flex: 1, padding: 0, minHeight: 0 }, onclick: () => open(item), 'aria-label': (item.missing ? 'Unavailable: ' : 'Open ') + item.name },
      el('span', { class: 'thumb-s' }, icon(kindIcon(item.kind))),
      el('span', { class: 'info' }, el('span', { class: 'name truncate' }, item.name),
        el('span', { class: 'tiny' }, item.missing ? 'Missing on server' : [fmtBytes(item.size), item.folder || item.root, extra || ''].filter(Boolean).join(' · ')))),
    item.favorite ? el('span', { class: 'chip', title: 'Favorite' }, icon('heart')) : null, more);
}

/**
 * Generic paged, filterable browser used by Library, Search, Favorites and Watchlist.
 * cfg: { title, sub, path, base:{}, filters:bool, requireQuery:bool, empty:{icon,title,text}, initialQuery }
 */
export function renderBrowser(root, cfg) {
  const st = { q: cfg.initialQuery || '', kind: '', sort: cfg.defaultSort || 'name', order: cfg.defaultOrder || 'asc', page: 1, root: '', ext: '', min_size: '' , view: lsGet(KEYS.view, 'grid') };
  let aborted = false, token = 0;
  const results = el('div', { 'aria-live': 'polite' });
  const pager = el('div', { class: 'pager' });
  const count = el('span', { class: 'tiny' });

  const qInput = el('input', { class: 'input', type: 'search', placeholder: cfg.requireQuery ? 'Search by file or folder name' : 'Filter by name', 'aria-label': 'Search', value: st.q, style: { flex: '1 1 220px' }, 'data-autofocus': '' });
  const kinds = [['', 'All'], ['video', 'Video'], ['audio', 'Audio'], ['image', 'Images'], ['other', 'Files']];
  const seg = el('div', { class: 'seg', role: 'group', 'aria-label': 'Type' }, kinds.map(([v, l]) => el('button', { type: 'button', 'aria-pressed': String(st.kind === v), dataset: { v }, onclick: () => { st.kind = v; st.page = 1; sync(); load(); } }, l)));
  const sort = el('select', { class: 'input', 'aria-label': 'Sort by', style: { width: 'auto', minWidth: '120px' }, onchange: () => { st.sort = sort.value; st.page = 1; load(); } },
    [['name', 'Name'], ['mtime', 'Modified'], ['size', 'Size'], ['kind', 'Type'], ['added', 'Recently added']].map(([v, l]) => el('option', { value: v, selected: v === st.sort }, l)));
  const orderBtn = el('button', { class: 'btn icon', type: 'button', 'aria-label': 'Toggle sort direction', onclick: () => { st.order = st.order === 'asc' ? 'desc' : 'asc'; sync(); st.page = 1; load(); } });
  const viewBtn = el('button', { class: 'btn icon', type: 'button', onclick: () => { st.view = st.view === 'grid' ? 'list' : 'grid'; lsSet(KEYS.view, st.view); sync(); load(); } });
  function sync() {
    seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === st.kind)));
    orderBtn.textContent = st.order === 'asc' ? 'A→Z' : 'Z→A'; orderBtn.setAttribute('aria-label', 'Sort direction: ' + (st.order === 'asc' ? 'ascending' : 'descending'));
    clear(viewBtn); viewBtn.append(icon(st.view === 'grid' ? 'list' : 'grid')); viewBtn.setAttribute('aria-label', st.view === 'grid' ? 'Switch to list view' : 'Switch to grid view');
  }
  const onType = debounce(() => { st.q = qInput.value.trim(); st.page = 1; load(); }, 320);
  qInput.addEventListener('input', onType);

  async function load() {
    const my = ++token;
    if (cfg.requireQuery && !st.q && !st.kind) {
      mount(results, emptyState('search', 'Search your library', 'Type part of a file or folder name, or pick a type, to see results.')); mount(pager); count.textContent = ''; return;
    }
    mount(results, st.view === 'grid' ? skeletonGrid(8) : skeletonList(6));
    try {
      const d = await api.get(cfg.path, { query: { ...(cfg.base || {}), q: st.q, kind: st.kind, sort: st.sort, order: st.order, page: st.page, per_page: st.view === 'grid' ? 36 : 40 } });
      if (aborted || my !== token) return;
      count.textContent = d.total + (d.total === 1 ? ' item' : ' items');
      if (!d.items.length) {
        const e = cfg.empty || {};
        mount(results, emptyState(e.icon || 'library', st.q || st.kind ? 'No matches' : (e.title || 'Nothing here yet'),
          st.q || st.kind ? 'Try a different word or clear the filters.' : (e.text || ''),
          e.action || (st.q || st.kind ? el('button', { class: 'btn', type: 'button', onclick: () => { st.q = ''; st.kind = ''; qInput.value = ''; sync(); load(); } }, 'Clear filters') : null)));
        mount(pager); return;
      }
      const refresh = () => load();
      mount(results, st.view === 'grid'
        ? el('div', { class: 'media-grid' }, d.items.map((i) => mediaCard(i, refresh)))
        : el('div', { class: 'list' }, d.items.map((i) => mediaRow(i, refresh))));
      mount(pager, d.pages > 1 ? [
        el('button', { class: 'btn', type: 'button', disabled: d.page <= 1, onclick: () => { st.page--; load(); window.scrollTo(0, 0); } }, icon('chevL'), 'Previous'),
        el('span', { class: 'tiny' }, 'Page ' + d.page + ' of ' + d.pages),
        el('button', { class: 'btn', type: 'button', disabled: d.page >= d.pages, onclick: () => { st.page++; load(); window.scrollTo(0, 0); } }, 'Next', icon('chevR'))] : null);
    } catch (e) {
      if (aborted || my !== token || e.code === 'aborted') return;
      mount(results, errorState(e, load)); mount(pager);
    }
  }

  mount(root, el('div', { class: 'page' },
    el('div', { class: 'page-head' }, el('h1', {}, cfg.title), cfg.sub ? el('p', { class: 'sub' }, cfg.sub) : null, count),
    el('div', { class: 'toolbar' }, qInput, sort, orderBtn, viewBtn),
    seg, results, pager));
  sync(); load();
  if (cfg.requireQuery) setTimeout(() => qInput.focus(), 50);
  return () => { aborted = true; onType.cancel(); };
}

export function libraryScreen(root) {
  return renderBrowser(root, { title: 'Library', sub: 'Everything NEXORA has indexed from your media folders.', path: '/library/items',
    empty: { icon: 'library', title: 'Your library is empty', text: isAdmin() ? 'Add files in Files, or scan your media folders from Storage.' : 'Ask the owner to add media.',
      action: isAdmin() ? el('a', { class: 'btn primary', href: '#/storage' }, icon('scan'), 'Open Storage') : null } });
}
export function favoritesScreen(root) {
  return renderBrowser(root, { title: 'Favorites', sub: 'Items you marked with a heart.', path: '/favorites', defaultSort: 'name',
    empty: { icon: 'heart', title: 'No favorites yet', text: 'Tap the heart on any item to keep it here.', action: el('a', { class: 'btn', href: '#/library' }, 'Browse library') } });
}
export function watchlistScreen(root) {
  return renderBrowser(root, { title: 'Watchlist', sub: 'Things you plan to watch or listen to.', path: '/watchlist',
    empty: { icon: 'bookmark', title: 'Your watchlist is empty', text: 'Use the “⋯” menu on a video or track and choose Add to watchlist.', action: el('a', { class: 'btn', href: '#/library' }, 'Browse library') } });
}
export function searchScreen(root, ctx) {
  return renderBrowser(root, { title: 'Search', sub: 'Find files by name, folder and type.', path: '/search', requireQuery: true, initialQuery: ctx.query.q || '', empty: { icon: 'search' } });
}
export { relTime, fmtTime };
