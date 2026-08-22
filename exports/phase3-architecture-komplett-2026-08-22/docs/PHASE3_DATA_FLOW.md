# BUZZARD AI CORE — PHASE 3 DATA FLOW

**Version:** 1.0  
**Date:** 2026-08-22

---

## 1. Master Data Flow

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   External   │    │  Integration │    │   AI Core    │
│   Systems    │───▶│   Adapters   │───▶│  Orchestrator│
└──────────────┘    └──────────────┘    └──────┬───────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
              ┌─────▼─────┐            ┌───────▼───────┐          ┌──────▼──────┐
              │  Workers  │            │    Memory     │          │  Exception  │
              │  (L3)     │───────────▶│    (L6)       │─────────▶│   (L8)      │
              └─────┬─────┘            └───────┬───────┘          └─────────────┘
                    │                          │
              ┌─────▼─────┐            ┌───────▼───────┐
              │ Category  │            │    Kurmay /   │
              │ Intel(L4) │            │   Decision    │
              └─────┬─────┘            │   Engine      │
                    │                  └───────┬───────┘
              ┌─────▼─────┐                  │
              │ Commerce  │            ┌─────▼─────┐
              │ Intel(L5) │            │ Approval  │
              └─────┬─────┘            │   (L11)   │
                    │                  └─────┬─────┘
              ┌─────▼─────┐                  │
              │  Action   │◀─────────────────┘
              │ Execution │
              └─────┬─────┘
                    │
              ┌─────▼─────┐
              │   Audit   │
              │   (L10)   │
              └───────────┘
```

---

## 2. Task Lifecycle Flow (inherited from Phase 2)

```
API Request → Task Created (QUEUED)
    → VALIDATING (EsatBey security inspect)
    → ASSIGNED (worker resolved)
    → RUNNING (WorkerExecutor)
        → [if commerce_write / HIGH risk] → REVIEW
            → APPROVED → RUNNING (approval_granted=True) → EXECUTED
            → REJECTED → FAILED
        → [if success] → EXECUTED → SUCCESS
        → [if retryable] → RETRY → QUEUED
        → [if critical] → ESCALATED + Exception + Kurmay trigger
    → Memory writes (orchestrator callback)
    → Audit record
```

Phase 3 adds: Decision Engine may create tasks from signals; event bus may trigger tasks asynchronously.

---

## 3. Commerce Read Flow

```
Domain Worker (e.g. product-intelligence)
    → CommerceBridge.read_products(sku)
        → CommerceIntegrationAdapter
            → CommerceConnector.request(GET, /products/{sku})
                → [if configured] Live Commerce API
                → [if not] { status: NO_DATA_AVAILABLE }
    → Worker processes result
    → Memory write: products/{sku}/
    → Task result returned
```

---

## 4. Commerce Write Flow (approval-gated)

```
API: POST /api/v1/commerce/write
    → Task created (type=commerce_write, requires_approval=True)
    → Orchestrator: VALIDATING → ASSIGNED → RUNNING
    → CommerceWriteWorker.execute()
        → CommerceBridge.write(action, payload, approval_granted=False)
        → Returns APPROVAL_REQUIRED
    → Orchestrator: RUNNING → REVIEW

Human: POST /api/v1/tasks/{id}/transition {action: "approve"}
    → ApprovalRecord created
    → Orchestrator: REVIEW → APPROVED → RUNNING (payload.approval_granted=True)
    → CommerceWriteWorker.execute() [re-run]
        → CommerceBridge.write(action, payload, approval_granted=True)
            → [if configured] POST /actions/{action} to Commerce API
            → [if not] EXTERNAL_INTEGRATION_PENDING
    → EXECUTED → SUCCESS
    → Memory: commerce/writes/{id}
    → Audit: commerce_write_executed
```

**No bypass path.** AI workers cannot set `approval_granted=True`.

---

## 5. Supplier Ingestion Flow

```
Scheduled Task / Webhook
    → supplier-hub worker (task_type=supplier_sync)
    → SupplierAdapter.fetch_catalog(since=last_sync)
    → For each RawProduct:
        → Normalizer → canonical schema
        → Validator → pass/fail
        → ProductMapper → Buzzard SKU assignment
        → InventoryMapper → stock update
        → PriceMapper → cost basis
    → Memory writes: suppliers/{id}/, products/{sku}/
    → Event: supplier.catalog_synced
    → [if new products] Task: product_enrich
    → Audit: supplier_sync_completed
```

---

## 6. Product Intelligence Pipeline Flow

```
product-intelligence worker (task_type=product_enrich)
    → Read products/{sku}/ from memory (or payload)
    → Category Intelligence: TaxonomyRegistry.get_node() → category-bz.{nn}
    → Attribute extraction (brand, GTIN, compatibility)
    → Compliance check (EU rules)
    → Content enrichment (multilingual if locale set)
    → Pricing Intelligence: evaluate margin
        → [if below minimum] Exception LOW_MARGIN → price-engine owner
        → [if within policy] Price Candidate
    → [if publish required] Approval request
    → [if approved] CommerceBridge write
    → Memory: products/{sku}/ updated
    → Audit
```

---

## 7. Pricing Intelligence Flow

```
Price Candidate (from product pipeline or price_recheck task)
    → Inputs: supplier_cost, shipping, tax, fees, market_price,
              competitor_price, margin, min_margin, stock, demand,
              sales_velocity, supplier_availability, promotions,
              currency, marketplace_fees, advertising_costs
    → PricingPolicyEngine.evaluate(candidate)
        → [if within auto-approve bounds] → Publish queue
        → [if outside bounds] → Approval request (REVIEW)
        → [if policy violation] → Exception + block
    → [on approval] price-engine worker
        → CommerceBridge write (price update action)
    → Memory: pricing/{sku}/
    → Kurmay signal if margin impact HIGH
    → Audit: price_change
