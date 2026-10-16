// NEXORA file manager and uploads — Created By Shiv Yogi
import * as api from './api.js';
import { el, mount, clear, fmtBytes, fmtDate, joinPath, parentPath, debounce } from './utils.js';
import { icon, kindIcon, toast, confirmDialog, formDialog, openMenu, skeletonList, emptyState, errorState, progressBar } from './ui.js';
import { isAdmin } from './auth.js';
import { navigate } from './router.js';
import { downloadItem } from './media.js';

const PAGE = 100;

/** Folder chooser used for Move and Copy. Returns {root,path} or null. */
async function pickFolder(roots, startRoot, startPath, verb) {
  const st = { root: startRoot, path: startPath };
  const list = el('div', { class: 'list', style: { maxHeight: '260px', overflow: 'auto' } });
  const where = el('div', { class: 'mono tiny' });
  const rootSel = el('select', { class: 'input', 'aria-label': 'Media folder', hidden: roots.length < 2, onchange: () => { st.root = rootSel.value; st.path = ''; draw(); } }, roots.map((r) => el('option', { value: r.name, selected: r.name === st.root }, r.name)));
  async function draw() {
    where.textContent = st.root + '/' + st.path;
    mount(list, skeletonList(3));
    try {
      const d = await api.get('/files/list', { query: { root: st.root, path: st.path, limit: 200 } });
      const dirs = d.entries.filter((e) => e.type === 'dir');
      mount(list, st.path ? el('button', { class: 'list-row', type: 'button', onclick: () => { st.path = parentPath(st.path); draw(); } }, el('span', { class: 'thumb-s' }, icon('chevL')), el('span', { class: 'info' }, 'Up one level')) : null,
        dirs.length ? dirs.map((f) => el('button', { class: 'list-row', type: 'button', onclick: () => { st.path = joinPath(st.path, f.name); draw(); } }, el('span', { class: 'thumb-s' }, icon('folder')), el('span', { class: 'info' }, f.name))) : el('p', { class: 'tiny', style: { padding: '8px 12px' } }, 'No subfolders here.'));
    } catch (e) { mount(list, errorState(e, draw)); }
  }
  draw();
  const ok = await confirmDialog({ title: verb + ' to…', message: 'Choose the destination folder.', confirmText: verb + ' here', extra: el('div', { class: 'stack' }, rootSel, where, list) });
  return ok ? { root: st.root, path: st.path } : null;
}

