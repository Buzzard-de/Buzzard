# BUZZARD AI CORE — PHASE 2 ARCHITECTURE

**Version:** 2.0 (Design)  
**Date:** 2026-08-22  
**Status:** Architecture only — **implementation not started**  
**Prerequisite:** Phase 1 Final Verification — 88/100 READY

---

## 1. Purpose

Phase 2 connects the **real Buzzard AI worker ecosystem** to the Phase 1 foundation:

- `UnifiedOrchestrator` — task lifecycle, routing, approval gates
- `CentralMemoryService` — versioned, namespaced knowledge store
- `ExceptionService` — detection, containment, worker halt
- `AuditService` — append-only action log
- `EsatBey` Security Layer — pre-execution policy gate
- `WorkerExecutor` + `WorkerRegistry` — deterministic execution spine

**This is not a demo.** Workers operate on real interfaces, real schemas, and real persistence. External integrations that are not configured return `EXTERNAL_INTEGRATION_PENDING` — never fake success.

---

## 2. Design Principles

| Principle | Enforcement |
|-----------|-------------|
| Single orchestrator | All domain work via `UnifiedOrchestrator.create_task()` |
| Single memory | All worker outputs → `CentralMemoryService` with typed namespaces |
| Security-by-design | EsatBey gate before every execution; workers cannot self-elevate |
| No fake AI | `EnvironmentAIProvider` fails explicitly until `LLM_API_KEY` configured |
| No fake data | Supplier/product feeds require real connectors; unconfigured = pending status |
| Audit everything | Every state transition, memory write, exception, halt → `AuditService` |
| Human gates for risk | HIGH/CRITICAL commercial actions require REVIEW → APPROVED |
| Kurmay reads, does not act | Kurmay synthesizes; orchestrator executes approved actions |

---

