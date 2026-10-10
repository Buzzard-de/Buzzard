# BUZZARD AI CORE — AI WORKER SPECIFICATION

**Version:** 1.0  
**Date:** 2026-08-21

---

## 1. Purpose

This document defines the **standard contract** every AI worker in BUZZARD AI CORE must implement. Workers are the specialized execution units routed by the Central Orchestrator.

**Principles:**
- Workers operate through a common interface
- Workers cannot access other workers' domains without orchestrator routing
- Workers cannot elevate their own permissions
- All worker I/O is validated against schemas
- All worker actions are audit-logged

---

## 2. Worker Interface

```python
from abc import ABC, abstractmethod
from enum import Enum
from typing import Any
from pydantic import BaseModel
from uuid import UUID


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class WorkerStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    HALTED = "HALTED"       # stopped by exception engine
    MAINTENANCE = "MAINTENANCE"


class WorkerResult(BaseModel):
    success: bool
    output: dict[str, Any]
    confidence: float          # 0.0 – 1.0
    risk_level: RiskLevel
    memory_entries: list[dict]  # entries to write to CentralMemory
    exceptions: list[dict]      # exceptions to raise
    audit_metadata: dict[str, Any]


class BuzzardWorker(ABC):
    """Base contract for all AI workers."""

    # Identity (class-level, immutable after registration)
    id: str
    name: str
    category: str
    description: str
    capabilities: list[str]
    permissions: list[str]
    input_schema: type[BaseModel]
    output_schema: type[BaseModel]
    risk_level: RiskLevel
    memory_namespace: str
    execution_policy: ExecutionPolicy

    @abstractmethod
    def execute(
        self,
        task: "Task",
        memory: "CentralMemory",
        security: "SecurityLayer",
    ) -> WorkerResult:
        """Execute task. Must not bypass security layer."""
        ...

    @abstractmethod
    def health(self) -> WorkerHealth:
        """Return worker health status."""
        ...


class ExecutionPolicy(BaseModel):
    timeout_seconds: int = 60
    max_retries: int = 3
    retry_delay_seconds: int = 30
    requires_approval_above_risk: RiskLevel = RiskLevel.HIGH
    max_concurrent: int = 5


class WorkerHealth(BaseModel):
    status: WorkerStatus
    last_execution: str | None
    last_error: str | None
    executions_24h: int
    failure_rate_24h: float
```

---

## 3. Worker Registration

Workers are registered at application startup via `WorkerRegistry`:

```python
# core/worker_registry.py

class WorkerRegistry:
    def register(self, worker: BuzzardWorker) -> None: ...
    def get(self, worker_id: str) -> BuzzardWorker: ...
    def list_by_category(self, category: str) -> list[BuzzardWorker]: ...
    def list_by_capability(self, capability: str) -> list[BuzzardWorker]: ...
    def health_all(self) -> dict[str, WorkerHealth]: ...
```

Registration validates:
- Unique `id`
- Valid `input_schema` / `output_schema` (JSON Schema exportable)
- Permissions are subset of allowed worker permissions
- `memory_namespace` is unique per worker

---

## 4. Worker Categories

| Category | Workers | Count |
|----------|---------|-------|
| `category_intelligence` | Category expert workers | 49 (48 L1 + KFZ) |
| `customs` | Customs classification | 1 |
| `supplier` | Supplier sync, scoring | 1 |
| `product` | Enrichment, classification, dedup | 1 |
| `price` | Price calculation engine | 1 |
| `stock` | Stock level management | 1 |
| `order` | Order lifecycle | 1 |
| `customer_service` | Intent analysis, response draft | 1 |
| `security` | Esat Bey gate | 1 |
| `exception` | Exception detection/resolution | 1 |
| `kurmay` | Management synthesis | 1 |
| `orchestrator` | Aslan Bey task routing | 1 |
| `research` | Dogu Bey research | 1 |

