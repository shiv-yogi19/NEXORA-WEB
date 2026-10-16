# Pydroid 3 setup

> **Not verified on a real device.** These steps follow Pydroid 3's documented behaviour; the author could not run Pydroid here. Run `scripts/check_environment.py` first and trust its output over this page.

1. Install Pydroid 3. Grant it file access (Android settings → Apps → Pydroid 3 → Permissions → Files and media / All files) so it can read your media folder.
2. In Pydroid: menu → **Pip** → install `flask`. Do not pin versions.
3. Copy the `mobile-server` folder to the phone (e.g. `/storage/emulated/0/NEXORA-server/`). Open `scripts/check_environment.py` and press Run.
4. Open `run.py` and press Run: choose *Add a media folder* (e.g. `/storage/emulated/0/Movies`), then *Create administrator* or just *Start server* and use the setup code.
5. Keep the screen/app alive: Android may suspend Pydroid in the background. Disable battery optimisation for Pydroid 3 and keep it in the foreground when streaming. Behaviour varies by device and was not tested.
6. Uploads and file changes need write permission to the media folder; if Android refuses, the app reports it and stays read-only.

Data folder defaults to the app's home (`~/nexora_data`); the database lives there, not in the media folder.
