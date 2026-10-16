# API reference (prefix `/api/v1`)

Responses: `{"ok":true,"data":…}` or `{"ok":false,"error":{"code","message"}}`. Auth: `Authorization: Bearer <token>`. Generated from the live route table (55 routes). A = admin only; P = public.

**System**: P GET `/health` (includes `setup_required`) · GET `/system/storage` · A GET `/system/diagnostics`, GET/PUT `/system/settings` (`max_upload_mb`, `history_limit`, `session_hours`), POST `/system/backup`, GET `/system/backups`
**Auth**: P POST `/auth/setup` (needs setup code), P POST `/auth/login`, P POST `/auth/register` (403 unless enabled), POST `/auth/logout`, GET `/auth/session`, POST `/auth/change-password`, GET `/auth/sessions`, DELETE `/auth/sessions/<id>`
**Library**: GET `/library/roots`, `/library/items` (filters, sort, pagination), `/library/items/<id>`, `/library/albums/<id>`, `/library/scan`; A POST `/library/scan`, `/library/scan/cancel`; GET `/search?q=`
**Streaming**: POST `/media/<id>/ticket` → `{stream,download}`; P GET/HEAD `/stream/<ticket>[?download=1]` (Range, If-Range, 206/416)
**Files** (A for changes): GET `/files/list`; POST `/files/mkdir|rename|move|copy|delete|upload`
**User data**: GET/PUT/DELETE `/favorites[/<id>]`, `/watchlist[/<id>]`; GET/POST/DELETE `/history`; GET `/progress/continue`, GET/PUT `/progress/<id>`; GET/PUT `/preferences`; GET/DELETE `/activity`
**Shares**: A POST/GET/DELETE `/shares`, DELETE `/shares/<id>`, GET `/shares/<id>/access`; P GET `/public/share/<token>`, P GET/HEAD `/public/share/<token>/file` (password via `X-Share-Password`)

Common errors: 400 validation, 401 `unauthorized`, 403 forbidden/`registration_disabled`/`bad_setup_code`, 404, 409, 413, 416, 429 `rate_limited` (+`Retry-After`), 500 generic (no trace).
