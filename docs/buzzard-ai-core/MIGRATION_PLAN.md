# BUZZARD AI CORE — MIGRATION PLAN

**Date:** 2026-08-21  
**From:** Fragmented SQLite + dual APIs + static HTML demos  
**To:** Unified PostgreSQL AI Core + bridged commerce API + real admin dashboard

---

## 1. Migration Principles

1. **No big-bang rewrite** — incremental phases with working system at each step
2. **Preserve existing features** — Node commerce API and storefront remain operational
3. **Backward compatible APIs** — existing plugin routes stay; new `/api/v1/*` added alongside
4. **Feature flags** — `BUZZARD_AI_CORE_V1=1` gates new platform behavior
5. **Rollback ready** — every DB migration has `down()`; feature flags allow instant revert
6. **Document before delete** — archive deprecated modules with reason in `CHANGELOG.md`

---

## 2. Phase Overview

| Phase | Focus | Risk | Rollback |
|-------|-------|------|----------|
| 0 | Analysis + docs | None | N/A |
| 1 | Core platform (DB, orchestrator, memory, exception, audit) | Medium | Feature flag off |
| 2 | Domain workers (category, product, supplier, price, stock) | Medium | Per-worker disable |
| 3 | Commerce bridge (orders, customer service, admin UI) | High | Keep Node as primary |
| 4 | Production hardening (Postgres prod, observability, sales) | High | Staging first |

---

## 3. Phase 1 — Core Platform

### 3.1 PostgreSQL Setup

**Steps:**
1. Add `docker-compose.dev.yml` at repo root: Postgres 16 + Python API + Node API
2. Add Alembic to `intelligence/buzzard_ai_complete/`:
   ```
   database/
   ├── alembic/
   │   ├── versions/
   │   └── env.py
   ├── models/          # SQLAlchemy models
   ├── migrations.py    # CLI wrapper
   └── seeds/           # Dev seed data
   ```
3. Migration `001_initial_core`: tasks, task_transitions, memory, memory_history, exceptions, exception_transitions, audit_log, workers, api_keys
4. Migration `002_commerce_bridge`: products, suppliers, orders (mirror Python SQLite schema)
5. Seed script: 48 category workers + 3 Bey agents + sample tasks

**Data migration from SQLite:**
```bash
python -m buzzard_ai_complete.database.migrate_sqlite_to_postgres \
  --source intelligence/data/buzzard.db \
  --target $DATABASE_URL
```

**Validation:** Row counts match; memory version history intact.

### 3.2 Unified Orchestrator

**Steps:**
1. Create `core/task_engine.py` — full lifecycle state machine
2. Extend `core/orchestrator.py` — delegate to task_engine; keep EsatBey gate
3. Create `core/worker_registry.py` — register workers at startup
4. Create `core/queue.py` — priority queue (DB-backed, not in-memory)
5. Wire `/api/v1/tasks` routes
6. Port tests from `intelligence_pipeline/` and council orchestrator

**Deprecate (mark read-only, do not delete):**
- `buzzard_intelligence/orchestrator.py`
- `control_center/orchestrator.py` (absorb routes)

### 3.3 Central Memory

**Steps:**
1. Create `memory/central.py` — `CentralMemory` class with directive fields
2. Migrate `memory/store.py` callers to `CentralMemory`
3. Add memory types enum (FACT, SIGNAL, DECISION, etc.)
4. Wire `/api/v1/memory` routes
5. Bridge council shared memory → CentralMemory

### 3.4 Exception Engine

**Steps:**
1. Create `exception_engine/` module:
   ```
   exception_engine/
   ├── __init__.py
   ├── models.py        # Exception, ExceptionTransition
   ├── service.py       # lifecycle: DETECTED → RESOLVED
   ├── detectors.py     # auto-detectors (stale feed, low margin, etc.)
   └── api/routes.py
   ```
2. Wire `/api/v1/exceptions`
3. Connect detectors to supplier sync, price engine, customs AI

### 3.5 Audit System

