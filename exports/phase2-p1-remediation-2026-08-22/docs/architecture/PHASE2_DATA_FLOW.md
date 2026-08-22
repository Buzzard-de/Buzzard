# BUZZARD AI CORE — PHASE 2 DATA FLOW

**Version:** 2.0 (Design)  
**Date:** 2026-08-22  
**Status:** Architecture only — **implementation not started**

---

## 1. Master Flow

All domain operations follow the canonical pipeline:

```
┌──────┐    ┌────────┐    ┌────────┐    ┌───────────────┐    ┌──────────┐
│ DATA │───▶│ WORKER │───▶│ RESULT │───▶│ CENTRAL MEMORY│───▶│ KURMAY AI│
└──────┘    └────────┘    └────────┘    └───────────────┘    └────┬─────┘
                                                                    │
┌───────┐    ┌────────┐    ┌──────────────────┐    ┌──────────┐    │
│ AUDIT │◀───│ ACTION │◀───│ APPROVAL (if req)│◀───│ DECISION │◀───┘
└───────┘    └────────┘    └────────┬─────────┘    └────┬─────┘
                                    │                    │
                                    │              ┌─────┴──────┐
                                    │              │POLICY CHECK│
                                    │              │ (EsatBey)  │
                                    │              └────────────┘
                                    ▼
                              Human operator
                              (REVIEW → APPROVED)
```

### 1.1 Stage Definitions

| Stage | Component | Mutates State? |
|-------|-----------|----------------|
| DATA | External sources, commerce bridge, payload | No (read) |
| WORKER | `WorkerExecutor` + domain worker | No (compute) |
| RESULT | `WorkerResult` validated output | No |
| CENTRAL MEMORY | `CentralMemoryService.write()` | Yes (memory) |
| KURMAY AI | `kurmay-synthesis` worker | Yes (memory: DECISION) |
| DECISION | `KurmayReport.recommendations` | No |
| POLICY CHECK | `EsatBey.inspect()` | No (audit only) |
| APPROVAL | Orchestrator `approve()` / `reject()` | Yes (task status) |
| ACTION | Child task or commerce bridge call | Yes (downstream) |
| AUDIT | `AuditService.log()` | Yes (append-only) |

---

## 2. Task Lifecycle Data Flow

```
API Request (POST /api/v1/tasks)
    │
    ▼
[Auth] BUZZARD_API_TOKEN validation
    │
    ▼
[Orchestrator.create_task]
    ├── idempotency check (key → existing task)
    ├── dependency validation
    ├── audit: task.create
    └── status: QUEUED
    │
    ▼
[Orchestrator.advance] (auto or run_cycle)
    ├── VALIDATING
    │     └── EsatBey.inspect(SecurityEvent)
    │           ├── DENY → BLOCKED
    │           └── ALLOW → continue
    ├── ASSIGNED (worker_id from WORKER_ROUTING)
    ├── RUNNING
    │     └── WorkerExecutor.execute()
    │           ├── validate input schema
    │           ├── worker.execute()
    │           ├── validate output schema
    │           └── audit: worker.execute.start/finish
    ├── REVIEW (if requires_approval or risk >= HIGH)
    │     └── wait for operator approve()
    ├── APPROVED
    ├── EXECUTED
    │     └── memory write (TASK_RESULT)
    │     └── Kurmay trigger (if impact >= MEDIUM)
    └── SUCCESS
```

---

## 3. Domain Flows