**Total at launch:** ~60 workers

---

## 5. Category Intelligence Workers (49)

### 5.1 Base Class

```python
class CategoryWorker(BuzzardWorker):
    category = "category_intelligence"
    risk_level = RiskLevel.LOW
    permissions = [
        "memory:write",
        "tasks:read",
        "categories:analyze",
    ]
    capabilities = [
        "assortment_scan",
        "competitor_price",
        "competitor_product",
        "trend_analysis",
        "supplier_opportunity",
        "stock_price_signal",
        "subcategory_gap",
        "quality_issue_detection",
    ]

    def execute(self, task, memory, security) -> WorkerResult:
        analysis_types = task.payload.get("analysis_types", ["full"])
        findings = []
        for analysis in analysis_types:
            findings.extend(self._run_analysis(analysis, task, memory))
        return WorkerResult(
            success=True,
            output={"findings": findings, "category_id": self.category_id},
            confidence=self._aggregate_confidence(findings),
            risk_level=RiskLevel.LOW,
            memory_entries=[self._to_memory(f) for f in findings],
            exceptions=[],
            audit_metadata={"category_id": self.category_id, "analysis_count": len(findings)},
        )
```

### 5.2 Worker List (from taxonomy)

Generated from `data/taxonomy/buzzard_master_48_main_categories_de.json`:

| ID | Name | Namespace |
|----|------|-----------|
| `category-01` | Automotive & Kfz | `category:01` |
| `category-02` | Garten & Gartenbau | `category:02` |
| ... | ... | ... |
| `category-48` | Allgemeine Produkte & Marktplatz | `category:48` |
| `category-kfz` | KFZ Specialist (TecDoc-ready) | `category:kfz` |

### 5.3 Output Flow

```
CategoryWorker.execute()
    → findings[]
    → CentralMemory.write(type=SIGNAL or INSIGHT)
    → Kurmay.trigger_synthesis()  (if impact >= MEDIUM)
```

---

## 6. Domain Workers

### 6.1 Customs Worker

```python
class CustomsWorker(BuzzardWorker):
    id = "customs-classifier"
    category = "customs"
    risk_level = RiskLevel.MEDIUM
    permissions = ["memory:write", "customs:classify", "exceptions:create"]
    capabilities = ["hs_classification", "origin_check", "compliance_signal"]

    # NEVER returns APPROVED for high uncertainty
    # Always creates exception for REVIEW when confidence < 0.85
```

### 6.2 Supplier Worker

```python
class SupplierWorker(BuzzardWorker):
    id = "supplier-hub"
    category = "supplier"
    permissions = ["suppliers:read", "suppliers:sync", "memory:write"]
    capabilities = ["feed_ingest", "normalize", "validate", "score"]

    # Pipeline: RAW → PARSED → NORMALIZED → VALIDATED → CANONICAL
    # Stale feed → exception (STALE_SUPPLIER_FEED)
```

### 6.3 Product Worker

```python
class ProductWorker(BuzzardWorker):
    id = "product-intelligence"
    category = "product"
    permissions = ["products:read", "products:write", "memory:write"]
    capabilities = [
        "enrich", "classify", "title_generate", "description_generate",
        "attribute_extract", "taxonomy_map", "duplicate_detect", "identity_resolve",
    ]
```

### 6.4 Price Worker

```python
class PriceWorker(BuzzardWorker):
    id = "price-engine"
    category = "price"
    risk_level = RiskLevel.MEDIUM
    permissions = ["prices:calculate", "memory:write", "exceptions:create"]
    # NOT prices:publish — that requires human approval

    # Blocks auto-publish when margin < minimum_margin policy
    # Creates exception (LOW_MARGIN) on violation
```

### 6.5 Stock Worker

