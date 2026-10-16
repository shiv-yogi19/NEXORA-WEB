# Project inventory

```
index.html  manifest.json  service-worker.js  LICENSE  README.md  .gitignore
assets/css/   tokens base layout components animations responsive
assets/js/    config utils ui api router auth media player files sharing settings diagnostics dashboard favorites search game app
assets/icons/ icon.svg icon-192/512/maskable-512.png
frontend-tests/e2e_smoke.py
mobile-server/ app config database security storage media_service file_service sharing_service auth diagnostics routes_{library,files,user,shares,system} run  (.py)
mobile-server/migrations/0001_initial.sql 0002_tickets_and_indexes.sql
mobile-server/scripts/check_environment.py
mobile-server/tests/ helpers test_{core,auth,files,range,shares,library}
mobile-server/requirements.txt requirements-pydroid.txt
docs/ (this set)
```
Counts: 17 JS modules, 6 CSS files, 19 Python modules/tests, 2 migrations. Module-level purposes are in ARCHITECTURE.md. No Git repository exists in the workspace. No secrets or database files are in the tree.