**Steps:**
1. Create `audit/` module — append-only `audit_log` table
2. Middleware: log every mutating API call
3. Workers write audit entries on execution
4. Wire `/api/v1/audit` (read-only)

### 3.6 Security Layer

**Steps:**
1. Promote `agents/esat_bey/` to `security/` package
2. RBAC middleware on all `/api/v1/*` routes
3. Permission check before every worker execution
4. Worker isolation: workers run with scoped permissions only

### 3.7 CI Integration

**Steps:**
1. Add to `.github/workflows/ci.yml`:
   ```yaml
   - name: Start Postgres
     uses: docker/setup-compose-action@v1
   - name: Run migrations
     run: cd intelligence && alembic upgrade head
   - name: Pytest
     run: cd intelligence && pytest buzzard_ai_complete/tests/ -q
   ```
2. Add `npm test` script → smoke + pytest wrapper

---

## 4. Phase 2 — Domain Workers

### 4.1 Category Intelligence Unification

**Current:** 43-maximal (55 config entries), 47-maximal, 48 taxonomy — overlapping.

**Target:** 49 expert workers:
- 48 from `buzzard_master_48_main_categories_de.json`
- 1 KFZ specialist from `automotive_taxonomy_maximal/`

**Steps:**
1. Create `workers/category/` with `CategoryWorker` base class
2. Generate 49 worker classes from taxonomy JSON
3. Migrate `category_intelligence_43_maximal/category_intelligence/agent.py` logic
4. Set `live_activation: true` in production config
5. Category findings → CentralMemory → Kurmay

### 4.2 Product AI

**Steps:**
1. Create `workers/product/` — enrichment, classification, duplicate detection
2. Unify canonical product model (see DATABASE_SCHEMA.md)
3. Migrate `pim_product_master/` logic
4. Wire `/api/v1/products`

### 4.3 Supplier Hub

**Steps:**
1. Create `supplier_hub/adapters/` — REST, XML, CSV, Webhook base classes
2. Migrate `supplier_intelligence_ai_maximal/` scoring
3. Node `supplierHub.js` → thin proxy to Python `/api/v1/suppliers`
4. Deprecation plan for `supplierIntegrationHubPlugin.js` (v3.1) — merge features into v1.6 proxy

### 4.4 Price & Stock Engines

**Steps:**
1. Create `engines/price/` — calculation + policy gate + history
2. Create `engines/stock/` — levels + freshness + safety stock
3. Wire `/api/v1/prices`, `/api/v1/stock`
4. Connect to exception engine (low margin, stale feed, negative stock)

### 4.5 Customs AI

**Steps:**
1. Create `workers/customs/` from council 19
2. HS/CN candidate → review queue → exception on uncertainty
3. Wire `/api/v1/customs`

### 4.6 Kurmay AI

**Steps:**
1. Create `kurmay/service.py` — synthesize memory entries
2. Output format: SITUATION → ANALYSIS → RISK → OPPORTUNITY → RECOMMENDATION → REQUIRED APPROVAL → ACTION
3. Wire `/api/v1/reports/kurmay`

---

## 5. Phase 3 — Commerce Integration

### 5.1 Order Engine

**Steps:**
1. Extend `order_engine/` with full lifecycle (directive §13)
2. Idempotency keys on `POST /api/v1/orders`
3. Node `ordersPlugin.js` calls Python for lifecycle transitions
4. Duplicate order prevention

### 5.2 Customer Service AI

**Steps:**
1. Create `workers/customer_service/` — intent pipeline
2. Bridge `ai_phone_assistant/` memory to CentralMemory
3. Wire `/api/v1/customers/service`

### 5.3 TecDoc Adapter

**Steps:**
1. Create `adapters/tecdoc/interface.py` — protocol only
2. Connection test returns `EXTERNAL INTEGRATION PENDING`
3. No mock data

### 5.4 Admin Dashboard

**Steps:**
1. Add `app/admin/ai-core/` pages:
   - Dashboard (KPIs from `/api/v1/health` + task/memory/exception counts)
   - Tasks, Workers, Memory, Exceptions, Security, Reports