### 3.1 Category Intelligence Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ TRIGGER: POST /api/v1/categories/{bz_id}/scan                   │
│         or scheduled cron per category                          │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ DATA SOURCES (read only)                                        │
│  • master_taxonomy_48_maximal/data/taxonomy.json (canonical)    │
│  • Offer sample from payload OR configured PublicSourceCrawler  │
│  • Observed taxonomy snapshot (optional, from payload)          │
│  • If no data: report NO_DATA_AVAILABLE (not fake data)         │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ WORKER: category-bz.{nn} or category-kfz                        │
│  • CategoryIntelligenceBridge → CategoryIntelligenceAgent       │
│  • TaxonomyIntelligence.hierarchy_gaps()                        │
│  • PriceIntelligenceEngine.summarize()                          │
│  • OpportunityScorer.score()                                    │
│  • TecDocAdapter (KFZ only, if configured)                      │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ RESULT: CategoryScanOutput                                        │
│  • findings[], opportunities[], taxonomy_gaps[]                 │
│  • integration_status per connector                             │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ CENTRAL MEMORY                                                  │
│  namespace: categories/{category_id}                            │
│  type: SIGNAL (findings), INSIGHT (opportunities)               │
│  impact: LOW–HIGH based on finding severity                     │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
              [if impact >= MEDIUM]
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ KURMAY AI: kurmay_synthesis (scope: category)                   │
│  • Aggregates findings across categories if multi-scan parent   │
│  • Produces recommendations (e.g. supplier_sync, product_enrich)│
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ DECISION → POLICY CHECK → ACTION                                │
│  • Low-risk: auto-create child tasks (category_analyze)         │
│  • High-risk: REVIEW → operator approval → child task         │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
                        AUDIT
```

### 3.2 Supplier Intelligence Flow

```
TRIGGER: POST /api/v1/suppliers/sync {supplier_id}
    │
    ▼
DATA: SupplierFeedAdapter.connect()
    ├── CONNECTED → fetch real feed
    └── EXTERNAL_INTEGRATION_PENDING → return pending status
    │
    ▼
WORKER: supplier-hub
    RAW records → PARSED → NORMALIZED → VALIDATED
    │
    ▼
RESULT: SupplierSyncOutput (counts, errors, score)
    │
    ▼
MEMORY: suppliers/{supplier_id} (FACT, EVENT)
    │
    ├── [if STALE_SUPPLIER_FEED] → Exception → Exception Coordinator
    │
    ▼
KURMAY (if sync_status != SUCCESS or score < threshold)
    │
    ▼
DECISION: recommend re-sync, switch supplier, or alert operator
    │
    ▼
POLICY CHECK → APPROVAL (bulk full sync) → ACTION → AUDIT
```

### 3.3 Product Intelligence Flow

```
TRIGGER: POST /api/v1/products/enrich {product_id}
    │
    ▼
DATA: CommerceBridge.get_product(product_id)
    │   (real product record or NOT_FOUND)
    ▼
WORKER: product-intelligence
    classify → attribute_extract → taxonomy_map → duplicate_detect
    [optional] title_generate, description_generate (LLM if available)
    │
    ▼
RESULT: ProductEnrichOutput
    changes_proposed[] (NOT applied to commerce)
    │
    ▼
MEMORY: products/{product_id} (INSIGHT, FACT)
    │
    ▼
KURMAY (if taxonomy reassignment across L1)
    │
    ▼
DECISION: propose product_update action
    │
    ▼
POLICY CHECK → APPROVAL (L1 category change) →
    ACTION: child task product_publish (Phase 2b) → AUDIT
```

### 3.4 Pricing Flow

```
TRIGGER: Kurmay recommendation OR POST /api/v1/tasks {type: price_recheck}
    │
    ▼
