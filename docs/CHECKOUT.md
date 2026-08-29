# Checkout (Part 8)

## Flow

```
Cart → Customer ID → Address → Shipping → Tax → Price verify → Stock verify → Risk → Payment readiness → Order readiness
```

## State machine

`DRAFT` → `VALIDATING` → `READY` → `PAYMENT_PENDING` → `PAYMENT_AUTHORIZED` → `COMPLETED`

Blocked paths: `BLOCKED`, `FAILED`, `CANCELLED`

Illegal transitions return `409 illegal_state_transition`.

## Server-side rules

- Client prices/totals ignored and recalculated
- Price tampering → `price_tampering` security event
- Stock validated in dry-run (no reservation)
- `BUZZARD_SALES_ENABLED=0` stops commercial order creation at completion boundary

## Order types when sales disabled

- `DRY_RUN` (default)
- `TEST_ORDER`
- `READINESS_TEST`

`COMMERCIAL` is rejected at start when sales disabled.
