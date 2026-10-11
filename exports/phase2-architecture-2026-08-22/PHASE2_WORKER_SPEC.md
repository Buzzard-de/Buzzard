# BUZZARD AI CORE — PHASE 2 WORKER SPECIFICATION

**Version:** 2.0 (Design)  
**Date:** 2026-08-22  
**Status:** Architecture only — **implementation not started**  
**Builds on:** Phase 1 `Worker` ABC, `AI_WORKER_SPEC.md` v1.0

---

## 1. Standard Worker Fields

Every worker in this document defines the same field set:

| Field | Description |
|-------|-------------|
| **Responsibility** | What the worker owns |
| **Input Schema** | Pydantic model — validated before execution |
| **Output Schema** | Pydantic model — validated after execution |
| **Capabilities** | Declared capability tokens |
| **Permissions** | Fixed permission set (immutable at runtime) |
| **Risk Level** | Default risk classification |
| **Memory Access** | Namespaces read/write |
| **Tools** | Internal adapters and external connectors |
| **Dependencies** | Other workers, services, or data sources |
| **Failure Behavior** | What happens on error |
| **Retry Behavior** | Retry policy |
| **Approval Requirements** | When human gate is required |
| **Audit Requirements** | Required audit actions |

---

## 2. Kurmay AI

**Worker ID:** `kurmay-synthesis`  
**Category:** `kurmay`  
**Task Types:** `kurmay_synthesis`, `kurmay_digest`

### Responsibility

Executive synthesis layer. Receives structured reports from specialist workers via Central Memory, produces cross-domain situation analysis, risk assessment, opportunity identification, and actionable recommendations. **Does not execute commercial actions.**

### Input Schema

```python
class KurmaySynthesisInput(BaseModel):
    trigger: Literal["memory_event", "exception", "scheduled", "manual"]
    scope: Literal["category", "supplier", "product", "price", "stock", "order", "customs", "customer_service", "global"]
    namespace_filter: list[str] | None = None      # e.g. ["categories/bz.01", "suppliers/*"]
    memory_since: datetime | None = None            # time window for memory reads
    exception_ids: list[str] | None = None
    task_ids: list[str] | None = None               # source tasks to synthesize
    priority_topics: list[str] | None = None        # focus areas
    max_entries: int = Field(default=500, le=2000)
```

### Output Schema

```python
class KurmayRecommendation(BaseModel):
    action_type: str                                # e.g. "price_recheck", "supplier_sync"
    target_entity: str
    rationale: str
    confidence: float                               # 0.0–1.0
    risk_level: RiskLevel
    requires_approval: bool
    suggested_payload: dict[str, Any]

class KurmayReport(BaseModel):
    report_id: str
    generated_at: datetime
    scope: str
    situation: str                                  # executive summary
    analysis: list[dict[str, Any]]                  # per-domain findings
    risks: list[dict[str, Any]]                     # severity, source, mitigation
    opportunities: list[dict[str, Any]]
    recommendations: list[KurmayRecommendation]
    required_approvals: list[str]                   # action types needing human gate
    source_memory_ids: list[str]
    source_exception_ids: list[str]
    confidence: float
```

### Capabilities

`memory:aggregate`, `cross_domain_synthesize`, `risk_assess`, `recommend`, `executive_digest`

### Permissions

`memory:read`, `tasks:read`, `exceptions:read`, `reports:generate`, `audit:read`

**Explicitly denied:** `memory:write` (writes via orchestrator callback), `prices:publish`, `orders:transition`, `suppliers:sync`, all commerce write permissions

### Risk Level

`LOW` — Kurmay produces recommendations only; downstream action tasks inherit their own risk.

### Memory Access

| Direction | Namespace | Type |
|-----------|-----------|------|
| Read | `categories/*`, `suppliers/*`, `products/*`, `prices/*`, `stock/*`, `orders/*`, `customs/*`, `customer_service/*`, `exceptions/*` | SIGNAL, INSIGHT, FACT, EXCEPTION |
| Write (via orchestrator) | `kurmay/reports` | DECISION, INSIGHT |

### Tools

- `CentralMemoryService.search()` — aggregated read
- `ExceptionService.list()` — open exception context
- `EnvironmentAIProvider` — optional LLM synthesis when configured; otherwise deterministic rule-based aggregation
- `KurmayRuleEngine` — template-based synthesis without LLM

### Dependencies

- `CentralMemoryService` (read)
- `ExceptionService` (read)
- `AuditService` (log)
- Specialist worker memory entries (must exist before synthesis)

### Failure Behavior

| Failure | Action |
|---------|--------|
| No memory entries in scope | Return success with empty report + `confidence: 0.0` |
| LLM unavailable | Fall back to `KurmayRuleEngine` (deterministic) |
| Schema validation error | Task → FAILED, exception `KURMAY_SCHEMA_ERROR` |
| Timeout | Task → RETRY |

