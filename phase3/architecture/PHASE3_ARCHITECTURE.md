# BUZZARD AI CORE — PHASE 3 MASTER ARCHITECTURE

**Version:** 1.0  
**Date:** 2026-08-22  
**Baseline:** Phase 2 FROZEN — 96/100 (`PHASE2_PARTIAL`)  
**Scope:** Architecture design only — no Phase 3 implementation

---

## 1. Executive Summary

Phase 3 transforms Buzzard AI Core from a **verified, honest, integration-ready foundation** into a **production-grade autonomous commerce intelligence platform**. It closes the three external Commerce API P1 dependencies, wires real supplier and logistics systems, and introduces decision support and governed autonomy — without redesigning working Phase 1/2 components.

**Extend-not-replace** is mandatory. Phase 2 code in `intelligence/buzzard_ai_complete/ai_core/` remains frozen.

---

## 2. Architecture Hierarchy (13 Layers)

Dependencies flow **downward only**. No circular dependencies.

```
LAYER 12  Future Autonomous Operations
    ↑
LAYER 11  Human Interaction / Approval
    ↑
LAYER 10  Observability / Reporting
    ↑
LAYER 9   External Integrations
    ↑
LAYER 8   Exception / Recovery
    ↑
LAYER 7   Security / Governance
    ↑
LAYER 6   Memory / Knowledge
    ↑
LAYER 5   Commerce Intelligence
    ↑
LAYER 4   Category Intelligence
    ↑
LAYER 3   Specialist AI Workers
    ↑
LAYER 2   AI Orchestration
    ↑
LAYER 1   Central AI Core
    ↑
LAYER 0   Foundation / Infrastructure
```

### LAYER 0 — Foundation / Infrastructure

| Component | Phase 2 State | Phase 3 Extension |
|-----------|---------------|-------------------|
| PostgreSQL / SQLite | ✅ Migrations 001–007 | Additive 008+ (events, suppliers, products, decisions) |
| Alembic | ✅ | Continue chain; no rewrite |
| Config (`settings.py`) | ✅ | New integration credentials (env-scoped) |
| Feature flags | ✅ `BUZZARD_AI_CORE_V2` | `BUZZARD_AI_CORE_V3` for Phase 3 modules |
| Docker / deploy | Partial | Production topology documented in implementation plan |

**Depends on:** nothing  
**Depended on by:** all layers

### LAYER 1 — Central AI Core

| Component | Phase 2 State | Phase 3 Extension |
|-----------|---------------|-------------------|
| `UnifiedOrchestrator` | ✅ 13-state lifecycle | Hook extensions for decision engine events (Wave 5) |
| `CentralMemoryService` | ✅ Versioned namespaces | New namespaces: `decisions/`, `suppliers/`, `market/` |
| `ExceptionService` | ✅ 6-state lifecycle | SLA fields, postmortem links |
| `AuditService` | ✅ Dual-write | Correlation IDs, integration audit events |
| `TaskQueuePoller` | ✅ In-process | Optional distributed queue adapter (Wave 4+) |

**Depends on:** L0  
**Depended on by:** L2–L12

### LAYER 2 — AI Orchestration

| Component | Phase 2 State | Phase 3 Extension |
|-----------|---------------|-------------------|
| `WorkerRegistry` | ✅ 61 workers (48 category + 13 domain) | Register Phase 3 intelligence workers |
| `WorkerExecutor` | ✅ Timeout, permissions, validation | Contract tests for new workers |
| `resolve_worker_id()` | ✅ Taxonomy-aware routing | New task types for Phase 3 domains |
| Task dependencies | ✅ `TaskDependency` model | Decision-engine task chains |

**Depends on:** L1  
**Depended on by:** L3–L5, L8, L11

### LAYER 3 — Specialist AI Workers

Existing Phase 2 workers (frozen IDs):

