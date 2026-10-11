# Render Storage Operator Procedure

This is the canonical production storage verification procedure.  
**This task did not open, migrate, or write the production database.**  
**This task did not change production environment variables or the Render disk.**

Sales remain locked. Product SoT remains inactive. Do not run this procedure as a deploy.

## What the code does today

- If `BUZZARD_DB_PATH` is set, `server/lib/dbPaths.js` resolves that absolute path.
- If it is unset, the process uses `server/data/buzzard.db` for **local development only**.
- In `NODE_ENV=production`, a missing `BUZZARD_DB_PATH` is a **fail-closed** configuration error. The local default is **not** accepted as production storage (`silentFallbackPrevented`).
- The gate runs before plugin load and before `server/lib/db.js` creates a directory or opens SQLite. Production therefore cannot silently create `server/data/buzzard.db`.
- Paths under `/tmp`, `/var/tmp`, `os.tmpdir()`, or `/dev/shm` are ephemeral. Production refuses to create a durable database there.
- Blueprint (`render.yaml`) already declares disk `/var/data`, `BUZZARD_DB_PATH=/var/data/buzzard.db`, and `BUZZARD_BACKUP_DIR=/var/data/backups`. That is configuration-as-code, not operator proof that the live service matches it.

## Operator steps (read-only unless separately approved)

1. Confirm the Render **service identity** is `buzzard-api` (not a preview or another app).
2. Confirm the persistent disk `buzzard-data` is attached.
3. Confirm the mount path is `/var/data`.
4. Confirm `BUZZARD_DB_PATH` is present. Validate only that the **path string** is `/var/data/buzzard.db`. Do not paste secret values. Do not change the variable from this task.
5. Confirm `BUZZARD_BACKUP_DIR` is `/var/data/backups` if backups are expected.
6. Confirm `NODE_ENV=production` and `BUZZARD_SALES_ENABLED=0`.
7. From the Render shell or a read-only health call, confirm:
   - the file at the configured path exists
   - the directory is writable by the service user
   - `/api/health` reports `persistence.mode=render_persistent_disk` and `persistent=true`
   - `ephemeralRisk` is null
8. Confirm schema/migration state from health/startup logs. Do **not** apply migrations from this repository against production in this task.
9. Confirm backup location and permissions. Do not copy customer data into a test environment.
10. After a controlled restart (only if already authorized), confirm the same path still has data. Do not treat a new empty file as success.

## Backup and restore

- Approved backup method in-repo: `npm run backup:db` / `node scripts/backup-db.mjs` writing under `BUZZARD_BACKUP_DIR`.
- Restore requires **explicit operator approval**. Do not execute a production restore from this task.
- Dry-run restore: `npm run test:backup-restore` (local only).
- A backup is **not** claimed to exist in production unless the operator confirms a file on the disk.

## Status

| Stage | Status |
| --- | --- |
| Local database tests | PASS |
| CI database/unit tests | recorded against the SHA that CI ran |
| Deployment configuration inspected (`render.yaml`) | PASS (code) |
| Render configuration verified by operator | NOT_VERIFIED |
| Production disk verified | NOT_VERIFIED |
| Production DB path verified | NOT_VERIFIED |
| Production database health verified | NOT_VERIFIED |
| Backup/restore verified | NOT_VERIFIED |
| Production end-to-end | NOT_VERIFIED |

Production readiness remains **0%** until an authorized operator records evidence for the NOT_VERIFIED rows.