### Retry Behavior

- `max_attempts: 2`
- `retry_delay_seconds: 60`
- Non-retryable: schema errors, permission denied

### Approval Requirements

Kurmay itself requires no approval. Each `KurmayRecommendation` with `requires_approval: true` spawns a child task in `REVIEW` state — never auto-executed.

### Audit Requirements

- `kurmay.synthesis.start` — scope, trigger, entry count
- `kurmay.synthesis.complete` — report_id, recommendation count, confidence
- `kurmay.recommendation.proposed` — per recommendation with risk level

---

## 3. Category Intelligence AI Workers

**Worker IDs:** `category-bz.01` … `category-bz.48`, `category-kfz`  
**Category:** `category_intelligence`  
**Task Types:** `category_scan`, `category_analyze`, `taxonomy_gap_report`

### Responsibility

Per-category market intelligence: assortment analysis, competitor price signals, taxonomy gap detection, opportunity scoring, and evidence collection. One worker per L1 taxonomy node from `master_taxonomy_48_maximal`. KFZ specialist adds automotive compatibility analysis via TecDoc adapter interface.

### Input Schema

```python
class CategoryScanInput(BaseModel):
    category_id: str                                # bz.01 – bz.48 or "kfz"
    analysis_types: list[Literal[
        "assortment_scan", "competitor_price", "competitor_product",
        "trend_analysis", "supplier_opportunity", "stock_price_signal",
        "subcategory_gap", "quality_issue_detection", "full"
    ]] = ["full"]
    period: str = "current"                         # reporting period label
    observed_taxonomy_snapshot: dict | None = None  # optional external taxonomy
    offer_sample: list[dict] | None = None          # pre-loaded offers (no fake generation)
    depth: Literal["L1", "L2", "L3"] = "L2"
    include_children: bool = True
```

### Output Schema

```python
class CategoryFinding(BaseModel):
    finding_id: str
    category_id: str
    finding_type: str                               # gap, price_signal, opportunity, risk
    title: str
    description: str
    confidence: float
    evidence_refs: list[str]
    impact: MemoryImpact

class CategoryScanOutput(BaseModel):
    category_id: str
    category_name: str
    period: str
    offers_seen: int
    unique_sellers: int
    price_statistics: dict[str, Any]
    findings: list[CategoryFinding]
    opportunities: list[dict[str, Any]]
    taxonomy_gaps: list[dict[str, Any]]
    risks: list[dict[str, Any]]
    integration_status: dict[str, str]              # per-connector status
```

### Capabilities

`assortment_scan`, `competitor_price`, `competitor_product`, `trend_analysis`, `supplier_opportunity`, `stock_price_signal`, `subcategory_gap`, `quality_issue_detection`, `taxonomy_map`

**KFZ specialist additional:** `vehicle_compatibility_check`, `tecdoc_lookup` (interface only)

### Permissions

`memory:write`, `memory:read`, `tasks:read`, `categories:analyze`, `taxonomy:read`

### Risk Level

`LOW`

### Memory Access

| Direction | Namespace | Type |
|-----------|-----------|------|
| Write | `categories/{category_id}` | SIGNAL, INSIGHT |
| Read | `categories/{category_id}`, `taxonomy/canonical` | FACT, SIGNAL |

### Tools

- `CategoryIntelligenceBridge` — wraps existing `CategoryIntelligenceAgent.analyze()`
- `TaxonomyLoader` — reads `master_taxonomy_48_maximal/data/taxonomy.json`
- `PriceIntelligenceEngine` — existing pricing analysis
- `TaxonomyIntelligence` — gap detection
- `OpportunityScorer` — scoring engine
- `EvidenceStore` — evidence persistence (existing module)
- `TecDocAdapter` — `EXTERNAL_INTEGRATION_PENDING` until `TECDOC_API_KEY` set (KFZ only)
- `PublicSourceCrawler` — policy-gated; returns empty if not configured

### Dependencies

- `master_taxonomy_48_maximal/data/taxonomy.json` (canonical)
- `category_intelligence_43_maximal/category_intelligence/` (bridge)
- Real offer data via payload or configured crawler — **never synthesized**

### Failure Behavior

| Failure | Action |
|---------|--------|
| Unknown category_id | Task → FAILED, exception `INVALID_CATEGORY` |
| No offer data available | Success with `offers_seen: 0`, findings note `NO_DATA_AVAILABLE` |
| Crawler not configured | Success with `integration_status.crawler: EXTERNAL_INTEGRATION_PENDING` |
| TecDoc unavailable (KFZ) | Skip compatibility checks; note in output |

### Retry Behavior

- `max_attempts: 3`
- `timeout_seconds: 120`
- Retryable: timeout, transient crawler errors

