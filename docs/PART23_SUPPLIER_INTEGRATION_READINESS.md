# Part 23 — B2B Supplier Integration Readiness

## Overview

Part 23 adds a **supplier integration readiness layer** on top of the existing Part 5/15/16/22 supplier and PIM infrastructure. It does **not** create parallel PIM, catalog, order, or payment systems.

All operations default to **dry-run**. Live import, publish, supplier orders, and outbound network calls remain **blocked** by production safety gates.

## Architecture

```
SupplierRegistry
  ├── adapterRegistry (Part 5 mock + Part 23 API/XML/CSV dry-run adapters)
  ├── SupplierCapabilityMatrix
  ├── SupplierMappingService → Part 16 PIM + Part 22 quality hardening
  ├── SupplierPriceStockReadiness
  ├── SupplierImportPipeline (dry-run default)
  ├── SupplierHealth
  ├── SupplierOrderReadiness (CREATE ORDER blocked)
  ├── SupplierShippingReadiness
  ├── SupplierSafetyGate + adminSafetyGate
  ├── SupplierAudit → Part 17 operationsAudit
  └── SupplierReadinessCenter
```

## Supplier Abstraction

Location: `server/lib/supplier/`

| Module | Purpose |
|--------|---------|
| `supplierRegistry.js` | Multi-supplier registry (mock, API, XML, CSV, REAL-WHOLESALER-001 placeholder) |
| `dryRunSupplierAdapter.js` | Base adapter — no outbound network |
| `apiSupplierAdapter.js` | REST/API dry-run adapter |
| `xmlSupplierAdapter.js` | XML feed dry-run adapter |
| `csvSupplierAdapter.js` | CSV feed dry-run adapter |
| `realSupplierConnector.js` | Part 15 connector (unchanged, dry-run default) |

Each adapter implements:

- `validateConfiguration()`
- `fetchProducts()` — **network blocked**
- `fetchProductsDryRun()` — sample data only
- `fetchStock()` / `fetchPrices()`
- `mapProduct()` / `normalizeProduct()`
- `healthCheck()`

## Capability Matrix

Capabilities per supplier: `catalog`, `price`, `stock`, `gtin`, `mpn`, `brand`, `images`, `categories`, `orders`, `shipping`, `tracking`, `dropshipping`, `whiteLabel`, `api`, `xml`, `csv`.

When `credentialsConfigured=false`:

- Supplier cannot go LIVE
- Live capability status = `BLOCKED`

## Product Mapping

`supplierMappingService.js` maps supplier fields to existing PIM:

| Supplier field | PIM field |
|----------------|-----------|
| supplier SKU | internal SKU |
| GTIN/EAN | GTIN |
| MPN | MPN |
| brand | normalized brand (Part 22) |
| supplier category | taxonomy (CONDITION if unmapped) |
| images | image pipeline |
| price | source price |
| stock | source stock |

Missing or suspicious data → `BLOCKED` or `CONDITION`. No data fabrication.

## Import Pipeline

`supplierImportPipeline.js`:

```
supplier → adapter → raw staging → normalization → validation →
quality hardening → category validation → duplicate detection → PIM staging
```

- Default: `DRY_RUN=true`
- Live publish: **never**
- Reuses Part 22 `productQualityHardening` and duplicate flags

## Safety Controls (unchanged)

| Control | Value |
|---------|-------|
| `BUZZARD_SALES_ENABLED` | 0 |
| `NEXT_PUBLIC_SALES_ENABLED` | 0 |
| `PRODUCTION_SAFETY_LOCK` | true |
| Stripe / PayPal | OFF |
| `supplierOrdersBlocked` | true |
| `REAL_SUPPLIER_LIVE_IMPORT` | 0 |
| `REAL_SUPPLIER_DRY_RUN` | 1 |
| Public products | 0 |

## API Endpoints

### Public

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/health/supplier-readiness` | `diagnosticOnly: true`, `autoActivate: false` |

### Admin (RBAC: `suppliers.read`)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/admin/suppliers/readiness` | Aggregated readiness report |
| GET | `/api/admin/suppliers` | Legacy list + `integration` registry (extended) |
| GET | `/api/admin/suppliers/:id/health` | Per-supplier health |
| GET | `/api/admin/suppliers/:id/capabilities` | Capability matrix |
| POST | `/api/admin/suppliers/:id/validate` | Validation only |
| POST | `/api/admin/suppliers/:id/dry-run` | Dry-run import pipeline |

POST endpoints perform **validation/dry-run only** — no live import or orders.

## Tests

```bash
npm run test:part23
```

35 tests covering registry, adapters, capability matrix, mapping, price/stock, pipeline, duplicates, safety, RBAC, audit, and error handling.

## Regression

```bash
npm run test:part15   # Gate #11 environmental failure expected
npm run test:part16
npm run test:part17
npm run test:part18
npm run test:part19
npm run test:part20
npm run test:part21
npm run test:part22
npm run test:part23
npm run typecheck
npm run lint
```

## Next Steps (Part 24 — NOT started)

1. Configure real supplier credentials in Render secrets (operator action)
2. Enable live import only after credential validation + explicit approval
3. Connect order adapter after sales go-live approval

Part 24 is **not** started by this branch.
