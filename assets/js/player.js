// NEXORA players: video, audio (+mini player), image viewer — Created By Shiv Yogi
import * as api from './api.js';
import { el, mount, clear, fmtBytes, fmtTime, fmtDate, clamp } from './utils.js';
import { icon, kindIcon, toast, openMenu, errorState, emptyState } from './ui.js';
import { toggleFavorite, toggleWatchlist, downloadItem, itemMenu, showDetails } from './media.js';
import { navigate } from './router.js';
import { isAdmin } from './auth.js';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

async function ticketUrl(item) { const t = await api.post('/media/' + item.id + '/ticket'); return api.absolute(t.stream); }

/** Work out why a stream failed, in words the owner can act on. */
async function diagnose(url) {
  try {
    const r = await fetch(url, { method: 'HEAD', cache: 'no-store', headers: /ngrok/.test(url) ? { 'ngrok-skip-browser-warning': '69420' } : {} });
    if (r.status === 410) return 'This file is no longer on the server. It may have been moved or deleted.';
    if (r.status === 401) return 'This playback link expired. Reload to get a fresh one.';
    if (r.ok) return 'The file was found but this browser can’t play its format (' + (r.headers.get('content-type') || 'unknown') + '). You can download it instead.';
    return 'The server answered with an error (' + r.status + ').';
  } catch { return 'Can’t reach the server right now.'; }
}

function throttleSave(item, getPos) {
  let last = 0;
  const save = async (force) => {
    const now = Date.now();
    if (!force && now - last < 10000) return; last = now;
    const { position, duration } = getPos();
    if (!isFinite(position) || !isFinite(duration)) return;
    try { await api.put('/progress/' + item.id, { position: Math.floor(position), duration: Math.floor(duration || 0) }, { timeout: 8000 }); } catch { /* progress is best effort */ }
  };
  return save;
}

async function loadContext(id) {
  const item = await api.get('/library/items/' + id);
  const [prefs, prog] = await Promise.all([api.get('/preferences').catch(() => ({})), api.get('/progress/' + id).catch(() => ({ position: 0 }))]);
  return { item, prefs, prog };
}
async function siblings(item) {
  try { return (await api.get('/library/albums/' + item.id)).items; } catch { return [item]; }
}

function actionBar(item, onChange) {
  const fav = el('button', { class: 'btn' + (item.favorite ? ' on' : ''), type: 'button', 'aria-pressed': String(!!item.favorite), onclick: async () => { const v = await toggleFavorite(item); fav.classList.toggle('on', v); fav.setAttribute('aria-pressed', String(v)); } }, icon('heart'), el('span', { class: 'lbl' }, 'Favorite'));
  const wl = el('button', { class: 'btn' + (item.watchlist ? ' on' : ''), type: 'button', 'aria-pressed': String(!!item.watchlist), onclick: async () => { const v = await toggleWatchlist(item); wl.classList.toggle('on', v); wl.setAttribute('aria-pressed', String(v)); } }, icon('bookmark'), el('span', { class: 'lbl' }, 'Watchlist'));
  return el('div', { class: 'toolbar' }, fav, wl,
    isAdmin() ? el('button', { class: 'btn', type: 'button', onclick: () => import('./sharing.js').then((m) => m.createShareDialog(item)) }, icon('share'), el('span', { class: 'lbl' }, 'Share')) : null,
    el('button', { class: 'btn', type: 'button', onclick: () => downloadItem(item) }, icon('download'), el('span', { class: 'lbl' }, 'Download')),
    el('button', { class: 'btn', type: 'button', onclick: () => showDetails(item) }, icon('info'), el('span', { class: 'lbl' }, 'Details')));
}

/* ============================== VIDEO ============================== */
function srtToVtt(srt) {
  return 'WEBVTT\n\n' + srt.replace(/\r+/g, '').replace(/^\d+\n/gm, '').replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
}
async function findSubtitles(item) {
  try {
    const base = item.name.replace(/\.[^.]+$/, '');
    const d = await api.get('/library/items', { query: { root: item.root, folder: item.folder, kind: 'other', per_page: 100, q: base } });
    return d.items.filter((i) => ['vtt', 'srt'].includes(i.ext) && i.name.startsWith(base));
  } catch { return []; }
}