### Approval Requirements

None for scan/analyze. Findings with `impact: CRITICAL` trigger Kurmay synthesis automatically.

### Audit Requirements

- `category.scan.start` — category_id, analysis_types
- `category.scan.complete` — findings count, offers_seen
- `category.finding.recorded` — per finding with confidence

---

## 4. Supplier Intelligence AI

**Worker ID:** `supplier-hub`  
**Category:** `supplier`  
**Task Types:** `supplier_sync`, `supplier_validate`, `supplier_score`

### Responsibility

Supplier feed ingestion, normalization, validation, freshness monitoring, and scoring. Pipeline: RAW → PARSED → NORMALIZED → VALIDATED → CANONICAL. Does not invent supplier catalogs.

### Input Schema

```python
class SupplierSyncInput(BaseModel):
    supplier_id: str
    feed_type: Literal["api", "ftp", "manual_upload", "edi"]
    sync_mode: Literal["full", "incremental", "validate_only"] = "incremental"
    feed_reference: str | None = None               # file path or API endpoint ref
    force_refresh: bool = False
```

### Output Schema

```python
class SupplierSyncOutput(BaseModel):
    supplier_id: str
    sync_status: Literal["SUCCESS", "PARTIAL", "FAILED", "EXTERNAL_INTEGRATION_PENDING"]
    records_received: int
    records_normalized: int
    records_validated: int
    records_rejected: int
    validation_errors: list[dict[str, Any]]
  freshness: dict[str, Any]                         # last_sync, staleness_hours
    score: float | None                             # 0.0–1.0 supplier reliability
    integration_status: str
    canonical_snapshot_id: str | None
```

### Capabilities

`feed_ingest`, `normalize`, `validate`, `score`, `freshness_check`, `duplicate_detect`

### Permissions

`suppliers:read`, `suppliers:sync`, `memory:write`, `memory:read`, `exceptions:create`

### Risk Level

`MEDIUM`

### Memory Access

| Direction | Namespace | Type |
|-----------|-----------|------|
| Write | `suppliers/{supplier_id}` | FACT, SIGNAL, EVENT |
| Read | `suppliers/{supplier_id}` | FACT, SIGNAL |

### Tools

- `SupplierFeedAdapter` (ABC) — per-supplier connector
- `SupplierNormalizer` — field mapping engine
- `SupplierValidator` — schema + business rule validation
- `SupplierScorer` — reliability scoring
- `CommerceBridge.get_supplier_config()` — read supplier config from Node API

### Dependencies

- Configured supplier feed credentials (per supplier)
- `supplier_intelligence_ai_maximal/` logic (bridge)
- Commerce bridge for supplier metadata

### Failure Behavior

| Failure | Action |
|---------|--------|
| No credentials configured | `sync_status: EXTERNAL_INTEGRATION_PENDING`, no fake records |
| Feed unreachable | Task → RETRY, exception `SUPPLIER_FEED_ERROR` |
| Validation failure > 50% | Task → SUCCESS (PARTIAL), exception `SUPPLIER_VALIDATION_DEGRADED` |
| Stale feed (> policy threshold) | Exception `STALE_SUPPLIER_FEED`, Kurmay trigger |

### Retry Behavior

- `max_attempts: 3`
- `retry_delay_seconds: 300` (5 min)
- Non-retryable: invalid supplier_id, auth failure (permanent)

### Approval Requirements

`supplier_sync` with `sync_mode: full` on production supplier → REVIEW if `records_received > 10000`.

### Audit Requirements

- `supplier.sync.start` — supplier_id, sync_mode
- `supplier.sync.complete` — counts, status
- `supplier.validation.error` — per rejection batch

---

## 5. Product AI

**Worker ID:** `product-intelligence`  
**Category:** `product`  
**Task Types:** `product_enrich`, `product_classify`, `product_dedup`, `product_identity_resolve`

### Responsibility

Product enrichment, taxonomy mapping, attribute extraction, title/description generation (when LLM available), duplicate detection, and identity resolution. Operates on real product records from commerce bridge.

### Input Schema

```python
class ProductEnrichInput(BaseModel):
    product_id: str | None = None
    sku: str | None = None
    enrichment_types: list[Literal[
        "classify", "title_generate", "description_generate",
        "attribute_extract", "taxonomy_map", "duplicate_detect", "identity_resolve", "full"
    ]] = ["full"]
    target_locales: list[str] = ["de", "en"]
    category_hint: str | None = None                # bz.xx taxonomy hint
```

### Output Schema