```python
class StockWorker(BuzzardWorker):
    id = "stock-engine"
    category = "stock"
    permissions = ["stock:read", "memory:write", "exceptions:create"]
    capabilities = ["level_check", "freshness_check", "safety_stock_alert"]

    # Negative stock → exception (NEGATIVE_STOCK)
    # Stale feed → exception (STALE_STOCK_DATA)
```

### 6.6 Order Worker

```python
class OrderWorker(BuzzardWorker):
    id = "order-engine"
    category = "order"
    risk_level = RiskLevel.HIGH
    permissions = ["orders:read", "orders:transition", "memory:write"]
    # Transition to SHIPPED requires fulfillment permission
    # Idempotency enforced on all transitions
```

### 6.7 Customer Service Worker

```python
class CustomerServiceWorker(BuzzardWorker):
    id = "customer-service-ai"
    category = "customer_service"
    permissions = ["customers:read", "orders:read", "memory:write", "exceptions:create"]
    capabilities = ["intent_detect", "context_load", "policy_check", "draft_response"]

    # Pipeline: intent → identity → order context → policy → answer → escalation
    # Intents: ORDER, SHIPPING, RETURN, REFUND, PRODUCT, PRICE, COMPATIBILITY, COMPLAINT, GENERAL
    # RETURN/REFUND with financial impact → escalation (no auto-decision)
```

---

## 7. System Workers

### 7.1 Aslan Bey (Orchestrator)

```python
class AslanBeyWorker(BuzzardWorker):
    id = "aslan-bey-orchestrator"
    category = "orchestrator"
    permissions = ["tasks:create", "tasks:transition", "tasks:read", "agents:read"]
    # Routes tasks to appropriate workers
    # Manages priority, dependencies, retries
```

**Source:** `intelligence/buzzard_ai_complete/agents/aslan_bey/agent.py`

### 7.2 Esat Bey (Security)

```python
class EsatBeyWorker(BuzzardWorker):
    id = "esat-bey-security"
    category = "security"
    permissions = ["security:read", "audit:read"]
    # NOT a task worker — runs as gate before every execution
    # Cannot be bypassed by any worker including AslanBey
```

**Source:** `intelligence/buzzard_ai_complete/agents/esat_bey/agent.py`

### 7.3 Dogu Bey (Research)

```python
class DoguBeyWorker(BuzzardWorker):
    id = "dogu-bey-research"
    category = "research"
    permissions = ["memory:write", "tasks:read"]
    capabilities = ["web_research", "source_verification", "claim_extraction"]
```

**Source:** `intelligence/buzzard_ai_complete/agents/dogu_bey/` + `buzzard_ai_gesamt/agents/`

### 7.4 Kurmay (Synthesis)

```python
class KurmayWorker(BuzzardWorker):
    id = "kurmay-synthesis"
    category = "kurmay"
    permissions = ["memory:read", "reports:generate"]
    capabilities = ["synthesize", "recommend", "risk_assess"]

    # Output: SITUATION → ANALYSIS → RISK → OPPORTUNITY → RECOMMENDATION → REQUIRED APPROVAL → ACTION
    # Does NOT execute high-risk commercial actions
```

### 7.5 Exception Worker

```python
class ExceptionWorker(BuzzardWorker):
    id = "exception-engine"
    category = "exception"
    permissions = ["exceptions:create", "exceptions:resolve", "workers:halt"]
    capabilities = ["detect", "classify", "contain", "assign", "resolve"]

    # CRITICAL → can halt affected worker (status = HALTED)
```

---

## 8. Task Routing

Orchestrator selects worker by `task.type`:

| Task Type | Worker |
|-----------|--------|
| `category_scan` | `category-{id}` |
| `supplier_sync` | `supplier-hub` |
| `price_recheck` | `price-engine` |
| `stock_sync` | `stock-engine` |
| `product_enrich` | `product-intelligence` |
| `order_check` | `order-engine` |
| `customer_service` | `customer-service-ai` |
| `customs_classify` | `customs-classifier` |
| `kurmay_synthesis` | `kurmay-synthesis` |
| `system_health` | `aslan-bey-orchestrator` |