## 3. System Context

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           BUZZARD AI CORE (Phase 2)                          │
│                                                                              │
│  ┌─────────────┐   ┌──────────────┐   ┌─────────────┐   ┌────────────────┐  │
│  │ API Layer   │──▶│ Orchestrator │──▶│ Worker      │──▶│ Domain Workers │  │
│  │ /api/v1/*   │   │ (Phase 1+)   │   │ Executor    │   │ (11 families)  │  │
│  └─────────────┘   └──────┬───────┘   └─────────────┘   └───────┬────────┘  │
│                           │                                        │         │
│         ┌─────────────────┼─────────────────┬──────────────────────┘         │
│         ▼                 ▼                 ▼                                │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌────────────────┐  │
│  │ Central     │   │ Exception   │   │ Audit       │   │ Kurmay AI      │  │
│  │ Memory      │◀──│ Engine      │──▶│ System      │◀──│ (Synthesis)    │  │
│  └──────┬──────┘   └─────────────┘   └─────────────┘   └────────────────┘  │
│         │                                                                    │
│  ┌──────┴────────────────────────────────────────────────────────────────┐  │
│  │                    Esat Bey Security Layer (Gate)                        │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────┐          ┌─────────────────────┐
│ PostgreSQL       │          │ Commerce Bridge      │
│ ai_core_* tables │◀────────▶│ Node API (existing)  │
└─────────────────┘          └─────────────────────┘
```

---

## 4. Worker Ecosystem (11 Families)

| # | Family | Worker ID(s) | Count | Phase 1 State |
|---|--------|--------------|-------|---------------|
| 1 | **Kurmay AI** | `kurmay-synthesis` | 1 | Not built |
| 2 | **Category Intelligence** | `category-{taxonomy_node_id}` | **Dynamic** — one per master L1 node | Stub + legacy agents exist |
| 3 | **Supplier Intelligence** | `supplier-hub` | 1 | Routed, not implemented |
| 4 | **Product AI** | `product-intelligence` | 1 | Routed, not implemented |
| 5 | **Pricing AI** | `price-engine` | 1 | Deterministic stub |
| 6 | **Stock AI** | `stock-engine` | 1 | Routed, not implemented |
| 7 | **Customs AI** | `customs-classifier` | 1 | Legacy council module exists |
| 8 | **Order AI** | `order-engine` | 1 | Routed, not implemented |
| 9 | **Customer Service AI** | `customer-service-ai` | 1 | Deterministic stub |
| 10 | **Security AI** | `esat-bey-security` | 1 (gate, not task worker) | Partial — legacy SQLite |
| 11 | **Exception Coordination** | `exception-coordinator` | 1 | Phase 1 service exists |

**Total registered workers at Phase 2 launch:** `TaxonomyRegistry.list_main_categories().length` + domain/system workers (count computed at runtime — never hard-coded). See `PHASE2_CATEGORY_INTELLIGENCE_ARCHITECTURE.md`.

---

## 5. Canonical Taxonomy Decision

Phase 2 uses a **dynamic, taxonomy-driven** Category Intelligence model. The worker count is never hard-coded.

**Authoritative source:** `intelligence/buzzard_ai_complete/master_taxonomy_48_maximal/data/taxonomy.json` (schema `buzzard.master-taxonomy.v2`)

**Full specification:** `PHASE2_CATEGORY_INTELLIGENCE_ARCHITECTURE.md`

| Aspect | Rule |
|--------|------|
| Worker count | `TaxonomyRegistry.list_main_categories().length` at runtime |
| Worker ID | `category-{taxonomy_node_id}` (e.g. `category-bz.01`) |
| Node IDs | `bz.{nn}` from authoritative tree |
| KFZ / TecDoc | Capability extension on `bz.01` (Automotive & Kfz) — not a separate main-category worker |
| Legacy bridge | `category_intelligence_43_maximal/` wrapped via `CategoryIntelligenceBridge` |
| Discrepancies | 43/47/48/53/55 counts documented in category architecture — do not guess |

Category workers map 1:1 to every L1 node in the authoritative master tree. New L1 categories require no architectural changes — only a taxonomy file update and worker re-provisioning.

---

## 6. Core Communication Flow

```
DATA
  │
  ▼
WORKER (execute via WorkerExecutor)
  │
  ▼
RESULT (WorkerResult — validated output schema)
  │
  ▼
CENTRAL MEMORY (namespace write, versioned)
  │
  ▼
KURMAY AI (synthesis task triggered when impact ≥ MEDIUM)
  │
  ▼
DECISION (KurmayReport — recommendations, no side effects)
  │
  ▼
POLICY CHECK (EsatBey — risk level, permissions, rate limits)
  │
  ▼
APPROVAL IF REQUIRED (task → REVIEW → operator APPROVED)
  │
  ▼
ACTION (orchestrator creates downstream task or commerce bridge call)
  │
  ▼
AUDIT (append-only log with request_id, before/after state)
```

### 6.1 Trigger Rules for Kurmay

| Condition | Kurmay Trigger |
|-----------|----------------|
| Memory write with `impact >= MEDIUM` | Auto-create `kurmay_synthesis` child task |
| Exception `severity >= HIGH` | Auto-create `kurmay_synthesis` with exception context |
| Scheduled (cron) | Daily executive digest task |
| Manual | `POST /api/v1/reports/kurmay` |

Kurmay **never** calls commerce APIs directly. It produces `KurmayReport` memory entries of type `DECISION` and `INSIGHT`.

---

## 7. Worker Contract Evolution (Phase 1 → Phase 2)

Phase 1 `Worker` ABC is extended — not replaced — via `BuzzardWorker` mixin:

```python
# Target: ai_core/workers/buzzard_worker.py (NEW — Phase 2)

class BuzzardWorker(Worker):
    """Extends Phase 1 Worker with production metadata."""

  # Identity
    name: str
    category: str                          # worker family
    description: str
    capabilities: frozenset[str]
    permissions: frozenset[str]
    risk_level: RiskLevel
    memory_namespace: str

  # Schemas (Pydantic v2)
    input_schema: type[BaseModel]
    output_schema: type[BaseModel]

  # Policy
    execution_policy: ExecutionPolicy        # timeout, retries, approval threshold

    def validate_input(self, payload: dict) -> BaseModel: ...
    def validate_output(self, output: dict) -> BaseModel: ...
    def health(self) -> WorkerHealth: ...
```

Phase 1 workers remain compatible. Phase 2 workers add schema validation and metadata for `/api/v1/agents`.

---

## 8. Module Map — Extend vs Create

### 8.1 Phase 1 Modules to EXTEND

| Module | Path | Phase 2 Changes |
|--------|------|-----------------|
| UnifiedOrchestrator | `ai_core/services/orchestrator.py` | Kurmay triggers, action tasks, expanded routing |
| WorkerRegistry | `ai_core/workers/registry.py` | Metadata, health, capability index |
| WorkerExecutor | `ai_core/workers/executor.py` | Schema validation, structured errors |
| Worker (ABC) | `ai_core/workers/base.py` | BuzzardWorker extension, richer WorkerResult |
| CentralMemoryService | `ai_core/services/memory_service.py` | Namespace conventions, Kurmay read API |
| ExceptionService | `ai_core/services/exception_service.py` | Domain exception types, coordinator hooks |
| AuditService | `ai_core/services/audit_service.py` | Kurmay/action audit actions |
| WorkerStateService | `ai_core/services/worker_state_service.py` | Per-family halt groups |
| API Router | `ai_core/api/v1/router.py` | `/agents`, `/reports/kurmay`, domain endpoints |
| API Deps | `ai_core/api/deps.py` | Scoped API keys (Phase 2b) |
| EsatBey | `agents/esat_bey/agent.py` | Migrate to ai_core DB, expanded policies |
| Schemas | `ai_core/schemas/api.py` | Worker, Kurmay, domain request/response models |
| Enums | `ai_core/enums.py` | Task types, exception types, action types |
| Migrations | `alembic/versions/` | 004 workers table, 005 kurmay_reports, 006 api_keys |

### 8.2 NEW Modules (Phase 2)

| Module | Path | Purpose |
|--------|------|---------|
| BuzzardWorker base | `ai_core/workers/buzzard_worker.py` | Extended worker contract |
| Kurmay service | `ai_core/kurmay/service.py` | Synthesis engine |
| Kurmay schemas | `ai_core/kurmay/schemas.py` | KurmayReport, Situation, Recommendation |
| Kurmay worker | `ai_core/workers/kurmay/synthesis_worker.py` | Task worker wrapper |
| TaxonomyRegistry | `ai_core/taxonomy/registry.py` | Dynamic L1 discovery from master tree |
| Category workers | `ai_core/workers/category/` | CategoryExpertWorker per L1 node (factory-generated) |
| Category bridge | `ai_core/workers/category/bridge.py` | Wraps CategoryIntelligenceAgent |
| Supplier worker | `ai_core/workers/supplier/hub_worker.py` | Feed ingest pipeline |
| Supplier adapters | `ai_core/workers/supplier/adapters/` | Connector interfaces (no fake data) |
| Product worker | `ai_core/workers/product/intelligence_worker.py` | PIM enrichment |
| Price worker | `ai_core/workers/price/engine_worker.py` | Margin-aware pricing |
| Stock worker | `ai_core/workers/stock/engine_worker.py` | Level + freshness checks |
| Customs worker | `ai_core/workers/customs/classifier_worker.py` | HS classification |
| Order worker | `ai_core/workers/order/engine_worker.py` | Lifecycle checks |
| CS worker | `ai_core/workers/customer_service/service_worker.py` | Intent + draft |
| Security service | `ai_core/security/service.py` | EsatBey → platform security |
| Security policies | `ai_core/security/policies.py` | Risk rules, approval matrix |
| Exception coordinator | `ai_core/exception/coordinator.py` | Cross-worker exception routing |
| Commerce bridge | `ai_core/bridge/commerce.py` | Node API internal calls |
| Worker schemas | `ai_core/schemas/workers/` | Per-worker input/output Pydantic models |
| Agents API | `ai_core/api/v1/agents.py` | Worker registry HTTP surface |
| Reports API | `ai_core/api/v1/reports.py` | Kurmay reports HTTP surface |
| Background scheduler | `ai_core/scheduler/poller.py` | `run_cycle()` consumer |
| Integration status | `ai_core/integrations/status.py` | EXTERNAL_INTEGRATION_PENDING registry |

### 8.3 Legacy Modules — BRIDGE (not rewrite)

| Legacy | Bridge Strategy |
|--------|-----------------|
| `category_intelligence_43_maximal/` | `CategoryExpertWorker` delegates to `CategoryIntelligenceAgent.analyze()` |
| `supplier_intelligence_ai_maximal/` | Adapter interface; real connector when credentials exist |
| `pim_product_master/` | Product worker reads via commerce bridge |
| `ai_council_19_customs_bureaucracy/` | Customs worker delegates classification logic |
| `order_engine/` | Order worker reads order state via bridge |
| Node commerce plugins | Internal token bridge only; no direct worker access |

---

## 9. Data Stores

### 9.1 Existing Tables (Phase 1 — unchanged)

- `ai_core_tasks`, `ai_core_task_transitions`, `ai_core_task_dependencies`
- `ai_core_memory`, `ai_core_memory_history`
- `ai_core_exceptions`, `ai_core_exception_transitions`
- `ai_core_audit_log`
- `ai_core_worker_state`

### 9.2 New Tables (Phase 2)

| Table | Purpose |
|-------|---------|
| `ai_core_workers` | Registered worker metadata, status, health snapshot |
| `ai_core_kurmay_reports` | Structured synthesis reports (also mirrored to memory) |
| `ai_core_api_keys` | Scoped service accounts (Phase 2b) |
| `ai_core_integration_status` | External connector health (pending/connected/error) |
| `ai_core_action_queue` | Approved actions awaiting commerce bridge execution |

---

## 10. API Surface (Phase 2 Additions)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/agents` | Bearer | List registered workers + health |
| `GET` | `/api/v1/agents/{id}` | Bearer | Worker detail + capabilities |
| `POST` | `/api/v1/agents/{id}/health-check` | Bearer | Force health probe |
| `GET` | `/api/v1/reports/kurmay` | Bearer | List Kurmay reports |
| `GET` | `/api/v1/reports/kurmay/{id}` | Bearer | Single report |
| `POST` | `/api/v1/reports/kurmay` | Bearer | Trigger synthesis |
| `POST` | `/api/v1/categories/{bz_id}/scan` | Bearer | Create `category_scan` task |
| `POST` | `/api/v1/suppliers/sync` | Bearer | Create `supplier_sync` task |
| `POST` | `/api/v1/products/enrich` | Bearer | Create `product_enrich` task |
| `GET` | `/api/v1/integrations/status` | Bearer | External connector status |
| `GET` | `/api/v1/health/ready` | Public | Deep readiness (DB + workers + integrations) |

Existing Phase 1 endpoints remain unchanged.

---

## 11. Autonomy vs Human Approval

| Risk | Auto-execute | Example |
|------|--------------|---------|
| LOW | Yes | Category scan, memory write, health check |
| MEDIUM | Yes + audit | Price calculation, stock check, product enrichment draft |
| HIGH | No — REVIEW required | Price publish, order state change, customs approve |
| CRITICAL | No — APPROVED + operator | Refund, security config, worker resume after CRITICAL halt |

See `PHASE2_PERMISSION_MATRIX.md` for the full matrix.

---

## 12. External Integration Boundaries

All external connectors implement `IntegrationAdapter`:

```python
class IntegrationAdapter(ABC):
    integration_id: str          # e.g. "tecdoc", "supplier_feed_acme"
    
    def status(self) -> IntegrationStatus:
        """Returns CONNECTED | EXTERNAL_INTEGRATION_PENDING | ERROR"""
    
    def connect(self) -> ConnectionResult: ...
```

Workers check `status()` before calling external APIs. Unconfigured integrations:
- Return `WorkerResult.success=False` with `integration_status: "EXTERNAL_INTEGRATION_PENDING"`
- Write memory entry type `SIGNAL` documenting pending state
- Do **not** generate synthetic supplier/product/order data

---

## 13. Background Processing

Phase 1 uses in-process `run_cycle()`. Phase 2 adds:

```
ai_core/scheduler/poller.py
  → polls QUEUED/RETRY tasks every N seconds
  → respects worker halt state
  → configurable via BUZZARD_WORKER_POLL_INTERVAL_SECONDS
```

Production deployment: separate worker process or Render background worker calling the poller. No Celery dependency in Phase 2 initial scope.

---

## 14. Observability

| Signal | Mechanism |
|--------|-----------|
| Request correlation | `X-Request-Id` (Phase 1 middleware) |
| Task correlation | `task_id` on all audit entries |
| Worker execution | `worker.execute.start` / `worker.execute.finish` audit actions |
| Health | `/api/v1/agents` + `/api/v1/health/ready` |
| Integration status | `/api/v1/integrations/status` |

Structured JSON logging deferred to Phase 2b.

---

## 15. Non-Goals (Phase 2)

- Full JWT/RBAC (Phase 2b — scoped API keys first)
- Multi-tenant isolation
- Real-time WebSocket dashboards
- Automatic commerce write-back without approval
- LLM fine-tuning or model hosting
- Replacing Node commerce API

---

## 16. Success Criteria

Phase 2 is complete when:

1. All 11 worker families registered in `WorkerRegistry`
2. Category workers cover every authoritative master L1 node with real taxonomy bridge
3. Kurmay synthesizes reports from memory without executing commercial actions
4. EsatBey gate blocks unauthorized/high-risk actions
5. Exception coordinator routes cross-domain exceptions
6. `/api/v1/agents` and `/api/v1/reports/kurmay` operational
7. Background poller processes queued tasks
8. All external integrations report real status (pending or connected)
9. Test suite covers each worker family with schema + permission boundary tests
10. No fake AI execution, no fake supplier data in any code path

---

## 17. Related Documents

| Document | Content |
|----------|---------|
| `PHASE2_WORKER_SPEC.md` | Per-worker responsibility, schemas, policies |
| `PHASE2_DATA_FLOW.md` | End-to-end flows per domain |
| `PHASE2_PERMISSION_MATRIX.md` | Permissions, autonomy, approval gates |
| `PHASE2_IMPLEMENTATION_PLAN.md` | Ordered implementation steps |
| `PHASE2_CATEGORY_INTELLIGENCE_ARCHITECTURE.md` | Dynamic category worker model, taxonomy authority, discrepancies |

---

**Phase 2 architecture design complete. Implementation not started.**
