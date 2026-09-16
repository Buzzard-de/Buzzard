# #341 — Inter Cars createOrder Production Capability Validation

## Architecture

Extends the existing supplier stack without duplicating engines:

- `lib/supplier-production-order-validation/` — createOrder capability model and validation pipeline
- Integrates with #337 readiness, #339 production validation, #340 activation safety
- Uses existing Inter Cars adapter (`adapterProfile: inter-cars`) and SupplierConnector abstraction

## Capability States

Independent flags: declared, configured, authenticated, endpointAvailable, requestValidated, responseValidated, idempotencyValidated, errorHandlingValidated, statusValidated, trackingValidated, productionValidated.

Overall: `UNVERIFIED` | `VALIDATED` | `BLOCKED`

**Default without controlled live proof:** `UNVERIFIED`

## Safety Rules

- `SUPPLIER_ORDER_NETWORK_ENABLED=0` (default)
- No real customer orders during validation
- No automatic `UNVERIFIED → VALIDATED`
- Unknown outcome → check idempotency / status, never blind retry
- Secrets never logged, stored, or shown in admin UI

## Live Validation Prerequisites

1. Inter Cars production credentials configured (`SUPPLIER_LIVE_CREDENTIALS`)
2. API createOrder endpoint enabled for account
3. Explicit human approval (requester ≠ approver)
4. `SUPPLIER_CREATE_ORDER_VALIDATION_MODE=VALIDATION`
5. `SUPPLIER_CREATE_ORDER_VALIDATION_ENABLED=1`
6. All upstream gates PASS (#337, #339, #340)
7. Controlled test product, minimal quantity/value

If prerequisites missing: status remains `BLOCKED` or `SKIPPED` — not `VALIDATED`.

## Failure Handling

HTTP errors classified per policy. Timeout/network failure → `UNKNOWN_OUTCOME` → idempotency check → `HUMAN_REVIEW_REQUIRED` if unresolved.

## Go-Live

createOrder `VALIDATED` requires explicit controlled validation run with audit trail. Production order network remains separate from validation mode.
