# BUZZARD AI CORE — PHASE 3 IMPLEMENTATION PLAN

**Version:** 1.0  
**Date:** 2026-08-22  
**Status:** Planning only — no implementation started

---

## 1. Wave Overview

| Wave | Objective | Autonomy | Dependencies |
|------|-----------|----------|--------------|
| **Wave 1** | Foundation + Commerce Integration | L0 | Phase 2 frozen baseline |
| **Wave 2** | Supplier + Product Pipeline | L0–L1 | Wave 1 |
| **Wave 3** | Pricing, Stock, Order Intelligence | L0–L2 | Wave 2 |
| **Wave 4** | Logistics, Returns, Market, Observability | L0–L3 | Wave 3 |
| **Wave 5** | Decision Engine + Autonomous L4 | L0–L4 | Wave 4 |

No wave starts until prior wave acceptance criteria are met.

---

## 2. Wave 1 — Foundation + Commerce Integration

### Objective

Close P1 commerce gaps (GAP-A-003, GAP-I-001, GAP-M-002) with live adapter wiring. Establish JWT/RBAC. Enable honest CONNECTED status.

### Dependencies

- Phase 2 frozen baseline (96/100)
- Buzzard Commerce API staging environment provisioned (external)
- `COMMERCE_API_URL` + `COMMERCE_API_TOKEN` in staging

### Modules

| Module | Path | Type |
|--------|------|------|
| `CommerceIntegrationAdapter` | `ai_core/integrations/commerce_adapter.py` | New |
| `CommerceConnector` | `ai_core/integrations/connectors/buzzard_commerce.py` | New |
| JWT middleware | `ai_core/api/middleware_jwt.py` | New |
| API permission enforcement | `ai_core/api/deps.py` (extend) | Extend |
| Idempotency service | `ai_core/services/idempotency_service.py` | New |
| Event outbox | `ai_core/services/event_service.py` | New |

### Database Migrations

- `008_ai_core_idempotency_and_events.py`

### APIs

- JWT auth on all existing endpoints
- Permission enforcement middleware
- `POST /integrations/webhooks/commerce`

### Workers

- Wire existing domain workers to live `CommerceBridge`
- No new workers

### Tests

- `test_phase3_commerce_adapter.py` — mock + staging
- `test_phase3_jwt_auth.py` — token validation
- `test_phase3_api_permissions.py` — role matrix
- `test_phase3_idempotency.py` — duplicate write handling
- Full regression: 479+ passed

### Security

- JWT RS256 authentication
- API-level permission enforcement
- Service identity for commerce adapter
- GAP-K-002: improve Kurmay trigger attribution

### Rollback

- `BUZZARD_AI_CORE_V3=0` disables Phase 3 modules
- `BUZZARD_JWT_ENABLED=false` reverts to bearer token
- Alembic downgrade 008

### Acceptance Criteria

- [ ] `CommerceIntegrationAdapter.health_check()` returns CONNECTED on staging
- [ ] `IntegrationStatusRegistry` reports CONNECTED for commerce
- [ ] Domain workers return real data (not `NO_DATA_AVAILABLE`) on staging
- [ ] JWT auth enforced on all endpoints
- [ ] Approval flow unchanged and tested
- [ ] 0 regressions in existing test suite
- [ ] P1 gaps A-003, I-001, M-002 closable with staging E2E

---

## 3. Wave 2 — Supplier + Product Pipeline

### Objective

Multi-format supplier ingestion. Product intelligence pipeline. Storefront taxonomy bridge.

### Dependencies

- Wave 1 complete
- At least one supplier feed available (staging)

### Modules

| Module | Path | Type |
|--------|------|------|
| `SupplierAdapter` ABC | `ai_core/integrations/suppliers/base.py` | New |
| `RestSupplierAdapter` | `ai_core/integrations/suppliers/rest.py` | New |
| `CsvSupplierAdapter` | `ai_core/integrations/suppliers/csv.py` | New |
| `XmlSupplierAdapter` | `ai_core/integrations/suppliers/xml.py` | New |
| `SupplierNormalizer` | `ai_core/integrations/suppliers/normalizer.py` | New |
| `ProductMapper` | `ai_core/integrations/suppliers/product_mapper.py` | New |
| `StorefrontTaxonomyBridge` | `ai_core/taxonomy/storefront_bridge.py` | New |

