# Buzzard Inventory & Stock Automation Engine

Central authority for supplier availability and Buzzard saleability in a **dropshipping-first** architecture.

**Buzzard does not own physical stock in the default dropshipping architecture.**

Built on top of:
- Product Engine
- Supplier Integration Engine
- Pricing & Margin Engine
- Market Engine
- PIM canonical model

## Supplier Stock vs Buzzard Stock

| Concept | Meaning |
|---------|---------|
| Supplier quantity | Units reported by supplier feed (source of truth) |
| Buzzard physical inventory | **Always zero** — no warehouse model |
| Available quantity | Validated supplier quantity after rules |
| Saleable quantity | What Buzzard may sell after buffers and reservations |

Example:
```
Supplier A reports: 100 units
Buzzard warehouse:  0 units (not tracked)
Supplier offer available: 100
Stock buffer: 5
Saleable quantity: 95
```

## Architecture

```
Supplier Stock Feed
    ↓
Supplier Integration Engine (fetch/parse/normalize/validate)
    ↓
Inventory & Stock Engine
    ↓
Supplier Offer Availability
    ↓
Product Availability
    ↓
Market Availability
    ↓
Pricing Engine (recalculation signal only)
    ↓
Marketplace / Store Availability
```

## Saleable Quantity

```
afterBuffer = availableQuantity - stockBuffer
saleableQuantity = max(0, afterBuffer - reservedQuantity)
```

Buffer types:
- **Absolute**: subtract fixed units (e.g. 5)
- **Percentage**: subtract percentage (e.g. 10%)

## Stale Stock Protection

If `lastSuccessfulSync` exceeds `staleAfterMs`:
- Default policy: `BLOCK_SALE` → saleableQuantity = 0
- Alternatives: `ALLOW_WITH_WARNING`, `KEEP_LAST_KNOWN`

Conservative default: **STALE → NOT SALEABLE**.

## Reservations

Buzzard order reservations are **NOT** supplier-confirmed holds.

```
Customer order → Buzzard reservation (in-memory foundation)
Supplier stock → unchanged unless supplier API confirms (future)
```

Reservation statuses: ACTIVE, RELEASED, CONSUMED, EXPIRED, CANCELLED

## Multi-Supplier

Stock tracked independently per `product + supplier + supplierOffer`.

Supplier Selection uses exposed stock info — selection logic stays in Product/Supplier Engine.

## Market & Channel Availability

Markets reuse Market Engine regions and supplier supported markets.

Channels: direct, amazon, ebay, kaufland, allegro, bol, cdiscount, otto

## Discontinued Products

- Supplier DISCONTINUED → offer unavailable
- Central Product **NOT deleted**
- Other supplier offers may remain sellable
- Manual DISCONTINUED **cannot** auto-reactivate

## Supplier Failure

On sync failure:
- Retain last known valid stock
- Do NOT zero out on temporary API failure
- Mark sync failed; stale policy applies when threshold exceeded

## Pricing Integration

Inventory Engine signals `pricingRecalculationRequired` — does **NOT** calculate prices.

## Security

Server-only fields: supplierQuantity, saleableQuantity, reservedQuantity, stockStatus, buffers, availability.

Server mirror: `server/core/inventoryEngineRegistry.js`

## Module Structure

| Module | Purpose |
|--------|---------|
| `types.ts` | Canonical stock model |
| `registry.ts` | In-memory stock registry + config |
| `stock.ts` | Validation, saleable quantity, stale |
| `buffer.ts` | Absolute/percentage buffers |
| `market.ts` | Market availability |
| `channel.ts` | Channel availability |
| `reservation.ts` | Order reservation foundation |
| `sync.ts` | Stock update processing |
| `events.ts` | Stock events |
| `audit.ts` | Audit log |
| `security.ts` | Client write protection |
| `admin.ts` | Admin overview |

## Test Fixtures

Uses TEST_SUPPLIER_A and four automotive products with scenarios: 100, 25, 5, 1, 0, negative, missing, invalid, stale, discontinued, recovered.

Run: `npm run test:inventory-engine`

## Known Limitations

- In-memory reservation store (foundation only)
- No real supplier stock reservation APIs
- No warehouse management
- No marketplace stock APIs
- No AI demand forecasting
- No distributed locking beyond single-process atomic checks

## Extension Points

1. Persist stock registry to existing DB hub
2. Wire Order Engine to reservation consume/release
3. Connect supplier stock reservation APIs when available
4. Marketplace availability sync webhooks
5. Carrier/shipping route validation for market availability
