# #346 — Controlled Go-Live Observation Period & Broader Rollout Approval

Observation period and human-approved broader rollout gate after #345 Controlled Go-Live.

## Safety chain

```
#337 → #338 → #339 → #340 → #341 → #342 → #343 → #344 → #345 → #346
```

## State machine

```
BLOCKED → OBSERVATION_READY → OBSERVATION_ACTIVE → OBSERVATION_COMPLETED
→ OBSERVATION_REVIEW_READY → BROADER_ROLLOUT_APPROVAL_PENDING
→ BROADER_ROLLOUT_APPROVED → BROADER_ROLLOUT_ACTIVE
```

## Critical rules

- `OBSERVATION_ACTIVE != BROADER_ROLLOUT_ACTIVE`
- `BROADER_ROLLOUT_APPROVED != UNLIMITED_GLOBAL_GO_LIVE`
- `SUPPLIER_ORDER_NETWORK_ENABLED` remains `0` by default
- Observation completion derived from measured duration, orders, metrics — no manual `complete=true`
- Separate Four-Eyes approval from #345; scope change invalidates approval
- Broader rollout limits cannot exceed #345 controlled go-live limits
- Mock metrics flagged `mockMetrics: true` — not production evidence

## CI default status

```
#342 LIVE EVIDENCE = NONE
#345 CONTROLLED_GO_LIVE = BLOCKED
#346 OBSERVATION = BLOCKED
#346 BROADER_ROLLOUT = BLOCKED
NETWORK = OFF
REAL ORDERS = 0
```

## Admin

`/admin/supplier-go-live-observation`

Permissions: `supplier-observation.read|manage|review`, `supplier-rollout.approve|activate|rollback`

## Configuration

- `SUPPLIER_OBSERVATION_DURATION_MS`
- `SUPPLIER_OBSERVATION_MIN_ORDERS`
- `SUPPLIER_OBSERVATION_THRESHOLDS_CONFIGURED=1` + threshold env vars
