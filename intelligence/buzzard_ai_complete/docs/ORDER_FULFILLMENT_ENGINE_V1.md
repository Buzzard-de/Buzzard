# Buzzard Order & Fulfillment Engine v1

This module manages the operational lifecycle from order validation through
payment authorization, inventory reservation, supplier selection and
fulfillment submission.

It includes:
- order state machine
- payment gateway
- inventory reservation
- supplier selection
- fulfillment gateway
- returns
- customer status notifications
- deterministic tests

External payment and fulfillment providers are credential-aware and never
pretend that an external transaction succeeded.

## CLI

```bash
cd intelligence
python3 main.py complete-order-demo
python3 main.py complete-order-process --order-id O1 --customer-id C1 --sku SKU-DEMO --quantity 2 --price 10
python3 main.py complete-order-docs
```

## API

`POST /orders/process` — process order through fulfillment pipeline (FastAPI)

## Note

`commerce.orders` persists orders in the Commerce DB.
`buzzard_ai_complete.order_engine` is the operational fulfillment lifecycle engine.