```python
class ProductEnrichOutput(BaseModel):
    product_id: str
    sku: str
    enrichment_status: Literal["SUCCESS", "PARTIAL", "FAILED", "EXTERNAL_INTEGRATION_PENDING"]
    taxonomy_mapping: dict[str, Any] | None         # bz.xx node assignment
    attributes: dict[str, Any]
    titles: dict[str, str]                            # locale → title
    descriptions: dict[str, str]
    duplicates: list[dict[str, Any]]
    confidence: float
    llm_status: Literal["AVAILABLE", "EXTERNAL_AI_PROVIDER_PENDING", "NOT_REQUIRED"]
    changes_proposed: list[dict[str, Any]]            # not applied — awaiting approval
```

### Capabilities

`enrich`, `classify`, `title_generate`, `description_generate`, `attribute_extract`, `taxonomy_map`, `duplicate_detect`, `identity_resolve`

### Permissions

`products:read`, `memory:write`, `memory:read`, `exceptions:create`

**Denied:** `products:write`, `products:publish` — proposals only

### Risk Level

`MEDIUM`

### Memory Access

| Direction | Namespace | Type |
|-----------|-----------|------|
| Write | `products/{product_id}` | INSIGHT, FACT, SIGNAL |
| Read | `products/{product_id}`, `taxonomy/canonical` | FACT |

### Tools

- `CommerceBridge.get_product()` — read product from Node API
- `TaxonomyMapper` — maps to `bz.xx` nodes
- `DuplicateDetector` — fingerprint-based dedup
- `EnvironmentAIProvider` — title/description when configured
- `pim_product_master/` bridge logic

### Dependencies

- Commerce bridge (product read)
- Canonical taxonomy
- LLM provider (optional for generation)

### Failure Behavior

| Failure | Action |
|---------|--------|
| Product not found | Task → FAILED, exception `PRODUCT_NOT_FOUND` |
| LLM unavailable | Skip generation steps; `llm_status: EXTERNAL_AI_PROVIDER_PENDING` |
| Low classification confidence (< 0.6) | Exception `PRODUCT_CLASSIFICATION_UNCERTAIN` |

### Retry Behavior

- `max_attempts: 2`
- `timeout_seconds: 90`

### Approval Requirements

`changes_proposed` with taxonomy reassignment across L1 categories → REVIEW.

### Audit Requirements

- `product.enrich.start` — product_id, enrichment_types
- `product.enrich.complete` — confidence, changes count
- `product.duplicate.detected` — duplicate pairs

---

## 6. Pricing AI

**Worker ID:** `price-engine`  
**Category:** `price`  
**Task Types:** `price_recheck`, `price_calculate`, `margin_analysis`

### Responsibility

Price recalculation, margin analysis, competitive price comparison, and price change proposals. Calculates but does **not publish** prices.

### Input Schema

```python
class PriceRecheckInput(BaseModel):
    product_id: str | None = None
    category_id: str | None = None                  # bulk recheck by category
    supplier_id: str | None = None
    recheck_mode: Literal["single", "category_bulk", "supplier_bulk"] = "single"
    include_competitor_signals: bool = True
    margin_floor_override: float | None = None
```

### Output Schema

```python
class PriceProposal(BaseModel):
    product_id: str
    current_price: float | None
    proposed_price: float
    margin_percent: float
    margin_status: Literal["OK", "BELOW_FLOOR", "ABOVE_CEILING"]
    competitor_median: float | None
    confidence: float
    requires_approval: bool

class PriceRecheckOutput(BaseModel):
    proposals: list[PriceProposal]
    products_checked: int
    violations: list[dict[str, Any]]                  # margin floor breaches
    integration_status: dict[str, str]
```

### Capabilities

`price_calculate`, `margin_analysis`, `competitor_compare`, `bulk_recheck`

### Permissions

`prices:calculate`, `memory:write`, `memory:read`, `exceptions:create`

**Denied:** `prices:publish`

### Risk Level

`MEDIUM` (calculation), `HIGH` (if proposal would change live price > 10%)

### Memory Access

| Direction | Namespace | Type |
|-----------|-----------|------|
| Write | `prices/{product_id}`, `prices/analysis` | SIGNAL, INSIGHT |
| Read | `prices/*`, `products/*`, `categories/*` | FACT, SIGNAL |

### Tools

- `CommerceBridge.get_price()` / `get_product()`
- `MarginPolicyEngine` — reads margin rules from memory `policies/pricing`
- `CompetitorPriceSignalReader` — reads category worker memory signals
- Existing `PriceRecheckWorker` deterministic logic (Phase 1 base)

### Dependencies

- Commerce bridge (price read)
- Category intelligence price signals (memory read)
- Margin policy configuration

### Failure Behavior

| Failure | Action |
|---------|--------|
| Margin below floor | Exception `LOW_MARGIN`, proposal flagged `requires_approval: true` |
| No price data | Success with `products_checked: 0` |
| Bulk timeout | Partial results + RETRY for remainder |

### Retry Behavior

- `max_attempts: 3`
- `timeout_seconds: 60` (single), `300` (bulk)

