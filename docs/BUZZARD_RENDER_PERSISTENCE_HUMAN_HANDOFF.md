# BUZZARD Render Persistence Human Handoff

Generated: 2026-09-19T12:34:21.850Z

**Status:** No step below is marked complete by Cursor. Operator must execute on Render.

## Steps

1. Open Render dashboard
2. Select **buzzard-api** service
3. Create Persistent Disk — mount path `/var/data`, size ≥ 1 GB
4. Set environment: `BUZZARD_DB_PATH=/var/data/buzzard.db`, `BUZZARD_BACKUP_DIR=/var/data/backups`
5. Deploy service
6. Verify `GET /api/health/db` → `persistent=true`, path `/var/data/buzzard.db`
7. Run `npm run backup:db` on the instance; retain artifact reference (not in git)
8. Register **RENDER_LIVE** evidence (operator workflow — not automated here)
9. Manual production restart (operator only)
10. Re-verify `/api/health/db` and register **RENDER_RESTART_PERSISTENCE** evidence

## Current bridge status

| Field | Value |
|-------|-------|
| BLUEPRINT_CONFIGURATION | VALIDATED |
| LIVE_RENDER_DISK | UNVERIFIED_EXTERNAL |
| LIVE_DB_PATH | UNVERIFIED_EXTERNAL |
| LIVE_DB_HEALTH | UNVERIFIED_EXTERNAL |
| LIVE_RESTART_PERSISTENCE | UNVERIFIED_EXTERNAL |
| LIVE_BACKUP | UNVERIFIED_EXTERNAL |
| LIVE_RESTORE | UNVERIFIED_EXTERNAL |
| PERSISTENCE | HUMAN_REQUIRED |

Next human action: Create/mount Persistent Disk on buzzard-api — path /var/data, size ≥ 1 GB
