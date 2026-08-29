# Catalog Intelligence (Part 6)

## Category System

Buzzard uses the **53-category master taxonomy** in `data/buzzard_categories.json`. Part 6 does **not** embed the category tree in the product model.

### Category Engine

`server/lib/pim/categoryEngine.js`

- Loads taxonomy from JSON (unchanged source of truth)
- Resolves categories by `id` or `slug` (e.g. `cat-05` / `automotive`)
- Supports main → sub → sub-sub assignment via `taxonomy_category_id` + `subcategory_id`
- Product category mapping managed via `pim_core_category_mappings`

### Dynamic Attributes

Per-category attribute schemas in `pim_core_attribute_schemas`:

| Category ID | Example attributes |
|-------------|-------------------|
| `cat-05` (Automotive) | OEM, engine, year, vehicle compatibility |
| `cat-02` (Kosmetik) | skin type, volume, ingredients |

Product Core stores values in `attributes_json` — no hard-coded category fields.

## Search Foundation

`server/lib/pim/productSearch.js` — abstraction over SQLite full-text patterns.

Searchable: SKU, EAN, GTIN, MPN, brand, title, category.

Designed for future Elasticsearch/OpenSearch backend swap.

## Legacy Catalog

| System | Status |
|--------|--------|
| `pim_products` / PIM v1.9 | Preserved |
| `buzzard_products.json` catalog mode | Preserved |
| `/admin/catalog`, `/admin/pim-catalog` | Unchanged |

Product Core (`pim_core_*`) runs **alongside** legacy systems.

## SEO

`server/lib/pim/seoService.js` — slug, metaTitle, metaDescription, canonical, structured metadata with duplicate slug prevention.

## Media

`server/lib/pim/mediaService.js` — image, video, manual, datasheet, certificate; primary image validation.

## Variants

`server/lib/pim/variantService.js` — axes: size, color, capacity, packSize, model, configuration.

Parent product → variants via `pim_core_variants`.
