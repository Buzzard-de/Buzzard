# Mandatory Safety Rules

Production defaults:
SUPPLIER_NETWORK_ENABLED=0
SUPPLIER_LIVE_READ_ENABLED=0
SUPPLIER_ORDER_NETWORK_ENABLED=0

No fake evidence.
No fake credentials.
No fabricated supplierOrderId.
No secret logging.
No PII in evidence.
No human-approval bypass.
No automatic SALES_ENABLED=1.
Every real network action requires correlation ID, audit and idempotency.
Unknown CreateOrder outcome stops execution.
Kill switch must block supplier-order actions.