### Approval Requirements

Any `PriceProposal` with `requires_approval: true` or `margin_status: BELOW_FLOOR` → child task `price_publish` in REVIEW.

### Audit Requirements

- `price.recheck.start` — scope, mode
- `price.proposal.created` — per proposal with margin
- `price.margin.violation` — floor breach details

---

## 7. Stock AI

**Worker ID:** `stock-engine`  
**Category:** `stock`  
**Task Types:** `stock_sync`, `stock_check`, `safety_stock_alert`

### Responsibility

Stock level synchronization, freshness validation, safety stock monitoring, and negative stock detection.

### Input Schema

```python
class StockSyncInput(BaseModel):
    warehouse_id: str | None = None
    product_id: str | None = None
    supplier_id: str | None = None
    sync_mode: Literal["full", "incremental", "check_only"] = "incremental"
    staleness_threshold_hours: int = 24
```

### Output Schema

```python
class StockLevelReport(BaseModel):
    product_id: str
    warehouse_id: str
    quantity: int
    reserved: int
    available: int
    last_updated: datetime | None
    staleness_hours: float | None
    status: Literal["OK", "LOW", "NEGATIVE", "STALE", "UNKNOWN"]

class StockSyncOutput(BaseModel):
    levels: list[StockLevelReport]
    products_checked: int
    alerts: list[dict[str, Any]]
    integration_status: str
```

### Capabilities

`level_check`, `freshness_check`, `safety_stock_alert`, `negative_stock_detect`, `bulk_sync`

### Permissions

`stock:read`, `memory:write`, `memory:read`, `exceptions:create`

### Risk Level

`LOW` (check), `MEDIUM` (sync)

### Memory Access

| Direction | Namespace | Type |
|-----------|-----------|------|
| Write | `stock/{warehouse_id}`, `stock/alerts` | SIGNAL, EVENT |
| Read | `stock/*`, `products/*`, `suppliers/*` | FACT |

### Tools

- `CommerceBridge.get_stock_levels()` — WMS/inventory read
- `StockFreshnessChecker`
- `SafetyStockPolicyEngine`

### Dependencies

- Commerce bridge (inventory read)
- WMS integration (may be `EXTERNAL_INTEGRATION_PENDING`)

### Failure Behavior

| Failure | Action |
|---------|--------|
| Negative stock | Exception `NEGATIVE_STOCK` (HIGH) |
| Stale data | Exception `STALE_STOCK_DATA` (MEDIUM) |
| WMS unavailable | `integration_status: EXTERNAL_INTEGRATION_PENDING` |

### Retry Behavior

- `max_attempts: 3`
- `retry_delay_seconds: 120`

### Approval Requirements

None for checks/alerts. Stock adjustment actions (if added in Phase 2b) require REVIEW.

### Audit Requirements

- `stock.sync.start` — scope
- `stock.alert.raised` — per alert
- `stock.negative.detected` — product_id, quantity

---

## 8. Customs AI

**Worker ID:** `customs-classifier`  
**Category:** `customs`  
**Task Types:** `customs_classify`, `customs_origin_check`, `customs_compliance_signal`

### Responsibility

HS code classification, country-of-origin validation, and compliance signal generation. Never auto-approves high-uncertainty classifications.

### Input Schema

```python
class CustomsClassifyInput(BaseModel):
    product_id: str | None = None
    description: str
    material_composition: str | None = None
    country_of_origin: str | None = None            # ISO 3166-1 alpha-2
    intended_use: str | None = None
    weight_kg: float | None = None
    value_eur: float | None = None
```

### Output Schema

```python
class CustomsClassification(BaseModel):
    hs_code: str
    hs_description: str
    confidence: float
    classification_status: Literal["PROPOSED", "REVIEW_REQUIRED", "EXTERNAL_INTEGRATION_PENDING"]
    origin_status: Literal["VERIFIED", "UNVERIFIED", "CONFLICT"]
    compliance_flags: list[str]
    duty_estimate_eur: float | None
    reasoning: str

class CustomsClassifyOutput(BaseModel):
    product_id: str | None
    classification: CustomsClassification
    alternatives: list[dict[str, Any]]              # lower-confidence alternatives
    requires_approval: bool                           # true when confidence < 0.85
```

### Capabilities

`hs_classification`, `origin_check`, `compliance_signal`, `duty_estimate`

### Permissions

`customs:classify`, `memory:write`, `memory:read`, `exceptions:create`

**Denied:** `customs:approve`

### Risk Level

`MEDIUM` (classification), `HIGH` (if value_eur > 10000)

### Memory Access

| Direction | Namespace | Type |
|-----------|-----------|------|
| Write | `customs/{product_id or hash}` | FACT, INSIGHT |
| Read | `customs/*`, `products/*` | FACT |

### Tools

