# Security

**Model**: single owner; the server is reachable from the internet through a tunnel, so every request is authorised server-side.

- **Setup**: the first administrator requires a one-time code shown only on the server console/data folder. Registration is **disabled by default**; if enabled, new users are non-admin and cannot scan, manage files, share, or see diagnostics.
- **Passwords**: PBKDF2-SHA256 (310,000 iterations), 10+ chars, common/simple passwords rejected. Never stored or logged in plain text.
- **Sessions**: random bearer tokens; only their SHA-256 is stored. 12 h idle / 14 day absolute expiry, revocable, other sessions are revoked on password change. No cookies, so CSRF does not apply.
- **Login**: per-IP rate limit (429 + Retry-After), generic error for bad user/password, timing-equalised.
- **Authorisation**: every `/api/v1` route except health, setup, login, register, public shares and stream tickets requires a token; admin routes require admin.
- **File access**: all paths resolve inside configured media roots; `..`, absolute paths, symlink escapes, dotfiles, database/config files are rejected. Uploads are size-limited, written to `.part` and renamed, never overwrite.
- **Streaming**: media uses short-lived tickets (a `<video>` tag can't send headers). HTML/SVG/JS files are served as attachments, never rendered.
- **Shares**: random token, only the hash stored, expiry, download limit, optional password, revoke, access log.
- **CORS**: exact allow-list (default: the GitHub Pages origin), no wildcard, no credentials. Private Network preflight is granted only to allowed origins.
- **Headers/errors**: nosniff, frame deny, no-store, CSP; clients never receive stack traces.
- **Frontend**: DOM is built without `innerHTML` from data; token only in sessionStorage.
- **Secrets**: none belong in GitHub. `.gitignore` excludes the data folder, databases, setup code.

## Limits
- Rate limiter is in-memory (resets on restart). Dev server (werkzeug) is used, not a hardened WSGI server.
- Anyone with the tunnel URL can reach the login page; use a strong password and stop the tunnel when unused.
- No independent security audit has been done. Tests cover the above behaviours (see FEATURE_MATRIX.md).
- Lost password: `python run.py reset-password` on the host (owner-only recovery).
