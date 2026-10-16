# Backup and restore

- Database: single SQLite file in the data folder. Schema changes are numbered migrations; a backup is made automatically before any migration.
- **Backup**: admin → Settings → *Back up now*, or `python run.py backup`. Files go to `<data>/backups/` using SQLite's online backup (consistent while running).
- **Restore** (server stopped): `python run.py restore [FILE]` (menu option too). The current DB is first saved as `pre-restore-*.db`, then replaced, then migrated forward.
- Back up the `backups/` folder off the phone yourself; nothing is uploaded anywhere.
- Media files are not part of the backup (they live in your media folders).
- Restore of a file from a newer NEXORA schema is refused rather than guessed.
