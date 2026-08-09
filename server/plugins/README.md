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

## Identity Security Plugin (v2.0)

The `identitySecurityPlugin.js` module adds customer identity and security foundations:

- `POST /api/identity-security/auth/register|login|refresh|logout|verify-email|password-reset*` — auth flows with refresh sessions
- `GET|PATCH /api/identity-security/account` — profile management
- `GET|POST|DELETE /api/identity-security/account/addresses` — extended address book
- `POST /api/identity-security/account/2fa/setup|disable` — 2FA/TOTP boundary
- `POST|GET /api/identity-security/privacy/request|requests` — GDPR export/delete requests
- `GET /api/admin/identity-security/overview|audit|sessions` — admin security dashboard

Requires SQLite (`BUZZARD_DB_ENABLED=1`). Disable with `BUZZARD_IDENTITY_SECURITY=0`.
Tables: extends `users`; adds `identity_sessions`, `identity_verification_tokens`, `identity_login_attempts`, `identity_security_audit`, `identity_privacy_requests`, `identity_addresses`.
Frontend admin: `/admin/identity-security/`. Set `NEXT_PUBLIC_IDENTITY_SECURITY=1`.
Note: Existing `/api/auth/*` (database plugin) remains separate.

## Payments Finance Plugin (v2.1)

The `paymentsFinancePlugin.js` module adds payment and financial transaction foundations:

- `GET /api/payments-finance/methods` — enabled provider methods
- `POST /api/payments-finance/intents` — create payment intent with idempotency
- `POST /api/payments-finance/intents/:id/confirm|refunds` — capture and refund flows
- `POST /api/payments-finance/webhook` — provider payment webhook boundary
- `POST /api/payments-finance/invoices` — invoice records
- `POST /api/payments-finance/provider/payout-webhook|dispute-webhook` — reconciliation boundaries
- `GET /api/admin/payments-finance/overview|payments|refunds|invoices|payouts|disputes|audit`

Requires SQLite (`BUZZARD_DB_ENABLED=1`). Disable with `BUZZARD_PAYMENTS_FINANCE=0`.
Tables: `finance_payment_providers`, `finance_payment_methods`, `finance_payment_intents`, `finance_payment_transactions`, `finance_refunds`, `finance_invoices`, `finance_payouts`, `finance_disputes`, `finance_audit`.
Frontend admin: `/admin/payments-finance/`. Set `NEXT_PUBLIC_PAYMENTS_FINANCE=1`.
Note: Existing commercial integrations (`/api/payments/session`) remain separate. Sales remain disabled on storefront.

## Order Management Plugin (v2.2)

The `orderManagementPlugin.js` module adds central order orchestration (OMS):

- `POST /api/order-management/orders` — unified order creation with idempotency
- `GET /api/order-management/orders/:orderNumber` — order detail with items, events, fulfillment links
- `GET /api/order-management/customer/:customerId/orders` — customer order history
- `GET /api/admin/order-management/overview|orders` — admin OMS dashboard
- `PATCH /api/admin/order-management/orders/:id/status|payment|fulfillment` — lifecycle updates
- `POST /api/admin/order-management/orders/:id/cancel|split|fulfillment-link|note` — cancellation, split orders, fulfillment linkage

Requires SQLite (`BUZZARD_DB_ENABLED=1`). Disable with `BUZZARD_ORDER_MANAGEMENT=0`.
Tables: `oms_orders`, `oms_order_items`, `oms_order_splits`, `oms_order_events`, `oms_order_notes`, `oms_fulfillment_links`, `oms_order_idempotency`.
Frontend admin: `/admin/order-management/`. Set `NEXT_PUBLIC_ORDER_MANAGEMENT=1`.
Note: Existing JSON checkout (`/api/orders`) and SQLite orders (`/api/db/orders`) remain separate.

## Cart Checkout Plugin (v2.3)

The `cartCheckoutPlugin.js` module adds cart and checkout foundations:

- `POST /api/cart-checkout/carts` — create cart with token
- `GET /api/cart-checkout/carts/:token` — cart with items and VAT totals
- `POST|PATCH /api/cart-checkout/carts/:token/items` — add/update line items
- `POST /api/cart-checkout/carts/:token/coupon` — apply coupon (e.g. WELCOME10)
- `GET /api/cart-checkout/shipping/:country` — EU shipping rates
- `POST /api/cart-checkout/sessions` — start checkout session
- `POST /api/cart-checkout/sessions/:token/validate|complete` — validation and payment handoff
- `GET /api/admin/cart-checkout/overview|carts|sessions|coupons|shipping-rates`

