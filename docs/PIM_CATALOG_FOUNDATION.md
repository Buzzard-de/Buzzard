# PIM Catalog Foundation

This document describes the Buzzard Product Catalog / PIM foundation layer. It builds on existing PIM Core modules (`server/lib/pim/*`) and does **not** introduce a new Part 36 governance layer.

## Architecture

```
Mock / P1 JSON / Legacy / Supplier dry-run
        ↓
supplierProductNormalizer
        ↓
categoryResolver (JSON mapping → taxonomy)
        ↓
productValidationPipeline
        ↓
pim_core_product_staging (optional)
        ↓
pim_core_products (PIM master)
        ↓
Manual review (admin)
        ↓
productCatalogPublish (explicit, human-controlled)
        ↓
catalogReadService → /api/catalog/*
```

Canonical modules:

| Module | Path |
|--------|------|
| Normalization | `server/lib/pim/supplierProductNormalizer.js` |
| Category resolution | `server/lib/pim/categoryResolver.js` |
| Validation pipeline | `server/lib/pim/productValidationPipeline.js` |
| Structured reports | `server/lib/pim/productValidationReport.js` |
| Staging | `server/lib/pim/productStagingService.js` |
| PIM master | `server/lib/pim/productCore.js` |
| Publish (manual) | `server/lib/pim/productCatalogPublish.js` |
| Health report | `server/lib/pim/pimHealthReport.js` |
| Merchant prep | `server/lib/pim/googleMerchantPrep.js` |
| Workflow labels | `server/core/pimWorkflowConstants.js` |

## Product lifecycle

### Staging lifecycle

`DISCOVERED → IMPORTED → VALIDATION_PENDING → VALIDATED → PROMOTED`

Blocked paths: `BLOCKED`, `INVALID`, `REJECTED`

### PIM workflow labels (admin)

| Label | Meaning |
|-------|---------|
| `DRAFT` | Not yet imported / incomplete |
| `IMPORTED` | In PIM, early stage |
| `NORMALIZED` | Normalized, validation in progress |
| `VALIDATED` | Passed deterministic checks |
| `REVIEW_REQUIRED` | Missing data or category mapping |
| `READY_FOR_REVIEW` | Complete enough for human review |
| `APPROVED` | Admin approved — **not published** |
| `PUBLISH_BLOCKED` | Demo, blocked, or invalid |
| `PUBLISHED` | Visible in catalog (manual publish only) |

**APPROVED ≠ PUBLISHED.** Publish requires explicit `npm run pim:publish` or admin action with safety gates.

## Validation rules

Structured validation output:

```json
{
  "valid": false,
  "status": "REJECTED",
  "errors": [],
  "warnings": [],
  "missingFields": []
}
```

Minimum checks:

- SKU, title, category (mapped)
- Brand (where applicable)
- Description
- GTIN/EAN (when required)
- Images (when required)
- Supplier source / provenance
- Duplicate SKU/EAN detection
- Price/currency sanity
- Demo product guard (`BZ-CORE-DEMO-001` remains blocked)

Implementation: `productValidationReport.js` wraps `productValidation.js` and `productValidationPipeline.js`.

## Category mapping

Order of resolution (`categoryResolver.js`):

1. Explicit `buzzard_category` hint
2. `data/buzzard_supplier_category_mappings.json` (supplier_id + supplier_category)
3. Taxonomy slug/id lookup in `data/buzzard_categories.json`
4. If uncertain → `REVIEW_REQUIRED` (never auto-create public categories)

## Dry-run process

```bash
npm run pim:dry-run
npm run pim:dry-run -- --json
npm run pim:dry-run -- --source=p1
npm run pim:dry-run -- --supplier=SUP-DEMO-001
```

Dry-run **must not**:

- Call live suppliers
- Publish products
- Enable sales or payments
- Modify production catalog unexpectedly

Default import remains dry-run: `npm run pim:import`

## PIM health

```bash
npm run pim:health
npm run pim:health -- --json
```

Reports: total/valid/invalid products, review required, missing images/categories, duplicate SKUs/EANs, demo products, supplier distribution, safety flags.

Admin API: `GET /api/admin/pim-core/health`

## Admin review

Path: `/admin/pim-core/`

- Workflow filter: ALL, DRAFT, INVALID, REVIEW_REQUIRED, READY_FOR_REVIEW, APPROVED, PUBLISH_BLOCKED
- Validation tab shows structured report
- Staging API: `GET /api/admin/pim-core/staging`

## Publish safety

Publish is blocked when:

- `productionSafetyGate` fails (sales/payments/go-live lock)
- Product is demo/test
- Validation is not PASS
- Category not visible

```bash
npm run pim:publish -- --dry-run --sku=SKU
```

## Google Merchant preparation

`googleMerchantPrep.js` prepares feed-shaped objects for future Merchant activation. Products are excluded when sales are off or required commercial fields are missing. **No Merchant publishing is activated.**

## Supplier boundaries

| Flag | Required value |
|------|----------------|
| `REAL_SUPPLIER_LIVE_IMPORT` | `0` |
| `REAL_SUPPLIER_DRY_RUN` | `1` |
| `BUZZARD_SALES_ENABLED` | `0` |
| `NEXT_PUBLIC_SALES_ENABLED` | `0` |

Live supplier credentials must not be used by `pim:dry-run` or default import paths.

## Tests

```bash
npm run test:pim-catalog
npm run test:part15
npm run test:part22
npm run test:part23
npm run test:part28
# … through part35
```

## Related docs

- [PIM.md](./PIM.md) — Part 6 PIM Core overview
- [CATALOG.md](./CATALOG.md) — Storefront catalog bridge
- [PART15_PRODUCT_CATALOG_READINESS.md](./PART15_PRODUCT_CATALOG_READINESS.md)