### Database Migrations

- `009_ai_core_suppliers.py`
- `010_ai_core_products.py`

### APIs

- `GET/POST /suppliers`, `GET /suppliers/{id}`, `POST /suppliers/{id}/sync`
- `GET /products`, `GET /products/{sku}`, `POST /products/{sku}/enrich`

### Workers

- Wire `supplier-hub` to `SupplierAdapter`
- Wire `product-intelligence` to full pipeline

### Tests

- Supplier adapter tests with fixture files
- Product pipeline end-to-end
- Storefront bridge mapping tests
- Malicious data rejection tests

### Security

- Supplier credential encryption
- File size limits on CSV/XML imports
- Content sanitization

### Rollback

- Alembic downgrade 010, 009
- `BUZZARD_AI_CORE_V3=0`

### Acceptance Criteria

- [ ] Supplier catalog sync produces normalized products in DB
- [ ] Product enrichment pipeline runs end-to-end
- [ ] Storefront `cat-{nn}` ↔ `bz.{nn}` mapping functional
- [ ] Malicious supplier data rejected
- [ ] 0 regressions

---

## 4. Wave 3 — Pricing, Stock, Order Intelligence

### Objective

Production pricing engine with policy gates. Multi-source stock reconciliation. Order lifecycle with idempotency.

### Dependencies

- Wave 2 complete
- WMS staging environment (external)

### Modules

| Module | Path | Type |
|--------|------|------|
| `PricingPolicyEngine` | `ai_core/intelligence/pricing/policy.py` | New |
| `StockReconciler` | `ai_core/intelligence/stock/reconciler.py` | New |
| `OrderIngestionService` | `ai_core/intelligence/orders/ingestion.py` | New |
| `WmsAdapter` | `ai_core/integrations/wms_adapter.py` | New |
| `CrmAdapter` | `ai_core/integrations/crm_adapter.py` | New |

### Database Migrations

- `011_ai_core_stock_and_orders.py`

### APIs

- `POST /pricing/evaluate`, `POST /pricing/publish`, `GET /pricing/candidates`
- `GET /stock`, `POST /stock/sync`
- `GET /orders`, `GET /orders/{id}`, `POST /orders/ingest`

### Workers

- Wire `price-engine` to `PricingPolicyEngine`
- Wire `stock-engine` to `StockReconciler` + WMS
- Wire `order-engine` to `OrderIngestionService`
- Wire `customer-service-ai` to CRM adapter

### Tests

- Pricing policy tests (margin, min/max, approval gate)
- Stock reconciliation conflict tests
- Order idempotency tests
- No pricing bypass tests

### Security

- Pricing policy cannot be bypassed by workers
- Order ingest HMAC verification

### Rollback

- Alembic downgrade 011
- Workers revert to Phase 2 honest degradation

### Acceptance Criteria

- [ ] Price candidate evaluated against policy; approval required outside bounds
- [ ] Stock reconciled from 3 sources with conflict resolution
- [ ] Order ingested idempotently; no duplicate POs
- [ ] Customer service uses CRM context when configured
- [ ] 0 regressions

---

## 5. Wave 4 — Logistics, Returns, Market, Observability

### Objective

Carrier abstraction. Returns lifecycle. Compliant market intelligence. Production observability.

### Dependencies

- Wave 3 complete

### Modules

| Module | Path | Type |
|--------|------|------|
| `CarrierAdapter` ABC | `ai_core/integrations/carriers/base.py` | New |
| `DhlCarrierAdapter` | `ai_core/integrations/carriers/dhl.py` | New |
| `LogisticsIntelligenceWorker` | `ai_core/workers/logistics/` | New |
| `ReturnsIntelligenceWorker` | `ai_core/workers/returns/` | New |
| `MarketIntelligenceWorker` | `ai_core/workers/market/` | New |
| Metrics exporter | `ai_core/observability/metrics.py` | New |
| Structured logger | `ai_core/observability/logging.py` | New |

