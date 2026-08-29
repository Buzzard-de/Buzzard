# Production Remaining Status — Post Part 14 Live

**Generated:** 2026-08-29T22:23:00Z (re-verified)  
**Previous audit:** 2026-08-29T22:15:00Z  
**Scope:** Continue after Part 14 LIVE — **Part 15 NOT started**  
**Sales:** **DISABLED** (`BUZZARD_SALES_ENABLED=0`)

---

## Executive summary

| Gate | Status |
|------|--------|
| Part 14 CODE | **COMPLETE** |
| Part 14 LIVE | **YES** |
| Deployment drift (API) | **false** — `SYNCED` |
| Safety (sales/lock/payments) | **PASS** |
| Persistent DB (live) | **FAIL** — ephemeral |
| Redis (live) | **CONDITION** — not configured |
| **Part 15 readiness** | **PART 15 STILL BLOCKED** |

Part 14 catalog go-live is **complete and verified**. Part 15 remains **blocked** until persistent SQLite is live on Render (`/var/data` + `BUZZARD_DB_PATH`) and backup runs against `/var/data/backups`.

**Re-verification (2026-08-29T22:23Z):** Live commit updated to `90dc974`; all safety gates pass; DB still ephemeral; `RENDER_API_KEY` not available → **MANUAL RENDER ACTION REQUIRED**.

---

## Repository / main alignment

