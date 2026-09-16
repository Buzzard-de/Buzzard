# #343 — Inter Cars Production Order Arming

## Purpose

Prepares the Inter Cars production order path for **later** activation. **ARMED ≠ EXECUTED** and **ARMED ≠ automatic customer orders**.

## State Model

```
READY → ENABLED → ARMED → EXECUTED (separate gate chain)
CREATE_ORDER_UNVERIFIED | CREATE_ORDER_VALIDATED
ARMING_BLOCKED | ARMING_READY | ARMED | EXPIRED | DISARMED
```

## Prerequisites (all required)

1. #337 readiness READY
2. #339 production validation PASSED
3. #340 activation APPROVED
4. #341 createOrder validation pipeline
5. #342 controlled live validation with **official VALIDATED evidence**

Without #342 live proof: `ARMING = BLOCKED`, `CREATE_ORDER = UNVERIFIED`.

## Evidence Integrity

Capability state must come from official `#342` validation records — no manual override, no admin flag, no AI approval.

## Safety

- `SUPPLIER_ORDER_NETWORK_ENABLED=0` (default, never auto-enabled)
- Kill switch blocks arming and execution
- Four-eyes: requester ≠ approver
- Scoped limits from #340 first-order policy
- Expiry on arming and approval

## Flow

```
requestProductionOrderArming → preflight → ARMING_READY
approveProductionOrderArming (human, four-eyes)
armProductionOrder → ARMED
disarmProductionOrder → DISARMED
attemptProductionOrderExecution → BLOCKED (requires full execution gate chain)
```

## Admin

`/admin/supplier-production-order-arming`
