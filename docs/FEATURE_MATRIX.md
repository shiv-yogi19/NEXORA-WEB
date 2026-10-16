# Requirement ledger

| ID | Requirement | Backend | Frontend | Tests | Status |
|---|---|---|---|---|---|
| R1 | Static GitHub Pages frontend, hash routing, sub-path safe | – | index.html, router.js | e2e | Verified (local sub-path) |
| R2 | Flask+SQLite backend, no DB reset | app.py, database.py | – | test_core | Verified |
| R3 | No hardcoded tunnel URL, user-entered | – | api.js, settings.js | e2e | Verified |
| R4 | ngrok skip header | – | config.js, api.js | – | Not verified (no tunnel) |
| R5 | CORS allow-list | security.py | – | test_auth | Verified |
| R6 | Auth, setup code, registration off | auth.py | auth.js | test_auth, e2e | Verified |
| R7 | Rate limit | security.py | – | test_auth | Verified |
| R8 | Migrations/backup/restore | database.py, run.py | settings.js | test_core | Verified |
| R9 | Library, scan, search | media_service.py, routes_library.py | media.js, search.js | test_library, e2e | Verified |
| R10 | Range streaming | media_service.py | player.js | test_range, e2e | Verified |
| R11 | File manager + upload | file_service.py, storage.py | files.js | test_files, e2e | Verified |
| R12 | Favorites/watchlist/history/progress | routes_user.py | favorites.js, dashboard.js | e2e | Verified |
| R13 | Shares | sharing_service.py, routes_shares.py | sharing.js | test_shares, e2e | Verified |
| R14 | Settings/diagnostics | routes_system.py, diagnostics.py | settings.js, diagnostics.js | e2e | Verified |
| R15 | PWA/offline | – | manifest.json, service-worker.js | e2e | Verified (Chromium) |
| R16 | Dino game | – | game.js | e2e | Verified |
| R17 | Liquid Glass UI, a11y, responsive | – | assets/css | e2e, screenshots | Verified visually (no formal a11y audit) |
| R18 | Pydroid 3 / Android operation | run.py, scripts/check_environment.py | – | none | Not verified |