- `CustomsClassifierBridge` — wraps `ai_council_19_customs_bureaucracy/` logic
- `HSCodeDatabase` — local reference data (bundled)
- `OriginValidator`
- `EnvironmentAIProvider` — optional for ambiguous descriptions

### Dependencies

- HS code reference data (local)
- Product data (commerce bridge, optional)
- Customs API connector (future — `EXTERNAL_INTEGRATION_PENDING`)

### Failure Behavior

| Failure | Action |
|---------|--------|
| Confidence < 0.85 | `classification_status: REVIEW_REQUIRED`, exception `CUSTOMS_UNCERTAIN` |
| Confidence < 0.50 | `classification_status: REVIEW_REQUIRED`, no HS code proposed |
| Origin conflict | Exception `CUSTOMS_ORIGIN_CONFLICT` |

### Retry Behavior

- `max_attempts: 2`
- Non-retryable: invalid input, schema errors

### Approval Requirements

All classifications with `requires_approval: true` → task in REVIEW. Operator with `customs:approve` must approve before `customs:approve` action task.

### Audit Requirements

- `customs.classify.start` — product/description hash
- `customs.classification.proposed` — hs_code, confidence
- `customs.review.required` — when confidence below threshold

---

## 9. Order AI

**Worker ID:** `order-engine`  
**Category:** `order`  
**Task Types:** `order_check`, `order_validate`, `order_fulfillment_check`

### Responsibility

Order lifecycle validation, fulfillment readiness checks, anomaly detection, and state transition proposals. Does not ship orders without approval.

### Input Schema

```python
class OrderCheckInput(BaseModel):
    order_id: str
    check_types: list[Literal[
        "payment_status", "stock_availability", "address_validity",
        "customs_required", "fraud_signal", "fulfillment_ready", "full"
    ]] = ["full"]
```

### Output Schema

```python
class OrderCheckItem(BaseModel):
    check_type: str
    status: Literal["PASS", "FAIL", "WARN", "PENDING"]
    details: dict[str, Any]

class OrderCheckOutput(BaseModel):
    order_id: str
    overall_status: Literal["READY", "BLOCKED", "REVIEW_REQUIRED"]
    checks: list[OrderCheckItem]
    proposed_transition: str | None                 # e.g. "PROCESSING" — not applied
    requires_approval: bool
    blockers: list[str]
```

### Capabilities

`payment_verify`, `stock_verify`, `address_validate`, `fraud_check`, `fulfillment_ready`, `transition_propose`

### Permissions

`orders:read`, `memory:write`, `memory:read`, `exceptions:create`

**Denied:** `orders:transition` (proposals only in Phase 2)

### Risk Level

`HIGH`

### Memory Access

| Direction | Namespace | Type |
|-----------|-----------|------|
| Write | `orders/{order_id}` | SIGNAL, EVENT |
| Read | `orders/*`, `stock/*`, `customs/*`, `products/*` | FACT, SIGNAL |

### Tools

- `CommerceBridge.get_order()` — order read
- `StockEngineReader` — stock availability from memory
- `CustomsRequirementChecker`
- `FraudSignalDetector` — rule-based

### Dependencies

- Commerce bridge (order read)
- Stock AI memory signals
- Customs AI memory signals

### Failure Behavior

| Failure | Action |
|---------|--------|
| Order not found | Task → FAILED, exception `ORDER_NOT_FOUND` |
| Payment not confirmed | `overall_status: BLOCKED` |
| Stock insufficient | Exception `ORDER_STOCK_INSUFFICIENT` |
| Fraud signal | Exception `ORDER_FRAUD_SIGNAL` (HIGH), REVIEW required |

### Retry Behavior

- `max_attempts: 2`
- `timeout_seconds: 30`

### Approval Requirements

Any `proposed_transition` to `SHIPPED` or `REFUNDED` → REVIEW + operator approval.

### Audit Requirements

- `order.check.start` — order_id, check_types
- `order.check.complete` — overall_status
- `order.blocker.detected` — per blocker

---

## 10. Customer Service AI

**Worker ID:** `customer-service-ai`  
**Category:** `customer_service`  
**Task Types:** `customer_service`, `intent_classify`, `response_draft`

### Responsibility

Customer intent detection, context loading, policy checking, and response drafting. Escalates financial-impact intents (refund, return) — never auto-decides.

### Input Schema

```python
class CustomerServiceInput(BaseModel):
    channel: Literal["email", "chat", "phone_transcript", "ticket"]
    customer_id: str | None = None
    order_id: str | None = None
    message: str
    locale: str = "de"
    conversation_id: str | None = None
```

### Output Schema

