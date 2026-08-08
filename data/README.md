# Buzzard Data Packages

| Package | Files | Purpose |
|---------|-------|---------|
| 01 | `buzzard_categories.json` | Category tree (41 mains) |
| 02 | `buzzard_products.json`, `buzzard_product_schema.json` | Product catalog |
| 03 | `buzzard_home_navigation_spec.json` | Home & navigation |
| 04 | `buzzard_checkout_order_spec.json` | Checkout & orders |
| 05 | `buzzard_suppliers.json`, `buzzard_supplier_category_mappings.json` | Supplier & admin |

## Package 05 — Supplier & Admin

- **Suppliers:** `data/buzzard_suppliers.json`
- **Category mapping:** supplier category → Buzzard `category_id` (master nav unchanged)
- **Admin UI:** `/admin/` (requires API backend)
- **Admin API:** `server/plugins/adminAuthPlugin.js`, `adminCatalogPlugin.js`
- **Import pipeline:** JSON / CSV / manual via `POST /api/admin/import`
- **Roles:** administrator, catalog_manager, order_manager, read_only
- **Demo users:** see `data/buzzard_admin_users.seed.json` (passwords hashed on first server start)

Set `NEXT_PUBLIC_BUZZARD_API_URL` and run `cd server && node server.js`.
