# BUZZARD — Production Storage Preflight (Render)

**Generated:** 2026-09-18T16:35:48.928Z
**Command:** `npm run preflight:production-storage`

---

## Scoreboard

| Check | Status |
|-------|--------|
| SOFTWARE_PERSISTENCE_SUPPORT | **PASS** |
| PERSISTENCE_CONFIGURATION | **PASS** |
| RENDER_PERSISTENT_DISK | **BLOCKED** |
| LIVE_PERSISTENCE_VALIDATION | **UNVERIFIED** |
| PRODUCTION_READY_IMPACT | **BLOCKED** |
| SALES_ENABLED | **0** |
| PERSISTENCE_MODE | **DEVELOPMENT** |

---

## Health Status

| Field | Value |
|-------|-------|
| PERSISTENCE_CONFIGURED | PASS |
| PERSISTENCE_PATH | `server/data/buzzard.db` |
| PERSISTENCE_WRITABLE | BLOCKED |
| SQLITE_READY | PASS |
| MIGRATION_READY | PASS |
| BACKUP_READY | WARNING |
| RESTORE_EVIDENCE | PASS |
| RESTART_PERSISTENCE | PASS |
| RENDER_MANUAL_ACTION_REQUIRED | BLOCKED |

---

## PASS

- SQLite path SSOT via server/lib/dbPaths.js (BUZZARD_DB_PATH)
- Startup validation in server/lib/dbStartup.js
- Integrity checks in server/lib/dbIntegrity.js
- Ephemeral→persistent one-time migration on first /var/data mount
- Backup script: scripts/db-backup.mjs
- Restore script: scripts/restore-db.mjs (production guard)
- Render Blueprint: render.yaml with /var/data disk
- Isolated restart persistence test (temp DB only)

---

## BLOCKED

- RENDER_PERSISTENT_DISK — /var/data not mounted on this instance
- BLOCKED_MANUAL_DEPLOYMENT — configure Render persistent disk

---

## UNVERIFIED

- LIVE_PERSISTENCE_VALIDATION — requires production Render instance check

---

## Manual Render Actions

1. **Upgrade buzzard-api to Starter plan and add persistent disk mounted at /var/data (1 GB)** — Render free tier filesystem is ephemeral — SQLite data lost on redeploy
2. **Set BUZZARD_DB_PATH=/var/data/buzzard.db and BUZZARD_BACKUP_DIR=/var/data/backups in Render environment** — Application uses BUZZARD_DB_PATH SSOT — do not duplicate with new env keys
3. **Sync Render Blueprint (render.yaml) or apply manual disk configuration** — Blueprint ready — dashboard sync pending
4. **Deploy latest commit (manual deploy — do not auto-trigger from this preflight)** — Disk mount requires redeploy
5. **Verify: curl https://buzzard-api.onrender.com/api/health/db — expect path /var/data/buzzard.db, persistent=true** — LIVE_PERSISTENCE_VALIDATION only possible on production instance
6. **Run npm run backup:db on Render after first persistent deploy** — Establish backup baseline on persistent disk

---

## Environment (existence only — no secret values)

| Variable | Configured | Hint |
|----------|------------|------|
| BUZZARD_DB_PATH | false | NOT_SET |
| BUZZARD_BACKUP_DIR | false | NOT_SET |
| PERSISTENT_DATA_PATH | false | NOT_SET |
| SQLITE_PATH | false | NOT_SET |
| DATABASE_PATH | false | NOT_SET |
| DATA_DIR | false | NOT_SET |
| NODE_ENV | false | NOT_SET |
| REQUIRE_PERSISTENT_DB | false | NOT_SET |

---

## /var/data Validation

- Path: `/var/data`
- Exists: false
- Directory: false
- Writable: false
- SQLite openable: false
- Status: **UNVERIFIED**
- Notes: MANUAL_RENDER_ACTION_REQUIRED: mount persistent disk at /var/data; Local/dev environment — live Render disk validation required

---

## SQLite Configuration

- Database path: `/workspace/server/data/buzzard.db`
- File exists: true
- Journal mode: delete
- Foreign keys: true
- Integrity: ok
- Migration ready: true
- Status: **PASS**

---

## Restart Persistence Test (isolated temp DB)

- Status: **PASS**
- Write OK: true
- Read OK: true
- Cleanup OK: true
- Notes: Isolated write/reopen/read cycle passed (local temp DB)

---

## Backup / Restore

- Backup script: true
- Restore script: true
- Backup dir: `/workspace/server/data/backups`
- Backup available: false
- Restore evidence: **PASS**
- Status: **WARNING**

---

## Deployment Configuration

- render.yaml: true
- Persistent disk in Blueprint: true
- BUZZARD_DB_PATH in Blueprint: true
- BUZZARD_BACKUP_DIR in Blueprint: true
- Health check: true

---

## Side Effect Counters

```json
{
  "realSupplierOrders": 0,
  "realPaymentTransactions": 0,
  "realRefunds": 0,
  "realShipments": 0,
  "realMarketplaceOrders": 0,
  "realMarketplaceListings": 0,
  "realAdSpend": 0,
  "fakeEvidence": 0
}
```

---

## Production Flags (must remain OFF)

```json
{
  "SALES_ENABLED": "0",
  "SUPPLIER_NETWORK_ENABLED": "0",
  "SUPPLIER_ORDER_NETWORK_ENABLED": "0",
  "PAYMENT_PRODUCTION_ENABLED": "0",
  "CARRIER_PRODUCTION_ENABLED": "0",
  "MARKETING_SPEND_ENABLED": "0",
  "AI_PRODUCTION_ENABLED": "0"
}
```
