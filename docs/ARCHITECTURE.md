# Architecture

```
Browser (GitHub Pages, static)  --HTTPS + Bearer token-->  ngrok  -->  Flask (Pydroid 3, 127.0.0.1:8765)  -->  SQLite + media folders
```
**Backend (`mobile-server/`)**: `app.py` factory (CORS, headers, error handlers) → blueprints `routes_*.py` → services (`media_service`, `file_service`, `sharing_service`, `auth`, `diagnostics`) → `storage.py` (path sandbox) and `database.py` (WAL, FK, `BEGIN IMMEDIATE`, numbered migrations in `migrations/`, backup/restore). `config.py` reads `config.json` in the data dir. `run.py` is the menu/CLI.
**Frontend**: `index.html` + ES modules in `assets/js` (`api` client and connection ladder, hash `router`, `auth`, page modules, `player` with a global audio element/mini-player), CSS tokens/base/layout/components/animations/responsive, `service-worker.js` (shell cache only).
**Decisions**: bearer tokens (cross-site cookies blocked); media tickets for `<video>/<audio>/<img>`; hash routing for sub-path hosting; no build step; no hardcoded backend URL; DB never reset at startup.
**Tests**: `mobile-server/tests` (stdlib unittest) and `frontend-tests/e2e_smoke.py` (Playwright + Chromium).
