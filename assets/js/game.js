// NEXORA offline runner game — Created By Shiv Yogi
// No network, no external API. Pauses when the tab is hidden; loop only runs while playing.
import { KEYS } from './config.js';
import { el, mount, lsGet, lsSet } from './utils.js';
import { icon } from './ui.js';

const W = 720, H = 240, GROUND = 190;

export function gameScreen(root) {
  const canvas = el('canvas', { id: 'dino', role: 'img', 'aria-label': 'Runner game. Press space or tap to jump.', tabindex: '0' });
  const ctx = canvas.getContext('2d');
  const scoreEl = el('span', { 'aria-live': 'off' }, 'Score 0'), bestEl = el('span', {}, '');
  const status = el('div', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
  let best = Number(lsGet(KEYS.best, '0')) || 0;
  bestEl.textContent = 'Best ' + best;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr; canvas.height = H * dpr; ctx.scale(dpr, dpr);
  const css = getComputedStyle(document.documentElement);
  const col = { fg: css.getPropertyValue('--text').trim() || '#eef3ff', dim: css.getPropertyValue('--text-3').trim() || '#888', acc: css.getPropertyValue('--accent').trim() || '#ffb36b' };

  let state = 'ready', raf = 0, last = 0, g;
  function reset() {
    g = { y: GROUND, vy: 0, duck: false, speed: 330, score: 0, obstacles: [], next: 0.9, t: 0, clouds: [{ x: 120, y: 40 }, { x: 420, y: 70 }, { x: 640, y: 30 }], ground: 0 };
  }
  reset();

  const player = () => (g.duck && g.y >= GROUND ? { x: 60, y: GROUND - 24, w: 50, h: 24 } : { x: 60, y: g.y - 44, w: 34, h: 44 });
  function jump() {
    if (state === 'ready' || state === 'over') { start(); return; }
    if (state === 'paused') { resume(); return; }
    if (g.y >= GROUND) { g.vy = -640; g.duck = false; }
  }
  function start() { reset(); state = 'running'; status.textContent = 'Game started'; last = performance.now(); loop(last); updatePauseBtn(); }
  function pause() { if (state !== 'running') return; state = 'paused'; cancelAnimationFrame(raf); draw(); status.textContent = 'Paused'; updatePauseBtn(); }
  function resume() { if (state !== 'paused') return; state = 'running'; last = performance.now(); loop(last); status.textContent = 'Resumed'; updatePauseBtn(); }
  function over() {
    state = 'over'; cancelAnimationFrame(raf);
    const s = Math.floor(g.score);
    if (s > best) { best = s; lsSet(KEYS.best, String(best)); bestEl.textContent = 'Best ' + best; }
    status.textContent = 'Game over. Score ' + s; draw(); updatePauseBtn();
  }

  function spawn() {
    const bird = g.score > 300 && Math.random() < 0.3;
    if (bird) g.obstacles.push({ type: 'bird', x: W + 20, y: [GROUND - 22, GROUND - 52][Math.floor(Math.random() * 2)] , w: 36, h: 22, f: 0 });
    else { const n = 1 + Math.floor(Math.random() * 3); g.obstacles.push({ type: 'cactus', x: W + 20, w: 16 * n + 4 * (n - 1), h: 28 + Math.floor(Math.random() * 22), n }); }
  }
  function step(dt) {
    g.t += dt; g.speed = 330 + Math.min(300, g.score * 0.45); g.score += dt * g.speed * 0.03;
    g.vy += 1900 * dt * (g.duck && g.y < GROUND ? 1.8 : 1); g.y = Math.min(GROUND, g.y + g.vy * dt); if (g.y >= GROUND) g.vy = 0;
    g.ground = (g.ground + g.speed * dt) % 24;
    g.next -= dt; if (g.next <= 0) { spawn(); g.next = 0.7 + Math.random() * 0.9 + 140 / g.speed; }
    for (const o of g.obstacles) { o.x -= g.speed * dt; if (o.type === 'bird') o.f += dt * 8; }
    g.obstacles = g.obstacles.filter((o) => o.x + o.w > -10);
    for (const c of g.clouds) { c.x -= g.speed * dt * 0.15; if (c.x < -60) { c.x = W + 40; c.y = 20 + Math.random() * 60; } }
    const p = player();
    for (const o of g.obstacles) {
      const oy = o.type === 'bird' ? o.y - o.h : GROUND - o.h;
      const hit = p.x + 4 < o.x + o.w - 3 && p.x + p.w - 4 > o.x + 3 && p.y + 3 < oy + o.h && p.y + p.h > oy + 3;
      if (hit) { over(); return; }
    }
    scoreEl.textContent = 'Score ' + Math.floor(g.score);
  }
  function loop(now) {
    if (state !== 'running') return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    step(dt);
    if (state === 'running') { draw(); raf = requestAnimationFrame(loop); }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = col.dim; ctx.fillStyle = col.dim;
    for (const c of g.clouds) { ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.ellipse(c.x, c.y, 26, 8, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.moveTo(0, GROUND + 2); ctx.lineTo(W, GROUND + 2); ctx.stroke();
    ctx.globalAlpha = 0.5; for (let x = -g.ground; x < W; x += 24) { ctx.fillRect(x, GROUND + 8, 8, 2); } ctx.globalAlpha = 1;
    // obstacles
    ctx.fillStyle = col.fg;
    for (const o of g.obstacles) {
      if (o.type === 'cactus') { for (let i = 0; i < o.n; i++) { const x = o.x + i * 20; ctx.fillRect(x + 5, GROUND - o.h, 7, o.h); ctx.fillRect(x, GROUND - o.h * 0.65, 5, 4); ctx.fillRect(x, GROUND - o.h * 0.65 - 8, 4, 12); ctx.fillRect(x + 12, GROUND - o.h * 0.5, 5, 4); ctx.fillRect(x + 13, GROUND - o.h * 0.5 - 8, 4, 12); } }
      else { const flap = Math.sin(o.f) > 0; ctx.fillRect(o.x + 8, o.y - 14, 22, 8); ctx.fillRect(o.x, o.y - 12, 10, 4); ctx.fillRect(o.x + 14, flap ? o.y - 26 : o.y - 6, 10, flap ? 12 : 10); }
    }
    // player
    const p = player();
    ctx.fillStyle = col.acc;
    if (g.duck && g.y >= GROUND) { ctx.fillRect(p.x, p.y + 6, 40, 16); ctx.fillRect(p.x + 36, p.y, 14, 14); }
    else { ctx.fillRect(p.x + 6, p.y + 14, 22, 24); ctx.fillRect(p.x + 14, p.y, 20, 18); ctx.fillRect(p.x, p.y + 20, 8, 6); const leg = state === 'running' && g.y >= GROUND && Math.floor(g.t * 12) % 2; ctx.fillRect(p.x + 8, p.y + 38, 6, leg ? 4 : 6); ctx.fillRect(p.x + 20, p.y + 38, 6, leg ? 6 : 4); }
    ctx.fillStyle = '#05080f'; ctx.fillRect(g.duck && g.y >= GROUND ? p.x + 44 : p.x + 28, g.duck && g.y >= GROUND ? p.y + 4 : p.y + 5, 3, 3);
    // overlay text
    ctx.textAlign = 'center'; ctx.fillStyle = col.fg;
    if (state === 'ready') { ctx.font = '600 20px system-ui, sans-serif'; ctx.fillText('Tap, or press Space to start', W / 2, 90); }
    if (state === 'paused') { ctx.font = '600 20px system-ui, sans-serif'; ctx.fillText('Paused', W / 2, 90); }
    if (state === 'over') { ctx.font = '700 26px system-ui, sans-serif'; ctx.fillText('Game over', W / 2, 84); ctx.font = '500 16px system-ui, sans-serif'; ctx.fillText('Score ' + Math.floor(g.score) + ' · tap or press Enter to play again', W / 2, 112); }
  }

  const onKey = (e) => {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || document.querySelector('.scrim')) return;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { if (e.target.tagName === 'BUTTON' && e.code === 'Space') return; e.preventDefault(); jump(); }
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); if (state === 'running') g.duck = true; }
    else if (e.code === 'KeyP' || e.code === 'Escape') { if (state === 'running') pause(); else if (state === 'paused') resume(); }
    else if (e.code === 'Enter' && (state === 'over' || state === 'ready')) { start(); }
  };
  const onKeyUp = (e) => { if (e.code === 'ArrowDown' || e.code === 'KeyS') g.duck = false; };
  const onHide = () => { if (document.hidden) pause(); };
  document.addEventListener('keydown', onKey); document.addEventListener('keyup', onKeyUp); document.addEventListener('visibilitychange', onHide);
  canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); jump(); });

  const pauseBtn = el('button', { class: 'btn', type: 'button', onclick: () => (state === 'paused' ? resume() : pause()) });
  function updatePauseBtn() { mount(pauseBtn, icon(state === 'paused' ? 'play' : 'pause'), state === 'paused' ? 'Resume' : 'Pause'); pauseBtn.disabled = state !== 'running' && state !== 'paused'; }
  const duckBtn = el('button', { class: 'btn', type: 'button', 'aria-label': 'Duck (hold)' }, 'Duck');
  duckBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); if (state === 'running') g.duck = true; }); ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => duckBtn.addEventListener(ev, () => { g.duck = false; }));
  updatePauseBtn(); draw();

  mount(root, el('div', { class: 'page', style: { maxWidth: '820px' } }, el('div', { class: 'page-head' }, el('h1', {}, 'Offline runner'), el('p', { class: 'sub' }, 'Works without a server or an internet connection.')),
    el('div', { class: 'glass card game-wrap' }, el('div', { class: 'score-row' }, scoreEl, bestEl), canvas,
      el('div', { class: 'row' }, el('button', { class: 'btn primary', type: 'button', onclick: jump }, icon('play'), 'Jump / Start'), duckBtn, pauseBtn),
      el('p', { class: 'tiny' }, 'Space, W or ↑ jumps · ↓ or S ducks under birds · P pauses · Enter restarts. The game pauses when you switch tabs.'), status)));
  return () => { cancelAnimationFrame(raf); state = 'paused'; document.removeEventListener('keydown', onKey); document.removeEventListener('keyup', onKeyUp); document.removeEventListener('visibilitychange', onHide); };
}
