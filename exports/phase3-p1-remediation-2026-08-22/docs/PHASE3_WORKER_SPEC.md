# BUZZARD AI CORE — PHASE 3 WORKER SPECIFICATION

**Version:** 1.0  
**Date:** 2026-08-22  
**Extends:** `docs/buzzard-ai-core/PHASE2_WORKER_SPEC.md` (frozen)

---

## 1. Worker Contract (inherited — unchanged)

All Phase 3 workers extend `BuzzardWorker` (Phase 2 frozen base):

```python
class BuzzardWorker(ABC):
    worker_id: str
    family: str
    capabilities: frozenset[str]
    permissions: frozenset[str]  # resource:action
    risk_level: RiskLevel
    supported_task_types: frozenset[str]

    def execute(self, context: WorkerContext) -> WorkerResult: ...
```

Phase 3 adds new workers and extends existing worker behavior through integration wiring — **no changes to the base contract**.

---

## 2. Existing Workers — Phase 3 Wiring

| Worker ID | Task Types | Phase 3 Change | Integration |
|-----------|------------|----------------|-------------|
| `supplier-hub` | `supplier_sync` | Wire to Supplier Adapter Layer | `SupplierAdapter` |
| `product-intelligence` | `product_enrich` | Full pipeline execution | Supplier + Commerce + Category |
| `price-engine` | `price_recheck` | PricingPolicyEngine gate | CommerceBridge write |
| `stock-engine` | `stock_sync` | Multi-source reconciliation | WMS + Commerce + Supplier |
| `order-engine` | `order_check` | Full order lifecycle | Commerce + Stock + Supplier |
| `customer-service-ai` | `customer_service` | CRM + LLM production path | CRM + LlmProviderAdapter |
| `customs-classifier` | `customs_classify` | EU customs API | Customs authority adapter |
| `commerce-write` | `commerce_write` | Live write execution | CommerceBridge (unchanged gate) |
| `kurmay` | `kurmay_synthesis` | Decision Engine input | Memory + Exceptions |
| `security-ai` | `security_scan`, `security_inspect` | Extended threat signals | EsatBey |
| `exception-coordinator` | `exception_route`, `exception_coordinate` | SLA + postmortem | ExceptionService |
| `category-{bz.nn}` | `category_scan`, `category_analyze`, `taxonomy_gap_report` | Market signals | TaxonomyRegistry + Commerce |

Worker count: `13 + TaxonomyRegistry.main_category_count()` — currently 61, dynamic.

---

## 3. New Phase 3 Workers

### 3.1 `market-intelligence`

| Field | Value |
|-------|-------|
| **Worker ID** | `market-intelligence` |
| **Family** | `market` |
| **Task Types** | `market_scan`, `competitor_analysis`, `trend_detection` |
| **Risk Level** | LOW |
| **Permissions** | `market:read`, `memory:write` (namespace `market/`) |
| **Capabilities** | `compliant_data_ingestion`, `signal_generation` |
| **Integration** | Compliant market data adapters only |
| **Approval** | Not required (read-only intelligence) |
| **Memory Namespace** | `market/{source}/`, `competitors/{id}/` |

### 3.2 `procurement-intelligence` (Wave 5 worker)

| Field | Value |
|-------|-------|
| **Worker ID** | `procurement-intelligence` |
| **Registration Wave** | **5** (worker); routing logic in `ProcurementRoutingService` Wave 3 |
| **Family** | `procurement` |
| **Task Types** | `supplier_selection`, `purchase_order_draft` |
| **Risk Level** | MEDIUM |
| **Permissions** | `suppliers:read`, `stock:read`, `procurement:draft` |
| **Capabilities** | `supplier_scoring`, `po_generation` |
| **Approval** | Required for PO submission (HIGH if above threshold) |
| **Memory Namespace** | `procurement/{id}/` |

### 3.3 `logistics-intelligence`

| Field | Value |
|-------|-------|
| **Worker ID** | `logistics-intelligence` |
| **Family** | `logistics` |
| **Task Types** | `shipment_rate`, `label_create`, `tracking_update` |
| **Risk Level** | MEDIUM |
| **Permissions** | `logistics:read`, `logistics:execute`, `orders:read` |
| **Capabilities** | `rate_quote`, `label_generation`, `tracking` |
| **Integration** | Carrier Adapter Layer |
| **Approval** | Required for label creation above value threshold |
| **Memory Namespace** | `logistics/{shipment_id}/` |

### 3.4 `returns-intelligence`

| Field | Value |
|-------|-------|
| **Worker ID** | `returns-intelligence` |
| **Family** | `returns` |
| **Task Types** | `return_evaluate`, `return_process`, `refund_recommend` |
| **Risk Level** | HIGH |
| **Permissions** | `returns:read`, `returns:evaluate`, `orders:read` |
| **Capabilities** | `eligibility_check`, `routing`, `refund_recommendation` |
| **Approval** | Required for all refund recommendations |
| **Memory Namespace** | `returns/{id}/` |

