# Buzzard Supplier Integration Engine

Production-ready connector architecture for B2B supplier feeds — no live external APIs, no real credentials.

## Architecture

```
Supplier Sources (API / XML / CSV / MANUAL)
        ↓
Supplier Connector Engine
        ↓
Fetch → Parse → Field Mapping → Normalize (PIM) → Validate → Deduplicate
        ↓
Product Engine → Supplier Offer → Market Engine → Pricing
```

## Supplier Model

Loaded from `data/buzzard_suppliers.json` + `data/global/test_supplier_feeds.json` (TEST_SUPPLIER_A).

| Field | Description |
|-------|-------------|
| `supplierId` | Unique identifier |
| `status` | DISCOVERED / TESTING / CONNECTED / ACTIVE / PAUSED / DISABLED |
| `integrationTypes` | api, xml, csv, manual |
| `capabilities` | productFeed, stockFeed, priceFeed, orderAPI, dropshipping, etc. |
| `fieldMapping` | Supplier field → Buzzard field |

Capabilities are only `true` when explicitly configured — never assumed.

## Connector Interface

```ts
class SupplierConnector {
  connect()
  disconnect()
  healthCheck()
  fetchProducts()
  fetchStock()
  fetchPrices()
  fetchOrders()    // capability-gated
  fetchTracking()  // capability-gated
}
```

Implementations: `ApiSupplierConnector`, `XmlSupplierConnector`, `CsvSupplierConnector`, `ManualSupplierConnector`.

## Field Mapping

`applyFieldMapping(raw, mapping)` transforms supplier-specific fields:

```
article_number → supplierSku
ean_code → ean
price_net → supplierPrice
stock_qty → stock
```

## Normalization

Delegates to existing `server/lib/pim/supplierProductNormalizer.js` — no second normalizer.

Product Engine `ingestSupplierProduct()` handles final persist.

## Sync Jobs

| Type | Behavior |
|------|----------|
| FULL | Fetch all products, create/update via Product Engine |
| INCREMENTAL | Same pipeline with cursor support |
| STOCK_ONLY | Update supplier offer stock only |
| PRICE_ONLY | Update supplier price, recalculate customer price via Pricing Engine |

Removed supplier products → offer marked inactive, central product preserved.

## Batch Processing

`processInBatches()` and `paginateRecords()` — configurable `batchSize`, cursor, checkpoint.

## Retry & Rate Limiting

- Exponential backoff via `withRetry()` — max 3 attempts
- Token bucket rate limiting per supplier
- 429 / rate-limit aware

## Health Check

Returns: status, latency, lastSuccessfulSync, productsFetched/Updated/Failed.

## Security

- API keys / secrets: **server only**
- `sanitizeClientSyncRequest()` blocks client price/stock/credential writes
- `redactSecrets()` in all logs
- Server mirror: `server/core/supplierEngineRegistry.js`

## Dropshipping

TEST_SUPPLIER_A configured with dropshipping, whiteLabel, blindShipping capabilities.

Flow: Customer Order → Supplier Selection → Supplier Order (dry-run) → Supplier → Customer

## Supplier Selection

`selectBestSupplierForMarket()` enriches Product Engine scoring with:
- reliability score (from sync logs, no invented history)
- connector health
- dropshipping capability

## Order API Foundation

`createSupplierOrder()`, `getSupplierOrder()`, `cancelSupplierOrder()`, `getSupplierTracking()` — dry-run only, capability-gated.

## Test Supplier

`TEST_SUPPLIER_A` with API, XML, CSV feeds for:
- Michelin 225/45 R17 tire
- 5W-30 engine oil
- Bremsscheibe 280mm
- Bremsbeläge

## Admin

`getSupplierEngineAdminOverview()` — supplier, country, integration, status, capabilities, last sync, health, products, errors.

## Tests

```bash
npm run test:supplier-engine
```

## Extension Points

1. Wire live API/XML/CSV parsers to connectors (keep dry-run default)
2. Connect sync jobs to existing `jobHandlers.js` SUPPLIER_SYNC
3. Persist cursors in DB hub (`supih_suppliers`)
4. Encrypt credentials via existing secret infrastructure
5. Enable orderAPI when supplier contract ready