Requires SQLite (`BUZZARD_DB_ENABLED=1`). Disable with `BUZZARD_CART_CHECKOUT=0`.
Tables: `cc_carts`, `cc_cart_items`, `cc_coupons`, `cc_shipping_rates`, `cc_checkout_sessions`.
Frontend admin: `/admin/cart-checkout/`. Set `NEXT_PUBLIC_CART_CHECKOUT=1`.
Note: Existing `/api/cart/*` (database plugin) and `/api/checkout/*` (orders plugin) remain separate. Sales remain disabled on storefront.

## CRM Customer Service Plugin (v2.4)

The `crmCustomerServicePlugin.js` module adds CRM profiles and support ticket foundations:

- `POST /api/crm-customer-service/customers` — create customer profile
- `GET /api/crm-customer-service/customers/:id` — profile with tags, timeline, tickets
- `POST /api/crm-customer-service/tickets` — create support ticket
- `GET /api/crm-customer-service/tickets/:number` — ticket detail with messages and notes
- `GET /api/admin/crm-customer-service/overview|customers|tickets` — admin CRM dashboard
- `PATCH /api/admin/crm-customer-service/customers/:id` — update profile and consent fields
- `POST /api/admin/crm-customer-service/customers/:id/tags` — customer tags
- `PATCH /api/admin/crm-customer-service/tickets/:id` — status, priority, assignment
- `POST /api/admin/crm-customer-service/tickets/:id/messages|notes` — replies and internal notes

Requires SQLite (`BUZZARD_DB_ENABLED=1`). Disable with `BUZZARD_CRM_CUSTOMER_SERVICE=0`.
Tables: `crmcs_customers`, `crmcs_customer_tags`, `crmcs_customer_events`, `crmcs_tickets`, `crmcs_ticket_messages`, `crmcs_ticket_notes`.
Frontend admin: `/admin/crm-customer-service/`. Set `NEXT_PUBLIC_CRM_CUSTOMER_SERVICE=1`.
Note: Existing `/api/admin/customer-support/*` (v1.1) and `/api/admin/crm-loyalty/*` (v1.2) remain separate.

## Returns RMA Plugin (v2.5)

The `returnsRmaPlugin.js` module adds returns, refunds, exchanges and warranty foundations:

- `POST /api/returns-rma/returns` — customer return request with items
- `GET /api/returns-rma/returns/:rmaNumber` — RMA detail with items, events, labels, warranty
- `GET /api/admin/returns-rma/overview|returns` — admin RMA dashboard
- `PATCH /api/admin/returns-rma/returns/:id/status|inspection` — lifecycle and inspection
- `POST /api/admin/returns-rma/returns/:id/label|refund|exchange|warranty|note` — labels, refunds, exchanges, warranty claims

Requires SQLite (`BUZZARD_DB_ENABLED=1`). Disable with `BUZZARD_RETURNS_RMA=0`.
Tables: `rma_returns`, `rma_return_items`, `rma_return_events`, `rma_return_notes`, `rma_return_labels`, `rma_warranty_claims`.
Frontend admin: `/admin/returns-rma/`. Set `NEXT_PUBLIC_RETURNS_RMA=1`.
Note: Existing `logistics_returns` (v1.7) and JSON checkout returns remain separate.

## Marketing & Loyalty Plugin (v2.6)

The `marketingLoyaltyPlugin.js` module adds campaigns, coupons, loyalty tiers, referrals and marketing consent:

- `POST /api/marketing-loyalty/campaigns` — create campaign/coupon
- `GET /api/marketing-loyalty/campaigns` — list campaigns
- `PATCH /api/admin/marketing-loyalty/campaigns/:id` — update campaign
- `POST /api/marketing-loyalty/campaigns/:code/apply|use` — validate and record promotion usage
- `POST /api/marketing-loyalty/accounts|points` — loyalty account and points ledger
- `GET /api/marketing-loyalty/:customerId` — loyalty profile with tier and ledger
- `POST /api/marketing-loyalty/referrals/create|complete` — referral codes and rewards
- `GET|PUT /api/marketing-loyalty/preferences/:customerId` — marketing consent boundary
- `GET /api/admin/marketing-loyalty/overview` — admin marketing dashboard

