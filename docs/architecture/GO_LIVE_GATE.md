# Production Go-Live Gate

Central readiness and activation control. This layer does not invent connectors and does not open sales.

## Phase A — Readiness

`createGoLiveGate().evaluateGoLive()` reuses:

- `productionDbVerification`
- Source of Truth registry (product / order / availability / price)
- `externalIntegrationVerification`
- existing tax, shipping, payment, supplier adapters
- `commerce_idempotency` / `core_approvals` / Control Center

Critical check status must be `PASS` or GO is `BLOCKED`. Code PASS is not production PASS.

## Phase B — Activation

`activateProduction({ approvalId, correlationId })` re-evaluates every gate, verifies a `GO_LIVE_PRODUCTION` approval, rejects bypass flags, and refuses to mutate `BUZZARD_SALES_ENABLED` unless an explicit `mutateEnv` option is set (never used by the validator or HTTP plugin).

Default state: `LOCKED`.

## Safety

- PRODUCT_SOT_ACTIVE stays OFF during this work
- SALES stays LOCKED
- supplier orders, payments, marketplace writes stay OFF
- production writes: NOT_EXECUTED
- kill switch / `PRODUCTION_SAFETY_LOCK` blocks automatic GO

## Endpoints

- `GET /api/health/go-live` → `{ status, salesEnabled }`
- `GET /api/admin/system/go-live`
- `GET /api/admin/system/go-live/checks`
- `POST /api/admin/system/go-live/activate`
- `POST /api/admin/system/go-live/deactivate`

## Validator

`npm run test:go-live` prints `GO_LIVE_READINESS` and never activates sales.
