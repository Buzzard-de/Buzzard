# Buzzard CRM & Customer Experience Engine v1

Includes:
- customer events and 360° snapshot
- customer segmentation
- support ticket lifecycle
- reviews and ratings
- loyalty points
- abandoned-cart recovery foundation
- notification adapter
- privacy/consent helpers
- CLV calculation helper
- deterministic tests

External email/SMS/push providers are not faked; without configured credentials
the notification layer reports `NOT_CONFIGURED`.

## CLI

```bash
cd intelligence
python3 main.py complete-crm-demo
python3 main.py complete-crm-segment --ltv 1200 --orders 6
python3 main.py complete-crm-docs
```

## API

- `GET /crm/demo` — full demo flow
- `POST /crm/segment` — customer segment from LTV/orders/tickets

## Note

`commerce.customer` is the Commerce catalog extension scaffold.
`buzzard_ai_complete.crm` is the operational CRM & customer experience engine.
