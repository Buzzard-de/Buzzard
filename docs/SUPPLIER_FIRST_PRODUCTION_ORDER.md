# #344 — Controlled First Production Order Execution Gate

Final controlled execution gate for the first real Inter Cars production supplier order.

## Safety chain

```
#337 Readiness → #338 Rehearsal → #339 Validation → #340 Activation
→ #341 createOrder → #342 Controlled Live Validation → #343 Arming
→ #344 First Production Order → Execution
```

## State machine

```
BLOCKED → ELIGIBLE → FIRST_ORDER_READY → APPROVED → EXECUTION_AUTHORIZED
→ EXECUTING → EXECUTED
```

Failure states: `REJECTED`, `EXPIRED`, `CANCELLED`, `UNKNOWN_OUTCOME`, `KILL_SWITCHED`, `EXECUTION_FAILED`

## Critical rules

- `EXECUTION_AUTHORIZED != EXECUTED`
- `ARMED != EXECUTION_AUTHORIZED`
- `SUPPLIER_ORDER_NETWORK_ENABLED` remains `0` by default
- Scoped network: `SUPPLIER_FIRST_PRODUCTION_ORDER_NETWORK=1` only with full gate chain
- Mock execution: `SUPPLIER_FIRST_PRODUCTION_ORDER_MOCK=1` (tests only)
- No automatic retry on `UNKNOWN_OUTCOME`
- Four-eyes approval required (primary + secondary approver)
- Authorization tokens are single-use (replay blocked)

## CI default status

```
CREATE_ORDER = UNVERIFIED
ARMING = BLOCKED
FIRST_PRODUCTION_ORDER = BLOCKED
REAL_SUPPLIER_HTTP_CALLS = 0
```

## Admin

`/admin/supplier-first-production-order`

Permissions: `supplier-first-production-order.read|request|approve|execute`
