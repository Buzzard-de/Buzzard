# #345 — Post-First-Order Validation & Controlled Go-Live Gate

Human-approved, scoped go-live gate after the first controlled Inter Cars production supplier order (#344).

## Safety chain

```
#337 Readiness → #338 Rehearsal → #339 Validation → #340 Activation
→ #341 createOrder → #342 Controlled Live Validation → #343 Arming
→ #344 First Production Order → #345 Controlled Go-Live
```

## State machine

```
BLOCKED → FIRST_ORDER_PENDING → FIRST_ORDER_COMPLETED → POST_ORDER_VALIDATION
→ GO_LIVE_REVIEW_READY → HUMAN_APPROVAL → CONTROLLED_GO_LIVE
```

Failure states: `VALIDATION_FAILED`, `UNKNOWN_OUTCOME`, `EXPIRED`, `REJECTED`, `KILL_SWITCHED`, `ROLLED_BACK`

## Critical rules

- `CONTROLLED_GO_LIVE != FULL_GLOBAL_GO_LIVE`
- `SUPPLIER_ORDER_NETWORK_ENABLED` remains `0` by default
- Scoped rollout limits: daily orders, daily value, max order value, allowed categories
- First order evidence from #344 is the authoritative SSOT
- No artificial promotion (`goLiveApproved=true` bypasses forbidden)
- Four-eyes approval required before activation
- AI may OBSERVE/ANALYZE/RECOMMEND only — never APPROVE or ACTIVATE
- Tracking recorded as `UNVERIFIED` until real endpoint validated
- Returns live status `NOT_TESTED` until real return occurs

## CI default status

```
#342 LIVE EVIDENCE = NONE
CREATE_ORDER = UNVERIFIED
#343 ARMING = BLOCKED
#344 FIRST_ORDER = BLOCKED
#345 GO_LIVE = BLOCKED
PRODUCTION_NETWORK = OFF
REAL_SUPPLIER_ORDERS = 0
```

## Admin

`/admin/supplier-controlled-go-live`

Permissions: `supplier-controlled-go-live.read|review|approve|activate|rollback`
