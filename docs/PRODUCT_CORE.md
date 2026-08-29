# Product Core (Part 6)

Buzzard Product Core is a **category-agnostic** central product model. Automotive is one category among 53 — not the platform default.

## Model

Products live in `pim_core_products` (separate from legacy `pim_products` v1.9).

| Field | Description |
|-------|-------------|
| `id`, `sku` | Internal identifiers (`sku` unique) |
| `supplierSku`, `ean`, `gtin`, `mpn` | Cross-supplier identity (partial unique indexes) |
| `brandId` | FK → `pim_core_brands` |
| `title`, `description`, `shortDescription` | Content |
| `taxonomy_category_id`, `subcategory_id` | Category assignment via taxonomy service |
| `attributes_json` | Dynamic per-category attributes |
| `price`, `stock`, `supplier_id` | Commerce fields (sales disabled in Part 6) |
| `status`, `visibility` | Lifecycle |
| `seo_json`, `metadata_json` | SEO & extensibility |
| `quality_score` | 0–100 data quality |

## Lifecycle

```
DRAFT → IMPORTED → VALIDATING → READY → ACTIVE
                      ↓           ↓
                   BLOCKED     HIDDEN → ARCHIVED
```

- Transitions are enforced in `server/core/productConstants.js`
- `BLOCKED` products cannot become `ACTIVE`
- `ACTIVE` is blocked when `BUZZARD_SALES_ENABLED=0`

## Modules

| Module | Path |
|--------|------|
| CRUD & lifecycle | `server/lib/pim/productCore.js` |
| Identifiers | `server/lib/pim/productIdentifiers.js` |
| Audit | `server/lib/pim/productAudit.js` |
| Validation | `server/lib/pim/productValidation.js` |
| Quality score | `server/lib/pim/qualityScore.js` |
| Search abstraction | `server/lib/pim/productSearch.js` |

## API

Admin routes under `/api/admin/pim-core/*` (plugin: `server/plugins/pimCorePlugin.js`).

## Safety

- `BUZZARD_SALES_ENABLED=0` — no live sales activation
- Legacy catalog pages (`/admin/products`, `/admin/pim-catalog`) unchanged
