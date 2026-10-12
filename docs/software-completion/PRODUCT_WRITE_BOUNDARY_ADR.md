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
| PIM catalog v1.9 | `pimCatalog.createProduct` | `pim_products` | Separate schema. Admin HTTP. Gated by `productWriteBoundary` (`requireExplicitAuth`). Persist still `pim_products` only. |
| Catalog SEO | `catalogSeo.createProduct` | `products` | Storefront/SEO table. Admin HTTP. Now gated by `productWriteBoundary` (`requireExplicitAuth`). Persist still `products` only, `active=0` on create. |
| JSON catalog | `productStore.upsertProduct` | `data/buzzard_products.json` | File catalog. Admin catalog plugin + import pipeline. Now gated by `authorizeCreate` / `authorizeUpdate` (`requireExplicitAuth`). Persist still the JSON file only. Tests use `BUZZARD_PRODUCT_STORE_PATH`. |
| Search index | `advancedSearch.createProduct` | `srch_products` | Search document, not commercial identity. |
| Supplier staging | `productStagingService` | `pim_core_product_staging` | Promotes to `productCore` after safety checks. |

Consumers: admin PIM UIs, import pipeline, storefront `catalogReadService` / search, marketplace drafts (SKU+price only), inventory reservations (SKU, not this identity).

## Proposed canonical write boundary

**Policy module:** `server/lib/pim/productWriteBoundary.js`  
**Not a store. Not a second orchestrator.**

The boundary validates and authorizes mutations. Persistence stays on the caller’s existing destination. Dual-write is rejected by design (`dualWrite: false`).

This increment does **not** declare any table as a live Source of Truth. Choosing a store still requires a migration plan, consumer cutover, and operator approval.

## Recommended candidate (NOT selected, NOT activated)

**Candidate:** `pim_core_products` via `productCore`.

Evidence, not convenience:

- `CANONICAL_ENGINES.productCreate` already names `productCore.createProduct`.
- Identifier uniqueness exists for sku/ean/gtin/mpn.
- `pim_core_product_audit` is the only dedicated product mutation audit table.
- Status lifecycle already refuses ACTIVE create and READY→ACTIVE while sales are locked.
- PIM import promotion (`server/lib/pim/importPipeline.js`) already writes here after staging.

Why it is **not** activated:

- Storefront and admin still read JSON catalog, `products`, `pim_products`, and `pim30_products`.
- No cross-store SKU/EAN map exists.
- No production migration is authorized.
- Dual-write is forbidden, so readers cannot be cut over implicitly.

Operator approval plus a reader inventory and identity backfill remain prerequisites. Until then Product SoT stays **INACTIVE**.

## Product identity and duplicates

- SKU is required before persist.
- `productCore` still enforces identifier uniqueness (`sku`/`ean`/`gtin`/`mpn`) on `pim_core_products`.
- `pim30_products` still uses its SKU unique constraint.
- Cross-store duplicate detection is **not** implemented here (would require choosing a canonical identity). Remaining blocker.

## Supplier offer separation

Conflicting `offers` fail closed via `inventory.resolveSupplierConflict`. Supplier stock is not written as canonical product truth. No speculative purchase.

## Validation and authorization

- HTTP `/api/product-catalog-pim` writes already require admin + `products.write`.
- HTTP `/api/admin/pim-catalog/products` and `/api/admin/catalog/products` already require admin (`requireAnyAdmin`). Actor identity is taken from the session, never the body.
- Library `productCatalogPim.createProduct`, `pimCatalog.createProduct`, and `catalogSeo.createProduct` require `authorized: true` (`requireExplicitAuth`). SYSTEM/IMPORT without that flag fail closed on those libraries.
- ACTIVE create is rejected on the boundary for every caller. Catalog SEO `active: true` / `1` is treated as ACTIVE (this table has no `status` column).
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

Phase 1: `productCatalogPim.createProduct` → boundary → `pim30_products` only. `productCore.createProduct` → boundary → `pim_core_products` only.

Phase 2: `pimCatalog.createProduct` → boundary (`requireExplicitAuth`) → `pim_products` only. HTTP still returns `result.product`. Missing SKU still `{ error: "sku required" }`. Duplicate SKU still 409. Actor identity is taken only from the authenticated plugin context, never from the request body.

Phase 3: `catalogSeo.createProduct` → boundary (`requireExplicitAuth`) → `products` only. HTTP still returns `result.product`. Missing sku/name still `{ error: "sku and name required" }`. Duplicate still `{ error: "SKU or slug already exists" }` 409. Creates persist `active=0` so the table default of `active=1` cannot silently publish. `updateProduct` refuses inactive→active while sales are locked (minimum bypass guard; already-active seed rows can still be edited).

Phase 4: `productStore.upsertProduct` → `authorizeCreate` / `authorizeUpdate` (`requireExplicitAuth`) → `data/buzzard_products.json` only. Admin/import/p1 callers pass session-derived identity. Duplicate SKU 409 on create and on SKU-changing updates (self excluded). ACTIVE create and draft→active updates fail closed. `productStore.deleteProduct` uses `authorizeDelete` (`requireExplicitAuth`); there is no HTTP delete caller. Shared `authorizeUpdate` also gates `pimCatalog.updateProduct`, `catalogSeo.updateProduct`, and `productCore.updateProduct`. `productCore` identifier uniqueness now runs before persist so a colliding EAN/GTIN/MPN cannot leave a written row.

No dual-write. SoT inactive.

## Remaining writer classification (not routed)

| Path | Class | Rationale |
| --- | --- | --- |
| `advancedSearch.createProduct` | B — Read model / search index | Writes `srch_products` search documents, not master identity. Do not route through the product-master boundary. |
| `db.js` `seed()` product inserts | C — Seed/test fixture | Inserts demo `products` rows only when the table is empty. |
| `catalogProductSync.syncCatalogProducts` | D — Synchronization projection | Copies JSON catalog into `products`. Projection, not a new master authoring path. |