2. Replace links to static HTML consoles with admin pages
3. Keep HTML files in `public/taxonomy/` as archive (add deprecation banner)

### 5.5 Node ↔ Python Bridge Update

**Steps:**
1. Update `server/lib/intelligenceBridge.js`:
   - Primary: proxy to `/api/v1/*`
   - Fallback: embedded mode (unchanged for resilience)
2. Update `intelligenceProductionBridgePlugin.js` routes

---

## 6. Phase 4 — Production Hardening

### 6.1 Production Database

**Steps:**
1. Render: add Postgres addon or external Neon/Supabase
2. Set `DATABASE_URL` on `buzzard-intelligence` service
3. Run migrations on deploy
4. Node commerce: migrate critical tables to shared Postgres (optional, later)

### 6.2 Observability

**Steps:**
1. Structured JSON logging middleware
2. `/metrics` endpoint (Prometheus format)
3. Sentry integration when `ERROR_TRACKING_DSN` set
4. Worker execution metrics

### 6.3 Staging Environment

**Steps:**
1. Render staging services (API + intelligence + Postgres)
2. Staging deploy on PR merge to `staging` branch
3. Smoke tests against staging before production promotion

### 6.4 Sales Enablement (requires approval)

**Prerequisites:**
- [ ] Stripe/PayPal credentials configured
- [ ] Persistent database (paid Render disk or Postgres)
- [ ] Order engine tested end-to-end on staging
- [ ] Explicit user approval

**Steps:**
1. Set `BUZZARD_SALES_ENABLED=1` on staging
2. Test checkout flow
3. Production enable only after sign-off

---

## 7. Duplicate Removal Schedule

| Item | Phase | Action |
|------|-------|--------|
| `buzzard_intelligence/orchestrator.py` | 1 | Mark deprecated |
| `buzzard_ki_gesamt/` symlinks | 2 | Archive to `intelligence/archive/` |
| `gizli/` entrypoints | 2 | Redirect to `Buzzard/app.py` |
| `supplierIntegrationHubPlugin.js` | 2 | Merge → deprecate |
| Static HTML consoles | 3 | Deprecation banner; admin replaces |
| `buzzard_ai_gesamt/agents/` | 2 | Merge into `buzzard_ai_complete/agents/` |
| Legacy memory modules (v2, v12, v31) | 1 | Read-only; no new writes |

---

## 8. Rollback Procedures

### Database
```bash
alembic downgrade -1    # revert last migration
```

### Feature flag
```bash
BUZZARD_AI_CORE_V1=0  # revert to embedded intelligence mode
```

### Deploy
```bash
# Render: rollback to previous deploy via dashboard
# GitHub Pages: revert commit on main
```

---

## 9. Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data loss during SQLite→Postgres | Medium | High | Backup before migration; row count validation |
| Breaking Node API during bridge update | Medium | High | Feature flag; embedded fallback |
| Category worker numbering confusion | High | Medium | Standardize on 48+KFZ early in Phase 2 |
| Render free tier ephemeral disk | High | High | Postgres addon in Phase 4 |
| Test regression | Medium | Medium | pytest in CI from Phase 1 |
| Scope creep (11 systems at once) | High | High | Strict phase gates |

---

## 10. Checkpoints

| Checkpoint | Validation |
|------------|------------|
| CP1 (end Phase 1) | Task lifecycle works; memory persists in Postgres; exceptions created; audit logged; pytest green |
| CP2 (end Phase 2) | 49 category workers run; price engine blocks low margin; supplier adapter parses test feed |
| CP3 (end Phase 3) | Admin dashboard shows live data; order lifecycle transitions; customer service intent works |
| CP4 (end Phase 4) | Staging E2E pass; observability wired; production Postgres; sales ready (if approved) |

---

*See [ARCHITECTURE_PLAN.md](./ARCHITECTURE_PLAN.md) for target architecture and [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for schema details.*