```python
class CustomerServiceOutput(BaseModel):
    intent: Literal[
        "ORDER", "SHIPPING", "RETURN", "REFUND", "PRODUCT",
        "PRICE", "COMPATIBILITY", "COMPLAINT", "GENERAL", "UNKNOWN"
    ]
    intent_confidence: float
    response_draft: str | None
    escalation_required: bool
    escalation_reason: str | None
    context_loaded: dict[str, Any]                    # order/customer summary (redacted)
    policy_checks: list[dict[str, Any]]
    llm_status: Literal["AVAILABLE", "EXTERNAL_AI_PROVIDER_PENDING", "DETERMINISTIC_FALLBACK"]
    suggested_actions: list[dict[str, Any]]           # child task proposals
```

### Capabilities

`intent_detect`, `context_load`, `policy_check`, `draft_response`, `escalate`

### Permissions

`customers:read`, `orders:read`, `memory:write`, `memory:read`, `exceptions:create`

### Risk Level

`LOW` (general inquiry), `HIGH` (REFUND/RETURN intents)

### Memory Access

| Direction | Namespace | Type |
|-----------|-----------|------|
| Write | `customer_service/{conversation_id}` | INSIGHT, EVENT |
| Read | `orders/*`, `products/*`, `customer_service/*` | FACT (redacted) |

### Tools

- `CommerceBridge.get_order()` / `get_customer()` — PII-redacted reads
- `IntentClassifier` — rule-based + optional LLM
- `PolicyEngine` — return/refund policy rules
- `EnvironmentAIProvider` — response drafting when configured
- Existing `CustomerServiceWorker` deterministic fallback (Phase 1)

### Dependencies

- Commerce bridge (customer/order read)
- Policy rules in memory `policies/customer_service`
- LLM provider (optional)

### Failure Behavior

| Failure | Action |
|---------|--------|
| REFUND/RETURN intent | `escalation_required: true`, exception `CS_FINANCIAL_ESCALATION` |
| Customer not found | Process with limited context, note in output |
| LLM unavailable | `llm_status: DETERMINISTIC_FALLBACK`, template response |

### Retry Behavior

- `max_attempts: 2`
- `timeout_seconds: 45`

### Approval Requirements

All `REFUND` and `RETURN` intents → REVIEW. Response draft is never auto-sent to customer in Phase 2.

### Audit Requirements

- `cs.intent.detected` — intent, confidence
- `cs.escalation.required` — reason
- `cs.response.drafted` — draft hash (not full PII in audit)

---

## 11. Security AI (Esat Bey)

**Worker ID:** `esat-bey-security`  
**Category:** `security`  
**Role:** Gate service — not a standard task worker

### Responsibility

Pre-execution security gate for all task executions and sensitive API operations. Authentication verification, authorization check, rate limiting, input validation, risk assessment, and approval requirement enforcement.

### Input Schema

```python
class SecurityEvent(BaseModel):
    event_type: str                                 # task_execution, api_call, memory_write, etc.
    actor: str
    resource: str
    action: str
    risk_level: RiskLevel
    context: dict[str, Any]                         # task_id, worker_id, payload summary
    request_id: str
```

### Output Schema

```python
class SecurityDecision(BaseModel):
    allowed: bool
    severity: RiskLevel
    action: Literal["ALLOW", "DENY", "REVIEW", "BLOCK"]
    reason: str
    checks: list[dict[str, Any]]                    # per-check pass/fail
    rate_limit_remaining: int | None
```

### Capabilities

`authenticate`, `authorize`, `rate_limit`, `input_validate`, `risk_assess`, `approval_enforce`, `audit_record`

### Permissions

`security:read`, `audit:read`, `workers:read`

**Cannot be bypassed by any worker including Kurmay and Aslan Bey.**

### Risk Level

N/A (evaluates risk, does not generate risk)

### Memory Access

| Direction | Namespace | Type |
|-----------|-----------|------|
| Read | `policies/security`, `policies/*` | POLICY, RULE |
| Write | None directly — via AuditService |

### Tools

- `PolicyEngine` — rule evaluation
- `RateLimiter` — per-actor/per-IP limits
- `InputValidator` — payload schema check
- `AuditService` — security event logging
- Migration target: `ai_core/security/service.py` (from `agents/esat_bey/`)

### Dependencies

- `BUZZARD_API_TOKEN` / future API keys
- Policy configuration in memory `policies/security`
- AuditService

### Failure Behavior

| Failure | Action |
|---------|--------|
| Any check fails | `allowed: false`, `action: DENY` or `BLOCK` |
| Rate limit exceeded | `action: DENY`, HTTP 429 at API layer |
| CRITICAL risk without approval | `action: REVIEW` |
| Security service unavailable | **Fail closed** — deny all executions |

### Retry Behavior

Not applicable — synchronous gate, no retries.

### Approval Requirements

Enforces approval matrix from `PHASE2_PERMISSION_MATRIX.md`.

### Audit Requirements