function videoView(root, { item, prefs, prog }, list) {
  const video = el('video', { playsinline: true, preload: 'metadata', 'aria-label': item.name });
  const stage = el('div', { class: 'stage', tabindex: '-1' }, video);
  const msg = el('div', { class: 'overlay-msg', hidden: true });
  const spinner = el('div', { class: 'overlay-msg', hidden: true, style: { background: 'transparent', pointerEvents: 'none' } }, el('span', { class: 'chip' }, 'Buffering…'));
  const seek = el('input', { class: 'seek', type: 'range', min: '0', max: '1000', value: '0', step: '1', 'aria-label': 'Seek' });
  const cur = el('span', { class: 'time' }, '0:00'), dur = el('span', { class: 'time' }, '0:00');
  const playBtn = el('button', { class: 'btn icon', type: 'button', 'aria-label': 'Play' }, icon('play'));
  const back = el('button', { class: 'btn icon hide-sm', type: 'button', 'aria-label': 'Back 10 seconds', onclick: () => skip(-10) }, icon('rewind'));
  const fwd = el('button', { class: 'btn icon hide-sm', type: 'button', 'aria-label': 'Forward 10 seconds', onclick: () => skip(10) }, icon('forward'));
  const speedBtn = el('button', { class: 'btn small', type: 'button', 'aria-label': 'Playback speed' }, '1×');
  const ccBtn = el('button', { class: 'btn small', type: 'button', hidden: true, 'aria-pressed': 'false', 'aria-label': 'Subtitles' }, 'CC');
  const muteBtn = el('button', { class: 'btn icon hide-sm', type: 'button', 'aria-label': 'Mute' }, icon('volume'));
  const vol = el('input', { class: 'seek vol', type: 'range', min: '0', max: '1', step: '0.05', value: String(prefs.default_volume ?? 1), 'aria-label': 'Volume' });
  const fsBtn = el('button', { class: 'btn icon', type: 'button', 'aria-label': 'Fullscreen' }, icon('fullscreen'));
  stage.append(msg, spinner, el('div', { class: 'ctl' }, seek, el('div', { class: 'ctl-row' }, playBtn, back, fwd, cur, el('span', { class: 'time' }, '/'), dur, el('span', { class: 'grow' }), ccBtn, speedBtn, muteBtn, vol, fsBtn)));

  video.volume = clamp(Number(prefs.default_volume ?? 1), 0, 1); vol.value = String(video.volume);
  const setSpeed = (s) => { video.playbackRate = s; speedBtn.textContent = s + '×'; };
  setSpeed(Number(prefs.default_speed || 1));
  const save = throttleSave(item, () => ({ position: video.currentTime, duration: video.duration }));
  let dragging = false, idleT, retried = false, destroyed = false, wantPos = 0;

  const skip = (d) => { video.currentTime = clamp(video.currentTime + d, 0, video.duration || 1e9); wake(); };
  const toggle = () => { if (video.paused) video.play().catch(() => {}); else video.pause(); };
  playBtn.onclick = toggle;
  const wake = () => { stage.classList.remove('idle'); clearTimeout(idleT); if (!video.paused) idleT = setTimeout(() => { if (!video.paused) stage.classList.add('idle'); }, 2800); };
  ['pointermove', 'pointerdown', 'keydown'].forEach((ev) => stage.addEventListener(ev, wake));

  video.addEventListener('play', () => { clear(playBtn); playBtn.append(icon('pause')); playBtn.setAttribute('aria-label', 'Pause'); wake(); });
  video.addEventListener('pause', () => { clear(playBtn); playBtn.append(icon('play')); playBtn.setAttribute('aria-label', 'Play'); stage.classList.remove('idle'); save(true); });
  video.addEventListener('ended', () => { save(true); stage.classList.remove('idle'); const i = list.findIndex((x) => x.id === item.id); if (prefs.autoplay !== false && i >= 0 && i < list.length - 1) toast('Up next: ' + list[i + 1].name, 'info'); });
  video.addEventListener('waiting', () => { spinner.hidden = false; });
  ['playing', 'canplay', 'seeked'].forEach((ev) => video.addEventListener(ev, () => { spinner.hidden = true; }));
  video.addEventListener('loadedmetadata', () => {
    dur.textContent = fmtTime(video.duration);
    if (wantPos > 0 && wantPos < video.duration - 3) video.currentTime = wantPos;
  });
  video.addEventListener('timeupdate', () => {
    cur.textContent = fmtTime(video.currentTime);
    if (!dragging && video.duration) { const p = (video.currentTime / video.duration) * 1000; seek.value = String(p); seek.style.setProperty('--p', p / 10 + '%'); }
    save(false);
  });
  seek.addEventListener('input', () => { dragging = true; if (video.duration) { video.currentTime = (seek.value / 1000) * video.duration; seek.style.setProperty('--p', seek.value / 10 + '%'); } });
  seek.addEventListener('change', () => { dragging = false; });
  vol.addEventListener('input', () => { video.volume = Number(vol.value); video.muted = false; });
  video.addEventListener('volumechange', () => { clear(muteBtn); muteBtn.append(icon(video.muted || video.volume === 0 ? 'mute' : 'volume')); });
  muteBtn.onclick = () => { video.muted = !video.muted; };
  speedBtn.onclick = () => openMenu(speedBtn, SPEEDS.map((s) => ({ label: s + '×' + (s === video.playbackRate ? '  ✓' : ''), icon: 'play', onClick: () => setSpeed(s) })));

  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  const toggleFs = () => {
    if (fsEl()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
    const req = stage.requestFullscreen || stage.webkitRequestFullscreen;
    if (req) req.call(stage); else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
  };
  fsBtn.onclick = toggleFs;
  const onFs = () => stage.classList.toggle('fs', !!fsEl());
  document.addEventListener('fullscreenchange', onFs); document.addEventListener('webkitfullscreenchange', onFs);

  // touch: double-tap left/right third seeks 10 s, single tap toggles play
  let lastTap = 0, tapTimer;
  video.addEventListener('click', (e) => {
    const r = video.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, now = Date.now();
    if (now - lastTap < 320) { clearTimeout(tapTimer); lastTap = 0; if (x < 0.34) skip(-10); else if (x > 0.66) skip(10); else toggleFs(); return; }
    lastTap = now; tapTimer = setTimeout(toggle, 330);
  });

  const onKey = (e) => {
    if (e.target.closest && e.target.closest('input[type=text],input[type=search],textarea,select')) return;
    if (document.querySelector('.scrim')) return;
    const k = e.key.toLowerCase();
    if (k === ' ' || k === 'k') { if (e.target.tagName === 'BUTTON') return; e.preventDefault(); toggle(); }
    else if (k === 'arrowleft') { e.preventDefault(); skip(-5); } else if (k === 'arrowright') { e.preventDefault(); skip(5); }
    else if (k === 'j') skip(-10); else if (k === 'l') skip(10);
    else if (k === 'f') toggleFs(); else if (k === 'm') video.muted = !video.muted;
    else if (k === 'arrowup' && e.target.tagName !== 'INPUT') { e.preventDefault(); video.volume = clamp(video.volume + 0.1, 0, 1); vol.value = String(video.volume); }
    else if (k === 'arrowdown' && e.target.tagName !== 'INPUT') { e.preventDefault(); video.volume = clamp(video.volume - 0.1, 0, 1); vol.value = String(video.volume); }
    else if (k === 'c' && !ccBtn.hidden) ccBtn.click();
  };
  document.addEventListener('keydown', onKey);

  async function attach(position) {
    msg.hidden = true;
    try { wantPos = position; video.src = await ticketUrl(item); } catch (e) { showError(e.message, null); return; }
    if (prefs.autoplay !== false) video.play().catch(() => {});
  }
  async function showError(text, url) {
    spinner.hidden = true;
    const why = text || await diagnose(url || video.currentSrc);
    mount(msg, el('div', { class: 'stack', style: { alignItems: 'center' } }, icon('alert'), el('p', {}, why),
      el('div', { class: 'row', style: { justifyContent: 'center' } }, el('button', { class: 'btn', type: 'button', onclick: () => { retried = false; attach(video.currentTime || 0); } }, icon('refresh'), 'Try again'),
        el('button', { class: 'btn', type: 'button', onclick: () => downloadItem(item) }, icon('download'), 'Download'))));
    msg.hidden = false;
  }
  video.addEventListener('error', async () => {
    if (destroyed) return;
    if (!retried) { retried = true; const pos = video.currentTime || wantPos; try { video.src = await ticketUrl(item); wantPos = pos; video.play().catch(() => {}); return; } catch (e) { return showError(e.message); } }
    showError(null, video.currentSrc);
  });

  // subtitles
  findSubtitles(item).then(async (subs) => {
    if (!subs.length || destroyed) return;
    let url = null;
    try {
      const sub = subs[0];
      const turl = await ticketUrl(sub);
      const text = await (await fetch(turl, { headers: /ngrok/.test(turl) ? { 'ngrok-skip-browser-warning': '69420' } : {} })).text();
      url = URL.createObjectURL(new Blob([sub.ext === 'srt' ? srtToVtt(text) : text], { type: 'text/vtt' }));
    } catch { return; }
    const track = el('track', { kind: 'subtitles', label: 'Subtitles', srclang: 'en', src: url }); video.append(track);
    track.track.mode = 'disabled'; ccBtn.hidden = false;
    ccBtn.onclick = () => { const on = track.track.mode !== 'showing'; track.track.mode = on ? 'showing' : 'disabled'; ccBtn.setAttribute('aria-pressed', String(on)); ccBtn.classList.toggle('on', on); };
  });

  const resume = prefs.resume_playback !== false && prog.position > 5 && !prog.completed ? prog.position : 0;
  attach(resume);
  if (resume) toast('Resuming from ' + fmtTime(resume), 'info');
  const vis = () => { if (document.hidden) save(true); };
  document.addEventListener('visibilitychange', vis); window.addEventListener('pagehide', vis);
  return {
    node: stage,
    destroy() {
      destroyed = true; save(true); clearTimeout(idleT); clearTimeout(tapTimer);
      document.removeEventListener('keydown', onKey); document.removeEventListener('fullscreenchange', onFs); document.removeEventListener('webkitfullscreenchange', onFs);
      document.removeEventListener('visibilitychange', vis); window.removeEventListener('pagehide', vis);
      if (fsEl()) { try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch { /* ignore */ } }
      video.pause(); video.removeAttribute('src'); video.load();
    },
  };
}

/* ============================== AUDIO (global, survives navigation) ============================== */
const A = { el: new Audio(), item: null, list: [], idx: -1, repeat: 'off', shuffle: false, prefs: {}, save: null };
A.el.preload = 'metadata';
const audioSubs = new Set();
const fire = () => audioSubs.forEach((f) => f());
['play', 'pause', 'timeupdate', 'loadedmetadata', 'ended', 'volumechange', 'error'].forEach((ev) => A.el.addEventListener(ev, fire));
A.el.addEventListener('ended', () => audioNext(true));
A.el.addEventListener('pause', () => A.save && A.save(true));
A.el.addEventListener('timeupdate', () => A.save && A.save(false));
A.el.addEventListener('error', async () => {
  if (!A.item) return;
  if (!A._retried) { A._retried = true; const pos = A.el.currentTime; try { A.el.src = await ticketUrl(A.item); A.el.currentTime = pos; A.el.play().catch(() => {}); return; } catch { /* fall through */ } }
  A.error = await diagnose(A.el.currentSrc || ''); fire();
});

async function audioLoad(item, list, prefs, resumeAt = 0, autoplay = true) {
  if (A.save) A.save(true);
  A.item = item; A.list = list.length ? list : [item]; A.idx = A.list.findIndex((x) => x.id === item.id); A.prefs = prefs || A.prefs; A.error = null; A._retried = false;
  A.save = throttleSave(item, () => ({ position: A.el.currentTime, duration: A.el.duration }));
  fire();
  try { A.el.src = await ticketUrl(item); } catch (e) { A.error = e.message; fire(); return; }
  if (resumeAt > 3) A.el.addEventListener('loadedmetadata', () => { A.el.currentTime = resumeAt; }, { once: true });
  if (autoplay) A.el.play().catch(() => { /* blocked until the user taps play */ });
  api.post('/history', { media_id: item.id }).catch(() => {});
}
function audioNext(auto) {
  if (!A.list.length) return;
  if (auto && A.repeat === 'one') { A.el.currentTime = 0; A.el.play().catch(() => {}); return; }
  let n;
  if (A.shuffle && A.list.length > 1) { do { n = Math.floor(Math.random() * A.list.length); } while (n === A.idx); }
  else n = A.idx + 1;
  if (n >= A.list.length) { if (A.repeat === 'all' || !auto) n = 0; else return; }
  audioLoad(A.list[n], A.list, A.prefs, 0, true);
}
function audioPrev() {
  if (!A.list.length) return;
  if (A.el.currentTime > 4) { A.el.currentTime = 0; return; }
  const n = (A.idx - 1 + A.list.length) % A.list.length; audioLoad(A.list[n], A.list, A.prefs, 0, true);
}
const audioToggle = () => { if (A.el.paused) A.el.play().catch(() => {}); else A.el.pause(); };

function audioView(root, { item, prefs, prog }, list) {
  const playBtn = el('button', { class: 'btn icon primary', type: 'button', style: { width: '56px', minHeight: '56px' }, 'aria-label': 'Play', onclick: audioToggle }, icon('play'));
  const seek = el('input', { class: 'seek', type: 'range', min: '0', max: '1000', value: '0', 'aria-label': 'Seek', style: { '--p': '0%' } });
  const cur = el('span', { class: 'time' }, '0:00'), dur = el('span', { class: 'time' }, '0:00');
  const title = el('h2', { style: { textAlign: 'center' } }, item.name);
  const errBox = el('div', { class: 'banner bad', hidden: true, role: 'alert' });
  const rep = el('button', { class: 'btn icon', type: 'button', 'aria-label': 'Repeat: off', onclick: () => { A.repeat = { off: 'all', all: 'one', one: 'off' }[A.repeat]; paint(); } }, icon('repeat'));
  const shuf = el('button', { class: 'btn icon', type: 'button', 'aria-pressed': 'false', 'aria-label': 'Shuffle', onclick: () => { A.shuffle = !A.shuffle; paint(); } }, icon('shuffle'));
  const volume = el('input', { class: 'seek vol', type: 'range', min: '0', max: '1', step: '0.05', value: String(A.el.volume), 'aria-label': 'Volume', oninput: () => { A.el.volume = Number(volume.value); } });
  const listBox = el('div', { class: 'list', role: 'list' });
  let dragging = false;
  seek.addEventListener('input', () => { dragging = true; if (A.el.duration) A.el.currentTime = (seek.value / 1000) * A.el.duration; });
  seek.addEventListener('change', () => { dragging = false; });

  function paintList() {
    mount(listBox, A.list.map((t, i) => el('button', { class: 'list-row' + (A.item && t.id === A.item.id ? ' selected' : ''), type: 'button', role: 'listitem', 'aria-current': A.item && t.id === A.item.id ? 'true' : false,
      onclick: () => { navigate('/view/' + t.id, { replace: false }); } },
      el('span', { class: 'thumb-s' }, icon(A.item && t.id === A.item.id && !A.el.paused ? 'volume' : 'music')), el('span', { class: 'info' }, el('span', { class: 'name truncate' }, t.name), el('span', { class: 'tiny' }, fmtBytes(t.size))))));
  }
  function paint() {
    if (!A.item) return;
    title.textContent = A.item.name;
    clear(playBtn); playBtn.append(icon(A.el.paused ? 'play' : 'pause')); playBtn.setAttribute('aria-label', A.el.paused ? 'Play' : 'Pause');
    cur.textContent = fmtTime(A.el.currentTime); dur.textContent = fmtTime(A.el.duration);
    if (!dragging && A.el.duration) { const p = (A.el.currentTime / A.el.duration) * 1000; seek.value = String(p); seek.style.setProperty('--p', p / 10 + '%'); }
    rep.setAttribute('aria-label', 'Repeat: ' + A.repeat); rep.classList.toggle('on', A.repeat !== 'off'); rep.title = 'Repeat: ' + A.repeat;
    shuf.setAttribute('aria-pressed', String(A.shuffle)); shuf.classList.toggle('on', A.shuffle);
    errBox.hidden = !A.error; if (A.error) mount(errBox, icon('alert'), el('span', { class: 'grow' }, A.error), el('button', { class: 'btn small', type: 'button', onclick: () => downloadItem(A.item) }, 'Download'));
  }
  let lastIdx = -2;
  const sub = () => { paint(); if (A.idx !== lastIdx) { lastIdx = A.idx; paintList(); } };
  audioSubs.add(sub);

  if (!A.item || A.item.id !== item.id) audioLoad(item, list, prefs, prefs.resume_playback !== false && !prog.completed ? prog.position : 0, prefs.autoplay !== false);
  else { A.list = list.length ? list : A.list; A.idx = A.list.findIndex((x) => x.id === item.id); }
  sub(); paintList();

  const node = el('div', { class: 'stack', style: { maxWidth: '560px', margin: '0 auto', width: '100%' } },
    el('div', { class: 'audio-art glass' }, icon('music')), title, errBox,
    el('div', { class: 'stack', style: { gap: '4px' } }, seek, el('div', { class: 'row', style: { justifyContent: 'space-between' } }, cur, dur)),
    el('div', { class: 'row', style: { justifyContent: 'center', gap: '12px' } }, shuf,
      el('button', { class: 'btn icon', type: 'button', 'aria-label': 'Previous track', onclick: audioPrev }, icon('skipB')), playBtn,
      el('button', { class: 'btn icon', type: 'button', 'aria-label': 'Next track', onclick: () => audioNext(false) }, icon('skipF')), rep),
    el('div', { class: 'row', style: { justifyContent: 'center' } }, icon('volume'), volume),
    list.length > 1 ? el('div', { class: 'glass card' }, el('h3', {}, 'In this folder'), listBox) : null);
  const onKey = (e) => { if (e.code === 'Space' && !/^(BUTTON|INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && !document.querySelector('.scrim')) { e.preventDefault(); audioToggle(); } };
  document.addEventListener('keydown', onKey);
  return { node, destroy() { audioSubs.delete(sub); document.removeEventListener('keydown', onKey); } };   // playback continues in the mini player
}

/* ---- mini player (mounted once by the app shell) ---- */
export function createMiniPlayer() {
  const title = el('div', { class: 'truncate', style: { fontWeight: '560' } });
  const sub = el('div', { class: 'tiny' });
  const play = el('button', { class: 'btn icon small primary', type: 'button', 'aria-label': 'Play', onclick: audioToggle }, icon('play'));
  const node = el('div', { class: 'miniplayer glass', hidden: true, role: 'region', 'aria-label': 'Now playing' },
    el('button', { class: 'thumb-s', type: 'button', style: { border: 0, width: '40px', height: '40px', borderRadius: '12px', display: 'grid', placeItems: 'center', background: 'var(--glass-strong)', color: 'inherit' }, 'aria-label': 'Open player', onclick: () => A.item && navigate('/view/' + A.item.id) }, icon('music')),
    el('div', { class: 'meta' }, title, sub),
    el('button', { class: 'btn icon small', type: 'button', 'aria-label': 'Next track', onclick: () => audioNext(false) }, icon('skipF')), play,
    el('button', { class: 'btn icon small ghost', type: 'button', 'aria-label': 'Close player', onclick: () => { A.el.pause(); if (A.save) A.save(true); A.item = null; A.el.removeAttribute('src'); fire(); } }, icon('x')));
  let route = '';
  const update = () => {
    const onItem = A.item && route === '/view/' + A.item.id;
    node.hidden = !A.item || onItem;
    if (!A.item) return;
    title.textContent = A.item.name; sub.textContent = fmtTime(A.el.currentTime) + ' / ' + fmtTime(A.el.duration);
    clear(play); play.append(icon(A.el.paused ? 'play' : 'pause')); play.setAttribute('aria-label', A.el.paused ? 'Play' : 'Pause');
  };
  audioSubs.add(update);
  return { node, setRoute(p) { route = p; update(); } };
}
export const audioHasSession = () => !!A.item;

/* ============================== IMAGE ============================== */
function imageView(root, { item }, list) {
  const idx = list.findIndex((x) => x.id === item.id);
  const prev = idx > 0 ? list[idx - 1] : null, next = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null;
  const viewer = el('div', { class: 'viewer', 'aria-busy': 'true' });
  const status = el('div', { class: 'state' }, el('span', { class: 'chip' }, 'Loading image…'));
  viewer.append(status);
  ticketUrl(item).then((url) => {
    const img = el('img', { alt: item.name, decoding: 'async' });
    img.onload = () => { status.remove(); viewer.removeAttribute('aria-busy'); meta.textContent = img.naturalWidth + ' × ' + img.naturalHeight + ' px · ' + fmtBytes(item.size); };
    img.onerror = async () => { mount(status, icon('alert'), el('p', {}, await diagnose(url)), el('button', { class: 'btn', type: 'button', onclick: () => downloadItem(item) }, icon('download'), 'Download')); };
    img.addEventListener('click', () => { viewer.classList.toggle('zoom'); });
    viewer.append(img); img.src = url;
  }).catch((e) => mount(status, errorState(e, () => navigate('/view/' + item.id))));
  const meta = el('span', { class: 'tiny' }, fmtBytes(item.size));
  const go = (t) => navigate('/view/' + t.id);
  const onKey = (e) => { if (document.querySelector('.scrim')) return; if (e.key === 'ArrowLeft' && prev) go(prev); else if (e.key === 'ArrowRight' && next) go(next); else if (e.key.toLowerCase() === 'z') viewer.classList.toggle('zoom'); };
  document.addEventListener('keydown', onKey);
  const node = el('div', { class: 'stack' }, viewer,
    el('div', { class: 'row', style: { justifyContent: 'space-between' } },
      el('button', { class: 'btn', type: 'button', disabled: !prev, onclick: () => go(prev) }, icon('chevL'), 'Previous'),
      el('div', { class: 'row' }, meta, el('button', { class: 'btn small', type: 'button', onclick: () => viewer.classList.toggle('zoom') }, icon('zoom'), 'Zoom')),
      el('button', { class: 'btn', type: 'button', disabled: !next, onclick: () => go(next) }, 'Next', icon('chevR'))));
  return { node, destroy() { document.removeEventListener('keydown', onKey); } };
}

/* ============================== route ============================== */
export async function viewScreen(root, ctx) {
  const id = Number(ctx.params.id);
  mount(root, el('div', { class: 'page' }, el('div', { class: 'skeleton', style: { aspectRatio: '16/9' } })));
  let data;
  try { data = await loadContext(id); } catch (e) {
    mount(root, el('div', { class: 'page' }, errorState(e, () => viewScreen(root, ctx)), el('a', { class: 'btn', href: '#/library' }, 'Back to library'))); return;
  }
  const { item } = data;
  const list = item.kind === 'other' ? [item] : await siblings(item);
  let view = null;
  const head = el('div', { class: 'page-head' }, el('button', { class: 'btn icon', type: 'button', 'aria-label': 'Go back', onclick: () => (history.length > 1 ? history.back() : navigate('/library')) }, icon('chevL')),
    el('h1', { class: 'truncate', style: { fontSize: 'var(--fs-lg)' } }, item.name), el('button', { class: 'btn icon', type: 'button', 'aria-label': 'More actions', onclick: (e) => itemMenu(item, e.currentTarget) }, icon('more')));
  if (item.kind !== 'audio') api.post('/history', { media_id: item.id }).catch(() => {});
  if (item.kind === 'video') view = videoView(root, data, list);
  else if (item.kind === 'audio') view = audioView(root, data, list);
  else if (item.kind === 'image') view = imageView(root, data, list);
  const body = view ? view.node : el('div', { class: 'glass card' }, emptyState(kindIcon(item.kind), 'No preview for this file type', 'You can download it or share it.', el('button', { class: 'btn primary', type: 'button', onclick: () => downloadItem(item) }, icon('download'), 'Download')));
  mount(root, el('div', { class: 'page' }, head, body, item.missing ? el('div', { class: 'banner warn' }, icon('alert'), 'This file is missing on the server.') : null, actionBar(item), el('p', { class: 'tiny' }, item.root + '/' + item.path + ' · ' + item.mime)));
  return () => view && view.destroy();
}
