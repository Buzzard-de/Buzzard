# BUZZARD AI CORE — ARCHITECTURE PLAN

**Date:** 2026-08-21  
**Status:** Proposed — awaiting implementation phase  
**Principle:** ONE BUZZARD PLATFORM · ONE CENTRAL CORE · ONE DATABASE · ONE ORCHESTRATOR · ONE MEMORY · ONE SECURITY LAYER · ONE EXCEPTION ENGINE

---

## 1. Vision

Transform Buzzard from a **fragmented collection of modules, demos, and dual databases** into a **production-grade e-commerce operating system** where all AI workers, data flows, tasks, memory, suppliers, products, pricing, stock, orders, customer service, security, and exceptions operate through a single central architecture.

```
DATA SOURCES → INGESTION → NORMALIZATION → CANONICAL DATA
    → AI ORCHESTRATOR → SPECIALIZED AI WORKERS → CENTRAL MEMORY
    → POLICY / SECURITY → DECISION → APPROVED ACTION → AUDIT → REPORTING
```

---

## 2. Target Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         BUZZARD AI CORE                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  ┌────────────┐  │
│  │ Orchestrator │  │ Worker       │  │ Central     │  │ Kurmay AI  │  │
│  │ (tasks)      │  │ Registry     │  │ Memory      │  │ (synthesis)│  │
│  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘  └─────┬──────┘  │
│         │                │                  │                │          │
│  ┌──────┴────────────────┴──────────────────┴────────────────┴──────┐  │
│  │                    Esat Bey Security Layer                        │  │
│  └──────┬───────────────────────────────────────────────────────────┘  │
│         │                                                               │
│  ┌──────┴───────────────────────────────────────────────────────────┐ │
│  │              Exception Engine (lifecycle + containment)           │ │
│  └──────┬─────────────────────────────────────────────────────────────┘ │
│         │                                                               │
│  ┌──────┴──────┬──────────┬──────────┬──────────┬──────────┬─────────┐ │
│  │ Category AI │ Customs  │ Supplier │ Product  │ Price    │ Stock   │ │
│  │ (48+1 KFZ)  │ AI       │ Hub      │ AI       │ Engine   │ Engine  │ │
│  └─────────────┴──────────┴──────────┴──────────┴──────────┴─────────┘ │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────────────────┐  │
│  │ Order    │ Customer │ Audit    │ Reporting│ TecDoc Adapter       │  │
│  │ Engine   │ Service  │ System   │          │ (interface only)     │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────┐          ┌─────────────────────┐
│ PostgreSQL       │          │ Node Commerce API    │
│ (AI Core DB)     │◄─bridge─►│ (existing plugins)   │
└─────────────────┘          └─────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────┐          ┌─────────────────────┐
│ Admin Dashboard  │          │ Next.js Storefront   │
│ (extend existing)│          │ (static, i18n)       │
└─────────────────┘          └─────────────────────┘
```

---

## 3. Layer Decisions

### 3.1 Canonical Backend: Python FastAPI (`buzzard_ai_complete`)

**Why Python, not Node, for AI Core:**
- Already hosts orchestrator, memory, category agents, council, supplier intelligence
- 58+ existing tests
- FastAPI auto-docs, Pydantic validation, async support
- Bey agent runtime (AslanBey, EsatBey, DoguBey) already in Python

**Node API role:** Commerce edge — cart, checkout, storefront data, admin CRUD. Bridges to AI Core via `/api/v1/*` proxy or direct internal calls.

### 3.1 Canonical Database: PostgreSQL

**Why migrate from SQLite:**
- Directive requires production-grade relational DB
- Single source of truth for memory, tasks, audit, exceptions
- Concurrent writes, transactions, proper indexes
- Already documented in `production_integration_maximal/deployment/docker/compose.production.yml`

**Migration path:** SQLite schemas in `database/db.py` + `server/lib/db.js` → Alembic migrations → PostgreSQL. Node commerce tables remain in Node DB initially; AI Core tables move to Postgres first, then gradual unification.

### 3.3 Canonical Orchestrator: Extend `core/orchestrator.py`

Current implementation is 13 lines. Target: full task lifecycle engine per directive §3.

**Consolidate from:**
- `core/orchestrator.py` (Bey gate) — **keep as entry point**
- `intelligence_pipeline/orchestrator.py` — absorb 7-stage pipeline
- `ai_council_18_unified/council/orchestration/orchestrator.py` — council routing
- Deprecate (read-only): `buzzard_intelligence/orchestrator.py` (v20)

### 3.4 Canonical Memory: Extend `memory/store.py`

**Consolidate from:** all 10+ memory stores into one `CentralMemory` service with directive fields (§6).

**Preserve:** version history pattern already in `memory_history` table.

### 3.5 Canonical Security: `agents/esat_bey/` → Platform Security Service

Rename conceptually to **Esat Bey Security Layer**. Every worker action, API call, and task execution passes through policy check.

### 3.6 Canonical Exception Engine: **New module**

`buzzard_ai_complete/exception_engine/` — backend lifecycle per directive §16. HTML UI becomes client of this API.

### 3.7 Canonical Kurmay: **New module**

`buzzard_ai_complete/kurmay/` — synthesizes worker outputs into SITUATION → ANALYSIS → RISK → OPPORTUNITY → RECOMMENDATION → REQUIRED APPROVAL → ACTION.

---

## 4. Module Map — 11 Systems

| # | System | Target Module | Source to Migrate |
|---|--------|---------------|-------------------|
| 1 | Central AI structure | `core/orchestrator.py` + `core/worker_registry.py` | `core/`, `tasks/`, council orchestrators |
| 2 | Category AI | `workers/category/` (48 DE + KFZ) | `category_intelligence_43_maximal/`, `_47_maximal/`, `master_taxonomy_48_maximal/` |
| 3 | Customs AI | `workers/customs/` | `ai_council_19_customs_bureaucracy/` |
| 4 | Supplier Hub | `supplier_hub/` | `supplier_intelligence_ai_maximal/`, Node `supplierHub.js` adapter |
| 5 | Price Engine | `engines/price/` | `commerce/` pricing logic, `database/db.py` product_decisions |
| 6 | Stock Engine | `engines/stock/` | `inventory_movements`, Node WMS plugin |
| 7 | Order Engine | `engines/order/` | `order_engine/`, Node `ordersPlugin.js` |
| 8 | Product AI | `workers/product/` | `pim_product_master/`, `multilingual_product_intelligence/` |
| 9 | Customer Service AI | `workers/customer_service/` | `ai_phone_assistant/`, `aiAutomationPlugin` |
| 10 | Esat Bey Security | `security/` | `agents/esat_bey/`, Node identity plugins |
| 11 | Exception Engine | `exception_engine/` | New (replace HTML-only) |

Plus: **Kurmay** (`kurmay/`), **Audit** (`audit/`), **Reporting** (`reporting/`).

---

## 5. Worker Interface (Standard Contract)

Every AI worker implements `BuzzardWorker` protocol:

```python
class BuzzardWorker(Protocol):
    id: str
    name: str
    category: str
    capabilities: list[str]
    permissions: list[str]
    input_schema: type[BaseModel]
    output_schema: type[BaseModel]
    confidence: float
    risk_level: RiskLevel

    def execute(self, task: Task, memory: CentralMemory, security: SecurityLayer) -> WorkerResult: ...
```

Workers **cannot** access other workers' domains without orchestrator routing. Workers **cannot** elevate their own permissions.

**Registry:** `core/worker_registry.py` — discovers and registers all workers at startup.

---

## 6. Task Lifecycle

```
QUEUED → VALIDATING → ASSIGNED → RUNNING → REVIEW → APPROVED → EXECUTED → SUCCESS
                                                              ↓
                    FAILED / RETRY / BLOCKED / ESCALATED / CANCELLED
```

**Tables:** `tasks`, `task_transitions`, `task_dependencies`, `task_results`

**Orchestrator responsibilities:** creation, queue, routing, worker selection, priority, dependencies, retries, timeout, failure handling, approval requirements, execution tracking, result collection, memory write, audit logging.

---

## 7. Central Memory Model

Extend existing `memory` + `memory_history` tables:

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| source | string | Worker or system that created record |
| entity | string | Related entity (product, order, category) |
| category | string | Domain category |
| type | enum | FACT, SIGNAL, DECISION, INSIGHT, EVENT, TASK_RESULT, RULE, POLICY, EXCEPTION |
| content | JSONB | Structured payload |
| confidence | float | 0.0–1.0 |
| impact | enum | LOW, MEDIUM, HIGH, CRITICAL |
| timestamp | timestamptz | Created |
| expires_at | timestamptz | Optional TTL |
| created_by | string | Actor |
| related_task | UUID | FK to tasks |
| audit_id | UUID | FK to audit |

All changes versioned and audit-linked.

---

## 8. API Design — `/api/v1/*`

Unified versioned API on Python FastAPI. Node proxies admin/frontend calls.

| Endpoint Group | Methods | Auth |
|----------------|---------|------|
| `/api/v1/agents` | CRUD, list workers | RBAC |
| `/api/v1/tasks` | CRUD, transition, queue | RBAC |
| `/api/v1/products` | CRUD, enrich, classify | RBAC |
| `/api/v1/categories` | List, intelligence run | RBAC |
| `/api/v1/suppliers` | CRUD, sync, health | RBAC |
| `/api/v1/prices` | Calculate, history | RBAC |
| `/api/v1/stock` | Query, adjust, freshness | RBAC |
| `/api/v1/orders` | CRUD, lifecycle transition | RBAC |
| `/api/v1/customers` | Service intents | RBAC |
| `/api/v1/customs` | Classify, review queue | RBAC |
| `/api/v1/memory` | Query, write, search | RBAC |
| `/api/v1/exceptions` | CRUD, lifecycle | RBAC |
| `/api/v1/audit` | Query (append-only) | RBAC |
| `/api/v1/reports` | Generate, download | RBAC |
| `/api/v1/health` | Health + readiness | Public |

Validation: Pydantic v2 on all inputs/outputs. Auth: JWT (shared with Node) + API keys for workers.

---

## 9. Frontend Strategy

**Do not build new HTML single-file consoles.**

Extend existing surfaces:
1. **Admin dashboard** (`app/admin/`) — add AI Core section with real API data
2. **Replace static HTML demos** — admin pages call `/api/v1/*` instead of `localStorage`
3. **Keep storefront** (`app/`, i18n) unchanged — website translations (de/en/tr/ar) remain independent

Dashboard panels: workers, tasks, suppliers, products, orders, stock, price alerts, exceptions, security events, memory, reports.

Brand: black/gold (`--gold: #d5ad45`), responsive, mobile-friendly.

---

## 10. Supplier Hub Architecture

```
Supplier Adapter (REST/JSON/XML/CSV/Webhook/Feed)
    → RAW store
    → PARSED (format-specific parser)
    → NORMALIZED (common schema)
    → VALIDATED (schema + business rules)
    → CANONICAL (products, offers, stock)
```

**Adapter interface:**
```python
class SupplierAdapter(Protocol):
    def connect(self, config: SupplierConfig) -> ConnectionResult: ...
    def fetch(self) -> RawFeed: ...
    def parse(self, raw: RawFeed) -> ParsedFeed: ...
    def normalize(self, parsed: ParsedFeed) -> NormalizedFeed: ...
    def health(self) -> HealthStatus: ...
```

Credentials: env vars / secrets manager only. Connection test endpoint without fake success.

**Consolidate:** Node `supplierHub.js` becomes thin proxy; Python `supplier_hub/` owns canonical pipeline.

---

## 11. Product Intelligence

**Canonical Product model** (unify Node `products` + Python `products`):

```
sku, name, ean, gtin, mpn, oem, manufacturer, category_id,
attributes (JSONB), media (JSONB), descriptions (i18n JSONB),
seo (JSONB), compatibility (JSONB), marketplace_mappings (JSONB),
identity_hash, duplicate_of, status, created_at, updated_at
```

**Capabilities:** creation, enrichment, title/description generation, classification, taxonomy mapping, duplicate detection, identity resolution.

**TecDoc:** `adapters/tecdoc/` — interface only. Fields: MAKE, MODEL, TYPE, YEAR, ENGINE, POWER, FUEL, OEM, PART_NUMBER. `EXTERNAL INTEGRATION PENDING` until credentials provided.

---

## 12. Price & Stock Engines

### Price Engine
Inputs: purchase cost, shipping, supplier fees, payment fees, marketplace fees, advertising, return allowance, tax, target margin, competitor price, min margin, max price change.

**Policy gate:** price violating minimum margin → exception → human review. Never auto-publish.

**Price history table:** `price_history(sku, price, reason, calculated_at, approved_by)`.

### Stock Engine
Fields: available, reserved, incoming, supplier_stock, warehouse_stock, safety_stock, lead_time, freshness.

**Stale feed** → exception. **Negative stock** → blocked.

---

## 13. Order Engine

Lifecycle per directive §13. Idempotency keys on create. Duplicate order/supplier-order prevention.

Bridge to Node `ordersPlugin.js` for storefront checkout; Python owns lifecycle orchestration.

---

## 14. Customer Service AI

Pipeline: intent → identity → order context → policy → answer → escalation.

Intents: ORDER, SHIPPING, RETURN, REFUND, PRODUCT, PRICE, COMPATIBILITY, COMPLAINT, GENERAL.

High-risk legal/financial → exception → human review. No auto-decision.

---

## 15. Observability

| Component | Implementation |
|-----------|----------------|
| Structured logs | JSON logs with `request_id`, `task_id`, `worker_id` |
| Metrics | Prometheus-compatible `/metrics` endpoint |
| Health | `/api/v1/health` + `/api/v1/health/ready` |
| Error tracking | Sentry integration (when `ERROR_TRACKING_DSN` set) |
| Worker metrics | Execution count, duration, failure rate per worker |
| Supplier sync | Last sync time, record count, error rate |

---

## 16. Testing Strategy

| Layer | Tool | Target |
|-------|------|--------|
| Unit | pytest | Workers, engines, memory, security |
| Integration | pytest + test DB | API routes, DB transactions |
| API | httpx TestClient | All `/api/v1/*` endpoints |
| Worker lifecycle | pytest | Full task state machine |
| Security | pytest | RBAC, permission escalation attempts |
| Order lifecycle | pytest | Create → deliver → return → refund |
| Supplier adapter | pytest | Mock feeds, parse/normalize pipeline |
| CI | GitHub Actions | `pytest` + `npm test` + lint + typecheck + build |

Add `npm test` script that runs smoke + delegates to pytest.

---

## 17. CI/CD Pipeline

```
lint → typecheck → pytest → npm test:smoke → build → security-check → deploy
```

Python tests **must** gate merge. Staging environment before production promotion.

---

## 18. Environment Strategy

| Env | Purpose | DB | Secrets |
|-----|---------|-----|---------|
| development | Local dev | SQLite or local Postgres | `.env` |
| test | CI / automated tests | Ephemeral Postgres | CI secrets |
| staging | Pre-production | Postgres (staging) | Render env |
| production | Live | Postgres (production) | Render env + secrets manager |

`.env` in `.gitignore`. Never commit API keys.

---

## 19. Implementation Phases

### Phase 0 — Foundation (this phase) ✅
- Repository analysis
- Architecture documents
- No code changes

### Phase 1 — Core Platform (Weeks 1–3)
- PostgreSQL + Alembic migrations
- Unified orchestrator with full task lifecycle
- Central memory service (extend existing)
- Worker registry + interface
- Exception engine (backend)
- Audit system (append-only)
- `/api/v1/tasks`, `/api/v1/memory`, `/api/v1/exceptions`, `/api/v1/audit`
- Esat Bey security enforcement on all routes
- pytest in root CI

### Phase 2 — Domain Workers (Weeks 4–6)
- Category AI workers (48 + KFZ) — enable `live_activation`
- Product AI + canonical product model
- Supplier hub adapter architecture
- Price engine + policy gate
- Stock engine + freshness checks
- Customs AI → exception pipeline
- Kurmay synthesis service

### Phase 3 — Commerce Integration (Weeks 7–9)
- Order engine lifecycle + Node bridge
- Customer service AI pipeline
- TecDoc adapter interface
- Admin dashboard AI Core pages (real data)
- Deprecate static HTML consoles (keep as archive)

### Phase 4 — Production Hardening (Weeks 10–12)
- PostgreSQL on Render (paid)
- Observability (metrics, Sentry)
- E2E tests
- Staging environment
- Migration of Node commerce critical tables
- Documentation + runbooks
- Enable sales only after payment credentials + approval

---

## 20. What We Will NOT Do

- ❌ Create new standalone HTML demo files
- ❌ Mock fake API keys or supplier connections
- ❌ Delete existing working features without documentation
- ❌ Build 11 separate applications
- ❌ Replace storefront i18n (de/en/tr/ar stays)
- ❌ Enable real payments/orders without explicit approval
- ❌ Simulate successful external connections as production-ready

---

## 21. Duplicate Consolidation Plan

| Duplicate | Action |
|-----------|--------|
| 6 orchestrators | Merge into `core/orchestrator.py`; archive others |
| 10 memory stores | Migrate to `CentralMemory`; read-only legacy |
| Node supplier v1.6 + v3.1 | v1.6 primary; v3.1 features absorbed |
| Category 43/47/48/55 numbering | Standardize: 48 L1 DE + KFZ (cat-05) = 49 expert workers |
| `buzzard_ki_gesamt/` | Archive; symlinks removed after validation |
| `buzzard_ai_gesamt/` agents | Merge into `buzzard_ai_complete/agents/` |
| 14 HTML OS consoles | Archive; admin dashboard replaces |
| `gizli/` entrypoints | Deprecate; `Buzzard/app.py` only |

---

## 22. Success Criteria (Definition of Done)

Per directive §32:

- [ ] Build successful
- [ ] Lint successful
- [ ] Typecheck successful
- [ ] All tests successful (pytest + smoke)
- [ ] Database migration successful (PostgreSQL)
- [ ] API health successful
- [ ] Frontend build successful
- [ ] Security checks successful
- [ ] Core worker lifecycle operational
- [ ] Task orchestration operational
- [ ] Memory persistence operational
- [ ] Exception lifecycle operational
- [ ] Audit logging operational
- [ ] External integrations marked `EXTERNAL INTEGRATION PENDING` where applicable

---

## 23. Related Documents

| Document | Purpose |
|----------|---------|
| [CURRENT_STATE.md](./CURRENT_STATE.md) | Repository analysis |
| [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) | Step-by-step migration |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | Target PostgreSQL schema |
| [API_SPEC.md](./API_SPEC.md) | `/api/v1/*` specification |
| [AI_WORKER_SPEC.md](./AI_WORKER_SPEC.md) | Worker interface contract |
| [SECURITY_MODEL.md](./SECURITY_MODEL.md) | Esat Bey security layer |

---

*This plan preserves all existing Buzzard assets while converging on a single production-grade AI Core platform.*