Routing logic in `core/task_engine.py`:

```python
def select_worker(task: Task, registry: WorkerRegistry) -> BuzzardWorker:
    if task.type.startswith("category_"):
        return registry.get(f"category-{task.payload['category_id']}")
    return ROUTING_TABLE[task.type]
```

---

## 9. Permission Matrix

| Permission | category | product | price | order | customs | supplier | CS | kurmay | security |
|------------|----------|---------|-------|-------|---------|----------|-----|--------|----------|
| memory:write | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| memory:read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| tasks:read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| prices:calculate | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| prices:publish | ❌ | ❌ | ❌* | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| orders:transition | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| customs:approve | ❌ | ❌ | ❌ | ❌ | ❌** | ❌ | ❌ | ❌ | ❌ |
| exceptions:create | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ |
| workers:halt | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

\* Price publish requires human operator, not worker  
\** Customs approve requires human operator

---

## 10. Worker Lifecycle

```
REGISTERED (at startup)
    → ACTIVE (ready for tasks)
    → RUNNING (executing task)
    → ACTIVE (task complete)
    → HALTED (CRITICAL exception — manual resume required)
    → MAINTENANCE (admin disabled)
    → INACTIVE (decommissioned)
```

Worker status stored in `workers.status`. HALTED workers reject new tasks until admin resumes.

---

## 11. Error Handling

```python
class WorkerExecutionError(Exception):
    worker_id: str
    task_id: UUID
    retryable: bool
    risk_level: RiskLevel

# On failure:
# 1. Log to audit
# 2. If retryable and attempts < max: task → RETRY
# 3. If not retryable: task → FAILED, create exception
# 4. If CRITICAL: worker → HALTED
```

---

## 12. Testing Requirements

Each worker must have:

```python
# tests/workers/test_category_worker.py

def test_execute_returns_valid_result():
    worker = CategoryWorker(category_id="01")
    task = Task(type="category_scan", payload={"analysis_types": ["gap"]})
    result = worker.execute(task, memory, security)
    assert result.success
    assert 0 <= result.confidence <= 1
    assert worker.output_schema.model_validate(result.output)

def test_permission_boundary():
    worker = CategoryWorker(category_id="01")
    assert "prices:publish" not in worker.permissions

def test_cannot_self_elevate():
    # worker attempts to modify own permissions → blocked by security layer
    ...
```

---

## 13. Migration from Existing Agents

| Existing | Target Worker |
|----------|---------------|
| `category_intelligence_43_maximal/.../agent.py` | `CategoryWorker` base + 49 instances |
| `ai_council_19_customs_bureaucracy/` | `CustomsWorker` |
| `supplier_intelligence_ai_maximal/` | `SupplierWorker` |
| `pim_product_master/` | `ProductWorker` |
| `agents/aslan_bey/` | `AslanBeyWorker` |
| `agents/esat_bey/` | `EsatBeyWorker` (security gate) |
| `agents/dogu_bey/` | `DoguBeyWorker` |
| HTML "workers" in AI Core console | Replaced by real workers |

---

## 14. External Integration Boundaries

Workers that depend on external services must handle `EXTERNAL_INTEGRATION_PENDING`:

```python
class TecDocAdapter:
    def connect(self) -> ConnectionResult:
        if not os.getenv("TECDOC_API_KEY"):
            return ConnectionResult(
                status="EXTERNAL_INTEGRATION_PENDING",
                message="TECDOC_API_KEY not configured",
            )
        # real connection when credentials available
```

Workers must **never** return fake success for unconfigured integrations.

---

*See [ARCHITECTURE_PLAN.md](./ARCHITECTURE_PLAN.md) for system overview and [SECURITY_MODEL.md](./SECURITY_MODEL.md) for permission enforcement.*
