# Installation

## Requirements
Python 3.8+, Flask 2.2+ (Werkzeug comes with it), SQLite 3.24+. Nothing else.
Check with `python mobile-server/scripts/check_environment.py` (read-only).

## Server
1. `cd mobile-server && pip install -r requirements.txt` (on Pydroid 3 use its Pip screen; see PYDROID_SETUP.md).
2. `python run.py` opens a menu (Pydroid cannot pass arguments). Desktop sub-commands: `serve`, `add-root NAME PATH`, `remove-root NAME`, `list-roots`, `create-admin`, `reset-password [USER]`, `backup`, `restore [FILE]`, `add-origin URL`, `doctor`, `set KEY VALUE`; optional `--data-dir PATH`.
3. Add at least one media folder (it is only ever read/written inside that folder).
4. Start the server. First run prints and saves a one-time setup code (`SETUP_CODE.txt` in the data folder). It is deleted once the administrator exists.

## Data folder
`~/nexora_data` (or `NEXORA_DATA_DIR`, or `--data-dir`): `config.json`, the SQLite database, `backups/`, temp uploads. It is created on first run and **never reset on startup**. Do not commit it (see `.gitignore`).

## Configuration keys (`run.py set KEY VALUE`)
`allow_registration` (default off), `port` (8765), `host` (127.0.0.1), `max_upload_mb` (2048), `session_hours` (12), `session_max_days` (14), `history_limit` (500), `ticket_hours` (6), `login_rate_limit` (10 per 5 min per IP), `allowed_origins` (default only the GitHub Pages origin; use `add-origin`).

## Frontend
Static files in the repo root. Publish via GitHub Pages (GITHUB_PAGES.md). To test locally, serve the repo root with any static server and add its origin: `python run.py add-origin http://localhost:5500`.
