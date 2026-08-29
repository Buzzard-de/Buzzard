# Buzzard — Final Deployment Requirements (Part 11)

**Audit date:** 2026-08-29  
**Deployment verdict:** **BLOCKED** for production commerce until persistence + live verification complete

---

## Render Services (render.yaml)

| Service | Type | Status |
|---------|------|--------|
| buzzard-api | Web (Node) | Defined — free plan |
| buzzard-orchestrator | Worker | Defined |
| buzzard-guardian | Worker | Defined |
| buzzard-intelligence | Web | Defined |

---

## Production Requirements

### P0 / P1 — Must Have Before Commercial Launch

| Requirement | Current State | Action |
|-------------|---------------|--------|
| Persistent SQLite | **NOT MET** — free tier ephemeral | Upgrade Render plan; mount `/var/data`; set `BUZZARD_DB_PATH=/var/data/buzzard.db` |
| `BUZZARD_SALES_ENABLED=0` | **MET** | Keep until explicit go-live approval |
| Go-live lock | **ACTIVE** | Do not remove in Part 11 |
| Health checks | `/api/health` configured | Verify post-deploy |
| Secrets via env | Documented | Set in Render dashboard, not in repo |

### Environment Variables (minimum)

```
NODE_ENV=production
PORT=10000
BUZZARD_DB_ENABLED=1
BUZZARD_DB_PATH=/var/data/buzzard.db   # requires persistent disk
BUZZARD_SALES_ENABLED=0                # until approved
BUZZARD_CSRF_ENFORCE=1                 # recommended production
JWT_SECRET=<strong-secret>             # NOT default
ADMIN_SESSION_SECRET=<strong-secret>
```

### Optional / Conditional

| Variable | Purpose |
|----------|---------|
| REDIS_URL | Distributed rate limiting (not production-validated) |
| STRIPE_SECRET_KEY | Only when SALES=1 + BUZZARD_STRIPE_ENABLED=1 |
| PAYPAL_CLIENT_ID | Only when SALES=1 + BUZZARD_PAYPAL_ENABLED=1 |
| SUPPLIER_API_SECRET | Real supplier submission (disabled when SALES=0) |

---

## Build & Start Commands

```bash
# API (Render)
cd server && npm ci
node server/server.js

# Storefront (separate deploy or static)
npm ci && npm run build && npm start
```

---

## Health Endpoints

| Endpoint | Expected |
|----------|----------|
| GET /api/health | status: ok, commercial.salesEnabled: false |
| GET /api/health/db | database enabled, path writable |
| GET /api/health/commerce | flags consistent |
| GET /api/security/health | globalRbac: true |

---

## Worker / Scheduler

- Automation worker: `automationPlugin` + job queue in SQLite
- Scheduler: ONE_TIME, DELAYED, RECURRING supported
- **Limitation:** Single-instance SQLite locking; multi-instance requires Redis + shared DB

---

## SQLite Persistence

**CRITICAL:** Render free tier filesystem is ephemeral.  
`render.yaml` line 2 documents: *"Persistent SQLite: upgrade to paid plan, add disk mount /var/data"*.

**Status:** **BLOCKED** for production commerce data without persistent disk.

---

## Backup / Restore

| Item | Status |
|------|--------|
| Backup documentation | **TBD** — no automated backup script verified |
| Restore procedure | **TBD** |
| RPO / RTO | **TBD** |
| Integrity verification | Manual `sqlite3` PRAGMA integrity_check possible |

**Recommendation:** Document daily SQLite backup to object storage before go-live.

---

## Post-Deploy Checklist

1. Verify `/api/health` returns salesEnabled: false
2. Run `npm run test:production-safety` against live URL
3. Run `npm run test:final-audit` against live URL
4. Confirm persistent disk mounted and DB path writable
5. Sync search index: `node scripts/sync-search-index.mjs`
6. Verify CORS origins include production domain

---

## Live Render Verification

**Status:** **DEFERRED** (Part 10 open item)  
No live Render deployment verified in Part 11 audit environment.

---

## Frontend Deployment

- Set `NEXT_PUBLIC_BUZZARD_API_URL` to production API
- Set `NEXT_PUBLIC_COMMERCE_CORE=1` for commerce bridge
- Set `NEXT_PUBLIC_SALES_ENABLED=0` until go-live

---

## Deployment Summary

| Area | Result |
|------|--------|
| Blueprint exists | PASS |
| Build/start defined | PASS |
| Health checks | PASS |
| SQLite persistence | **BLOCKED** |
| Live verification | **DEFERRED** |
| Backup/restore | **TBD** |
