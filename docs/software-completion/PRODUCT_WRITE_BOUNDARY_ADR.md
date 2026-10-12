# ADR — Product write boundary (SoT inactive)

Status: accepted for this increment only. Product Source of Truth remains **INACTIVE**.  
Date: 2026-10-12  
Branch: `cursor/product-sot-write-boundary-c293`  
Does not activate SoT, unlock sales, migrate storage, or dual-write.

## Current storage architecture

Multiple independent product write stores exist. None is verified as production Source of Truth.

| Store | Writer | Tables / file | Notes |
| --- | --- | --- | --- |
| PIM core | `productCore.createProduct` / `updateProduct` | `pim_core_products` | Declared authorized persistence in `canonical.js`. ACTIVE create rejected. Sales lock blocks ACTIVE transition. |
| Product catalog PIM v3 | `productCatalogPim.createProduct` | `pim30_products` | Separate schema. Previously accepted `status` including ACTIVE. Admin required at HTTP layer. |
| PIM catalog v1.9 | `pimCatalog.createProduct` | `pim_products` | Separate schema. Admin HTTP. Not routed in this increment. |
| Catalog SEO | `catalogSeo.createProduct` | `products` | Storefront/SEO table. Admin HTTP. Not routed. |
| JSON catalog | `productStore.upsertProduct` | `data/buzzard_products.json` | File catalog. Admin catalog plugin. Not routed. |
| Search index | `advancedSearch.createProduct` | `srch_products` | Search document, not commercial identity. |
| Supplier staging | `productStagingService` | `pim_core_product_staging` | Promotes to `productCore` after safety checks. |

Consumers: admin PIM UIs, import pipeline, storefront `catalogReadService` / search, marketplace drafts (SKU+price only), inventory reservations (SKU, not this identity).

## Proposed canonical write boundary

**Policy module:** `server/lib/pim/productWriteBoundary.js`  
**Not a store. Not a second orchestrator.**

The boundary validates and authorizes mutations. Persistence stays on the caller’s existing destination. Dual-write is rejected by design (`dualWrite: false`).

This increment does **not** declare `pim_core_products` or `pim30_products` as Source of Truth. Choosing a store requires a migration plan, consumer cutover, and operator approval that this task does not authorize.

## Product identity and duplicates

- SKU is required before persist.
- `productCore` still enforces identifier uniqueness (`sku`/`ean`/`gtin`/`mpn`) on `pim_core_products`.
- `pim30_products` still uses its SKU unique constraint.
- Cross-store duplicate detection is **not** implemented here (would require choosing a canonical identity). Remaining blocker.

## Supplier offer separation

Conflicting `offers` fail closed via `inventory.resolveSupplierConflict`. Supplier stock is not written as canonical product truth. No speculative purchase.

## Validation and authorization

- HTTP `/api/product-catalog-pim` writes already require admin + `products.write`.
- Library `productCatalogPim.createProduct` now requires `authorized: true` (`requireExplicitAuth`).
- ACTIVE create is rejected on the boundary for every caller.
- SoT activation via payload is rejected.
- `productCore` keeps inherited ADMIN/IMPORT/SYSTEM+actorId authorization so existing tests and import promotion still persist to `pim_core_products` only.

## Audit trail

Existing `pim_core_product_audit` remains for `productCore` writes. Boundary decisions return `reason` / `boundary` on the catalog-PIM result. No new table.

## Compatibility

- Catalog-PIM success payload still includes `product` and `completeness`.
- ACTIVE create error text for `productCore` is unchanged.
- Sales lock and SoT flags remain false.

## Migration prerequisites (not done)

1. Inventory every reader of `pim_products`, `pim30_products`, `products`, and JSON catalog.
2. Choose one persistence target with operator approval.
3. Backfill identity mapping (SKU/EAN) without dual-write.
4. Cut readers over.
5. Only then consider SoT activation as a separate authorized change.

## Rollback

Remove the `authorizeCreate` calls and restore direct inserts. No schema migration to reverse. SoT was never flipped.

## Increment implemented

`productCatalogPim.createProduct` is routed through the boundary, then writes **only** to `pim30_products`. `productCore.createProduct` uses the same policy function, then writes **only** to `pim_core_products`. No dual-write. SoT inactive.