### Database Migrations

- `012_ai_core_decisions_and_policies.py`
- `013_ai_core_logistics_and_returns.py`

### APIs

- `POST /returns/evaluate`, `GET /returns`
- `GET /analytics/kpis`, `GET /analytics/workers`
- `POST /integrations/webhooks/carrier/{id}`

### Workers

- Register `logistics-intelligence`, `returns-intelligence`, `market-intelligence`

### Tests

- Returns eligibility + approval tests
- Carrier rate quote tests (mock)
- Market intelligence compliant source tests
- Metrics endpoint tests
- L3 autonomy auto-execute tests

### Security

- Returns refund always requires approval
- Market data source compliance validation

### Rollback

- Alembic downgrade 013, 012
- Disable new workers via registry

### Acceptance Criteria

- [ ] Return evaluated with approval gate for refunds
- [ ] Carrier rate quote functional (at least DHL mock)
- [ ] Market intelligence ingests compliant data only
- [ ] Prometheus metrics endpoint operational
- [ ] L3 auto-execute works for stock sync
- [ ] 0 regressions

---

## 6. Wave 5 — Decision Engine + Autonomous L4

### Objective

Central Business Decision Engine. Governed conditional autonomy. Demand forecasting foundation.

### Dependencies

- Wave 4 complete

### Modules

| Module | Path | Type |
|--------|------|------|
| `DecisionEngine` | `ai_core/intelligence/decision/engine.py` | New |
| `DecisionEngineWorker` | `ai_core/workers/decision/` | New |
| `AutonomousActionEngine` | `ai_core/intelligence/autonomy/action_engine.py` | New |
| `ProcurementIntelligenceWorker` | `ai_core/workers/procurement/` | New |
| Distributed queue adapter | `ai_core/scheduler/queue_adapter.py` | New (optional) |

### APIs

- `POST /decisions/evaluate`, `GET /decisions`

### Workers

- Register `decision-engine`, `procurement-intelligence`

### Tests

- Decision engine output type tests
- Autonomous action cannot bypass approval
- L4 conditional execution tests
- Kill switch tests

### Security

- Decision engine cannot execute writes
- L4 feature flag `BUZZARD_AUTONOMY_L4_ENABLED=false` by default

### Rollback

- `BUZZARD_AUTONOMY_L4_ENABLED=false`
- `BUZZARD_AI_CORE_V3=0`

### Acceptance Criteria

- [ ] Decision engine produces correct output types
- [ ] L4 auto-execute works within policy bounds
- [ ] L5 actions always require approval
- [ ] Kill switch disables all autonomous execution
- [ ] Full E2E staging suite green
- [ ] `PHASE3_READY` criteria met

---

## 7. External Dependency Gates

| Gate | Required Before | Owner |
|------|-----------------|-------|
| Commerce API staging | Wave 1 | Commerce platform team |
| Supplier feed (≥1) | Wave 2 | Supplier operations |
| WMS staging | Wave 3 | Warehouse team |
| CRM staging | Wave 3 | Customer service team |
| Carrier API (DHL) | Wave 4 | Logistics team |
| Compliant market data API | Wave 4 | Business intelligence |
| JWT IdP | Wave 1 | Platform/DevOps |
| Production Commerce API | Wave 5 / go-live | Commerce platform team |

---

## 8. PHASE3_READY Criteria

All must be true after Wave 5:

1. P1 commerce gaps closed with production/staging E2E verification
2. All 5 waves acceptance criteria met
3. Full test suite green (500+ tests expected)
4. JWT/RBAC enforced
5. Business Decision Engine operational
6. Observability: metrics, structured logs, audit correlation
7. No fake integrations
8. Phase 2 tests unmodified and passing
9. Independent verification report published

---

**STOP — Implementation not started.**
