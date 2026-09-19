# BUZZARD — Render Persistent Disk Blueprint

**Generated:** 2026-09-19T11:51:10.568Z

## Scoreboard

| Check | Status |
|-------|--------|
| SOFTWARE_SUPPORT | PASS |
| BLUEPRINT_CONFIGURATION | PASS |
| DATABASE_CONFIGURATION | PASS |
| BACKUP_CONFIGURATION | PASS |
| LIVE_RENDER_DISK | UNVERIFIED |
| LIVE_PERSISTENCE | UNVERIFIED |
| MANUAL_RENDER_ACTION | BLOCKED |
| PRODUCTION_READY | BLOCKED |
| SALES_ENABLED | 0 |

## Blueprint Fields

| Field | Value |
|-------|-------|
| RENDER_BLUEPRINT_DISK_CONFIGURED | PASS |
| RENDER_DISK_MOUNT_PATH | /var/data |
| RENDER_DB_PATH | /var/data/buzzard.db |
| RENDER_BACKUP_PATH | /var/data/backups |
| RENDER_PERSISTENCE_READY | UNVERIFIED |

## Sections

### BLUEPRINT
buzzard-api disk=buzzard-data mount=/var/data sizeGB=1 — **PASS**

### DATABASE
Path `/var/data/buzzard.db` — **PASS**

### BACKUP
Path `/var/data/backups` — **PASS**

### LIVE
BUZZARD_API_URL not set — skip live probe — **UNVERIFIED**

### MANUAL ACTION
Required: **true**

1. Sync Render Blueprint (render.yaml) in Render Dashboard for buzzard-api
2. Confirm Starter plan + persistent disk buzzard-data at /var/data (1 GB)
3. Confirm env BUZZARD_DB_PATH=/var/data/buzzard.db and BUZZARD_BACKUP_DIR=/var/data/backups
4. Manual deploy buzzard-api (do not auto-trigger from repository preflight)
5. Verify GET /api/health/db → persistent=true and path /var/data/buzzard.db
6. Run backup baseline on Render after first persistent deploy

## render.yaml status: **PASS**

## Health endpoint
`/api/health/db` supported in code: true

## Migration
`dbStartup.js` ephemeral→persistent migration: true

## Live health probe
{
  "attempted": false,
  "reachable": false,
  "persistent": null,
  "path": null,
  "notes": "BUZZARD_API_URL not set — skip live probe"
}
