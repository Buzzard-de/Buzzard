# PIM — Product Information Management (Part 6)

## Overview

Part 6 introduces Buzzard's central PIM layer on top of Product Core. It supports multi-supplier import, validation, mapping, variants, media, SEO, bulk ops, and AI suggestions with approval.

## Database Tables

| Table | Purpose |
|-------|---------|
| `pim_core_brands` | Central brand registry |
| `pim_core_products` | Product master |
| `pim_core_variants` | Parent → variant axes |
| `pim_core_media` | Images, video, manuals, datasheets, certificates |
| `pim_core_supplier_mappings` | Supplier SKU → internal product |
| `pim_core_category_mappings` | Taxonomy category mapping config |
| `pim_core_attribute_schemas` | Dynamic attribute definitions per category |
| `pim_core_product_audit` | Product change audit trail |
| `pim_core_import_stages` | Import pipeline stage log |

## Import Pipeline

```
Supplier → Raw → Validation → Normalization → Duplicate Detection → Mapping → Category → PIM → Status
```

Implementation: `server/lib/pim/importPipeline.js`

- Default **dry-run** — no writes unless `dryRun: false`
- Each stage logged to `pim_core_import_stages`

## Validation

Framework: `server/lib/pim/productValidation.js`

Each field: `PASS` | `WARNING` | `FAIL`

Checks: SKU, EAN/GTIN, brand, title, description, category, images, price, stock, supplier, identifiers.

## Supplier Mapping

`server/lib/pim/supplierMapping.js` — maps supplier records to internal products with confidence score.

## Worker Jobs

| Job Type | Handler |
|----------|---------|
| `PRODUCT_IMPORT` | Full import pipeline |
| `PRODUCT_VALIDATE` | Validation only |
| `PRODUCT_NORMALIZE` | Normalization preview |
| `PRODUCT_MAPPING` | Supplier mapping (dry-run default) |

## Admin UI

- Path: `/admin/pim-core/`
- Client: `lib/admin/pimCore.ts`
- Panel: `components/admin/AdminPimCorePanel.tsx`

Tabs: Products, Brands, Import, Validation, Supplier Mapping, Attributes.

## AI Foundation

`server/lib/pim/productAiFoundation.js` — suggestions only; `requiresApproval: true`; no direct critical field writes.

Capabilities: title/description generation, attribute extraction, category suggestion, duplicate detection, SEO suggestion.

## Tests

```bash
npm run test:unit      # includes part6Foundation.test.mjs
npm run test:part6     # API smoke (requires API on :3001)
npm run test:pim-catalog
npm run pim:health
npm run pim:dry-run
npm run test:e2e       # Playwright admin-pim-core.spec.ts
```

See also [PIM_CATALOG_FOUNDATION.md](./PIM_CATALOG_FOUNDATION.md) for catalog/PIM foundation (dry-run, health, workflow).
