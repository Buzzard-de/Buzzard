# Part 15 — Product Catalog Preparation

**Status:** COMPLETE (pipeline implemented; production import **not** executed)  
**Date:** 2026-08-30

---

## Summary

| Gate | Result |
|------|--------|
| **PART 15 PRODUCT CATALOG PREPARATION** | **COMPLETE** |
| **DRY RUN** | **PASS** |
| **PRODUCTS FOUND** | **26** |
| **PRODUCTS ELIGIBLE** | **6** |
| **PRODUCTS REJECTED** | **20** |
| **DEMO PRODUCTS BLOCKED** | **7** |
| **DUPLICATES** | **0** |
| **VALIDATION FAILURES** | **13** |
| **PUBLIC PRODUCTS CREATED** | **0** |
| **SALES** | **DISABLED** |
| **STRIPE** | **OFF** |
| **PAYPAL** | **OFF** |
| **SUPPLIER ORDERS** | **OFF** |
| **GO-LIVE LOCK** | **ACTIVE** |

---

## Architecture (Phase 1 — Existing Implementation)

### `pim_core_products` schema

Defined in `server/lib/db.js` — key fields: `sku` (unique), `ean`, `gtin`, `brand_id`, `title`, `taxonomy_category_id`, `price`, `stock`, `status` (default `DRAFT`), `visibility` (default `HIDDEN`).

### Services & routes

| Component | Path |
|-----------|------|
| Product CRUD | `server/lib/pim/productCore.js` |
| Validation | `server/lib/pim/productValidation.js` |
| Storefront visibility | `server/lib/storefront/storefrontVisibility.js` |
| Storefront constants | `server/core/storefrontConstants.js` |
| Catalog read (public) | `server/lib/storefront/catalogReadService.js` |
| Admin PIM Core API | `server/plugins/pimCorePlugin.js` |
| Single-product import | `server/lib/pim/importPipeline.js` |
| Category mapping | `server/lib/pim/categoryEngine.js` |
| Brand handling | `server/lib/pim/brandService.js` |
| SKU uniqueness | `server/lib/pim/productIdentifiers.js` |
| Media | `server/lib/pim/mediaService.js` |

Public storefront reads **only** from `pim_core_products` via `catalogReadService.js`.

---

## New Part 15 Pipeline

| Component | Path | Purpose |
|-----------|------|---------|
| Demo/test guard | `server/lib/pim/demoProductGuard.js` | Central demo detection (reused by storefront) |
| Production safety gate | `server/lib/pim/productionSafetyGate.js` | Blocks writes if sales/payments enabled |
| Catalog migration | `server/lib/pim/productCatalogMigration.js` | Multi-source → PIM Core import |
| Catalog publish | `server/lib/pim/productCatalogPublish.js` | Explicit visibility publish (catalog only) |
| Import CLI | `scripts/pim-import.mjs` | `npm run pim:import` |
| Publish CLI | `scripts/pim-publish.mjs` | `npm run pim:publish -- --sku=...` |

### Sources (priority: P1 > PIM Catalog > Legacy)

1. **P1 JSON** — `data/buzzard_products.json`
2. **PIM Catalog** — `pim_products` (+ translations, media, SEO)
3. **Legacy SQLite** — `products` table

### Migration statuses

- `READY_TO_IMPORT` — passes validation (no FAIL), not demo, category mapped, SKU unique
- `SKIPPED_DEMO` — demo/test indicators in SKU/title/brand/id
- `SKIPPED_DUPLICATE` — SKU already exists in PIM Core (no overwrite)
- `VALIDATION_FAILED` — PIM validation FAIL (e.g. invalid EAN checksum)
- `CATEGORY_MAPPING_REQUIRED` — no taxonomy category
- `INVALID_PRODUCT` — missing SKU/title
- `IMPORTED` — successfully written (live import only)

### Safe defaults on import

- `status`: `IMPORTED` (staging)
- `visibility`: `HIDDEN`
- **No** automatic publish
- **No** sales/payment changes

### Publish requirements (`npm run pim:publish`)

- Genuine product (demo guard)
- Validation **PASS** (strict — warnings block publish)
- Valid visible category
- Sets `visibility: CATALOG`, `status: READY` (via IMPORTED → VALIDATING → READY)
- Does **not** set `ACTIVE` (sales remain blocked when `BUZZARD_SALES_ENABLED=0`)

---

## Dry-Run Results (2026-08-30, local DB)

Command: `npm run pim:import`

```
=== PRODUCTION SAFETY ===
BUZZARD_SALES_ENABLED: 0
GO-LIVE LOCK:          ACTIVE
Safety gate:           PASS

=== PIM IMPORT DRY RUN ===

PRODUCTS FOUND:          26
PRODUCTS ELIGIBLE:       6
PRODUCTS REJECTED:       20
DEMO PRODUCTS BLOCKED:   7
DUPLICATES:              0
VALIDATION FAILURES:     13
PUBLIC PRODUCTS CREATED: 0
```

### Eligible for import (6)

| Source | SKU | Title |
|--------|-----|-------|
| p1 | BUZ-AUTO-000009 | Stoßdämpfer Vorderachse Gas |
| legacy | BZ-CLEAN-001 | Universal Fahrzeugreiniger 1L |
| legacy | BZ-GARDEN-001 | Garten Bewässerungsset |
| legacy | BZ-HOME-001 | Premium Aufbewahrungsbox |
| legacy | BZ-PET-001 | Premium Haustierdecke |
| legacy | BZ-SPORT-001 | Performance Sportsocken |

### Blocked demo/test (7)

| SKU | Reason |
|-----|--------|
| BUZ-AUTO-000001 | Testprodukt (P1) |
| BUZ-AUTO-000001-280/300/SLV/BLK/VW | Test variants (legacy) |
| BZ-OIL-5W30 | Buzzard Demo brand (PIM catalog) |

### Validation failures (13)

P1 products `BUZ-AUTO-000002` … `000008`, `000010` … `000015` — **invalid EAN checksum** (sequential test GTINs in JSON).

### Not executed

- **No production import** — dry-run only per Phase 9
- **No publish** — `PUBLIC PRODUCTS CREATED = 0`

---

## Commands

```bash
# Dry-run (default — no DB writes)
npm run pim:import
npm run pim:import -- --dry-run --source=p1

# Live import (local/staging only — safety gate enforced)
npm run pim:import:live

# Publish dry-run (single SKU)
npm run pim:publish -- --dry-run --sku=BUZ-AUTO-000009

# Tests
npm run test:unit -- part15ProductCatalog
```

---

## Next Steps (requires explicit authorization)

1. Fix EAN/GTIN values in `data/buzzard_products.json` for 13 P1 automotive products
2. Add product images (currently empty on all P1 products)
3. Create `pim_core_brands` for real brands (ATE, Bosch, etc.)
4. Re-run `npm run pim:import` dry-run until **14 P1 products** show `READY_TO_IMPORT`
5. Execute live import on staging/production only when authorized
6. Publish individual SKUs via `npm run pim:publish -- --sku=...` after validation PASS

**Do not enable sales, Stripe, PayPal, or supplier orders.**
