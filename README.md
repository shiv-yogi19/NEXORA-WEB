# NEXORA

**Created By Shiv Yogi** — a private media library you host on your own phone and open from anywhere.

- **Frontend**: static site (plain HTML/CSS/ES modules, no build step) for GitHub Pages at `https://shiv-yogi19.github.io/NEXORA/`.
- **Backend**: Flask + SQLite in `mobile-server/`, intended to run in Pydroid 3 on Android.
- **Access**: an HTTPS tunnel (ngrok). Free ngrok URLs change on restart, so you paste the current URL into the app's *Connect* panel. No URL is hardcoded.

## What it does
Media library (video, audio, images) with scanner, players, HTTP Range streaming, file manager and uploads, favorites, watchlist, history and resume, search, temporary share links, settings, diagnostics, backup/restore, offline app shell (PWA), a built-in Dino game, and a Liquid Glass UI.

## Quick start (desktop, to try it)
```
cd mobile-server
pip install -r requirements.txt
python run.py                # menu: add a media folder, then Start server
```
The first start prints a **one-time setup code**. Open the frontend, go to *Connect*, enter `http://127.0.0.1:8765`, then create the administrator with that code.

For the phone: `docs/PYDROID_SETUP.md`, `docs/NGROK_SETUP.md`, `docs/GITHUB_PAGES.md`.

## Honest status
Everything here was exercised by automated tests on a Linux machine (backend unit/integration tests and a headless-Chromium end-to-end run). **It has not been run on a real Android device, in Pydroid 3, or through a real ngrok tunnel.** See `docs/FEATURE_STATUS.md` and `docs/KNOWN_LIMITATIONS.md` before relying on it.

## Docs
`docs/INSTALLATION.md` · `PYDROID_SETUP.md` · `GITHUB_PAGES.md` · `NGROK_SETUP.md` · `SECURITY.md` · `TROUBLESHOOTING.md` · `API_REFERENCE.md` · `BACKUP_RESTORE.md` · `ARCHITECTURE.md` · `FEATURE_MATRIX.md` · `FEATURE_STATUS.md` · `KNOWN_LIMITATIONS.md` · `RELEASE_NOTES.md` · `PROJECT_INVENTORY.md` · `RESUME_STATE.md`

License: MIT (`LICENSE`).
