# Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Connect panel says unreachable | Server not running, wrong/old tunnel URL (free URLs change), or the tunnel stopped. Re-paste the URL. |
| Blocked / CORS error in console | Page origin not in `allowed_origins` → `python run.py add-origin <origin>`. |
| ngrok warning page when opening media | Click *Visit Site* once (header can't be added to navigations). |
| "Setup required" but no code | Run `python run.py doctor`; code file is `SETUP_CODE.txt` in the data folder; or `create-admin`. |
| Forgot password | `python run.py reset-password` on the host. |
| Library empty | Add a media folder, run *Scan* (admin). Check the folder is readable (`check_environment.py`). |
| Uploads refused | Folder read-only for the app, size over `max_upload_mb`, or not signed in as admin. |
| Video won't seek | Tunnel/proxy stripping Range requests; test at `http://127.0.0.1:8765`. |
| "Database corrupt" at start | The server will not delete it. Restore a backup (BACKUP_RESTORE.md). |
| Old UI after update | Use the "Reload" banner or hard-refresh once. |
| Server stops in background (Android) | Battery optimisation; keep Pydroid in the foreground. |