### 3.5 `decision-engine`

| Field | Value |
|-------|-------|
| **Worker ID** | `decision-engine` |
| **Family** | `decision` |
| **Task Types** | `decision_evaluate`, `decision_synthesize` |
| **Risk Level** | MEDIUM |
| **Permissions** | `memory:read`, `decisions:write`, `tasks:create` |
| **Capabilities** | `signal_aggregation`, `recommendation`, `task_creation` |
| **Approval** | Cannot execute actions — only creates APPROVAL_REQUEST tasks |
| **Memory Namespace** | `decisions/` |
| **Constraint** | Never sets `approval_granted=True`; never calls CommerceBridge.write directly |

---

## 4. Worker Registration

Phase 3 workers registered in `build_phase3_registry()` (new function, gated by `BUZZARD_AI_CORE_V3`):

```python
def build_phase3_registry(...) -> WorkerRegistry:
    registry = build_phase2_registry(...)  # inherit all Phase 2 workers
    registry.register(MarketIntelligenceWorker())
    registry.register(ProcurementIntelligenceWorker())
    registry.register(LogisticsIntelligenceWorker())
    registry.register(ReturnsIntelligenceWorker())
    registry.register(DecisionEngineWorker())
    return registry
```

`BUZZARD_AI_CORE_V2=1` remains required. `BUZZARD_AI_CORE_V3=1` enables Phase 3 extensions.

---

## 5. Task Type Routing (new entries)

| Task Type | Worker ID | Phase |
|-----------|-----------|-------|
| `market_scan` | `market-intelligence` | 3 |
| `competitor_analysis` | `market-intelligence` | 3 |
| `supplier_selection` | `procurement-intelligence` | 3 |
| `purchase_order_draft` | `procurement-intelligence` | 3 |
| `shipment_rate` | `logistics-intelligence` | 3 |
| `label_create` | `logistics-intelligence` | 3 |
| `return_evaluate` | `returns-intelligence` | 3 |
| `refund_recommend` | `returns-intelligence` | 3 |
| `decision_evaluate` | `decision-engine` | 3 |

Existing Phase 2 routing preserved unchanged.

---

## 6. Worker Output Schema Requirements

All workers must return `WorkerResult` with:

```python
@dataclass
class WorkerResult:
    success: bool
    output: dict[str, Any]          # Structured, schema-validated
    memory_entries: list[dict]       # Optional memory writes
    exceptions: list[dict]           # Optional exception triggers
    requires_approval: bool          # Gate for REVIEW transition
    risk_level: RiskLevel
    correlation_id: str
```

Phase 3 adds required output keys per worker family (validated by `WorkerExecutor`):

| Family | Required Keys |
|--------|---------------|
| `market` | `signals`, `source`, `confidence` |
| `procurement` | `recommendation`, `suppliers_evaluated` |
| `logistics` | `carrier_id`, `status` |
| `returns` | `eligibility`, `recommendation`, `requires_approval` |
| `decision` | `output_type`, `confidence`, `signals_processed` |

---

## 7. Retry and Timeout Policy

| Risk Level | Max Retries | Timeout | Backoff |
|------------|-------------|---------|---------|
| LOW | 3 | 30s | Exponential |
| MEDIUM | 2 | 60s | Exponential |
| HIGH | 1 | 120s | Fixed 5s |
| CRITICAL | 0 | 180s | No retry — escalate |

Integration calls within workers inherit connector retry policy (see `PHASE3_INTEGRATION_ARCHITECTURE.md`).

---

## 8. Worker Health

Existing: `POST /api/v1/agents/{id}/health-check`

Phase 3 extensions:
- Integration-dependent workers report `DEGRADED` when integration DISCONNECTED
- Health check probes integration adapter + worker logic
- `ai_core_workers.health_status` updated on check
- Kurmay receives worker health degradation signals

---

## 9. Category Worker Dynamic Registration

```python
# Provisioning rule (unchanged from Phase 2)
for node in TaxonomyRegistry().list_main_categories():
    worker_id = f"category-{node.id}"  # e.g. category-bz.01
    registry.register(CategoryExpertWorker(node))
```

Phase 3 additions per category worker:
- Market signals scoped to category
- Category-specific KPIs in observability
- Category-specific memory namespace: `categories/{bz_id}/`
- Category-specific permissions via `PolicyEngine.can_access_category(role, bz_id)`

Adding a new L1 category to `taxonomy.json` automatically provisions a new worker on next registry build. **No AI Core redesign required.**

---

## 10. Kurmay Interaction Rules

| Rule | Detail |
|------|--------|
| Kurmay does not execute commercial writes | Synthesis only |
| Kurmay reads memory and exceptions | Via `KurmayRuleEngine` |
| Kurmay writes to `insights/kurmay/` | Via orchestrator callback |
| Decision Engine may trigger Kurmay | On aggregated decision batches |
| Kurmay cannot approve tasks | No approval permissions |

---

**STOP — Worker implementation not started.**
