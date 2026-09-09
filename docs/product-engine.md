# Buzzard Product Engine

Central product SSOT layer built on top of existing PIM, canonical model, and static catalog — not a competing product system.

## Architecture

```
SUPPLIER DATA (API / XML / CSV / MANUAL)
        ↓
normalizeSupplierProduct() → PIM supplierProductNormalizer
        ↓
Product Engine (lib/product-engine)
        ↓
Market Engine → Pricing → Marketplace → Customer
```

**Authority hierarchy:**
1. PIM Core (`server/lib/pim/*`) — persistent master
2. Canonical model (`server/lib/global/productCanonicalModel.js`) — contract
3. Product Engine (`lib/product-engine/*`) — unified TS facade + orchestration
4. Static catalog (`lib/products/*`) — storefront read replica

## Product Model

`ProductEngineProduct` extends existing `BuzzardProduct` fields via adapter — no duplicate database.

Key fields: `productId`, `sku`, `ean/gtin/mpn`, `brand`, `categoryId`, `status`, `technicalData`, `translations`, `supplierOffers[]`, `pricing`, `stock`, `availability[]`, `compatibility[]`, `seo[]`.

## Product Status

`DRAFT` → `PENDING_REVIEW` → `ACTIVE` ↔ `PAUSED` / `OUT_OF_STOCK` → `DISCONTINUED` → `ARCHIVED`

Stock 0 → `OUT_OF_STOCK`. Restock → `ACTIVE` unless manually `DISCONTINUED`.

## Translations

Separate from i18n UI catalogs. Uses `ProductTranslation` per locale. Technical values stay in `technicalData` — never in translations. Integrates with `lib/i18n/international/productTranslation.ts`.

## Technical Data

Locale-independent key/value store (viscosity, API, ACEA, diameter, etc.). Validated via `validateTechnicalConsistency()`.

## Automotive Compatibility

`AutomotiveCompatibility` model with TecDoc-ready export (`adapterMode: MOCK`). No live TecDoc API.

## Supplier Offers

Multi-supplier via `supplierOffers[]`. `selectBestSupplier()` uses deterministic scoring (stock, price, lead time, reliability, margin, region).

## Pricing

`ProductPricing`: supplierCost, shippingCost, marketplaceFee, paymentFee, vat, margin, customerPrice. Compatible with Market Engine `calculateDisplayPrice()`.

## Market Availability

Per-country `availability[]` entries. Delegates to Market Engine `isProductAvailableInMarket()` for market-level checks.

## Category

Uses `categoryId` / `subcategoryId` only — category names resolved via existing category i18n system.

## Images

Typed images: MAIN, GALLERY, TECHNICAL, PACKAGING. URLs sanitized via `sanitizeImageUrl()`.

## SEO

Locale-specific `seoTitle`, `seoDescription`, `slug` per market language.

## Ingestion

`ingestSupplierProduct()` pipeline:
1. Normalization (PIM normalizer)
2. Engine mapping
3. Duplicate detection
4. Validation
5. Registry upsert

## Validation

`validateProduct()` checks SKU, brand, category, supplier, price, translations, technical data, images. Invalid → `PENDING_REVIEW`.

## Duplicate Detection

Priority: EAN/GTIN → MPN/OEM → brand+MPN → normalized attributes. Supports multi-supplier same product.

## Stock

Supplier stock is source of truth (dropshipping model). Buzzard does not require own warehouse stock.

## Events

In-memory event log: PRODUCT_CREATED, PRODUCT_UPDATED, SUPPLIER_PRICE_UPDATED, etc. Wraps existing PIM audit for persistence path.

## Snapshot

`createProductSnapshot()` captures order-critical fields + VAT context for immutable order records.

## Security

`sanitizeClientProductUpdate()` strips untrusted client mutations to price, stock, supplier, VAT. Server mirror: `server/core/productEngineRegistry.js`.

## API

| Function | Description |
|----------|-------------|
| `getProduct(id)` | By productId |
| `getProductBySku(sku)` | By SKU |
| `getProductByEan(ean)` | By EAN |
| `searchProducts(query)` | Text search |
| `getProductsByCategory(categoryId)` | Category filter |
| `getProductsForMarket(countryCode)` | Market-filtered |
| `createProduct()` / `updateProduct()` | CRUD |
| `validateProduct()` | Validation |
| `normalizeSupplierProduct()` | Supplier normalization |
| `updateProductSupplierOffer()` | Price/stock update |
| `selectBestSupplier()` | Supplier selection |
| `isProductAvailableInMarket()` | Availability |
| `createProductSnapshot()` | Order snapshot |

## Admin

`getProductEngineAdminOverview()` — product, suppliers, stock, pricing, markets, status rows.

## Tests

```bash
npm run test:product-engine
```

Fixtures: Michelin 225/45 R17, 5W-30 oil, brake disc 280mm, brake pads.

## Extension Points

1. Wire registry to PIM SQLite reads/writes
2. Connect event facade to `productAudit.js`
3. TecDoc connector when credentials available
4. VIES-validated B2B pricing via Market Engine
5. Marketplace sync per selected supplier