| Item | Value |
|------|-------|
| **origin/main HEAD** | `90dc974d7bd04dfece861b80b101ae44b1503958` |
| **Live running commit** | `90dc974d7bd0` |
| **Branch** | `main` |
| **PR #260 merged** | **YES** (`f9fd474` — `dbStartup.js` allows ephemeral when `BUZZARD_SALES_ENABLED=0`; server binds `0.0.0.0:$PORT`) |
| **Part 14 artifacts on main** | **YES** — production health, deployment identity, part14-smoke, closeout docs |
| **render.yaml persistence prep** | **YES** — `plan: starter`, disk `/var/data`, `BUZZARD_DB_PATH=/var/data/buzzard.db` (PR #267) |

**Note:** Repo blueprint is **ahead** of live Render disk configuration. Blueprint sync not yet applied on Render dashboard.

---

## Render configuration audit

### render.yaml (repository — source of truth for next sync)

| Setting | buzzard-api |
|---------|-------------|
| Plan | `starter` |
| Disk | `buzzard-data` → `/var/data` (1 GB) |
| `BUZZARD_DB_PATH` | `/var/data/buzzard.db` |
| `BUZZARD_BACKUP_DIR` | `/var/data/backups` |
| `BUZZARD_SALES_ENABLED` | `"0"` |
| `BUZZARD_RATE_LIMIT_STORE` | `redis` (needs Upstash env) |
| Upstash vars | `sync: false` (manual) |

### Live Render (observed via API — 2026-08-29)

| Setting | Live value |
|---------|------------|
| Plan | **Free tier inferred** (no persistent disk) |
| DB path | `/opt/render/project/src/server/data/buzzard.db` |
| `BUZZARD_DB_PATH` | **Not applied** on live |
| Persistent | **false** |
| Persistence mode | `production_ephemeral` |

### Render API credentials

| Credential | Agent env |
|------------|-----------|
| `RENDER_API_KEY` | **NOT available** |

**MANUAL RENDER ACTION REQUIRED**

1. Render Dashboard → Blueprint sync from `main` (or manually: upgrade `buzzard-api` to **Starter**, attach disk at `/var/data`, set env vars from `render.yaml`)
2. Redeploy and verify `GET /api/health/db` → `path: /var/data/buzzard.db`, `persistent: true`
3. Optional: set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` in Render Environment

Script (when API key available):  
`RENDER_API_KEY=... node scripts/setup-production-remaining.mjs --apply`

---

## Live health endpoints (2026-08-29)

### `GET /api/health/version`

```json
{
  "commit": "90dc974d7bd0",
  "branch": "main",
  "salesEnabled": false,
  "environment": "production"
}
```

### `GET /api/health/production`

| Field | Value |
|-------|-------|
| `overall` | `WARNING` (ephemeral DB warning) |
| `deployment.status` | **SYNCED** |
| `deployment.drift` | **false** |
| `environment.testMode` | **false** |
| `environment.salesEnabled` | **false** |
| `goLiveLock` | **true** |
| `database.persistence.persistent` | **false** |
| `redis.status` | `NOT_CONFIGURED` |
| `worker.status` | `RUNNING` |
| `commerce.stripeEnabled` | **false** |
| `commerce.paypalEnabled` | **false** |
| `commerce.supplierOrdersEnabled` | **false** |

### `GET /api/health/worker`

| Field | Value |
|-------|-------|
| `status` | **RUNNING** |
| `supplierOrdersBlocked` | **true** |
| Queue | 0 queued / 0 failed / 0 dead-letter |

### `GET /api/health/db`

| Field | Value |
|-------|-------|
| `path` | `/opt/render/project/src/server/data/buzzard.db` |
| `persistent` | **false** |
| `mode` | `production_ephemeral` |
| `users` | 1 |
| `products` | 26 |

**Required for Part 15 gate:** `path=/var/data/buzzard.db`, `persistent=true` — **NOT MET**

---

## Safety verification

| Control | Status | Evidence |
|---------|--------|----------|
| `BUZZARD_SALES_ENABLED` | **0** | `/api/health/version`, production health |
| `BUZZARD_TEST_MODE` | **NOT set** | `environment.testMode: false` |
| Stripe | **OFF** | `commerce.stripeEnabled: false` |
| PayPal | **OFF** | `commerce.paypalEnabled: false` |
| Supplier orders | **BLOCKED** | `supplierOrdersBlocked: true` |
| Go-Live Lock | **ACTIVE** | `goLiveLock: true` |
| Commercial sales | **NO-GO** | checkout dry-run / mock only |

**No safety regressions detected.**

---

## Control Center gates (API-equivalent)

| Tab / gate | Status |
|------------|--------|
| Deployment | **SYNCED** (`deployment.drift=false`) |
| Sales | **DISABLED** |
| Go-Live Lock | **ACTIVE** |
| Security | **PASS** (RBAC, rate limit, 2FA, audit) |
| Catalog | **PASS** (53 L1 categories, public catalog OK) |
| Commerce | **BLOCKED/SAFE** (sales off, checkout blocked in smoke) |
| Worker | **PASS** (RUNNING) |
| DB persistence | **FAIL** (ephemeral) |
| Backup readiness | **CONDITION** (backup scripts exist; live backup dir on ephemeral FS) |

---

## Redis

| Item | Status |
|------|--------|
| `UPSTASH_REDIS_REST_URL` | **Not configured** on live |
| `UPSTASH_REDIS_REST_TOKEN` | **Not configured** on live |
| Live backend | **memory** |
| `/api/security/health` | `rateLimitBackend: memory`, `redisConfigured: false` |

**Remaining infrastructure condition** — not blocking Part 14 catalog; recommended before multi-instance or Part 15 commerce hardening.

---

## Intelligence stack (informational)

| Service | Status |
|---------|--------|
| Python intelligence bridge | **LIVE** |
| Orchestrator | **ONLINE** |
| Guardian | **ONLINE** |

---

## Test results (live — 2026-08-29)

Run against `https://buzzard-api.onrender.com`:

| Suite | Result |
|-------|--------|
| `test:production-smoke` | **15/15 PASS** (with `BUZZARD_EXPECTED_GIT_COMMIT=90dc974d7bd0`) |
| `test:part14` | **10 pass, 0 fail, 3 conditions** — `LIVE WITH CONDITIONS` |
| `test:part12:live` | **8/8 PASS** |

### Part 14 conditions (non-fatal for catalog)

1. Persistent SQLite — ephemeral on live Render
2. Redis — memory backend; Upstash not in production env
3. Local git vs live — resolved when expected commit matches `f40dafa`
4. Render deploy path — hook configured; disk sync pending manual action

---

## Backup

| Item | Status |
|------|--------|
| `npm run backup:db` | **Available in repo** |
| Live `BUZZARD_BACKUP_DIR` | Ephemeral path (`server/data/backups`) |
| Persistent backup dir | **NOT live** until `/var/data/backups` mounted |

**Backup readiness:** **CONDITION** (tooling OK; production target path not on persistent disk)

---

## Remaining manual actions

| Priority | Action | Owner |
|----------|--------|-------|
| **P0** | Render Blueprint sync → Starter + disk `/var/data` + env from `render.yaml` | Dashboard |
| **P0** | Verify `/api/health/db` → `persistent: true` after redeploy | Post-sync |
| **P1** | Upstash Redis → Render env vars | Dashboard |
| **P1** | `ADMIN_PASSWORD` note + admin login test | Dashboard |
| **P2** | Google Search Console property + sitemap | Manual |
| **P2** | Cloudflare DNS (optional) | IONOS |

Docs: `docs/SETUP_REMAINING_DE.md`, `scripts/setup-production-remaining.mjs`

---

## Part 15 gate matrix

```
PART 14 CODE          = COMPLETE
PART 14 LIVE          = YES
DEPLOYMENT_DRIFT      = false
PRODUCTION_SMOKE      = 15/15 PASS
PART12 LIVE           = 8/8 PASS
SALES                 = DISABLED
GO-LIVE LOCK          = ACTIVE
PERSISTENT DB (live)  = FAIL  ← blocks Part 15
REDIS (live)          = CONDITION
BACKUP ON PERSISTENT  = CONDITION

VERDICT: PART 15 STILL BLOCKED
```

**Do NOT enable sales or start Part 15** until persistent DB is verified live and backup path uses `/var/data/backups`.

---

## Commands (re-verify anytime)

```bash
curl -s https://buzzard-api.onrender.com/api/health/version
curl -s https://buzzard-api.onrender.com/api/health/production
curl -s https://buzzard-api.onrender.com/api/health/worker
curl -s https://buzzard-api.onrender.com/api/health/db

BUZZARD_API_URL=https://buzzard-api.onrender.com \
BUZZARD_EXPECTED_GIT_COMMIT=90dc974d7bd0 \
npm run test:production-smoke

BUZZARD_API_URL=https://buzzard-api.onrender.com npm run test:part14
BUZZARD_API_URL=https://buzzard-api.onrender.com npm run test:part12:live
```