| Worker ID | Family | Phase 3 Role |
|-----------|--------|--------------|
| `supplier-hub` | supplier | Wire to Supplier Integration Layer |
| `product-intelligence` | product | Wire to Product Intelligence Pipeline |
| `price-engine` | pricing | Wire to Pricing Intelligence Engine |
| `stock-engine` | stock | Wire to Stock Intelligence |
| `order-engine` | order | Wire to Order Intelligence |
| `customer-service-ai` | customer_service | Wire to Customer Intelligence + LLM |
| `customs-classifier` | customs | EU compliance path |
| `commerce-write` | commerce | Wire to Commerce Integration Layer |
| `kurmay` | kurmay | Input from Business Decision Engine |
| `security-ai` | security | Extended threat signals |
| `exception-coordinator` | exception | SLA + escalation extensions |
| `category-{bz.nn}` × N | category_intelligence | Dynamic; N = `TaxonomyRegistry.main_category_count()` |

**Depends on:** L2, L6, L7, L9  
**Depended on by:** L4, L5

### LAYER 4 — Category Intelligence

| Principle | Detail |
|-----------|--------|
| **Authority** | `TaxonomyRegistry` → `master_taxonomy_48_maximal/data/taxonomy.json` |
| **Worker provisioning** | `CategoryWorkerFactory` creates one worker per L1 node dynamically |
| **No fixed count** | Never hard-code 43, 47, 48, or 50 — use `main_category_count()` |
| **KFZ/TecDoc** | Capability extension on `bz.01`, not separate worker |
| **Memory** | `categories/{bz_id}/` namespace per category |
| **Permissions** | Category-scoped read/write via `PolicyEngine` |
| **KPIs** | Per-category metrics in observability layer |

Phase 3 adds: category-specific market signals, competitor assortment gaps, dynamic registration API for new L1 nodes.

**Depends on:** L3, L6, L9  
**Depended on by:** L5

### LAYER 5 — Commerce Intelligence

Aggregates product, pricing, stock, order, margin, promotion, demand, procurement, logistics, and returns intelligence into actionable signals. See §4 module classification.

**Depends on:** L3, L4, L6, L9  
**Depended on by:** L10, L11, L12

### LAYER 6 — Memory / Knowledge

| Memory Type | Namespace Pattern | Retention |
|-------------|-------------------|-----------|
| Short-term execution | `tasks/`, `workers/` | 90 days |
| Long-term knowledge | `insights/`, `decisions/` | Versioned, indefinite |
| Category | `categories/{bz_id}/` | Versioned |
| Supplier | `suppliers/{supplier_id}/` | Versioned |
| Product | `products/{sku}/` | Versioned |
| Customer context | `customers/{hash}/` | GDPR-scoped, pseudonymized |
| Decision | `decisions/{id}/` | Immutable audit trail |
| Exception | `exceptions/{id}/` | Linked to exception records |
| Policy | `policies/` | Versioned with effective dates |
| Audit | `audit/` (read-only via AuditService) | Indefinite |

Conflict resolution: latest version wins unless `confidence` score differs — higher confidence retained with merge log in `MemoryHistory`.

**Depends on:** L1  
**Depended on by:** L3–L5, L8, L10, L12

### LAYER 7 — Security / Governance

EsatBey security gate (Phase 1/2) + Phase 3 extensions:

- JWT authentication (replacing flat bearer token for production)
- RBAC with approval role enforcement
- ABAC for namespace and risk-level policies
- Service identities for integration adapters
- Secret management via environment / vault
- Rate limiting (existing middleware extended)

See `PHASE3_SECURITY_MODEL.md`.

**Depends on:** L0  
**Depended on by:** all layers above L1

### LAYER 8 — Exception / Recovery

Extended lifecycle:

```
DETECTED → CLASSIFIED → CONTAINED → ASSIGNED → REVIEW → RESOLVED
```

Phase 3 additions: SLA timers, retry policy registry, fallback actions, human escalation tiers, postmortem records, circuit breaker state.

**Depends on:** L1, L7  
**Depended on by:** L9, L10, L11

### LAYER 9 — External Integrations

| Integration | Phase 2 | Phase 3 |
|-------------|---------|---------|
| Commerce API | Scaffold (`CommerceBridge`) | Live adapter + health checks |
| Supplier feeds | `EXTERNAL_INTEGRATION_PENDING` | Multi-format adapter layer |
| WMS | Pending | Stock sync adapter |
| CRM | Pending | Customer context adapter |
| Customs authority | Pending | EU customs API adapter |
| LLM provider | `LlmProviderAdapter` exists | Production credentials + governance |
| Carriers (DHL, DPD, etc.) | Not present | Carrier abstraction (Wave 3+) |
| Market data (compliant) | Not present | Compliant public API adapters |

