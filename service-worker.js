/* NEXORA service worker — Created By Shiv Yogi
 * Caches ONLY the static app shell from this site's own origin so the interface (and the
 * offline game) opens without a connection. It never touches requests to other origins, so
 * API replies, sign-in data, share links and media streams (all served by your phone) are
 * never cached. Bump VERSION on every release: old caches are deleted on activate. */
const VERSION = 'nexora-shell-1.0.0';
const SHELL = [
  './', 'index.html', 'manifest.json',
  'assets/css/tokens.css', 'assets/css/base.css', 'assets/css/layout.css', 'assets/css/components.css', 'assets/css/animations.css', 'assets/css/responsive.css',
  'assets/js/config.js', 'assets/js/utils.js', 'assets/js/ui.js', 'assets/js/api.js', 'assets/js/router.js', 'assets/js/auth.js',
  'assets/js/media.js', 'assets/js/player.js', 'assets/js/files.js', 'assets/js/search.js', 'assets/js/favorites.js', 'assets/js/sharing.js',
  'assets/js/settings.js', 'assets/js/diagnostics.js', 'assets/js/dashboard.js', 'assets/js/game.js', 'assets/js/app.js',
  'assets/icons/icon.svg', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)));   // no skipWaiting: the app offers "Reload" instead
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('nexora-shell-') && k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => { if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;   // API/media/other origins: network only
  if (req.headers.has('range')) return;
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    if (req.mode === 'navigate') {
      try { const fresh = await fetch(req); if (fresh.ok) cache.put('index.html', fresh.clone()); return fresh; }
      catch { return (await cache.match('index.html')) || (await cache.match('./')) || Response.error(); }
    }
    const hit = await cache.match(req, { ignoreSearch: true });
    const refresh = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
    return hit || (await refresh) || Response.error();   // stale-while-revalidate for static files
  })());
});
