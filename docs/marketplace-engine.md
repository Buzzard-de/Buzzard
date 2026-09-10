# Buzzard Marketplace Engine

Central abstraction over all marketplace integrations.

**The current implementation does not execute real marketplace API calls, real marketplace orders, real payments, real refunds, or real carrier operations.**

Built on top of:
- Product Engine
- Supplier Integration Engine
- Pricing & Margin Engine
- Inventory & Stock Automation Engine
- Order Engine
- Market Engine

Buzzard remains the **central system of record**.

## Architecture

```
BUZZARD CORE
  Product / Supplier / Pricing / Inventory / Order / Customer
        ↓
MARKETPLACE ENGINE
  Amazon | eBay | Kaufland | Allegro | bol.com | Cdiscount | OTTO
        ↓
  Dry-Run Connectors (foundation)
```

## Connector Interface

Every marketplace implements `MarketplaceConnector`:
- `connect()` / `disconnect()` / `healthCheck()`
- `createListing()` / `updateListing()` / `pauseListing()` / `deleteListing()`
- `updatePrice()` / `updateStock()`
- `fetchOrders()` / `fetchOrder()` / `acknowledgeOrder()`
- `createShipment()` / `updateTracking()`
- `fetchReturns()` / `fetchRefunds()`

All methods use deterministic dry-run behavior.

## Product Mapping

Buzzard Product IDs map independently to marketplace listing IDs:

```
Buzzard Product 123
  → Amazon ASIN X
  → eBay Listing Y
  → Kaufland Offer Z
```

Canonical Product ID is never overwritten.

## Listing Pipeline

```
Product Engine → Mapping → Category → Attributes
  → Pricing Engine → Inventory Engine → Listing Payload → Connector (dry-run)
```

Listing statuses: DRAFT, READY, ACTIVE, PAUSED, OUT_OF_STOCK, ERROR, REVIEW_REQUIRED, DISABLED

## Price Integration

Marketplace prices come from **Pricing Engine** per channel (`amazon`, `ebay`, etc.).
Marketplace Engine does not duplicate pricing formulas.

## Stock Integration

```
Supplier Stock → Inventory Engine → Saleable Quantity → Marketplace Stock
```

Marketplace-specific policies: stock buffer, max/min published quantity.

## Order Import

```
Marketplace → Connector → Import → Order Engine → Reservation → Supplier Fulfillment
```

`MarketplaceOrderMapping` ensures idempotent imports — same marketplace order never creates duplicate Buzzard orders.

Order Engine remains the central status authority.

## Shipment & Tracking

Foundation for Order Engine → Fulfillment → Tracking → Marketplace Connector.
No real carrier APIs.

## Returns / Refunds Foundation

Future financial chain:

```
Customer / Marketplace Refund
  → Buzzard Refund
  → Supplier Credit / Supplier Refund
  → Return Shipping
  → Final Buzzard Loss / Profit
```

Do NOT assume supplier automatically refunds Buzzard.

## Webhooks

Append-only webhook events with payload hash deduplication.
Signature verification reserved for future live connectors.

## Sync Jobs

FULL_PRODUCT_SYNC, INCREMENTAL_PRODUCT_SYNC, PRICE_SYNC, STOCK_SYNC, ORDER_SYNC, SHIPMENT_SYNC, RETURN_SYNC

Reuses supplier-engine retry/rate-limit utilities.

## Multi-Market & Multi-Language

Uses existing 35-market registry and i18n product translations.
Technical values (EAN, MPN, tire size, viscosity) are never incorrectly translated.

## Security

Server-only: credentials, listing IDs, marketplace price/stock, order mappings, webhook validation, connector status.

## Admin

Foundation API: marketplace status, capabilities, health, listings, orders, returns, sync actions.

## Not Implemented (By Design)

- Real Amazon/eBay/Kaufland/Allegro/bol/Cdiscount/OTTO APIs
- Real credentials, payments, refunds, carrier APIs, live webhooks
- AI marketplace optimization, competitor scraping
- Second product/order/inventory/pricing/market/translation engines
