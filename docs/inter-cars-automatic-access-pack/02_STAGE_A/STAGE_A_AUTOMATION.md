# Stage A — Read-only Live Validation

Use the existing Inter Cars production validation path.

When explicitly enabled:
SUPPLIER_LIVE_READ_ENABLED=1

Validate ONLY:
- health
- catalog
- stock
- price

Do NOT call createOrder.

For genuine production responses, persist metadata-only evidence:
provider, capability, timestamp, correlationId, response status, environment, request hash.

MOCK/SANDBOX/UNIT_TEST evidence is never production evidence.

Missing credentials/API access must return NOT_CONFIGURED/NOT_AVAILABLE/BLOCKED.

After genuine Stage A PASS expose READY_FOR_STAGE_B_342, but do not execute Stage B automatically.
