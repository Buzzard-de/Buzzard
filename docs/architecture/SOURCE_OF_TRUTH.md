# Source of Truth

Runtime ownership is enforced by `server/lib/sot/*`. This document matches that code.

## Product SoT

- **Owner:** `product_engine` (canonical PIM / Product D)
- **Write:** only `product_engine`
- **Read / input:** supplier catalog, marketplace catalog, AI proposal
- **Projection:** marketplace listing
- **Flag:** `BUZZARD_PRODUCT_SOT_ACTIVE` — when not `1`, product SoT writes are **LOCKED / BLOCKED**
- Supplier and marketplace rows are never the identity owner

## Order SoT

- **Owner:** `order_engine`
- **Write:** only `order_engine`
- **Input:** marketplace ingestion (adapter → order engine)
- **Projection:** supplier fulfillment (downstream)
- **Flag:** `BUZZARD_SALES_ENABLED` — when not `1`, **SALES LOCKED**; external side-effects are blocked
- Marketplace / supplier order records are not the customer order owner

## Availability SoT

- **Owner:** `availability_engine`
- **Write:** only `availability_engine`
- **Input:** supplier stock (stale feeds cannot rewind canonical version)
- **Projection:** marketplace stock
- Product SoT owns identity only; orders consume reservations

## Price SoT

- **Owner:** `pricing_engine`
- **Write:** only `pricing_engine`
- **Input:** supplier cost, AI recommendation
- **Projection:** marketplace listing price
- Marketplace listing price cannot overwrite Price SoT

## Conflicts and versions

`detectConflict` classifies `NO_CONFLICT`, `STALE_WRITE`, `VERSION_CONFLICT`, `SOURCE_CONFLICT`, `OWNERSHIP_CONFLICT`. Writes that supply `expectedVersion` fail with `SOT_VERSION_CONFLICT` (HTTP 409). No last-write-wins default.

## Idempotency

SoT writes reuse `commerce_idempotency` via `sotIdempotencyAdapter`. Same key + payload = replay. Different payload = `IDEMPOTENCY_CONFLICT`. In-flight = `IDEMPOTENCY_IN_PROGRESS`. No third idempotency table.

## Audit and correlation

Write attempts emit `SOT_WRITE_ACCEPTED`, `SOT_WRITE_REJECTED`, or `SOT_CONFLICT_DETECTED` through `coreAudit`. Mutations carry `correlationId` from `correlationContext`.

## Pusat and AI

Pusat and AI are not owners. They may read, analyze, and propose. Canonical mutation goes `command → domain engine → SoT`. Direct DB writes through the SoT API throw `SOT_WRITE_AUTHORITY_VIOLATION`.

## Safety

- `PRODUCT_SOT_ACTIVE` remains off unless explicitly set
- Sales remain locked unless `BUZZARD_SALES_ENABLED=1` and the sales gate allows it
- This foundation does not place live supplier, payment, or marketplace mutations