See `PHASE3_INTEGRATION_ARCHITECTURE.md`.

**Depends on:** L0, L7  
**Depended on by:** L3, L5

### LAYER 10 — Observability / Reporting

| Signal | Phase 2 | Phase 3 |
|--------|---------|---------|
| Structured logs | Partial | Full JSON logging with correlation IDs |
| Metrics | Health endpoints | Prometheus-compatible metrics |
| Traces | Request-ID middleware | Distributed trace propagation |
| Audit events | ✅ | Extended for integrations |
| Kurmay reports | ✅ | Business Decision Engine input |
| Dashboards | Not present | KPI definitions in implementation plan |

**Depends on:** L1–L9  
**Depended on by:** L11, L12

### LAYER 11 — Human Interaction / Approval

Phase 2 approval flow preserved and extended:

```
ACTION → RISK → POLICY → REQUIRED_APPROVER → APPROVAL → EXECUTION → AUDIT
```

Phase 3 adds: approval timeout, rejection cascade, multi-approver for financial thresholds, approval queue UI contract.

**Depends on:** L7, L2  
**Depended on by:** L12

### LAYER 12 — Future Autonomous Operations

Governed autonomy levels 0–5. Phase 3 implements levels 0–3; levels 4–5 are architected but not enabled in initial waves.

See `PHASE3_AUTONOMY_MODEL.md`.

**Depends on:** L5, L7, L10, L11  
**Depended on by:** nothing (top layer)

---

## 3. Phase 3 Purpose

Phase 3 logically extends Buzzard AI Core toward a **real autonomous commerce intelligence platform** by:

1. **Connecting real commerce systems** — close P1 gaps A-003, I-001, M-002
2. **Building supplier ecosystem intelligence** — multi-format ingestion, normalization, mapping
3. **Enabling governed product lifecycle** — supplier data → classification → publishing
4. **Operating production pricing** — policy-gated, never bypassed by AI workers
5. **Synchronizing stock truth** — multi-source reconciliation with conflict resolution
6. **Processing orders end-to-end** — idempotent ingestion through fulfillment
7. **Supporting customer intelligence** — privacy-respecting, escalation-aware
8. **Adding market intelligence** — compliant public data only
9. **Introducing Business Decision Engine** — signal aggregation → recommendations → governed actions
10. **Hardening security, observability, and EU multilingual operation**

### What Phase 3 is NOT

- Not a redesign of Phase 1/2 orchestrator, memory, or exception frameworks
- Not fake commerce data or synthetic CONNECTED status
- Not remediation of Phase 2 P3 technical debt (unless coincidentally addressed)
- Not unrestricted autonomous execution

---

## 4. Implementation Classification

### Legend

| Label | Meaning |
|-------|---------|
| **PHASE 1** | Implemented and verified in Phase 1 |
| **PHASE 2** | Implemented in frozen Phase 2 baseline |
| **PHASE 3** | New in Phase 3 architecture |
| **FUTURE** | Designed but deferred beyond initial Phase 3 waves |
| **EXTERNAL** | Requires external system provisioning |

### Module Classification (20 evaluated systems)