DATA: CommerceBridge.get_price() + memory: categories/*/price_signals
    │
    ▼
WORKER: price-engine
    calculate → margin_analysis → competitor_compare
    │
    ▼
RESULT: PriceRecheckOutput with proposals[]
    │
    ▼
MEMORY: prices/{product_id} (SIGNAL)
    │
    ├── [if margin < floor] → Exception LOW_MARGIN
    │
    ▼
KURMAY (if bulk violations)
    │
    ▼
DECISION: price_publish recommendations
    │
    ▼
POLICY CHECK (HIGH risk) → APPROVAL REQUIRED →
    ACTION: price_publish task (REVIEW) → commerce bridge → AUDIT
```

### 3.5 Stock Flow

```
TRIGGER: scheduled stock_sync OR order_check dependency
    │
    ▼
DATA: CommerceBridge.get_stock_levels()
    │   (or EXTERNAL_INTEGRATION_PENDING)
    ▼
WORKER: stock-engine
    level_check → freshness_check → safety_stock_alert
    │
    ▼
RESULT: StockSyncOutput with alerts[]
    │
    ▼
MEMORY: stock/{warehouse_id} (SIGNAL, EVENT)
    │
    ├── [if NEGATIVE_STOCK] → Exception (HIGH)
    ├── [if STALE] → Exception (MEDIUM)
    │
    ▼
KURMAY (if multiple warehouses affected)
    │
    ▼
DECISION: recommend supplier_sync or order_hold
    │
    ▼
POLICY CHECK → ACTION (order_hold → REVIEW) → AUDIT
```

### 3.6 Customs Flow

```
TRIGGER: product_enrich completion OR manual customs_classify
    │
    ▼
DATA: product description + HS reference database (local)
    │
    ▼
WORKER: customs-classifier
    hs_classification → origin_check → compliance_signal
    │
    ▼
RESULT: CustomsClassifyOutput
    requires_approval: true if confidence < 0.85
    │
    ▼
MEMORY: customs/{product_id} (FACT, INSIGHT)
    │
    ▼
KURMAY (if compliance_flags include restricted goods)
    │
    ▼
DECISION: customs_approve recommendation
    │
    ▼
POLICY CHECK → APPROVAL (always for final approve) →
    ACTION: customs_approve task → AUDIT
```

### 3.7 Order Flow

```
TRIGGER: commerce webhook OR manual order_check
    │
    ▼
DATA: CommerceBridge.get_order(order_id)
    + memory: stock/*, customs/*, prices/*
    │
    ▼
WORKER: order-engine
    payment_verify → stock_verify → customs_required → fraud_check
    │
    ▼
RESULT: OrderCheckOutput
    overall_status: READY | BLOCKED | REVIEW_REQUIRED
    proposed_transition (not applied)
    │
    ▼
MEMORY: orders/{order_id} (SIGNAL, EVENT)
    │
    ├── [if FRAUD_SIGNAL] → Exception (HIGH) → Exception Coordinator
    │
    ▼
KURMAY (if BLOCKED with multiple blockers)
    │
    ▼
DECISION: resolution recommendations
    │
    ▼
POLICY CHECK → APPROVAL (SHIPPED/REFUND transition) →
    ACTION: order_transition task → commerce bridge → AUDIT
```

### 3.8 Customer Service Flow

```
TRIGGER: POST /api/v1/tasks {type: customer_service}
    │
    ▼
DATA: message + CommerceBridge.get_order/customer (if IDs provided)
    │
    ▼
WORKER: customer-service-ai
    intent_detect → context_load → policy_check → draft_response
    │
    ▼
RESULT: CustomerServiceOutput
    escalation_required: true for REFUND/RETURN
    response_draft (never auto-sent)
    │
    ▼
MEMORY: customer_service/{conversation_id} (INSIGHT, EVENT)
    │
    ├── [if REFUND/RETURN] → Exception CS_FINANCIAL_ESCALATION
    │
    ▼
KURMAY (if COMPLAINT with pattern across conversations)
    │
    ▼
DECISION: escalate to operator or create order_check child task
    │
    ▼
POLICY CHECK → APPROVAL (refund action) →
    ACTION: refund task (REVIEW) → AUDIT
```

### 3.9 Kurmay Synthesis Flow

```
TRIGGER:
    • memory write with impact >= MEDIUM (auto)
    • exception severity >= HIGH (auto)
    • POST /api/v1/reports/kurmay (manual)
    • scheduled daily digest (cron)
    │
    ▼
DATA: CentralMemoryService.search(namespaces, since)
    + ExceptionService.list(open)
    + source task results
    │
    ▼
WORKER: kurmay-synthesis
    aggregate → analyze → risk_assess → recommend
    [optional] LLM synthesis OR KurmayRuleEngine (deterministic)
    │
    ▼
RESULT: KurmayReport
    situation, analysis, risks, opportunities, recommendations[]
    │
    ▼
MEMORY: kurmay/reports/{report_id} (DECISION, INSIGHT)
    │
    ▼
FOR EACH recommendation:
    ├── requires_approval: false → auto-create child task (LOW risk)
    └── requires_approval: true → create task in REVIEW
    │
    ▼
POLICY CHECK (EsatBey on each child task) → APPROVAL → ACTION → AUDIT
```

### 3.10 Exception Coordination Flow

```
TRIGGER:
    • Worker raises exception in WorkerResult.exceptions[]
    • ExceptionService.create() from API
    • Orchestrator failure handler
    • Domain worker policy violation
    │
    ▼
WORKER: exception-coordinator (exception_triage task)
    classify → assign → contain (if CRITICAL)
    │
    ├── CRITICAL + worker_id → WorkerStateService.halt_worker()
    ├── HIGH/CRITICAL → trigger Kurmay synthesis
    └── assign to operator pool by exception type
    │
    ▼
MEMORY: exceptions/{exception_id} (EXCEPTION, EVENT)
    │
    ▼
KURMAY (if severity >= HIGH)
    │
    ▼
DECISION: resolution_path in KurmayReport
    │
    ▼
POLICY CHECK → APPROVAL (resolve CRITICAL) →
    ACTION: exception_resolve + worker_resume → AUDIT
```

### 3.11 Security Gate Flow (Every Execution)

```
ANY task transition to RUNNING
    │
    ▼
EsatBey.inspect(SecurityEvent)
    ├── check_authentication(actor)
    ├── check_authorization(worker.permissions, action)
    ├── check_rate_limit(actor)
    ├── check_input_validation(payload schema)
    ├── check_risk_level(task.priority, worker.risk_level)
    └── check_approval_required(task.requires_approval, status)
    │
    ├── ALL PASS → ALLOW → WorkerExecutor.execute()
    ├── REVIEW needed → task.status = REVIEW
    └── ANY FAIL → DENY/BLOCK → task.status = BLOCKED
    │
    ▼
AUDIT: security.inspect (always)
```

---

## 4. Memory Namespace Map

| Namespace Pattern | Writer | Reader | Content |
|-------------------|--------|--------|---------|
| `tasks/{task_id}` | Orchestrator | All | Task results |
| `categories/{bz_id}` | Category workers | Kurmay, Price, Product | Scan findings, opportunities |
| `suppliers/{supplier_id}` | Supplier worker | Kurmay, Stock, Product | Sync state, scores |
| `products/{product_id}` | Product worker | Kurmay, Price, Order, Customs | Enrichment, classification |
| `prices/{product_id}` | Price worker | Kurmay, Order | Price signals, proposals |
| `prices/analysis` | Price worker | Kurmay | Bulk analysis summaries |
| `stock/{warehouse_id}` | Stock worker | Kurmay, Order | Levels, alerts |
| `stock/alerts` | Stock worker | Kurmay, Exception | Active alerts |
| `orders/{order_id}` | Order worker | Kurmay, CS | Check results, events |
| `customs/{entity}` | Customs worker | Kurmay, Order | Classifications |
| `customer_service/{conv_id}` | CS worker | Kurmay | Intent, drafts |
| `kurmay/reports/{report_id}` | Kurmay | API, operators | Synthesis reports |
| `exceptions/{exception_id}` | Exception coord | Kurmay, operators | Exception state |
| `policies/{domain}` | Admin (manual) | Security, all workers | Business rules |
| `taxonomy/canonical` | Bootstrap (read-only) | Category, Product | Taxonomy snapshot ref |

---

## 5. Cross-Worker Dependency Graph

```
                    ┌─────────────┐
                    │  Kurmay AI  │
                    └──────▲──────┘
                           │ reads all memory
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────┴────┐      ┌─────┴─────┐     ┌─────┴─────┐
   │Category │      │ Supplier  │     │  Product  │
   │Workers  │      │    AI     │     │    AI     │
   └────┬────┘      └─────┬─────┘     └─────┬─────┘
        │                  │                  │
        │    ┌─────────────┼─────────────┐    │
        │    │             │             │    │
        ▼    ▼             ▼             ▼    ▼
   ┌─────────┐       ┌─────────┐    ┌─────────┐
   │ Pricing │       │  Stock  │    │ Customs │
   │   AI    │       │   AI    │    │   AI    │
   └────┬────┘       └────┬────┘    └────┬────┘
        │                  │              │
        └────────┬─────────┴──────┬───────┘
                 ▼                ▼
           ┌─────────┐     ┌──────────────┐
           │  Order  │     │  Customer    │
           │   AI    │     │  Service AI  │
           └────┬────┘     └──────┬───────┘
                │                 │
                ▼                 ▼
         ┌──────────────────────────────┐
         │    Exception Coordinator     │
         └──────────────┬───────────────┘
                        │
                        ▼
                 ┌─────────────┐
                 │ Security AI │
                 │  (EsatBey)  │
                 └─────────────┘
              gates ALL executions
```

### 5.1 Task Dependency Examples

| Parent Task | Child Task | Dependency Reason |
|-------------|-----------|-------------------|
| `supplier_sync` | `product_enrich` | Need canonical supplier data first |
| `product_enrich` | `customs_classify` | Need product description |
| `customs_classify` | `order_check` | Need customs clearance status |
| `stock_sync` | `order_check` | Need current stock levels |
| `category_scan` | `price_recheck` | Category signals inform pricing |
| `kurmay_synthesis` | any domain task | Recommendations spawn children |
| `order_check` | `exception_triage` | Blockers create exceptions |

Orchestrator `dependency_ids` enforces parent SUCCESS before child QUEUED.

---

## 6. Commerce Bridge Data Flow

Workers never call Node API directly. All commerce reads/writes go through:

```
ai_core/bridge/commerce.py
    │
    ├── GET  /internal/products/{id}     → product read
    ├── GET  /internal/orders/{id}       → order read
    ├── GET  /internal/stock             → stock levels
    ├── GET  /internal/suppliers/{id}    → supplier config
    ├── POST /internal/actions/price     → price publish (approved only)
    └── POST /internal/actions/order     → order transition (approved only)

Auth: BUZZARD_INTERNAL_API_TOKEN (service-to-service)
```

Unconfigured bridge → `EXTERNAL_INTEGRATION_PENDING` on all commerce reads.

Write actions require:
1. Task in APPROVED state
2. EsatBey policy pass
3. Operator approval recorded in audit

---

## 7. Event Triggers

| Event | Auto Actions |
|-------|-------------|
| Memory write `impact: MEDIUM+` | Create `kurmay_synthesis` child task |
| Exception `severity: HIGH+` | Exception coordinator triage + Kurmay |
| Exception `severity: CRITICAL` | Worker halt + contain + Kurmay |
| Worker halt | Block new tasks for worker_id |
| Task `REVIEW` created | Notify operator (Phase 2b: webhook) |
| `price_publish` approved | Commerce bridge price write |
| Supplier feed stale | `supplier_sync` retry + Kurmay alert |

---

## 8. Idempotency & Correlation

| Mechanism | Scope |
|-----------|-------|
| `Idempotency-Key` header | Task creation (Phase 1) |
| `X-Request-Id` header | All API requests (Phase 1) |
| `idempotency_key` on order transitions | Order action tasks (Phase 2) |
| `task.parent_id` | Kurmay recommendation → child task linkage |
| `audit.request_id` | End-to-end correlation |

---

## 9. Data Integrity Rules

1. Workers never write to commerce systems without APPROVED task
2. Workers never generate synthetic supplier/product/order data
3. Memory writes are versioned — updates create history entries
4. Audit log is append-only — no UPDATE/DELETE
5. Worker halt state persists across restarts (Phase 1 verified)
6. External integration status is always truthful

---

**End of Phase 2 Data Flow. Implementation not started.**