- `security.inspect` — every gate invocation
- `security.deny` — denied events with reason
- `security.block` — blocked event types (credential_exfiltration, unauthorized_access)

---

## 12. Exception Coordination

**Worker ID:** `exception-coordinator`  
**Category:** `exception`  
**Task Types:** `exception_triage`, `exception_escalate`, `exception_resolve`

### Responsibility

Cross-domain exception routing, severity classification, worker containment, assignment, escalation to Kurmay, and resolution coordination. Extends Phase 1 `ExceptionService`.

### Input Schema

```python
class ExceptionTriageInput(BaseModel):
    exception_id: str | None = None               # existing exception to triage
    source_worker_id: str | None = None
    source_task_id: str | None = None
    severity: ExceptionSeverity | None = None
    type: str | None = None
    message: str | None = None
    metadata: dict[str, Any] | None = None
    auto_contain: bool = True
```

### Output Schema

```python
class ExceptionTriageOutput(BaseModel):
    exception_id: str
    status: ExceptionStatus
    severity: ExceptionSeverity
    assigned_to: str | None
    worker_halted: bool
    contained: bool
    kurmay_triggered: bool
    resolution_path: str                            # suggested resolution steps
    related_exceptions: list[str]
```

### Capabilities

`detect`, `classify`, `contain`, `assign`, `escalate`, `resolve`, `worker_halt`, `kurmay_trigger`

### Permissions

`exceptions:create`, `exceptions:resolve`, `exceptions:read`, `workers:halt`, `memory:read`, `memory:write`, `tasks:read`

### Risk Level

Varies by exception severity (coordinator inherits source severity)

### Memory Access

| Direction | Namespace | Type |
|-----------|-----------|------|
| Write | `exceptions/{exception_id}` | EXCEPTION, EVENT |
| Read | `exceptions/*`, all domain namespaces | EXCEPTION, SIGNAL |

### Tools

- `ExceptionService` — Phase 1 lifecycle engine
- `WorkerStateService` — halt/resume
- `KurmayTrigger` — creates synthesis task on HIGH/CRITICAL
- `AssignmentRouter` — routes to operator pool by exception type

### Dependencies

- `ExceptionService` (Phase 1)
- `WorkerStateService` (Phase 1)
- `UnifiedOrchestrator` — child task creation
- Kurmay AI — synthesis on escalation

### Failure Behavior

| Failure | Action |
|---------|--------|
| CRITICAL severity | Auto-contain, halt worker, trigger Kurmay |
| Duplicate exception | Merge into existing, update metadata |
| Resolution attempt on CONTAINED | Require operator role |

### Retry Behavior

- `max_attempts: 2` for triage tasks
- Worker halt is persistent (Phase 1 verified) — no retry on halt

### Approval Requirements

Resolution of CRITICAL exceptions requires operator with `exceptions:resolve` + `workers:resume`.

### Audit Requirements

- `exception.triage.start` — source context
- `exception.contain` — worker halt details
- `exception.escalate` — Kurmay trigger
- `exception.resolve` — resolution, operator

---

## 13. Worker Registration Summary

| Worker ID | Task Types | Risk | Auto-execute |
|-----------|-----------|------|--------------|
| `kurmay-synthesis` | `kurmay_synthesis`, `kurmay_digest` | LOW | Yes |
| `category-bz.{nn}` | `category_scan`, `category_analyze` | LOW | Yes |
| `category-kfz` | `category_scan`, `category_analyze` | LOW | Yes |
| `supplier-hub` | `supplier_sync`, `supplier_validate` | MEDIUM | Yes (bulk → REVIEW) |
| `product-intelligence` | `product_enrich`, `product_classify` | MEDIUM | Yes (L1 change → REVIEW) |
| `price-engine` | `price_recheck`, `price_calculate` | MEDIUM | Yes (publish → REVIEW) |
| `stock-engine` | `stock_sync`, `stock_check` | LOW/MEDIUM | Yes |
| `customs-classifier` | `customs_classify` | MEDIUM/HIGH | Propose only; approve → REVIEW |
| `order-engine` | `order_check` | HIGH | Check yes; transition → REVIEW |
| `customer-service-ai` | `customer_service` | LOW/HIGH | Draft yes; refund → REVIEW |
| `esat-bey-security` | (gate) | N/A | Synchronous |
| `exception-coordinator` | `exception_triage` | Varies | CRITICAL → auto-contain |

---

## 14. Schema Location Convention

```
ai_core/schemas/workers/
├── kurmay.py
├── category.py
├── supplier.py
├── product.py
├── price.py
├── stock.py
├── customs.py
├── order.py
├── customer_service.py
└── exception.py
```

Each schema exports JSON Schema via `model_json_schema()` for `/api/v1/agents/{id}` documentation.

---

**End of Phase 2 Worker Specification. Implementation not started.**
