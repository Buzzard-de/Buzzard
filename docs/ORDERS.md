# Orders (Part 8)

## Model

Orders stored in `commerce_orders` with:

- `orderType`: `DRY_RUN` | `TEST_ORDER` | `READINESS_TEST` | `COMMERCIAL`
- Status, payment status, fulfillment status
- Server-calculated totals and item snapshots

## Status transitions

Controlled via `canTransitionOrder()` in `commerceConstants.js`.

## Supplier boundary

Customer order ≠ supplier order.

`orderService.submitSupplierOrder()` always blocked in Part 8. Fulfillment → supplier dispatch is a separate future step.

## Commercial gate

`COMMERCIAL` orders require `BUZZARD_SALES_ENABLED=1` plus readiness gate + admin approval (future).
