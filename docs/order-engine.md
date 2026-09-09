# Buzzard Order Engine

Central authority for customer orders in a **dropshipping-first** architecture.

**The current implementation does not execute real supplier orders or real payments.**

Built on top of:
- Product Engine
- Supplier Integration Engine
- Pricing & Margin Engine
- Inventory & Stock Automation Engine
- Market Engine

Buzzard does **not** own physical warehouse stock.

## Architecture

```
Customer → Cart/Checkout → Order Engine
  → Validation → Price Snapshot → Inventory Reservation
  → Supplier Selection → Supplier Order Preparation (dry-run)
  → Order Status / Fulfillment State
```

## Order Lifecycle

```
DRAFT → PENDING_PAYMENT → PAID → CONFIRMED → PROCESSING
  → SUPPLIER_PENDING → SUPPLIER_CONFIRMED → SHIPPED → DELIVERED
```

Cancellation and failure paths supported with deterministic error codes.

## Price Snapshots — Critical

At order creation, immutable `OrderItemPriceSnapshot` captures:
- supplierCost, shippingCost, fees, return reserves
- targetMargin, customerNet/VAT/gross, actualMargin
- market, channel, currency, taxContext

Existing orders **never** recalculate from live supplier/pricing data.

## Inventory Reservations

```
Validate stock → Reserve (Inventory Engine) → Create order
```

On failure: reservation rolled back, no confirmed order.

Buzzard reservation ≠ supplier-confirmed hold.

## Supplier Assignment

Uses existing `selectBestSupplier()` — selection logic stays in Product/Supplier Engine.

Assignment snapshot stored on order with score and timestamp.

## Dropshipping / Supplier Order

Dry-run only:
```
Customer Order → Order Engine → Supplier Selection → PREPARED supplier order
```

Statuses active: `NOT_CREATED`, `PREPARED`. No real supplier dispatch.

## Payment Foundation

Mock/dry-run adapter:
- PENDING → AUTHORIZED → CAPTURED
- No card numbers, CVV, or credentials stored

Payment failure releases inventory reservations.

## Return / Refund Extension

Foundation fields only — future Returns Engine:

```
Customer Refund → Supplier Credit/Refund → Return Shipping
  → Marketplace Refund → Buzzard Final Loss/Profit
```

Do NOT assume supplier automatically refunds Buzzard.

## Idempotency

Duplicate `idempotencyKey` returns existing order — no duplicate reservations.

## Concurrency

Uses Inventory Engine atomic reservation — last unit cannot be double-sold.

## Security

Server-only: supplierCost, margin, priceSnapshot, paymentStatus, orderStatus, reservations.

Customer A cannot access Customer B's orders.

Customer view hides: supplier cost, margin, fees, internal scores.

## Module Structure

| Module | Purpose |
|--------|---------|
| `createOrder.ts` | Main order creation flow |
| `cancelOrder.ts` | Cancellation with reservation release |
| `validation.ts` | Input validation |
| `pricing.ts` | Pricing Engine aggregation + snapshots |
| `reservation.ts` | Inventory Engine integration |
| `supplier.ts` | Supplier selection integration |
| `fulfillment.ts` | Dry-run supplier orders |
| `payment.ts` | Mock payment adapter |
| `status.ts` | Order status machine |
| `events.ts` / `audit.ts` | Observability |
| `returns.ts` | Return/refund extension |
| `security.ts` | Client write protection |
| `customerView.ts` | Customer-safe order view |
| `admin.ts` | Admin overview |

Run: `npm run test:order-engine`

## Known Limitations

- In-memory order store (foundation)
- Mock payment only
- Dry-run supplier orders only
- No real marketplace order APIs
- No real refunds or carrier tracking
- No distributed locking beyond Inventory Engine

## Extension Points

1. Persist orders to existing DB
2. Real payment provider integration
3. Real supplier order APIs
4. Returns & Refund Engine
5. Marketplace order sync
6. Order tracking / delivery updates
