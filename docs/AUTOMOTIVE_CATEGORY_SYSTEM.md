# Buzzard — Automotive Category System

Development-only automotive & motor vehicles taxonomy and catalog infrastructure.

## Safety (unchanged)

```
BUZZARD_SALES_ENABLED=0
NEXT_PUBLIC_SALES_ENABLED=0
REAL_SUPPLIER_LIVE_IMPORT=0
REAL_SUPPLIER_DRY_RUN=1
```

- `ready=false`, `status=BLOCKED`
- No supplier API calls, no live import, no publish, no sales activation

## Architecture

```
data/automotive/automotive_category_tree.json   ← generated taxonomy (305 nodes)
data/automotive/supplier_category_mappings.json ← dry-run supplier mapping

server/core/automotive/
  automotiveTaxonomy.js      ← registry + URL/breadcrumb helpers
  automotiveAttributes.js    ← reusable product attributes
  automotiveVehicleCompatibility.js
  automotiveFilters.js
  automotiveValidation.js

server/lib/catalog/
  taxonomyResolver.js
  categoryMapping.js
  productCategoryValidator.js
  automotivePimBridge.js

server/plugins/automotiveCatalogPlugin.js  ← public + admin API

lib/automotive/               ← Next.js taxonomy service + SEO
components/catalog/           ← reusable UI components
app/products/automotive/      ← category pages
```

## Taxonomy hierarchy

| Level | Example |
|-------|---------|
| 1 Main | `automotive` |
| 2 Subcategory | `tires-wheels`, `brakes`, … (15 total) |
| 3 Sub-subcategory | `car-tires`, `brake-pads`, … (289 total) |

Regenerate tree:

```bash
npm run automotive:generate-taxonomy
```

## URLs (stable English slugs)

- `/products/automotive/`
- `/products/automotive/tires-wheels/`
- `/products/automotive/tires-wheels/car-tires/`

## i18n

DE / EN / TR / AR labels on every category node. UI strings under `automotive.*` in locale files. Arabic RTL via existing `LocaleProvider`.

## PIM integration

`automotivePimBridge.js` resolves supplier → Buzzard category mapping and validates products through `productCategoryValidator`. Publish remains blocked.

## Admin (RBAC)

- `GET /api/admin/automotive/categories`
- `PATCH /api/admin/automotive/categories/:id` (dry-run metadata)
- `POST /api/admin/automotive/supplier-mappings`
- `POST /api/admin/automotive/products/validate`
- `GET /api/admin/automotive/integrity`

## Tests

```bash
npm run test:automotive
```

## Empty catalog

Category pages render correctly with zero products. No fake public products are injected.
