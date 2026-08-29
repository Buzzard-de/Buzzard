# Backup & Restore (Part 12)

## Strategy

| Component | Method | Script |
|-----------|--------|--------|
| SQLite (Buzzard API) | File copy | `npm run backup:db` or `npm run db:backup` |
| Restore (dev/staging) | Guarded copy | `npm run restore:db -- --from <path>` |
| KI snapshots | Python backup | `npm run backup:ki` |
| Taxonomy artifacts | Git + publish | `npm run publish:taxonomy` |

## Backup

```bash
# Default path: server/data/buzzard.db
npm run backup:db

# Production Render disk
BUZZARD_DB_PATH=/var/data/buzzard.db BUZZARD_BACKUP_DIR=/var/data/backups npm run backup:db
```

Backups are written to `server/data/backups/` (or `BUZZARD_BACKUP_DIR`) as timestamped files.

## Restore (safe test environment)

```bash
# Dry-run (no write)
node scripts/restore-db.mjs --dry-run --from server/data/backups/buzzard-YYYY-MM-DD.db

# Restore to dev database
node scripts/restore-db.mjs --from server/data/backups/buzzard-YYYY-MM-DD.db
```

### Production guard

Restore to production paths (`NODE_ENV=production` or `/var/data/*`) requires:

```bash
BUZZARD_ALLOW_PRODUCTION_RESTORE=1 npm run restore:db -- --from /var/data/backups/buzzard-....db
```

A pre-restore snapshot is created automatically when overwriting an existing database.

## Verification after restore

```bash
npm run test:smoke
npm run test:production-safety
npm run test:part8
npm run test:part12
npm run test:unit
```

## Integrity check

SQLite integrity (manual):

```bash
sqlite3 server/data/buzzard.db "PRAGMA integrity_check;"
```

## RPO / RTO

| Metric | Target | Status |
|--------|--------|--------|
| RPO | Daily backup minimum before go-live | **TBD** — automate on Render cron |
| RTO | Restore + smoke < 30 min | **TBD** — validate in staging |

## Render persistence

SQLite on Render requires a **persistent disk** mounted at `/var/data` with `BUZZARD_DB_PATH=/var/data/buzzard.db`. Ephemeral filesystem loses data on redeploy.

See `docs/PART12_DEPLOY_CHECKLIST.md` for full deploy steps.

## Do not

- Run destructive restore against production without approval
- Enable sales during restore testing
- Commit backup files or secrets to git
