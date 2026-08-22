# BUZZARD AI CORE — PHASE 3 INTEGRATION ARCHITECTURE

**Version:** 1.0  
**Date:** 2026-08-22

---

## 1. Integration Philosophy

Phase 3 connects real external systems through **adapter layers** that sit between the frozen Phase 2 AI Core and external platforms. Adapters:

- Never fake connectivity status
- Return honest degraded responses when unconfigured
- Support multiple platforms without rewriting AI Core
- Enforce authentication, retries, rate limits, and audit on every call

---

## 2. Commerce Integration Layer

### 2.1 Current State (Phase 2 — frozen)

`CommerceBridge` in `ai_core/bridge/commerce.py`:

| Method | Endpoint | Status when unconfigured |
|--------|----------|--------------------------|
| `read_products(sku?)` | GET `/products` | `NO_DATA_AVAILABLE` |
| `read_orders(order_id?)` | GET `/orders` | `NO_DATA_AVAILABLE` |
| `read_stock(sku?)` | GET `/stock` | `NO_DATA_AVAILABLE` |
| `write(action, payload, approval_granted)` | POST `/actions/{action}` | `APPROVAL_REQUIRED` or `EXTERNAL_INTEGRATION_PENDING` |

Config: `COMMERCE_API_URL`, `COMMERCE_API_TOKEN`

### 2.2 Phase 3 Commerce Adapter Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AI Core (frozen)                      │
│  Domain Workers → CommerceBridge (interface preserved)     │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│              CommerceIntegrationAdapter                   │
│  implements IntegrationAdapter                            │
│  - is_configured() → bridge reality                       │
│  - health_check() → GET /health                           │
│  - status → CONNECTED | DEGRADED | DISCONNECTED           │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│              CommerceConnector (abstract)                   │
│  - authenticate()                                           │
│  - request(method, path, payload, idempotency_key)        │
│  - handle_rate_limit(retry_after)                         │
│  - handle_error(status, body) → structured error            │
└────────┬───────────────┬───────────────┬─────────────────┘
         │               │               │
   BuzzardCommerce   ShopifyConnector  FuturePlatform
   Connector (P3)    (FUTURE)          (FUTURE)
```

### 2.3 Connector Interface

```python
class CommerceConnector(ABC):
    def authenticate(self) -> AuthContext: ...
    def health_check(self) -> HealthResult: ...
    def get_products(self, *, sku: str | None, cursor: str | None) -> PaginatedResult: ...
    def get_orders(self, *, order_id: str | None, cursor: str | None) -> PaginatedResult: ...
    def get_stock(self, *, sku: str | None) -> StockResult: ...
    def execute_action(self, action: str, payload: dict, *, idempotency_key: str) -> ActionResult: ...
    def subscribe_webhook(self, event_type: str, callback_url: str) -> WebhookRegistration: ...
