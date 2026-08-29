# Legacy → PIM Migration (Part 8)

## Tool

`server/lib/commerce/legacyPimMigration.js`

Admin: `GET /api/admin/commerce/migration/legacy-pim`

## Source

- `server/data/buzzard_categories.json` (legacy JSON catalog)

## Part 8 scope

- **Dry-run only** — no destructive migration
- Duplicate SKU detection against PIM Core
- Mapping report: would-import / duplicates / skipped

## Mapping

Legacy product → PIM fields:

- `sku` / `id` → `sku`
- `name` / `title` → `title`
- `ean` → `ean`
- category node → `taxonomy_category_id`

Run full migration only after review in a future part.