Requires SQLite (`BUZZARD_DB_ENABLED=1`). Disable with `BUZZARD_MARKETING_LOYALTY=0`.
Tables: `mktloy_campaigns`, `mktloy_promotion_uses`, `mktloy_loyalty_tiers`, `mktloy_loyalty_accounts`, `mktloy_loyalty_ledger`, `mktloy_referrals`, `mktloy_marketing_preferences`.
Frontend admin: `/admin/marketing-loyalty/`. Set `NEXT_PUBLIC_MARKETING_LOYALTY=1`.
Note: Existing `/api/admin/marketing-center/*` (v1.4) and `/api/admin/crm-loyalty/*` (v1.2) remain separate.

## Reviews & Ratings Plugin (v2.7)

The `reviewsRatingsPlugin.js` module adds product reviews, moderation and rating aggregates:

- `POST /api/reviews-ratings/reviews` — submit product review with optional media metadata
- `GET /api/reviews-ratings/products/:sku/reviews` — published reviews and rating stats
- `GET /api/reviews-ratings/customers/:id/reviews` — customer review history
- `POST /api/reviews-ratings/reviews/:id/helpful|report` — helpful votes and abuse reports
- `GET /api/admin/reviews-ratings/overview|reviews` — admin review dashboard
- `PATCH /api/admin/reviews-ratings/reviews/:id/moderate` — moderation lifecycle
- `POST /api/admin/reviews-ratings/reviews/:id/reply` — seller replies
- `PATCH /api/admin/reviews-ratings/media/:id/moderate` — media moderation boundary

Requires SQLite (`BUZZARD_DB_ENABLED=1`). Disable with `BUZZARD_REVIEWS_RATINGS=0`.
Tables: `revr_reviews`, `revr_review_media`, `revr_review_votes`, `revr_review_replies`, `revr_review_reports`, `revr_product_rating_stats`.
Frontend admin: `/admin/reviews-ratings/`. Set `NEXT_PUBLIC_REVIEWS_RATINGS=1`.
Note: Existing `reviews` table (v1.0 customer checkout) remains separate.

## AI Center Plugin (v2.8)

The `aiCenterPlugin.js` module adds provider-agnostic AI orchestration foundations:

- `POST /api/ai-center/sessions|chat` — assistant sessions and intent-routed chat
- `GET /api/ai-center/sessions/:token` — session history
- `POST /api/ai-center/recommend|product-copy|translate|review-sentiment|smart-search` — AI job boundaries
- `POST /api/ai-center/jobs/:id/retry` — retry queued AI jobs
- `GET /api/admin/ai-center/overview|jobs` — admin AI dashboard

Requires SQLite (`BUZZARD_DB_ENABLED=1`). Disable with `BUZZARD_AI_CENTER=0`.
Tables: `aictr_sessions`, `aictr_messages`, `aictr_jobs`, `aictr_audit`, `aictr_prompt_versions`.
Frontend admin: `/admin/ai-center/`. Set `NEXT_PUBLIC_AI_CENTER=1`.
Note: Existing `/api/ai/chat` (aiAutomationPlugin) and storefront chat remain separate.

## Advanced Search Plugin (v2.9)

The `advancedSearchPlugin.js` module adds product discovery and search analytics foundations:

- `GET /api/advanced-search/suggest` — autocomplete suggestions
- `GET /api/advanced-search` — full-text search with filters, sorting and pagination
- `POST /api/advanced-search/:sku/click` — search click tracking
- `POST /api/admin/advanced-search/products|synonyms` — index and synonym management
- `GET /api/admin/advanced-search/overview|zero-results` — admin search dashboard

Requires SQLite (`BUZZARD_DB_ENABLED=1`). Disable with `BUZZARD_ADVANCED_SEARCH=0`.
Tables: `srch_products`, `srch_synonyms`, `srch_events`.
Frontend admin: `/admin/advanced-search/`. Set `NEXT_PUBLIC_ADVANCED_SEARCH=1`.
Note: Existing SQLite `products` catalog and storefront search remain separate. OpenSearch/Elasticsearch ready boundary.

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