```

### 2.4 Authentication

| Method | Use Case |
|--------|----------|
| Bearer token | Buzzard Commerce API (primary) |
| OAuth 2.0 client credentials | Future marketplace integrations |
| API key + HMAC signature | Webhook verification |
| mTLS | Enterprise supplier connections (future) |

Credentials stored in environment variables or secret manager. Never in code or memory namespaces.

### 2.5 Retries, Timeouts, Rate Limiting

| Parameter | Default | Configurable |
|-----------|---------|--------------|
| Connect timeout | 5s | `COMMERCE_CONNECT_TIMEOUT` |
| Read timeout | 30s | `COMMERCE_READ_TIMEOUT` |
| Max retries | 3 | `COMMERCE_MAX_RETRIES` |
| Backoff | Exponential (1s, 2s, 4s) | `COMMERCE_BACKOFF_BASE` |
| Rate limit | Respect `Retry-After` header | Per-connector config |
| Circuit breaker | Open after 5 failures in 60s | `COMMERCE_CIRCUIT_THRESHOLD` |

### 2.6 Idempotency

- All write operations require `Idempotency-Key` header
- Keys stored in `ai_core_idempotency_keys` table (migration 008)
- Duplicate keys return cached result without re-execution
- TTL: 24 hours default

### 2.7 Webhooks vs Polling

| Pattern | Use Case | Implementation |
|---------|----------|----------------|
| Webhook | Order created, stock changed, price updated | `POST /api/v1/integrations/webhooks/{platform}` |
| Polling | Supplier feeds without push capability | Scheduled task via orchestrator |
| Event bus | Internal propagation after ingestion | See `PHASE3_EVENT_ARCHITECTURE.md` |

Webhook verification: HMAC signature check, timestamp tolerance ±5 minutes, replay protection via nonce store.

### 2.8 Synchronization

| Sync Type | Direction | Frequency |
|-----------|-----------|-----------|
| Product catalog | Commerce → AI Core memory | Webhook + daily reconciliation |
| Stock levels | Commerce ↔ WMS ↔ AI Core | Webhook + 15-min poll |
| Orders | Commerce → AI Core | Webhook (real-time) |
| Prices | AI Core → Commerce (approved only) | On approval execution |

### 2.9 Error Handling

| Error Class | Action |
|-------------|--------|
| 4xx client error | Log, create exception, no retry |
| 429 rate limit | Backoff per `Retry-After`, retry |
| 5xx server error | Retry with backoff, circuit breaker |
| Timeout | Retry, then exception + alert |
| Auth failure | Halt integration, alert security, no retry |

### 2.10 Reconciliation

Daily reconciliation job compares:
- AI Core memory `products/{sku}` vs commerce API product count
- Stock totals per SKU across sources
- Order state consistency

Discrepancies → exception record + Kurmay signal.

### 2.11 Audit

Every integration call logged:

```json
{
  "integration_id": "commerce",
  "direction": "outbound",
  "method": "GET",
  "path": "/products/SKU-123",
  "status_code": 200,
  "duration_ms": 145,
  "idempotency_key": null,
  "correlation_id": "req-abc-123",
  "actor": "product-intelligence"
}
```

### 2.12 Versioning

- API version in URL path: `/api/v1/...`
- Connector version tracked in `ai_core_integration_status.connector_version`
- Breaking changes require new connector implementation, not AI Core changes

### 2.13 Health Checks

| Check | Frequency | Failure Action |
|-------|-----------|----------------|
| `GET /health` on commerce API | Every 60s | Status → DEGRADED |
| 3 consecutive failures | — | Status → DISCONNECTED, workers return `EXTERNAL_INTEGRATION_PENDING` |
| Auth token expiry | Before each call | Refresh or alert |

---

## 3. Supplier Integration Layer

### 3.1 Architecture

```
Supplier Source (API/XML/CSV/EDI/FTP/SFTP/REST/GraphQL/Webhook)
    ↓
Supplier Adapter (per supplier format)
    ↓
Normalizer (canonical supplier product schema)
    ↓
Validator (schema, business rules, malware scan on files)
    ↓
Product Mapper (supplier SKU → Buzzard SKU)
    ↓
Inventory Mapper (supplier stock → available stock)
    ↓
Price Mapper (supplier cost → cost basis)
    ↓
Availability Checker
    ↓
AI Intelligence (product-intelligence, supplier-hub workers)
    ↓
Central Memory (suppliers/{id}/, products/{sku}/)
    ↓
Audit
```

### 3.2 Supplier Adapter Interface

```python
class SupplierAdapter(ABC):
    supplier_id: str
    format: SupplierFormat  # API, XML, CSV, EDI, FTP, REST, GraphQL, WEBHOOK

    def connect(self) -> ConnectionResult: ...
    def fetch_catalog(self, *, since: datetime | None) -> Iterator[RawProduct]: ...
    def fetch_stock(self, *, skus: list[str]) -> list[StockUpdate]: ...
    def fetch_prices(self, *, skus: list[str]) -> list[PriceUpdate]: ...
    def submit_purchase_order(self, po: PurchaseOrder, *, idempotency_key: str) -> POResult: ...
    def health_check(self) -> HealthResult: ...
```

### 3.3 Supported Input Formats (future-proof)

| Format | Adapter Type | Scheduled Import |
|--------|-------------|------------------|
| REST API | `RestSupplierAdapter` | Poll + webhook |
| GraphQL | `GraphQLSupplierAdapter` | Poll |
| XML (BMEcat, etc.) | `XmlSupplierAdapter` | FTP/SFTP scheduled |
| CSV | `CsvSupplierAdapter` | FTP/SFTP scheduled |
| EDI (EDIFACT) | `EdiSupplierAdapter` | AS2/SFTP |
| FTP/SFTP | Transport layer for file adapters | Cron schedule |

**No hard-coded supplier.** Each supplier registered in `ai_core_suppliers` table (migration 009) with adapter class reference.

### 3.4 Malicious Data Protection

- XML/CSV files: size limits, schema validation, no external entity expansion
- HTML in product descriptions: sanitize before storage
- Executable attachments: rejected
- Anomalous price/stock changes: flagged for review

---

## 4. Product Intelligence Pipeline

```
Supplier Data
    → Raw Product (ai_core_raw_products)
    → Normalization (canonical schema)
    → Classification (Category Intelligence / TaxonomyRegistry)
    → Attribute Extraction (brand, GTIN/EAN, SKU, compatibility)
    → Compliance Check (EU regulations, customs HS code)
    → Content Generation (multilingual descriptions)
    → Pricing (Pricing Intelligence Engine)
    → Stock (Stock Intelligence)
    → Publishing Gate (approval if required)
    → Commerce Platform (via CommerceBridge write)
    → Audit
