# Stage B — #342 Controlled CreateOrder

Use the existing #342 controlled live-validation implementation.

Required:
- real Inter Cars production credential
- Stage A PASS
- explicit four-eyes approval
- approval expiry
- scoped order/product/market limits
- payload hash
- nonce
- idempotency key
- correlation ID
- kill switch OFF
- scoped production network

A real supplier response containing supplierOrderId is required before CREATE_ORDER=VALIDATED.

If outcome is uncertain: UNKNOWN_OUTCOME and stop. No blind retry.

On success, persist metadata-only evidence and expose READY_FOR_343_ARMING.

Do not execute #343 automatically.
