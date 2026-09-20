# BUZZARD — Render Persistent Disk Operator Guide

Generated: 2026-09-20T17:34:35.186Z

## RENDER DASHBOARD ACTION REQUIRED

**Cursor does not have access to your Render Dashboard.** Nothing below is marked done until you perform the steps and run verification.

GOLDEN RULE: **RENDER BLUEPRINT ≠ LIVE RENDER** — `render.yaml` disk config does not prove the disk is mounted at runtime.

---

## Repository facts (from `render.yaml`)

| Field | Value |
|-------|-------|
| Service name | `buzzard-api` |
| Disk name | `buzzard-data` |
| Mount path (blueprint) | `/var/data` |
| Disk size (blueprint) | `1 GB` |
| BUZZARD_DB_PATH (blueprint) | `/var/data/buzzard.db` |
| BUZZARD_BACKUP_DIR (blueprint) | `/var/data/backups` |
| Health check (service) | `/api/health` |
| DB health URL (derive) | `https://buzzard-api.onrender.com/api/health/db` |

BLUEPRINT_CONFIGURATION: **CONFIGURED**

---

## Operator steps

### STEP 1 — Render Dashboard login
Open [Render Dashboard](https://dashboard.render.com/) and sign in.

### STEP 2 — Find Buzzard API service
Service name from repository: **`buzzard-api`** (do not use a different name unless your Dashboard differs).

### STEP 3 — Settings → Disks
Open **Settings → Disks** for `buzzard-api`.

### STEP 4 — Create Persistent Disk
- **Mount Path:** `/var/data`
- **Disk Size:** at least **1 GB**

### STEP 5 — Environment variables
Confirm in Render Dashboard:
- `BUZZARD_DB_PATH=/var/data/buzzard.db`
- `BUZZARD_BACKUP_DIR=/var/data/backups`

### STEP 6 — Save
Save disk and environment changes.

### STEP 7 — Deploy (operator only)
Trigger **Deploy** / **Manual Deploy** from Render. **Cursor does not deploy.**

### STEP 8 — Verify DB health
After deploy succeeds, run from your workstation:

```bash
BUZZARD_API_URL=https://buzzard-api.onrender.com npm run verify:render-persistence
```

Or curl: `curl -sS https://buzzard-api.onrender.com/api/health/db`

Expected when live disk is active:
- `persistent: true`
- `path` contains `/var/data/buzzard.db`

---

## PHASE 5 — Restart persistence test (operator)

1. Run `npm run verify:render-persistence` (baseline).
2. In Render Dashboard: **Manual Restart** on `buzzard-api`.
3. Wait until service is live.
4. Run `npm run verify:render-persistence` again.
5. Confirm `persistent=true` and path still `/var/data/buzzard.db`.
6. Register restart evidence via render persistence evidence bridge (operator attestation).

If restart breaks persistence: `LIVE_RESTART_PERSISTENCE=BLOCKED` or `UNVERIFIED_EXTERNAL`.

---

## PHASE 6 — Backup (operator on Render shell)

Use existing script only: `npm run backup:db` with `BUZZARD_DB_PATH` and `BUZZARD_BACKUP_DIR` pointing at `/var/data`.
Cursor **will not** claim backup PASS without `RENDER_BACKUP` evidence.

---

## PHASE 7 — Restore safety

Use `scripts/restore-db.mjs` only with existing guards.
Production restore requires `BUZZARD_ALLOW_PRODUCTION_RESTORE=1` — do not bypass.

---

## Current live status (evidence SSOT)

| Check | Status |
|-------|--------|
| LIVE_RENDER_DISK | UNVERIFIED_EXTERNAL |
| LIVE_DB_PATH | UNVERIFIED_EXTERNAL |
| LIVE_DB_HEALTH | UNVERIFIED_EXTERNAL |
| LIVE_RESTART_PERSISTENCE | UNVERIFIED_EXTERNAL |
| LIVE_BACKUP | UNVERIFIED_EXTERNAL |
| LIVE_RESTORE | UNVERIFIED_EXTERNAL |
| PERSISTENCE | HUMAN_REQUIRED |

PRODUCTION / GO_LIVE remain **BLOCKED** until full external chain completes. **SALES_ENABLED=0**.

---

## Operator checklist

| Done | Step | CURRENT STATUS | EVIDENCE | BLOCKER |
|------|------|----------------|----------|---------|
| x | Render service found (buzzard-api in render.yaml) | CONFIGURED | render.yaml | — |
|   | Persistent Disk created in Render Dashboard | UNVERIFIED_EXTERNAL | none | RENDER DASHBOARD ACTION REQUIRED |
| x | Disk size >= 1 GB | blueprint:1GB | render.yaml disk.sizeGB | — |
|   | Mount path = /var/data | UNVERIFIED_EXTERNAL | /var/data | Operator mount + live health |
| x | BUZZARD_DB_PATH=/var/data/buzzard.db | /var/data/buzzard.db | render.yaml env | — |
| x | BUZZARD_BACKUP_DIR=/var/data/backups | /var/data/backups | render.yaml env | — |
|   | Deploy / redeploy performed by operator | UNVERIFIED_EXTERNAL | GET /api/health/db | RENDER DASHBOARD ACTION REQUIRED — Cursor cannot deploy |
|   | /api/health/db checked | UNVERIFIED_EXTERNAL | verify-render-persistence / RENDER_LIVE evidence | Run npm run verify:render-persistence after deploy |
|   | persistent=true | UNVERIFIED_EXTERNAL | health/db JSON | Live endpoint must report persistent=true |
|   | path=/var/data/buzzard.db | UNVERIFIED_EXTERNAL | health/db JSON | Ephemeral path until disk mounted |
|   | Manual Render restart performed | UNVERIFIED_EXTERNAL | RENDER_RESTART_PERSISTENCE evidence | Operator restart + re-verify + register evidence |
|   | After restart: DB persistence still PASS | UNVERIFIED_EXTERNAL | restart persistence evidence | — |
|   | Backup created (npm run backup:db on production shell) | UNVERIFIED_EXTERNAL | RENDER_BACKUP evidence | Operator runs backup on Render — Cursor will not fake |
|   | Backup evidence registered | UNVERIFIED_EXTERNAL | render-persistence evidence bridge | Use evidence CLI after real backup |
|   | Restore validation (dry-run / controlled only) | UNVERIFIED_EXTERNAL | RENDER_RESTORE evidence | Production restore requires BUZZARD_ALLOW_PRODUCTION_RESTORE=1 |
|   | Render persistence gate PASS | HUMAN_REQUIRED | gate:render-persistence | Complete live evidence chain |

---

## Commands

```bash
npm run status:render-persistence
npm run preflight:render-persistence
npm run verify:render-persistence
npm run gate:render-persistence
```