```

### Validation Gates

| Gate | Condition | On Failure |
|------|-----------|------------|
| Schema validation | Required fields present | Reject + exception |
| Category assignment | Maps to valid taxonomy node | Route to category worker |
| GTIN/EAN check | Valid checksum | Flag for manual review |
| Compliance | EU product safety rules | Block publish, escalate |
| Margin check | Above minimum margin policy | Require approval |
| Duplicate detection | SKU/GTIN uniqueness | Merge or reject |

---

## 5. Logistics — Carrier Abstraction

```
Carrier Adapter (DHL, DPD, Hermes, GLS, UPS, ...)
    → Rate Quote
    → Label Generation
    → Tracking Registration
    → Delivery Event Ingestion
    → Exception (delay, damage, loss)
    → Audit
```

### Carrier Adapter Interface

```python
class CarrierAdapter(ABC):
    carrier_id: str

    def get_rates(self, shipment: ShipmentRequest) -> list[RateQuote]: ...
    def create_label(self, shipment: ShipmentRequest, *, idempotency_key: str) -> LabelResult: ...
    def track(self, tracking_number: str) -> TrackingStatus: ...
    def cancel_label(self, label_id: str) -> CancelResult: ...
```

Volume-based shipping economics: rate selection considers package weight, dimensions, destination country, and contracted volume tiers. Logic in logistics intelligence module, not hard-coded per carrier.

**Wave 4.** Carrier abstraction not in initial commerce integration wave.

---

## 6. Market Intelligence (Compliant Sources Only)

### Permitted Data Sources

| Source Type | Examples | Constraints |
|-------------|----------|-------------|
| Public APIs | Google Trends (compliant tier), official statistics | API terms, rate limits |
| Licensed feeds | Market research providers (contracted) | License terms |
| Own commerce data | Buzzard sales, stock, pricing history | Internal |
| Competitor public prices | Where legally permitted and ToS-compliant | No unauthorized scraping |

### Prohibited

- Unauthorized web scraping
- Violation of robots.txt
- Circumvention of access controls
- Personal data collection without legal basis

### Signal Types

| Signal | Source | Use |
|--------|--------|-----|
| Market prices | Compliant APIs + own data | Pricing intelligence |
| Competitor assortment | Licensed feeds | Category gap analysis |
| Search demand | Trends APIs | Demand signals |
| Seasonality | Historical sales | Forecasting (future) |
| Promotion activity | Licensed/market feeds | Promotion intelligence |

---

## 7. Storefront Taxonomy Bridge (GAP-M-003)

Maps storefront `cat-{nn}` identifiers to master taxonomy `bz.{nn}`:

```
Storefront Catalog (cat-{nn})
    ↔ StorefrontTaxonomyBridge
    ↔ TaxonomyRegistry (bz.{nn})
    ↔ Category Workers (category-bz.{nn})
```

Resolves GAP-M-003 when storefront team provides mapping table. External dependency on storefront catalog alignment.

---

## 8. Integration Status Lifecycle

```
UNCONFIGURED → CONFIGURED → CONNECTING → CONNECTED
                                    ↓
                               DEGRADED → DISCONNECTED
                                    ↓
                               RECONNECTING → CONNECTED
```

Synced to `ai_core_integration_status` via `IntegrationStatusService.sync_from_registry()`.

Phase 3 Wave 1: wire `CommerceIntegrationAdapter.is_configured()` to `CommerceBridge.is_configured()` — closes status drift documented in Phase 2 review.

---

## 9. Multilingual / EU Considerations

| Dimension | Handling |
|-----------|----------|
| Language | Content stored per locale (`de`, `en`, `fr`, `ar`); workers receive `locale` in context |
| Currency | ISO 4217 in all price fields; conversion via configured rates |
| Tax/VAT | Country-specific rules in pricing engine; never hard-coded German-only |
| Shipping | Country + zone-based carrier selection |
| Returns | EU consumer rights per destination country |
| Regulatory | CE marking, WEEE, REACH compliance flags on products |

---

**STOP — Integration implementation not started.**
