# GitHub Pages

1. Push the repo root (index.html, assets/, manifest.json, service-worker.js) to `shiv-yogi19/NEXORA`. **Do not push** `mobile-server/nexora_data`, databases, `SETUP_CODE.txt`, or any secrets (the `.gitignore` excludes them). The `mobile-server/` folder itself contains no secrets and may be included or kept private.
2. Settings → Pages → deploy from branch `main`, folder `/ (root)`.
3. The site works under the `/NEXORA/` sub-path (hash routing; all asset paths are relative).
4. Open it, go to *Connect*, paste your current tunnel URL. It is stored in this browser only; the sign-in token lives in sessionStorage and is dropped when the tab closes.
5. After you publish a new version, the app shows a "Reload" banner; the service worker caches only the static shell, never API or media responses.

If you host the frontend elsewhere, add that origin with `python run.py add-origin https://your.origin`.