| # | System | Classification | Rationale |
|---|--------|----------------|-----------|
| 1 | Commerce Integration Layer | **PHASE 3** | `CommerceBridge` scaffold exists (P2); live adapter + sync is P3 |
| 2 | Supplier Integration Layer | **PHASE 3** | `supplier-hub` worker exists (P2); multi-format adapter layer is P3 |
| 3 | Product Intelligence | **PHASE 2 + PHASE 3** | Worker + pipeline stub (P2); full normalization→publish pipeline (P3) |
| 4 | Pricing Intelligence | **PHASE 2 + PHASE 3** | `price-engine` worker (P2); production policy engine + publish gate (P3) |
| 5 | Stock Intelligence | **PHASE 2 + PHASE 3** | `stock-engine` worker (P2); multi-source sync + conflict resolution (P3) |
| 6 | Order Intelligence | **PHASE 2 + PHASE 3** | `order-engine` worker (P2); full lifecycle + idempotency (P3) |
| 7 | Customer Intelligence | **PHASE 2 + PHASE 3** | `customer-service-ai` + LLM adapter (P2); CRM context + privacy (P3) |
| 8 | Market Intelligence | **PHASE 3** | New layer; compliant public data sources |
| 9 | Competitor Intelligence | **PHASE 3** | Subset of market intelligence; compliant sources only |
| 10 | Promotion Intelligence | **PHASE 3** | Pricing engine extension; policy-gated |
| 11 | Margin Intelligence | **PHASE 3** | Derived from pricing + cost; Kurmay input |
| 12 | Demand Forecasting | **FUTURE** | Requires historical sales data volume; architected, Wave 5+ |
| 13 | Procurement Intelligence | **PHASE 3** | `ProcurementRoutingService` Wave 3; `procurement-intelligence` worker Wave 5 |
| 14 | Logistics Intelligence | **PHASE 3** | Carrier abstraction; Wave 3–4 |
| 15 | Returns Intelligence | **PHASE 3** | Return lifecycle; Wave 4 |
| 16 | Customer Service Intelligence | **PHASE 2 + PHASE 3** | Worker exists; full escalation + CRM (P3) |
| 17 | Marketing Intelligence | **FUTURE** | Campaign optimization beyond Phase 3 scope |
| 18 | Analytics | **PHASE 2 + PHASE 3** | Kurmay reports (P2); metrics + dashboards (P3) |
| 19 | Business Decision Engine | **PHASE 3** | New central decision layer; **Wave 5** |
| 20 | Autonomous Action Engine | **PHASE 3** | Governed autonomy levels 0–3 initial; 4–5 future |

### Already Implemented (carry forward unchanged)

| Component | Phase |
|-----------|-------|
| UnifiedOrchestrator, 13-state task lifecycle | P1/P2 |
| CentralMemoryService with versioning | P1/P2 |
| ExceptionService with worker halt | P1/P2 |
| AuditService dual-write | P1/P2 |
| EsatBey security gate | P1/P2 |
| WorkerRegistry (61 workers) | P2 |
| TaxonomyRegistry + CategoryWorkerFactory | P2 |
| CommerceBridge HTTP scaffold | P2 |
| Kurmay rule engine (deterministic) | P2 |
| Approval-gated commerce write | P2 |
| IntegrationStatusRegistry + LlmProviderAdapter | P2 |
| Agents, Categories, Integrations, Reports APIs | P2 |
| Alembic migrations 001–007 | P1/P2 |

---

## 5. Documented Compatibility Issues

| Issue | Impact | Phase 3 Handling |
|-------|--------|------------------|
| Worker ID `kurmay` vs design `kurmay-synthesis` | Doc drift | Use implemented ID; optional alias |
| Worker ID `security-ai` vs design `esat-bey-security` | Doc drift | Use implemented ID |
| Kurmay has `memory:write` in permissions | Potential bypass concern | Orchestrator enforces write path; audit in Wave 1 |
| API-level permission check not wired | Security gap | JWT/RBAC in Wave 1 closes this |
| `IntegrationStatusRegistry` not synced with `CommerceBridge.is_configured()` | Status drift | `CommerceIntegrationAdapter` in Wave 1 |
| Storefront `cat-{nn}` vs master `bz.{nn}` | GAP-M-003 | Storefront bridge module in Wave 2 |
| In-process `TaskQueuePoller` | Scale limit | Distributed queue adapter in Wave 4 |

**No silent architecture changes.** All conflicts documented above.

---

## 6. Phase 3 Success Criteria (`PHASE3_READY`)

Phase 3 implementation complete when:

1. P1 commerce gaps (A-003, I-001, M-002) closed with verified staging/production E2E
2. `IntegrationStatusRegistry` reports `CONNECTED` for commerce, supplier_feeds, wms after real health checks
3. Domain workers return real structured outcomes (not `NO_DATA_AVAILABLE`) in E2E tests
4. JWT/RBAC enforced on API and approval paths
5. Business Decision Engine operational with governed autonomy levels 0–3
6. Full test suite green including commerce, supplier, and contract tests
7. Observability: structured logs, metrics, audit correlation IDs
8. Additive migrations 008+ applied without breaking Phase 2 schema

---

## 7. Architecture Artifact Index

See `DOC_INDEX.md` for complete document map.

**STOP — Phase 3 implementation not started. Phase 2 remains frozen.**
