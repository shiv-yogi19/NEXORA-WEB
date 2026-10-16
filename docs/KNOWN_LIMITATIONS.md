# Known limitations

**Not verified (cannot be from the build environment)**
- Real Android device, Pydroid 3 (Flask install, file permissions, background behaviour).
- Real ngrok tunnel; `pyngrok` on Pydroid; ngrok interstitial on direct media/download navigations (user clicks "Visit Site").
- Real GitHub Pages deployment (tested under a local `/NEXORA/` sub-path only).
- Cross-browser: only headless Chromium was used (no Safari/Firefox).

**Design/feature limits**
- Free ngrok URLs change on restart; re-enter manually.
- Werkzeug dev server; in-memory rate limiter resets on restart.
- Password-protected share downloads buffer the file in browser memory (large files heavy).
- Image thumbnails are icons only (no resizing).
- File manager has no sort-direction toggle.
- Needs Flask ≥ 2.2 and SQLite ≥ 3.24.
- Two backend tests are skipped when run as root (unreadable-dir scan, read-only storage); not exercised here.
- Media tickets/streams depend on the tunnel supporting Range.
