# Inter Cars Production API Access & #342 Live Validation Preparation

Dry-run deployment preparation for real Inter Cars production API access. **Does not send createOrder or enable global network.**

## Safe defaults

```
SUPPLIER_NETWORK_ENABLED=0
SUPPLIER_ORDER_NETWORK_ENABLED=0
SUPPLIER_CREATE_ORDER_VALIDATION_ENABLED=0
SUPPLIER_CONTROLLED_VALIDATION_NETWORK=0
```

## Credentials

Deploy via secret manager only:

```
SUPPLIER_LIVE_PROFILE=inter-cars
SUPPLIER_LIVE_CREDENTIALS={"accessToken":"..."}
```

For production scope against SANDBOX profile template:

```
SUPPLIER_LIVE_FORCE_PRODUCTION=1
```

Or override with `SUPPLIER_LIVE_CONFIG_JSON` including `baseUrl: https://gw.intercars.eu`.

Mock tokens (`mock-token`, `test-token`, `dummy-token`) are **BLOCKED**.

## Diagnostic commands

```bash
npm run gate:supplier-inter-cars-production-access
npm run gate:supplier-controlled-live-validation   # alias to full chain
node scripts/supplier-inter-cars-production-access-preflight.mjs
```

## Expected states

| State | Credentials | CREATE_ORDER | #342 |
|-------|-------------|--------------|------|
| CI default | NOT_CONFIGURED | UNVERIFIED | BLOCKED |
| Deployed creds, no live run | VALID | UNVERIFIED | READY* |
| After real #342 | VALID | VALIDATED | PASS |

\* READY = preflight passes; upstream gates + controlled run still required.

## Admin

`/admin/inter-cars-production-access`

Actions: Validate Configuration (dry-run) — **no Send Production Order**
