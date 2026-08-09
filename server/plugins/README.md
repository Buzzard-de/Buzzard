# Buzzard API Plugins

Dieser Ordner enthält Plugins für die lokale Buzzard API.

## Struktur

- `plugins/` enthält einzelne Plugin-Module.
- Jedes Plugin exportiert eine `register(app)` Funktion.

## Beispiel

```js
module.exports = {
  register(app) {
    app.get('/api/hello', (req, res) => {
      res.json({ message: 'Hello from plugin' });
    });
  }
};
```

## Kontakt-Speicher-Plugin

Das Projekt enthält jetzt ein Plugin, das Kontaktanfragen speichert:

- `POST /api/contact` speichert alle Anfragen in `server/data/submissions.json`
- `GET /api/submissions` gibt alle gespeicherten Anfragen zurück

## Product Data Plugin

Das Projekt enthält jetzt ein Produktdaten-Plugin mit folgenden Endpunkten:

- `GET /api/plugin/products` — listet alle Produkte
- `GET /api/plugin/products/:id` — zeigt Details zu einem Produkt

## SQLite Database Plugin (v0.3)

The `databasePlugin.js` module adds a SQLite-backed commerce API using `better-sqlite3`:

- Database file: `server/data/buzzard.db` (auto-created and seeded)
- Disable with `BUZZARD_DB_ENABLED=0`

Auth and catalog:

- `POST /api/auth/register` — register customer (JWT)
- `POST /api/auth/login` — login (JWT)
- `GET /api/me` — current SQLite user profile
- `GET /api/categories` — list categories
- `GET /api/products` — list products (`?q=`, `?category=`)
- `GET /api/products/:id` — product detail
- `POST /api/cart/items`, `GET /api/cart`, `DELETE /api/cart/items/:productId`

SQLite orders and admin (prefixed to avoid conflicts with JSON checkout):

- `POST /api/db/orders` — create order from authenticated cart
- `GET /api/db/orders` — list authenticated user's SQLite orders
- `GET /api/db/admin/orders` — admin order list (JWT admin role)
- `GET /api/db/admin/products` — admin product list
- `PATCH /api/db/admin/products/:id` — update product
- `POST /api/db/admin/shipments` — create mock shipment
- `GET /api/db/status` — SQLite backend status
- `GET /api/orders` — v0.4 alias for authenticated order list (JWT)

Environment variables:

