# Buzzard Data Packages

| Package | Files | Purpose |
|---------|-------|---------|
| 01 | `buzzard_categories.json` | Category tree (41 mains) |
| 02 | `buzzard_products.json`, `buzzard_product_schema.json` | Product catalog |
| 03 | `buzzard_home_navigation_spec.json`, `buzzard_homepage_navigation_spec.json` | Home & navigation |
| 04 | `buzzard_checkout_order_spec.json` | Checkout, cart, orders |

## Package 04 — Checkout & Orders

- **Frontend:** multi-step checkout, enhanced cart (variants, coupons, VAT)
- **Backend:** `server/plugins/ordersPlugin.js` — `POST /api/orders`, `GET /api/orders/:orderNumber`, `POST /api/checkout/quote`
- **Config:** set `NEXT_PUBLIC_BUZZARD_API_URL` (see `.env.example`)

Test coupons: `BUZZARD10` (10%), `WELCOME5` (5 €)
