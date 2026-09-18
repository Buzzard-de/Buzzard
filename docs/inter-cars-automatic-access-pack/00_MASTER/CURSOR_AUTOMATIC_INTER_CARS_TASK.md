# BUZZARD — AUTOMATIC INTER CARS ACCESS & VALIDATION

Integrate this pack into the existing Buzzard repository.

GOAL:
Prepare the complete Inter Cars production workflow:
credential detection -> configuration preflight -> Stage A read-only validation -> Stage B #342 controlled CreateOrder validation -> evidence -> #343 handoff.

Use existing #337–#348 SSOT modules. Do NOT create a second engine or database.

ABSOLUTE RULES:
- Never invent credentials, API responses, supplierOrderId, or production evidence.
- Never put secrets in Git, SQLite, logs, admin UI, or AI context.
- Never bypass four-eyes approval, #342, kill switch, limits, idempotency, or audit.
- Never automatically enable unrestricted supplier orders.
- Never automatically set SALES_ENABLED=1.
- Keep production defaults OFF.
- Unknown CreateOrder outcome must stop and require human review.

When real credentials are supplied externally through Secret Manager, the workflow must be able to detect them and proceed through the existing controlled gates without code changes.