- `JWT_SECRET` or `AUTH_SECRET` — JWT signing secret
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` — bootstrap admin user
- `BUZZARD_DB_ENABLED=1` — enable SQLite plugin (default)

See `server/docs/schema-notes.md` for production schema expansion notes.

## Commercial Integrations Plugin (v0.5)

The `commercialIntegrationsPlugin.js` module adds production-oriented adapter boundaries:

- `GET /api/admin/integrations` — credential/config status (admin auth)
- `POST /api/payments/session` — Stripe/PayPal/Klarna adapter boundary
- `POST /api/shipping/label` — DHL/DPD/GLS/UPS label adapter boundary
- `POST /api/tax/quote` — VAT/tax calculation boundary
- `GET /api/fx/rate` — exchange-rate boundary
- `POST /api/suppliers/import` — supplier feed import boundary
- `POST /api/tecdoc/compatibility` — TecDoc compatibility boundary
- `POST /api/dropship/forward` — dropshipping order forwarding boundary
- `POST /api/webhooks/:provider` — webhook stub (501 until configured)

Disable with `BUZZARD_COMMERCIAL_INTEGRATIONS=0`. Adapter logic lives in `server/lib/commercialIntegrations.js`.

## Order Automation Plugin (v0.6)

The `orderAutomationPlugin.js` module orchestrates payment, fulfillment, shipping and supplier flows:

- `GET /api/admin/automation-status` — jobs, events, order-flow aggregates
- `POST /api/automation/order-created` — queue payment + fulfillment jobs
- `POST /api/webhooks/payment` — idempotent payment webhook model
- `POST /api/admin/shipment-created` — mark order shipped + tracking
- `POST /api/admin/supplier-result` — supplier/dropship status update
- `GET /api/admin/jobs`, `POST /api/admin/jobs/:id/retry`
- `GET /api/admin/events` — integration event log
- `GET /api/admin/order-flow/:orderNumber` — per-order orchestration detail

Requires SQLite (`BUZZARD_DB_ENABLED=1`). Disable with `BUZZARD_ORDER_AUTOMATION=0`.
Tables: `integration_events`, `automation_jobs`, `order_flow` in `server/data/buzzard.db`.

## Supplier Hub Plugin (v0.7 → v1.6)

The `supplierHubPlugin.js` module adds supplier registry, feed sync, margins, TecDoc compatibility and v1.6 B2B sourcing:

- `GET/POST /api/admin/supplier-hub/suppliers` — supplier registry with scoring & capability flags
- `PATCH /api/admin/supplier-hub/suppliers/:id` — update supplier profile
- `GET/POST /api/admin/supplier-hub/suppliers/:id/products` — mapped supplier products
- `POST /api/admin/supplier-hub/suppliers/:id/sync` — JSON/XML feed sync (demo parser)
- `POST /api/admin/supplier-hub/sync` — queue stock/price/catalog sync jobs for all active suppliers
- `GET /api/admin/supplier-hub/sync-jobs` — sync job queue
- `POST /api/admin/supplier-hub/sync-jobs/:id/result` — worker result boundary
- `GET /api/admin/supplier-hub/sourcing/search` — supplier selection engine
- `POST/GET /api/admin/supplier-hub/supplier-orders` — dropship order queue
- `GET /api/admin/supplier-hub/sync-runs` — feed sync history
- `GET /api/admin/supplier-hub/margins` — cost vs sell margin view
- `GET /api/vehicles` — vehicle selector data (public)
- `POST /api/vehicles/seed` — seed demo vehicles (admin)
- `POST /api/tecdoc/compatibility/link` — link SKU to vehicle (auth required)
- `GET /api/tecdoc/compatibility/:sku` — compatibility rows for SKU
- `GET /api/tecdoc/compatibility/vehicle/:vehicleId` — compatible SKUs for vehicle

Requires SQLite (`BUZZARD_DB_ENABLED=1`). Disable with `BUZZARD_SUPPLIER_HUB=0`.
Tables: `suppliers`, `supplier_products`, `sync_runs`, `supplier_sync_jobs`, `supplier_orders`, `vehicles`, `compatibility`, `sync_errors`.
Frontend admin: `/admin/supplier-hub/`.

## Catalog SEO Plugin (v0.8)

The `catalogSeoPlugin.js` module adds SQLite catalog management, pricing rules and SEO endpoints:

- `GET /api/catalog/categories` — active categories with slugs
- `GET /api/catalog/products` — search/filter (`?q=`, `?category=`, price range)
- `GET /api/catalog/products/slug/:slug` — product detail + images
- `GET /api/catalog/products/:id/jsonld` — structured Product JSON-LD
- `GET /api/catalog/sitemap.xml`, `/api/catalog/robots.txt` — SEO feed endpoints
- `GET/POST /api/admin/catalog/products` — admin product list/create
- `PATCH /api/admin/catalog/products/:id` — update/deactivate products
- `POST /api/admin/catalog/products/bulk-price` — margin-based bulk repricing
- `POST /api/admin/catalog/products/:id/images` — product image URLs
- `POST /api/admin/catalog/categories` — create category

Requires SQLite (`BUZZARD_DB_ENABLED=1`). Disable with `BUZZARD_CATALOG_SEO=0`.
Extended columns on `products`/`categories`; tables `product_images`, `product_audit`.

Environment: `PUBLIC_BASE_URL`, `DEFAULT_MARGIN`, `MIN_MARGIN`.

## Localization Feeds Plugin (v0.9)

The `localizationFeedsPlugin.js` module adds multilingual catalog, country pricing and merchant feeds:

- `GET /api/localization/locales` — supported locale/country/currency list
- `GET /api/localization/country/:country` — tax, shipping and locale config
- `GET /api/localization/catalog` — localized product catalog (`?locale=`, `?country=`, filters)
- `GET /api/localization/products/slug/:slug` — localized product detail
- `GET /api/localization/feed/google.xml` — Google Merchant RSS feed
- `GET /api/admin/localization/status` — admin overview
- `POST /api/admin/localization/products/:id/translation` — upsert translation
- `POST /api/admin/localization/products/:id/price` — locale price override
- `POST /api/admin/localization/shipping-rate` — shipping rate table

Requires SQLite (`BUZZARD_DB_ENABLED=1`). Disable with `BUZZARD_LOCALIZATION_FEEDS=0`.
Tables: `locales`, `product_translations`, `category_translations`, `price_overrides`, `shipping_rates`, `tax_rates`.

## Customer Checkout Plugin (v1.0)

The `customerCheckoutPlugin.js` module adds address book, checkout drafts, shipping methods, coupons, wishlist, reviews and notifications:

- `GET /api/customer/shipping-methods/:country` — country shipping options
- `GET /api/customer/profile` — profile, addresses, wishlist (JWT)
- `POST/DELETE /api/customer/addresses` — address book (JWT)
- `POST/DELETE /api/customer/wishlist/:productId` — wishlist (JWT)
- `POST /api/customer/reviews`, `GET /api/customer/products/:id/reviews` — product reviews
- `POST /api/customer/coupons/validate` — coupon validation
- `PUT/GET /api/customer/checkout/draft` — persisted checkout draft (JWT)
- `POST /api/customer/checkout/quote` — subtotal/discount/shipping/tax quote
- `GET /api/customer/notifications` — customer notifications (JWT)
- `GET /api/admin/customer-checkout/status` — admin overview
- `GET/PATCH /api/admin/customer-checkout/reviews` — review moderation
- `GET/POST /api/admin/customer-checkout/coupons` — coupon management

Requires SQLite (`BUZZARD_DB_ENABLED=1`). Disable with `BUZZARD_CUSTOMER_CHECKOUT=0`.
Tables: `coupons`, `wishlists`, `reviews`, `notifications`, `checkout_drafts`, `shipping_methods`.

## Customer Support Plugin (v1.1)

The `customerSupportPlugin.js` module adds support tickets, order tracking timeline and notification queue boundaries:

- `POST/GET /api/customer/support/tickets` — create/list support tickets (JWT)
- `GET /api/customer/support/tickets/:id` — ticket detail + messages
- `POST /api/customer/support/tickets/:id/messages` — customer reply
- `GET /api/customer/orders/:orderNumber/tracking` — shipment timeline
- `GET /api/admin/customer-support/status` — admin overview
- `GET/PATCH /api/admin/customer-support/tickets` — ticket queue + status
- `POST /api/admin/customer-support/tickets/:id/reply` — admin reply
- `POST /api/admin/customer-support/tracking-event` — add tracking event
- `POST /api/admin/customer-support/notifications/email|whatsapp` — queue outbound notifications
- `GET /api/admin/customer-support/templates` — canned response templates

Requires SQLite (`BUZZARD_DB_ENABLED=1`). Disable with `BUZZARD_CUSTOMER_SUPPORT=0`.
Tables: `tickets`, `ticket_messages`, `tracking_events`, `support_templates` (+ extended `notifications` columns).

## CRM Loyalty Plugin (v1.2)

The `crmLoyaltyPlugin.js` module adds CRM profiles, loyalty points, rewards, segments, offers and cart recovery:

- `GET/PUT /api/customer/crm/profile` — CRM profile + consent fields (JWT)
- `GET /api/customer/loyalty` — points, ledger, rewards catalog
- `POST /api/customer/loyalty/redeem` — redeem reward for personalized offer code
- `POST /api/customer/cart/abandoned|recovered` — abandoned cart tracking
- `GET /api/customer/offers` — active personalized offers
- `GET /api/admin/crm-loyalty/status` — admin overview
- `GET /api/admin/crm-loyalty/segments|abandoned-carts|offers|loyalty` — CRM dashboards
- `POST /api/admin/crm-loyalty/points/earn` — manual/admin points credit
- `POST /api/admin/crm-loyalty/recovery-campaigns/queue` — queue cart recovery campaigns

Requires SQLite (`BUZZARD_DB_ENABLED=1`). Disable with `BUZZARD_CRM_LOYALTY=0`.
Tables: `crm_profiles`, `loyalty_accounts`, `loyalty_ledger`, `rewards`, `customer_segments`, `customer_segment_members`, `offers`, `abandoned_carts`, `recovery_campaigns`.

## Analytics Dashboard Plugin (v1.3)

The `analyticsDashboardPlugin.js` module adds SQLite-backed executive KPIs, funnel and attribution analytics:

- `POST /api/analytics/events` — consent-aware event ingestion boundary
- `GET /api/admin/analytics-dashboard/status` — admin overview
- `GET /api/admin/analytics-dashboard/summary` — revenue, AOV, conversion KPIs
- `GET /api/admin/analytics-dashboard/daily` — daily revenue series
- `GET /api/admin/analytics-dashboard/countries|categories|products|sources` — breakdowns
- `GET /api/admin/analytics-dashboard/funnel` — conversion funnel metrics

Requires SQLite (`BUZZARD_DB_ENABLED=1`). Disable with `BUZZARD_ANALYTICS_DASHBOARD=0`.
Tables: `analytics_orders`, `analytics_events`, `analytics_customers`.
Does not replace the JSON-based `/api/admin/analytics/*` engine in `analyticsPlugin.js`.

## Marketing Center Plugin (v1.4)

The `marketingCenterPlugin.js` module adds campaign management, UTM tracking, and ad platform adapter boundaries:

- `POST /api/marketing-center/events` — UTM-aware marketing event ingestion
- `POST /api/marketing-center/conversion` — campaign conversion attribution
- `GET /api/marketing-center/campaign/:slug` — campaign landing URL by UTM slug
- `GET /api/admin/marketing-center/summary` — spend, revenue, ROAS KPIs
- `GET /api/admin/marketing-center/campaigns` — campaign list with ROAS
- `POST /api/admin/marketing-center/campaigns` — create campaign
- `POST /api/admin/marketing-center/campaigns/:id/spend` — record ad spend
- `GET /api/admin/marketing-center/channels|utm|providers` — channel and UTM breakdowns
- `PATCH /api/admin/marketing-center/providers/:provider` — toggle provider adapter (demo)

Requires SQLite (`BUZZARD_DB_ENABLED=1`). Disable with `BUZZARD_MARKETING_CENTER=0`.
Tables: `marketing_campaigns`, `marketing_campaign_spend`, `marketing_campaign_conversions`, `marketing_center_events`, `marketing_provider_connections`.
Frontend admin: `/admin/marketing-center/`. Set `NEXT_PUBLIC_MARKETING_CENTER=1`.

## Marketplace Hub Plugin (v1.5)

The `marketplaceHubPlugin.js` module adds multi-channel marketplace operations:

- `GET /api/admin/marketplace-hub/marketplaces` — channel connections with listing/job counts
- `PATCH /api/admin/marketplace-hub/marketplaces/:code` — connect/disconnect channel (demo)
- `POST /api/admin/marketplace-hub/sync/stock|prices|orders` — queue sync jobs
- `POST /api/admin/marketplace-hub/listings` — upsert channel listing
- `POST /api/admin/marketplace-hub/sku-map` — SKU/channel mapping
- `GET /api/admin/marketplace-hub/sync-jobs|channel-orders` — sync logs and imported orders
- `POST /api/admin/marketplace-hub/sync-jobs/:id/result` — worker result boundary
- `POST /api/marketplace-hub/order-webhook` — marketplace order import webhook

Requires SQLite (`BUZZARD_DB_ENABLED=1`). Disable with `BUZZARD_MARKETPLACE_HUB=0`.
Tables: `marketplace_channels`, `marketplace_listings`, `marketplace_sync_jobs`, `marketplace_channel_orders`, `marketplace_sku_mappings`.
Frontend admin: `/admin/marketplace-hub/`. Set `NEXT_PUBLIC_MARKETPLACE_HUB=1`.

## Logistics Fulfillment Plugin (v1.7)

The `logisticsFulfillmentPlugin.js` module adds carrier-based shipping, label jobs, tracking and RMA returns:

- `GET /api/logistics-fulfillment/shipping/options/:country` — shipping services by destination
- `POST /api/admin/logistics-fulfillment/shipments/quote` — quote cheapest service for weight/country
- `POST /api/admin/logistics-fulfillment/shipments` — create shipment + label fulfillment job
- `POST /api/admin/logistics-fulfillment/shipments/:id/label-result` — carrier label callback
- `GET /api/admin/logistics-fulfillment/shipments|carriers|jobs|returns` — admin operations
- `PATCH /api/admin/logistics-fulfillment/returns/:id` — approve/update RMA
- `GET /api/logistics-fulfillment/shipments/:orderNumber/tracking` — customer tracking timeline
- `POST /api/logistics-fulfillment/carrier/webhook` — carrier status webhook
- `POST|GET /api/logistics-fulfillment/returns` — customer RMA requests

Requires SQLite (`BUZZARD_DB_ENABLED=1`). Disable with `BUZZARD_LOGISTICS_FULFILLMENT=0`.
Tables: `logistics_carriers`, `logistics_shipping_services`, `logistics_shipments`, `logistics_tracking_events`, `logistics_fulfillment_jobs`, `logistics_returns`.
Frontend admin: `/admin/logistics-fulfillment/`. Set `NEXT_PUBLIC_LOGISTICS_FULFILLMENT=1`.

## WMS Inventory Plugin (v1.8)

The `wmsInventoryPlugin.js` module adds warehouse management and inventory control:

- `GET|POST /api/admin/wms-inventory/warehouses` — warehouse registry
- `POST /api/admin/wms-inventory/locations` — bin/location setup
- `GET /api/admin/wms-inventory/inventory|low-stock|movements|jobs` — stock overview
- `POST /api/admin/wms-inventory/inventory/movement` — goods in/out/damage
- `POST /api/admin/wms-inventory/inventory/reserve` — order reservations
- `POST /api/admin/wms-inventory/jobs|transfers|stocktakes` — pick/pack jobs, transfers, cycle counts
- `POST /api/wms-inventory/scan` — barcode lookup

Requires SQLite (`BUZZARD_DB_ENABLED=1`). Disable with `BUZZARD_WMS_INVENTORY=0`.
Tables: `wms_warehouses`, `wms_locations`, `wms_inventory`, `wms_stock_movements`, `wms_reservations`, `wms_warehouse_jobs`, `wms_transfers`, `wms_stocktakes`.
Frontend admin: `/admin/wms-inventory/`. Set `NEXT_PUBLIC_WMS_INVENTORY=1`.

## PIM Catalog Plugin (v1.9)

The `pimCatalogPlugin.js` module adds central product information management:

- `GET /api/pim-catalog/categories|brands|products|feed` — public catalog and marketplace feed
- `GET /api/pim-catalog/products/:sku` — full product graph (translations, attributes, variants, media, SEO)
- `POST|PATCH /api/admin/pim-catalog/products` — master product CRUD
- `POST /api/admin/pim-catalog/translations|attributes|media|seo|variants` — enrich product data
- `GET /api/admin/pim-catalog/completeness|import-jobs` — completeness KPIs and import queue
- `POST /api/admin/pim-catalog/import` — bulk import job boundary

Requires SQLite (`BUZZARD_DB_ENABLED=1`). Disable with `BUZZARD_PIM_CATALOG=0`.
Tables: `pim_categories`, `pim_brands`, `pim_products`, `pim_product_translations`, `pim_product_attributes`, `pim_product_variants`, `pim_product_media`, `pim_product_seo`, `pim_catalog_import_jobs`.
Frontend admin: `/admin/pim-catalog/`. Set `NEXT_PUBLIC_PIM_CATALOG=1`.
Note: Existing `/admin/catalog/` (Catalog SEO v0.8) remains separate.

## Plugin hinzufügen

Neue Plugins kannst du so anlegen:

1. Erstelle eine Datei in `server/plugins/`, z. B. `myPlugin.js`
2. Exportiere die `register(app)` Funktion:

```js
module.exports = {
  register(app) {
    app.get('/api/plugin/example', (req, res) => {
      res.json({ message: 'Example plugin response' });
    });
  }
};
```

3. Starte den Server neu. Das Plugin wird automatisch geladen.
