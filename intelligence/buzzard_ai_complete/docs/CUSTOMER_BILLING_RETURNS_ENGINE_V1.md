# Buzzard Customer, Billing & Returns Engine v1

Includes:
- customer registry and addresses
- invoice creation and VAT calculation
- payment ledger
- refund requests
- credit notes
- payment reconciliation
- privacy redaction helper
- deterministic tests

This is an application-layer foundation. Country-specific tax/legal decisions
must be validated against the applicable jurisdiction and professional advice
before production use.

## CLI

```bash
cd intelligence
python3 main.py complete-billing-demo
python3 main.py complete-billing-refund --order-id O1 --reason defective --amount 10
python3 main.py complete-billing-docs
```

## API

- `GET /billing/demo` — full demo flow
- `POST /billing/refund` — refund request
- `POST /billing/payment-status` — payment status for order
