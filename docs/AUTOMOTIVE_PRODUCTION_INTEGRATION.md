# Automotive Production Integration Layer

## Overview

The **Automotive Production Integration Layer** (`server/core/automotiveProduction/`) is an orchestration layer on top of the existing **Automotive Core Engine**. It does **not** duplicate PIM, search, category, vehicle, fitment, price, stock, or order engines.

```
BUZZARD
  ↓
AUTOMOTIVE CORE ENGINE (server/core/automotiveCore/)
  ↓
AUTOMOTIVE PRODUCTION INTEGRATION (server/core/automotiveProduction/)
  ↓
Supplier Connectors → Normalization → Category Mapping → Identity → TecDoc
  → Fitment → AI Matching → Image → Localization/SEO → Price → Stock
  → Admin Review → APPROVED → MANUAL PUBLISH → Store → Orders → Shipping → Tracking → Returns
```

## Modules

| Module | Purpose |
|--------|---------|
| `productionConfig.js` | Environment config and startup validation |
| `productionSafety.js` | Fail-closed safety gates |
| `productionErrors.js` | Structured error model |
| `integrationRegistry.js` | Supplier registry |
| `supplierConnectorManager.js` | Mock / DryRun / Real (blocked) connectors |
| `tecdocConnectorManager.js` | TecDoc wrapper over core adapter |
| `productIngestionManager.js` | Full fail-closed ingestion pipeline |
| `productNormalizationManager.js` | Canonical product normalization |
| `productMatchingManager.js` | Multi-supplier matching and scoring |
| `priceStockManager.js` | Price calculation and stale stock checks |
| `orderIntegrationManager.js` | Order flow (live blocked) |
| `shippingIntegrationManager.js` | Direct shipping / dropshipping (PII protected) |
| `trackingManager.js` | Carrier-agnostic tracking (mock) |
| `returnIntegrationManager.js` | Return flow with human approval |
| `syncScheduler.js` | Sync jobs (disabled by default) |
| `integrationHealth.js` | Component health report |
| `integrationAudit.js` | Audit events (no secrets, no PII) |

## Data Flow

### Supplier → Product

1. **Supplier Connector** (mock/dry-run) fetches raw products
2. **Normalization** → canonical automotive product via core `productEngine`
3. **Category mapping** via `categoryMapping.js` and core `categoryEngine`
4. **Identity validation** (GTIN/EAN/MPN/OEM, duplicate detection)
5. **TecDoc enrichment** (dry-run/mock only)
6. **Fitment validation** with confidence levels
7. **AI matching** (recommendations only — never publish/approve)
8. **Image validation** via `imagePipeline.js`
9. **Translation/SEO** (de, en, tr, ar required)
10. **Price** (diagnostic when sales OFF)
11. **Stock** (stale check via `STOCK_MAX_AGE_MINUTES`)
12. **Staging** → REVIEW_REQUIRED or validation pass

### Order Flow

`DRAFT → PAYMENT_PENDING → PAID → SUPPLIER_PENDING → ...`

Live supplier orders require **all** gates: `ORDER_LIVE_ENABLED`, `SUPPLIER_LIVE_ENABLED`, `SALES_ENABLED`.

## Safety Contract

Default state (cannot be bypassed):

| Gate | Default |
|------|---------|
| SALES | OFF |
| PAYMENTS | OFF |
| SUPPLIER LIVE | OFF |
| LIVE IMPORT | OFF |
| TECDOC LIVE | OFF |
| ORDER LIVE | OFF |
| PUBLISH | OFF |
| AUTO ACTIVATION | OFF |
| GO-LIVE | BLOCKED |
| HUMAN APPROVAL | REQUIRED |

**APPROVED ≠ PUBLISHED** — `manualPublish === true` alone is insufficient; publish remains blocked in diagnostic mode.

## Environment Variables

See `.env.example`:

```
AUTOMOTIVE_PRODUCTION_ENABLED=0
SUPPLIER_LIVE_ENABLED=0
REAL_SUPPLIER_LIVE_IMPORT=0
TECDOC_ENABLED=0
TECDOC_DRY_RUN=1
SUPPLIER_SYNC_ENABLED=0
STOCK_SYNC_ENABLED=0
PRICE_SYNC_ENABLED=0
ORDER_LIVE_ENABLED=0
AUTOMOTIVE_AUTO_PUBLISH=0
SALES_ENABLED=0
PAYMENTS_ENABLED=0
```

Supplier credentials: `SUPPLIER_<ID>_API_URL`, `_API_KEY`, `_API_SECRET` (never in source code).

## Admin API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/automotive/integrations` | Integration manifest |
| GET | `/api/admin/automotive/suppliers` | Supplier registry |
| GET | `/api/admin/automotive/tecdoc/status` | TecDoc connector status |
| GET | `/api/admin/automotive/sync/status` | Sync scheduler status |
| GET | `/api/admin/automotive/health` | Full health report |
| POST | `/api/admin/automotive/sync/dry-run` | Dry-run sync (no live calls) |
| POST | `/api/admin/automotive/products/:sku/validate` | Run ingestion pipeline |
| POST | `/api/admin/automotive/products/:sku/approve` | Approve (not publish) |
| POST | `/api/admin/automotive/products/:sku/publish` | Publish (blocked) |

## Testing

```bash
npm run test:automotive-production
npm run test:automotive-production-integration
```

## Known Limitations

- **No real supplier/TecDoc integration** without external credentials and safety gate activation
- Real connectors exist at interface level only; all calls return `SUPPLIER_LIVE_DISABLED` / `TECDOC_DISABLED`
- Sync scheduler does not run automatically
- FX provider adapter is dry-run only

## External Human Actions Required

1. Configure real supplier API credentials in secret manager
2. Complete TecDoc API certification
3. Enable safety gates individually after business approval
4. Manual publish per product after admin review
5. Payment provider activation before sales enablement
