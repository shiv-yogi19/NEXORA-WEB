# Feature status

Status words: **COMPLETE AND VERIFIED** (automated tests actually run in this Linux environment: 106 backend tests, 2 skipped; 59/59 headless-Chromium e2e checks) · **IMPLEMENTED BUT NOT VERIFIED** · **PARTIALLY IMPLEMENTED** · **NOT IMPLEMENTED** · **BLOCKED**.
"Verified" never means tested on Android, Pydroid 3, a real ngrok tunnel, or real GitHub Pages. Those rows are marked separately.

| Feature | Status | Note |
|---|---|---|
| Owner setup with one-time code; registration off by default | COMPLETE AND VERIFIED | test_auth |
| Password hashing, sessions, logout, expiry, revoke, change password | COMPLETE AND VERIFIED | test_auth |
| Login rate limiting; generic login errors | COMPLETE AND VERIFIED | in-memory limiter |
| Server-side auth on every protected route; admin separation | COMPLETE AND VERIFIED | test_auth |
| CORS allow-list, PNA preflight, security headers | COMPLETE AND VERIFIED | test_auth |
| Versioned migrations, pre-migration backup, never reset DB | COMPLETE AND VERIFIED | test_core |
| Backup / restore (CLI + backup button) | COMPLETE AND VERIFIED | restore is CLI/menu only by design |
| Storage sandbox / path traversal protection | COMPLETE AND VERIFIED | test_files |
| Scanner, media index, filters, sort, pagination, search | COMPLETE AND VERIFIED | test_library, e2e |
| HTTP Range / HEAD / If-Range / 416 streaming | COMPLETE AND VERIFIED | test_range, e2e (206 seen) |
| Upload (limits, atomic, no overwrite) and file manager CRUD | COMPLETE AND VERIFIED | test_files, e2e |
| Favorites, watchlist, history, progress, continue watching | COMPLETE AND VERIFIED | e2e + tests |
| Temporary shares (hash, expiry, limit, password, revoke, log) | COMPLETE AND VERIFIED | test_shares, e2e |
| Video, audio (mini-player persists), image viewer, subtitles | COMPLETE AND VERIFIED | e2e, Chromium only |
| Settings, diagnostics, connection ladder | COMPLETE AND VERIFIED | e2e |
| Intro, themes, reduced motion, responsive (390 px no overflow) | COMPLETE AND VERIFIED | e2e + screenshots |
| PWA shell, offline shell, update banner | COMPLETE AND VERIFIED | e2e (Chromium) |
| Dino game | COMPLETE AND VERIFIED | e2e |
| ngrok header on ngrok hosts | IMPLEMENTED BUT NOT VERIFIED | no real tunnel |
| Interstitial on direct media/download navigations | IMPLEMENTED BUT NOT VERIFIED | user clicks Visit Site |
| Running on Android / Pydroid 3 | IMPLEMENTED BUT NOT VERIFIED | check_environment.py provided |
| ngrok on-device (pyngrok in Pydroid) | BLOCKED | unverifiable here; alternatives documented |
| Real GitHub Pages deploy | IMPLEMENTED BUT NOT VERIFIED | tested under local /NEXORA/ path |
| Safari / Firefox | IMPLEMENTED BUT NOT VERIFIED | |
| Image thumbnails | PARTIALLY IMPLEMENTED | icons only |
| File-manager sort direction | NOT IMPLEMENTED | |
| Hardened WSGI server | NOT IMPLEMENTED | werkzeug dev server |
