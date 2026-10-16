# ngrok

> **Not verified with a real tunnel or on Android.** Only local HTTP was tested.

The server listens on `127.0.0.1:8765`. A tunnel gives it a public HTTPS URL so the GitHub Pages site can reach it (browsers block HTTPS pages from calling plain HTTP hosts, except localhost).

Options, most to least certain:
1. **Tunnel from a PC/other device** to the phone's address/port, or run `ngrok http 8765` wherever the server runs. Standard ngrok usage.
2. **On the phone itself without Termux**: the `pyngrok` package may or may not work in Pydroid 3 (binary download/execution support is unverified). If it does not, use option 1 or option 3.
3. **Same phone, no tunnel**: open the frontend in the phone's Chrome and connect to `http://127.0.0.1:8765`. Chrome treats localhost as a secure context; it may show a local-network permission prompt. Only works on that phone.

## Free-plan behaviours
- The URL changes each restart. Paste the new one into *Connect* (the Connect panel in Settings). Nothing is hardcoded.
- The app sends `ngrok-skip-browser-warning: 69420` on API calls to ngrok hosts. Browser navigations to media/download links cannot carry that header, so ngrok's interstitial page may appear once; click *Visit Site*. This is expected but unverified against a real tunnel.
- You do NOT add the tunnel URL to CORS: CORS is about the *page* origin (GitHub Pages), not the server URL.