```

**Rule:** No AI worker may bypass `PricingPolicyEngine`.

---

## 8. Stock Intelligence Flow

```
stock-engine worker (task_type=stock_sync)
    → Sources (priority order):
        1. WMS adapter (internal stock)
        2. CommerceBridge.read_stock(sku)
        3. SupplierAdapter.fetch_stock(skus)
    → StockReconciler.merge(sources)
        → supplier_stock, internal_stock, reserved_stock,
           available_stock, incoming_stock, lead_time,
           safety_stock, demand, sales_velocity
    → [if conflict] ConflictResolver (supplier priority config)
    → [if stale data detected] Exception + alert
    → [if below safety stock] Stock alert → Decision Engine
    → Memory: stock/{sku}/
    → [if publish required] CommerceBridge write
    → Audit
```

---

## 9. Order Intelligence Flow

```
Order Event (webhook or poll)
    → Idempotency check (order_id + source)
    → order-engine worker (task_type=order_check)
    → Validation: customer, items, payment state
    → Fraud/risk signals (PolicyEngine)
    → Stock reservation (stock-engine coordination)
    → Supplier routing (procurement intelligence)
    → [if approved] Purchase order to supplier
    → Fulfillment task → Carrier adapter (Wave 3+)
    → Tracking update → Memory: orders/{id}/
    → [if exception] Exception lifecycle
    → Audit (every state transition)
```

**Idempotency:** Duplicate `order_id` + `source` returns cached result. No duplicate supplier POs.

---

## 10. Customer Intelligence Flow

```
customer-service-ai worker (task_type=customer_service)
    → Input: customer request (pseudonymized customer_ref)
    → Context assembly:
        → orders/{id}/ (if order referenced)
        → products/{sku}/ (if product referenced)
        → customers/{hash}/ (limited history, GDPR-scoped)
    → Issue classification
    → [if LLM configured] LlmProviderAdapter → draft response
    → [if CRM configured] CRM adapter → case context
    → [if HIGH risk or policy requires] → Human escalation (REVIEW)
    → [if resolved] Memory + Audit
    → Never expose unnecessary PII in worker output
```

---

## 11. Category Intelligence Flow

```
API: POST /api/v1/categories/{bz_id}/scan
    → resolve_worker_id → category-{bz_id}
    → CategoryExpertWorker.execute()
    → Input: offers[], observed_taxonomy, locale
    → TaxonomyRegistry.get_node(bz_id) → L1 context
    → analyze_category() bridge → intelligence signals
    → [if commerce configured] CommerceBridge.read_products (category filter)
    → [if market data] MarketIntelligence signals
    → Memory: categories/{bz_id}/
    → [if gaps detected] Task: taxonomy_gap_report
    → Kurmay trigger if impact MEDIUM+
    → Audit
```

**Dynamic:** Adding new L1 to taxonomy.json auto-provisions `category-{new_id}` worker.

---

## 12. Business Decision Engine Flow

```
Inputs (from memory + events):
    Category Intelligence, Supplier, Product, Pricing, Stock,
    Orders, Customers, Market, Competitors, Logistics, Returns, Finance

    → DecisionEngine.ingest(signals[])
    → Rule evaluation + confidence scoring
    → Output (one of):
        SIGNAL          → memory: decisions/signals/
        RECOMMENDATION  → memory: decisions/recommendations/
        DECISION        → memory: decisions/decisions/ + optional task
        TASK            → Orchestrator.create_task()
        APPROVAL_REQUEST → Orchestrator.create_task(requires_approval=True)
        EXCEPTION       → ExceptionService.create()

    → Kurmay input (aggregated decisions)
    → Audit: decision_engine_output
```

**Never silently executes high-risk actions.**

---

## 13. Exception Flow (extended)

```
Worker failure / Policy violation / Integration error
    → ExceptionService.create(type, severity, context)
    → DETECTED
    → ExceptionCoordinator.route()
        → AssignmentRouter → owner worker/team
    → CLASSIFIED → ASSIGNED
    → [if CRITICAL] Worker halt (WorkerStateService)
    → [if HIGH/CRITICAL] Kurmay auto-trigger
    → CONTAINED (if applicable)
    → REVIEW (human if required)
    → RESOLVED → Worker resume
    → [if SLA breached] Escalation + alert
    → Postmortem record (Phase 3)
    → Audit
```

---

## 14. Kurmay Synthesis Flow

```
Trigger: HIGH/CRITICAL exception, MEDIUM+ memory impact, manual API call
    → kurmay worker (task_type=kurmay_synthesis)
    → KurmayRuleEngine.synthesize(memory_signals, exceptions)
    → Conflict detection (price divergence, namespace collisions)
    → KurmayReport persisted (ai_core_kurmay_reports)
    → Memory: insights/kurmay/
    → Available via GET /api/v1/reports/kurmay
    → Decision Engine may consume for higher-level decisions
```

---

## 15. Event-Driven Flows (Phase 3)

See `PHASE3_EVENT_ARCHITECTURE.md` for full event catalog. Key flows:

| Event | Producer | Consumer |
|-------|----------|----------|
| `commerce.order.created` | Commerce webhook | order-engine |
| `supplier.catalog.updated` | Supplier adapter | product-intelligence |
| `stock.below_safety` | Stock reconciler | Decision Engine |
| `price.policy_violation` | Pricing engine | Exception + approval |
| `decision.approval_required` | Decision Engine | Orchestrator (REVIEW) |
| `integration.health_degraded` | Health checker | Observability + alert |

All events carry `correlation_id` for traceability.

---

**STOP — Data flow implementation not started.**
