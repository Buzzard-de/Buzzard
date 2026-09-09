# Buzzard Pricing & Margin Engine

Central deterministic pricing infrastructure for customer selling prices across products, supplier offers, markets, channels, and marketplaces.

Built on top of:
- Product Engine (`lib/product-engine/`)
- Supplier Integration Engine (`lib/supplier-engine/`)
- Market Engine (`lib/market-engine/`)
- PIM canonical model

No second product database. No second VAT engine. No AI pricing.

## Architecture

```
Supplier Offer
    ↓
Supplier Cost (server-trusted)
    ↓
Shipping Cost (dropshipping, supplier-direct)
    ↓
Marketplace / Payment Fees
    ↓
Return & Refund Cost Reserve
    ↓
Target Margin (contribution margin on revenue)
    ↓
Pricing Engine
    ↓
VAT (Market Engine)
    ↓
Rounding Rules
    ↓
Customer Selling Price
```

## Pricing Formula

```
totalVariableCost =
  supplierCost
  + shippingCost
  + marketplaceFee
  + paymentFee
  + returnCostReserve
  + refundCostReserve

customerNetPrice = totalVariableCost / (1 - targetMarginPercent)

VAT applied separately via Market Engine getVatContext()

customerGrossPrice = customerNetPrice + VAT

Rounding applied to gross; margin recalculated after rounding
```

**Important:** Contribution margin uses revenue-based math:

```
margin = (customerNetPrice - totalVariableCost) / customerNetPrice
```

NOT simple markup: `cost × (1 + margin)`.

## Module Structure

| Module | Purpose |
|--------|---------|
| `types.ts` | Canonical pricing model, snapshots, audit |
| `registry.ts` | Fee schedules, exchange rates, margin rules |
| `cost.ts` | Supplier cost from trusted offers |
| `currency.ts` | Deterministic FX conversion (integer minor units) |
| `vat.ts` | Delegates to Market Engine VAT |
| `shipping.ts` | Dropshipping cost estimation |
| `fees.ts` | Marketplace + payment fees |
| `returns.ts` | Return/refund cost reserve |
| `margin.ts` | Target/minimum margin calculation |
| `rules.ts` | Rounding + price bounds |
| `price.ts` | Central `calculatePrice()` |
| `snapshot.ts` | Immutable order-time snapshots |
| `security.ts` | Client write protection |
| `observability.ts` | Audit log + metrics |
| `admin.ts` | Admin overview rows |

## VAT Handling

Reuses `getVatContext()` from Market Engine. Supports B2C, B2B, intra-EU reverse charge, domestic VAT.

Customer price clearly separates:
- `customerNetPrice`
- `customerVat`
- `customerGrossPrice`

## Return / Refund Reserve

Financial risk-management layer — NOT a legal assumption.

```
Expected Return Cost =
  returnRate × (returnShipping + supplierCost × (1 - supplierReturnAcceptanceRate))

Expected Refund Cost =
  refundRate × (averageRefundLoss + supplierCost × (1 - supplierReturnAcceptanceRate))
```

Visible flow:
```
Customer Refund → Supplier Credit → Return Shipping → Marketplace Refund → Buzzard Loss
```

Money paid to supplier is NOT assumed to return automatically.

## Multi-Market Pricing

Price key: `product + supplier offer + market + channel`

Same product can have different prices in DE/EUR, PL/PLN, TR/TRY, SA/SAR, etc.

Currency conversion uses deterministic test rates in `data/global/pricing_engine_extensions.json`.

## Multi-Marketplace Pricing

Separate calculated prices per channel:
- `direct` — Buzzard store
- `amazon`, `ebay`, `kaufland`, `allegro`, `bol`, `cdiscount`, `otto`

Marketplace fees are configurable per marketplace — no hardcoded live commission rates.

## Price Snapshots

`createPriceSnapshot(result)` captures immutable order-time pricing. Historical orders retain their snapshot when supplier prices or rules change later.

## Security

Server-only fields (never client-writable):
- supplierCost, shippingCost, marketplaceFee, paymentFee
- returnReserve, targetMargin, calculatedPrice, margin

Server mirror: `server/core/pricingEngineRegistry.js`

## Product Engine Integration

`lib/product-engine/pricing.ts` delegates to `calculatePrice()` for `recalculatePricingFromBestOffer()`.

Supplier selection remains in Product/Supplier Engine — Pricing Engine calculates price for the selected offer.

## Competitive Pricing Extension

Extension points prepared (disabled):
- `competitorPrice`
- `marketAveragePrice`
- `lowestMarketPrice`
- `recommendedCompetitivePrice`

No web scraping or external APIs in foundation.

## Test Fixtures

| Product | Supplier Cost | Shipping |
|---------|--------------|----------|
| 225/45 R17 Reifen | €60 | €10 |
| 5W-30 Motoröl | €30 | €7 |
| 280mm Bremsscheibe | €40 | €8 |
| Bremsbeläge | €25 | €6 |

Run: `npm run test:pricing-engine`

## Known Limitations

- No live exchange-rate APIs
- No real marketplace API integrations
- No AI pricing optimization
- Shipping costs use configurable tables, not live carrier rates
- Fee schedules use test fixtures, not live commercial contracts

## Extension Points

1. Insert real marketplace fee schedules into `pricing_engine_extensions.json`
2. Wire live FX rates when infrastructure available
3. Connect carrier rate APIs for shipping
4. Add competitive pricing layer on top of cost-based foundation
5. Enable AI optimization as optional overlay (never replacing deterministic base)
