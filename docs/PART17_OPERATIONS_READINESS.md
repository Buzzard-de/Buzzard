# Part 17 — Operations Readiness Audit

**Generated:** 2026-08-30  
**Branch:** `cursor/part17-operations-readiness-c293`  
**Base:** Part 16 (`cursor/part16-technical-completion-c293`)

---

## Phase 0 — Current State (verified)

| Area | Status | Notes |
|------|--------|-------|
| **main** | `88343eb` | Part 15 finish merged |
| **PR #276** | Open (draft) | Part 16 — not merged |
| **Part 14** | LIVE WITH CONDITIONS | Catalog mode OK, sales OFF |
| **Part 15** | COMPLETE (branch) | Supplier scaffold, no live connection |
| **Part 16** | COMPLETE (branch) | Staging pipeline, validation, backup prep |
| **Render persistence** | CONDITION | Blueprint ready; live disk manual step |
| **Public catalog** | **0 products** | Expected without supplier |
| **Real supplier** | NOT CONNECTED | Credentials not provided |
| **Safety** | PASS | All gates verified |

---

## Central Operations Control (Phase 1)

| Component | Path |
|-----------|------|
| Operations constants | `server/core/operationsConstants.js` |
| Central control | `server/lib/operations/operationsControl.js` |
| Job queue (SQLite) | `server/lib/jobQueue.js` |
| Worker | `server/lib/jobWorker.js` |
| Operations plugin | `server/plugins/operationsPlugin.js` |

Unified statuses: `PENDING`, `RUNNING`, `SUCCESS`, `FAILED`, `BLOCKED`, `CANCELLED`, `RETRYING`, `PERMANENTLY_FAILED`

---

## Job Idempotency (Phase 2)

| Component | Path |
|-----------|------|
| Idempotency service | `server/lib/operations/jobIdempotency.js` |
| DB table | `core_job_idempotency` |
| Job column | `core_background_jobs.idempotency_key` |

Prevents duplicate: products, imports, backups (when idempotency key provided).

---

## Retry & Failure (Phase 3)

| Component | Path |
|-----------|------|
| Retry policy | `server/lib/operations/jobRetryPolicy.js` |
| Worker retry | `server/lib/jobWorker.js` (exponential backoff) |
| Dead letter | `DEAD_LETTER` → `PERMANENTLY_FAILED` |

Fail closed on critical configuration errors.

---

## Audit Log (Phase 4)

| Component | Path |
|-----------|------|
| Operations audit | `server/lib/operations/operationsAudit.js` |
| DB table | `core_operations_audit` |
| Secret redaction | `server/lib/security.js` (extended `apiKey` pattern) |

Fields: timestamp, actor, action, resource, resourceId, result, reason, correlationId, requestId, jobId

---

## Correlation / Trace (Phase 5)

| Component | Path |
|-----------|------|
| Correlation context | `server/lib/operations/correlationContext.js` |
| Server wiring | `server/server.js` — `X-Request-Id`, `X-Correlation-Id` headers |

---

## Admin Safety (Phase 6)

| Component | Path |
|-----------|------|
| Admin safety gate | `server/lib/operations/adminSafetyGate.js` |
| PIM import guarded | `server/plugins/pimCorePlugin.js` |

Blocks: sales activation, live import without credentials, test suppliers, supplier orders.

---

## Go-Live Control Center (Phase 7)

| Component | Path |
|-----------|------|
| Readiness evaluator | `server/lib/operations/goLiveReadiness.js` |
| Public endpoint | `GET /api/health/go-live-readiness` |
| Admin endpoint | `GET /api/admin/operations/go-live-readiness` |

**Diagnostic only — never auto-activates go-live.**

Gates: DATABASE, BACKUP, CATALOG, PRODUCT_DATA, SUPPLIER, REDIS, SECURITY, PAYMENTS, WORKERS, MONITORING, SALES, GO_LIVE_LOCK

---

## Catalog Readiness (Phase 8)

| Component | Path |
|-----------|------|
| Catalog readiness | `server/lib/operations/catalogReadiness.js` |

`PUBLIC PRODUCTS = 0` is **PASS** (expected without supplier).

---

## Price & Stock Engines (Phases 9–10)

| Engine | Path |
|--------|------|
| Price engine | `server/lib/operations/priceEngine.js` |
| Stock engine | `server/lib/operations/stockEngine.js` |

Deterministic, no auto-publish, no invented supplier data.

---

## Backup & Recovery (Phase 11)

| Component | Path |
|-----------|------|
| Backup automation | `server/lib/backupAutomation.js` |
| Restore safety | `server/lib/operations/restoreSafety.js` |
| Restore script guard | `scripts/restore-db.mjs` |

Flow: **VALIDATE → REVIEW → EXPLICIT ACTION** — no auto-overwrite.

---

## Monitoring (Phase 12)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/health/operations` | Full monitoring snapshot |
| `GET /api/health/go-live-readiness` | Go-live gate matrix |
| `GET /api/health/production` | Extended production summary |

---

## Configuration Validation (Phase 13)

| Component | Path |
|-----------|------|
| Config validation | `server/lib/operations/configurationValidation.js` |
| Startup check | `server/server.js` |

FAIL CLOSED when:
- `SALES=1` + Go-Live Lock active
- `REAL_SUPPLIER_LIVE_IMPORT=1` without credentials
- Payments/supplier orders enabled without sales

---

## Classification

### COMPLETED (without supplier)
- Central operations control
- Job idempotency
- Retry/failure policy
- Operations audit log
- Correlation IDs
- Admin safety gates
- Go-live readiness center
- Price/stock engines
- Restore safety layer
- Configuration validation
- Monitoring extensions

### BLOCKED (requires supplier)
- PRODUCT_DATA gate
- SUPPLIER gate (live connection)
- Verified catalog population

### REQUIRES HUMAN APPROVAL
- Sales / payments activation
- Go-live lock release
- Live import / publish
- Production restore

---

**Safety unchanged:** SALES=OFF, GO-LIVE LOCK=ACTIVE, no live import, no publish.