export async function filesScreen(root, ctx) {
  const admin = isAdmin();
  let roots = [];
  try { roots = await api.get('/library/roots'); } catch (e) { mount(root, el('div', { class: 'page' }, errorState(e, () => filesScreen(root, ctx)))); return; }
  if (!roots.length) { mount(root, el('div', { class: 'page' }, el('h1', {}, 'Files'), emptyState('folder', 'No media folder configured', 'On the phone, open the NEXORA server menu in Pydroid 3 and choose “Add a media folder”.', el('a', { class: 'btn', href: '#/diagnostics' }, 'Open diagnostics')))); return; }
  const st = { root: ctx.query.root || roots[0].name, path: ctx.query.path || '', q: '', sort: 'name', order: 'asc', offset: 0, selected: new Map(), entries: [], total: 0 };
  let gone = false, token = 0;
  const listBox = el('div', { class: 'list', 'aria-live': 'polite' });
  const crumbs = el('nav', { class: 'crumbs', 'aria-label': 'Folder path' });
  const bulk = el('div', { class: 'banner', hidden: true });
  const more = el('div', { class: 'pager' });
  const uploads = el('div', { class: 'stack' });
  const qInput = el('input', { class: 'input', type: 'search', placeholder: 'Filter this folder', 'aria-label': 'Filter this folder', style: { flex: '1 1 180px' } });
  qInput.addEventListener('input', debounce(() => { st.q = qInput.value.trim(); load(true); }, 300));
  const sortSel = el('select', { class: 'input', 'aria-label': 'Sort', style: { width: 'auto' }, onchange: () => { st.sort = sortSel.value; load(true); } }, [['name', 'Name'], ['mtime', 'Modified'], ['size', 'Size'], ['kind', 'Type']].map(([v, l]) => el('option', { value: v }, l)));
  const rootSel = el('select', { class: 'input', 'aria-label': 'Media folder', hidden: roots.length < 2, style: { width: 'auto' }, onchange: () => { st.root = rootSel.value; st.path = ''; st.selected.clear(); load(true); } }, roots.map((r) => el('option', { value: r.name, selected: r.name === st.root }, r.name)));

  const sync = () => { const q = '/files?root=' + encodeURIComponent(st.root) + (st.path ? '&path=' + encodeURIComponent(st.path) : ''); if (location.hash !== '#' + q) history.replaceState(null, '', '#' + q); };
  function drawCrumbs() {
    const parts = st.path ? st.path.split('/') : [];
    mount(crumbs, el('button', { type: 'button', onclick: () => go('') }, st.root), parts.map((p, i) => [el('span', { class: 'sep', 'aria-hidden': 'true' }, '/'), el('button', { type: 'button', 'aria-current': i === parts.length - 1 ? 'location' : false, onclick: () => go(parts.slice(0, i + 1).join('/')) }, p)]));
  }
  function go(path) { st.path = path; st.selected.clear(); st.q = ''; qInput.value = ''; load(true); }
  const key = (e) => joinPath(st.path, e.name);

  function drawBulk() {
    bulk.hidden = !st.selected.size;
    if (!st.selected.size) return;
    mount(bulk, el('span', { class: 'grow' }, st.selected.size + ' selected'),
      el('button', { class: 'btn small', type: 'button', onclick: () => bulkMove('move') }, icon('move'), 'Move'),
      el('button', { class: 'btn small', type: 'button', onclick: () => bulkMove('copy') }, icon('copy'), 'Copy'),
      el('button', { class: 'btn small danger', type: 'button', onclick: bulkDelete }, icon('trash'), 'Delete'),
      el('button', { class: 'btn small ghost', type: 'button', onclick: () => { st.selected.clear(); draw(); } }, 'Clear'));
  }

  async function load(reset) {
    const my = ++token;
    if (reset) { st.offset = 0; st.entries = []; mount(listBox, skeletonList(6)); }
    drawCrumbs(); sync();
    try {
      const d = await api.get('/files/list', { query: { root: st.root, path: st.path, q: st.q, sort: st.sort, order: st.order, offset: st.offset, limit: PAGE } });
      if (gone || my !== token) return;
      st.entries = reset ? d.entries : st.entries.concat(d.entries); st.total = d.total; draw();
    } catch (e) {
      if (gone || my !== token) return;
      if (e.status === 404 && st.path) { toast('That folder no longer exists. Showing the top level.', 'info'); st.path = ''; return load(true); }
      mount(listBox, errorState(e, () => load(true))); mount(more);
    }
  }
  function draw() {
    if (!st.entries.length) {
      mount(listBox, emptyState('folder', st.q ? 'No matches in this folder' : 'This folder is empty', admin && !st.q ? 'Upload files or create a folder to get started.' : ''));
    } else {
      mount(listBox, st.entries.map(row));
    }
    mount(more, st.entries.length < st.total ? el('button', { class: 'btn', type: 'button', onclick: () => { st.offset = st.entries.length; load(false); } }, 'Show more (' + (st.total - st.entries.length) + ')') : null);
    drawBulk();
  }

  function row(e) {
    const k = key(e), isDir = e.type === 'dir', sel = st.selected.has(k);
    const check = admin ? el('input', { type: 'checkbox', checked: sel, 'aria-label': 'Select ' + e.name, style: { width: '20px', height: '20px', accentColor: 'var(--accent)' }, onclick: (ev) => ev.stopPropagation(), onchange: (ev) => { if (ev.target.checked) st.selected.set(k, e); else st.selected.delete(k); r.classList.toggle('selected', ev.target.checked); drawBulk(); } }) : null;
    const menuBtn = el('button', { class: 'btn icon small ghost', type: 'button', 'aria-label': 'Actions for ' + e.name, onclick: (ev) => { ev.stopPropagation(); rowMenu(e, menuBtn); } }, icon('more'));
    const r = el('div', { class: 'list-row' + (sel ? ' selected' : '') }, check,
      el('button', { class: 'list-row', type: 'button', style: { flex: 1, padding: 0, minHeight: 0 }, onclick: () => (isDir ? go(k) : e.media_id ? navigate('/view/' + e.media_id) : null) },
        el('span', { class: 'thumb-s' }, icon(isDir ? 'folder' : kindIcon(e.kind))),
        el('span', { class: 'info' }, el('span', { class: 'name truncate' }, e.name), el('span', { class: 'tiny' }, (isDir ? 'Folder' : fmtBytes(e.size)) + ' · ' + fmtDate(e.mtime)))),
      e.favorite ? el('span', { class: 'chip' }, icon('heart')) : null, menuBtn);
    return r;
  }
  function rowMenu(e, anchor) {
    const isDir = e.type === 'dir', k = key(e);
    openMenu(anchor, [
      { label: isDir ? 'Open folder' : 'Open', icon: isDir ? 'folder' : 'play', onClick: () => (isDir ? go(k) : e.media_id && navigate('/view/' + e.media_id)) },
      !isDir && e.media_id ? { label: 'Download', icon: 'download', onClick: () => downloadItem({ id: e.media_id, name: e.name }) } : null,
      !isDir && admin && e.media_id ? { label: 'Share…', icon: 'share', onClick: () => import('./sharing.js').then((m) => m.createShareDialog({ id: e.media_id, name: e.name })) } : null,
      admin ? { label: 'Rename', icon: 'edit', onClick: () => rename(e) } : null,
      admin ? { label: 'Move…', icon: 'move', onClick: () => moveCopy([e], 'move') } : null,
      admin && !isDir ? { label: 'Copy…', icon: 'copy', onClick: () => moveCopy([e], 'copy') } : null,
      admin ? { label: 'Delete', icon: 'trash', danger: true, onClick: () => remove([e]) } : null]);
  }

  async function rename(e) {
    await formDialog({ title: 'Rename', fields: [{ name: 'name', label: 'New name', value: e.name, required: true }], submitText: 'Rename',
      onSubmit: async (v) => { await api.post('/files/rename', { root: st.root, path: key(e), name: v.name.trim() }); toast('Renamed.', 'ok'); } }) && load(true);
  }
  async function newFolder() {
    const ok = await formDialog({ title: 'New folder', fields: [{ name: 'name', label: 'Folder name', required: true }], submitText: 'Create folder',
      onSubmit: async (v) => { await api.post('/files/mkdir', { root: st.root, path: st.path, name: v.name.trim() }); toast('Folder created.', 'ok'); } });
    if (ok) load(true);
  }
  async function moveCopy(items, verb) {
    const dest = await pickFolder(roots, st.root, st.path, verb === 'move' ? 'Move' : 'Copy');
    if (!dest) return;
    let done = 0, failed = [];
    for (const e of items) {
      try {
        await api.post('/files/' + verb, { root: st.root, path: key(e), to_root: dest.root, to_path: dest.path, on_conflict: 'rename' }); done++;
      } catch (err) { failed.push(e.name + ': ' + err.message); if (err.network) break; }
    }
    if (done) toast((verb === 'move' ? 'Moved ' : 'Copied ') + done + (done === 1 ? ' item.' : ' items.'), 'ok');
    if (failed.length) toast(failed[0] + (failed.length > 1 ? ' (+' + (failed.length - 1) + ' more)' : ''), 'error');
    st.selected.clear(); load(true);
  }
  const bulkMove = (verb) => {
    const items = [...st.selected.values()];
    if (verb === 'copy' && items.some((i) => i.type === 'dir')) { toast('Folders can’t be copied. Deselect them or use Move.', 'error'); return; }
    return moveCopy(items, verb);
  };
  async function remove(items) {
    const dirs = items.filter((i) => i.type === 'dir').length;
    const names = items.length === 1 ? '“' + items[0].name + '”' : items.length + ' items';
    const ok = await confirmDialog({ title: 'Delete ' + names + '?', danger: true, confirmText: 'Delete permanently',
      message: (dirs ? 'Folders are deleted together with everything inside them. ' : '') + 'This removes the files from the phone and cannot be undone.' });
    if (!ok) return;
    let done = 0, failed = [];
    for (const e of items) {
      try { await api.post('/files/delete', { root: st.root, path: key(e), confirm: true, recursive: e.type === 'dir' }); done++; } catch (err) { failed.push(e.name + ': ' + err.message); if (err.network) break; }
    }
    if (done) toast('Deleted ' + done + (done === 1 ? ' item.' : ' items.'), 'ok');
    if (failed.length) toast(failed[0], 'error');
    st.selected.clear(); load(true);
  }
  const bulkDelete = () => remove([...st.selected.values()]);

  /* ---- uploads ---- */
  const active = new Set();
  function startUpload(files) {
    const list = Array.from(files); if (!list.length) return;
    const maxMb = null;   // server enforces the owner-configured limit and explains it
    const queue = list.slice();
    const runNext = async () => {
      const f = queue.shift(); if (!f) { load(true); return; }
      const bar = progressBar(0), status = el('span', { class: 'tiny' }, 'Waiting…');
      const cancel = el('button', { class: 'btn small', type: 'button' }, 'Cancel');
      const card = el('div', { class: 'glass card flat stack', style: { gap: '6px' } }, el('div', { class: 'row', style: { justifyContent: 'space-between', flexWrap: 'nowrap' } }, el('span', { class: 'truncate grow' }, f.name), cancel), bar, status);
      uploads.append(card);
      const form = new FormData(); form.append('root', st.root); form.append('path', st.path); form.append('on_conflict', 'rename'); form.append('file', f, f.name);
      const u = api.upload(form, (a, b) => { const p = (a / b) * 100; bar.firstChild.style.width = p + '%'; bar.setAttribute('aria-valuenow', String(Math.round(p))); status.textContent = fmtBytes(a) + ' of ' + fmtBytes(b) + ' (' + Math.round(p) + '%)'; });
      active.add(u); cancel.onclick = () => u.abort();
      try {
        const r = await u.promise;
        status.textContent = r.name !== f.name ? 'Saved as “' + r.name + '” because that name was taken.' : 'Uploaded.';
        bar.firstChild.style.width = '100%'; toast('Uploaded ' + r.name, 'ok'); setTimeout(() => card.remove(), 2500);
      } catch (err) {
        status.textContent = err.message; status.style.color = 'var(--bad)'; card.append(el('button', { class: 'btn small', type: 'button', onclick: () => card.remove() }, 'Dismiss'));
        cancel.remove(); if (err.code === 'aborted') setTimeout(() => card.remove(), 2500);
      } finally { active.delete(u); }
      runNext();
    };
    runNext();
  }
  const picker = el('input', { type: 'file', multiple: true, hidden: true, onchange: () => { startUpload(picker.files); picker.value = ''; } });
  const dropHint = el('div', { class: 'banner', hidden: true }, icon('upload'), 'Drop files to upload to this folder');
  const onDragOver = (e) => { if (!admin || !e.dataTransfer || !Array.from(e.dataTransfer.types).includes('Files')) return; e.preventDefault(); dropHint.hidden = false; };
  const onDragLeave = (e) => { if (e.relatedTarget === null) dropHint.hidden = true; };
  const onDrop = (e) => { if (!admin || !e.dataTransfer || !e.dataTransfer.files.length) return; e.preventDefault(); dropHint.hidden = true; startUpload(e.dataTransfer.files); };
  document.addEventListener('dragover', onDragOver); document.addEventListener('dragleave', onDragLeave); document.addEventListener('drop', onDrop);
  const beforeUnload = (e) => { if (active.size) { e.preventDefault(); e.returnValue = ''; } };
  window.addEventListener('beforeunload', beforeUnload);

  const rootInfo = roots.find((r) => r.name === st.root);
  mount(root, el('div', { class: 'page' },
    el('div', { class: 'page-head' }, el('h1', {}, 'Files'),
      admin ? [el('button', { class: 'btn', type: 'button', onclick: newFolder }, icon('plus'), el('span', { class: 'lbl' }, 'New folder')),
        el('button', { class: 'btn primary', type: 'button', onclick: () => picker.click() }, icon('upload'), el('span', { class: 'lbl' }, 'Upload'))] : null,
      !admin ? el('p', { class: 'sub' }, 'You can browse and play files. Only the owner can change them.') : null),
    rootInfo && !rootInfo.writable && admin ? el('div', { class: 'banner warn' }, icon('alert'), 'This folder is read-only for the server, so uploads and changes will fail. Check Android storage permission in Diagnostics.') : null,
    el('div', { class: 'toolbar' }, rootSel, qInput, sortSel,
      el('button', { class: 'btn icon', type: 'button', 'aria-label': 'Refresh', onclick: () => load(true) }, icon('refresh'))),
    crumbs, dropHint, uploads, bulk, listBox, more, picker));
  load(true);
  return () => { gone = true; document.removeEventListener('dragover', onDragOver); document.removeEventListener('dragleave', onDragLeave); document.removeEventListener('drop', onDrop); window.removeEventListener('beforeunload', beforeUnload); };
}
