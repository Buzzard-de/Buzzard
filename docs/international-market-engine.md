# Buzzard International Market Engine

Central infrastructure for country → language → currency → VAT → shipping → payment → marketplace → supplier routing across all 35 Buzzard markets.

## Architecture

```
global_countries_35.json (SSOT)
        ↓
market_country_overlay.json (tax, delivery metadata)
        ↓
market_engine_extensions.json (regions, flags, marketplaces)
        ↓
Market Registry (lib/market-engine/registry.ts)
        ↓
Market Engine APIs (vat, price, shipping, payment, …)
        ↓
BuzzardMarketContext (React) / marketEngineRegistry.js (server)
        ↓
Services & UI
```

**Rule:** Do not scatter `if (country === "DE")` across the codebase. Always resolve through the registry.

## Market Registry

- **Source:** `data/global/global_countries_35.json` — exactly 35 markets, no duplicate country list.
- **Overlay:** `data/global/market_country_overlay.json` — VAT rates, delivery hints.
- **Extensions:** `data/global/market_engine_extensions.json` — shipping/payment/legal regions, feature flags, marketplaces.

Each market resolves to a `MarketConfig` with:

| Field | Description |
|-------|-------------|
| `countryCode` | ISO 3166-1 alpha-2 |
| `defaultLanguage` / `supportedLanguages` | Integrated with i18n (`lib/i18n/international`) |
| `currency` / `currencySymbol` | From global registry |
| `vat` | Standard rate, include/exclude model |
| `shippingRegion` | Technical routing group (e.g. `EU_CENTRAL`, `GCC`) |
| `paymentRegion` | Payment capability group (`EU`, `TR`, `GCC`, `MENA`) |
| `legalRegion` / `returnRegion` | Legal/returns jurisdiction key |
| `status` | `PLANNED` \| `TESTING` \| `ACTIVE` \| `PAUSED` \| `DISABLED` |
| `featureFlags` | Per-capability rollout flags |
| `marketplaces` | Supported marketplaces (not claiming live integration) |

## Market Context

```tsx
import { useBuzzardMarket } from "@/lib/market-engine";

const { market, currency, vat, shippingRegion } = useBuzzardMarket();
```

`BuzzardMarketProvider` wraps inside existing `MarketProvider` in `ShopProviders.tsx`. It reads the selected country from the legacy market context and exposes the full engine config.

## VAT Context

`getVatContext({ sellerCountry, buyerCountry, customerType, vatId? })` returns:

```ts
{ rate, included, reverseCharge, reason }
```

Supports architectural distinction for:

- B2C / B2B
- Domestic / intra-EU / export / cross-border
- Reverse charge (B2B + valid VAT ID format — VIES validation prepared, not integrated)

**Important:** This is an architecture placeholder, not tax advice. Replace the rule base with juridically maintained data.

## Currency & Price

- Uses `Intl.NumberFormat` via `formatCurrencyIntl()`.
- Money calculations use integer minor units (`lib/market-engine/money.ts`) to avoid floating-point drift.
- `calculateDisplayPrice()` returns `{ netPrice, vatAmount, grossPrice, currency, formatted }`.

## Shipping

Shipping regions are **technical routing groups**, not final shipping prices:

| Example | Region |
|---------|--------|
| Germany | `EU_CENTRAL` |
| France | `EU_WEST` |
| Poland | `EU_EAST` |
| Turkey | `NON_EU` |
| Saudi Arabia | `GCC` |
| Egypt | `MENA` |

Capabilities prepared: `standard`, `express`, `free`, `pickup`, `supplier_direct`, `dropshipping`.

Buzzard model: **supplier → customer**, dropshipping-first.

## Payment

Payment capabilities by region (capability layer only — no provider integration unless already in project):

| Region | Methods |
|--------|---------|
| EU | card, sepa, paypal, klarna |
| TR / GCC / MENA | card (+ regional providers later) |

## Marketplace

Marketplace entries use lifecycle status:

- `supported` — known marketplace for market
- `configured` — settings present
- `connected` — API credentials
- `active` — live listing sync

Current entries are `supported` only.

## Supplier Region

`getEligibleSupplierRegions(market)` returns ordered preference list:

- EU customer → `[EU]`
- GCC customer → `[GCC, EU]`
- Turkey → `[TR, EU]`
- Egypt → `[MENA, EU]`

No concrete supplier selection — routing foundation only.

## Product Availability

`isProductAvailableInMarket(product, countryCode)` checks:

- Market active status
- `countryAvailability` map
- `countryRestrictions`
- Stock status (basic)

Future: category, supplier, legal, marketplace filters.

## Security

Client country/market selection **must not** be trusted for:

- VAT determination
- Final price
- Shipping eligibility
- Legal eligibility

Server mirror: `server/core/marketEngineRegistry.js` — use `validateMarketRequest()` and re-run VAT/availability on API routes.

## Extension Points

1. Replace VAT rule base with maintained legal data
2. Integrate VIES for B2B VAT ID validation
3. Add payment provider adapters per `paymentRegion`
4. Connect marketplace sync per `MarketplaceCapability.status`
5. Wire supplier selection to `getEligibleSupplierRegions()`
6. Expand admin UI using `getMarketEngineAdminOverview()`

## API Reference

| Function | Description |
|----------|-------------|
| `getMarket(countryCode)` | Full `MarketConfig` |
| `getDefaultMarket()` | Default (DE) |
| `getMarketLanguages(countryCode)` | Supported languages |
| `getMarketCurrency(countryCode)` | Currency code + symbol |
| `getMarketVat(countryCode)` | VAT rules |
| `getMarketShippingRegion(countryCode)` | Shipping routing group |
| `getMarketPaymentCapabilities(countryCode)` | Payment methods |
| `getMarketplaces(countryCode)` | Marketplace capabilities |
| `getEligibleSupplierRegions(countryCode)` | Supplier region preference |
| `isProductAvailableInMarket(product, countryCode)` | Availability check |
| `calculateDisplayPrice(input, options?)` | Price breakdown |
| `getVatContext(input)` | VAT context |

## Admin

`getMarketEngineAdminOverview()` returns rows for admin dashboards:

Country, languages, currency, VAT rate, shipping region, payment capabilities, marketplaces, status.

## Tests

```bash
npm run test:market-engine
```

Vitest: `lib/market-engine/marketEngine.test.ts`  
Node: `server/__tests__/marketEngine.test.mjs`
