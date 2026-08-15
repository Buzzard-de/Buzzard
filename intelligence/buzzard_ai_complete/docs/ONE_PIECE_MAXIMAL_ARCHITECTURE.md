# Buzzard MAXIMAL One-Piece Architecture

The package combines the previously built Buzzard AI, Commerce, Logistics,
Order/Fulfillment, Customer/Billing/Returns, CRM, Marketing and MAXIMAL
platform layers in one project. The Control Center adds the missing central
orchestration layer.

Core flow:

Customer -> Order -> Payment -> Inventory -> Supplier -> Fulfillment ->
Logistics -> Tracking -> Invoice -> CRM -> Marketing -> Analytics -> Audit

AI governance:
- Doğu Bey = lawful public-source intelligence
- Aslan Bey = coordination / operations
- Esat Bey = defensive security / threat detection

The package is designed so real provider integrations can be enabled without
breaking the core. Credentials are external and are never embedded in source.

## CLI

```bash
cd intelligence
python3 main.py complete-one-piece-demo
python3 main.py complete-one-piece-e2e --order-id O1
python3 main.py complete-one-piece-docs
```

## API

- `GET /control-center/demo` — full control center demo
- `GET /control-center/e2e/{order_id}` — end-to-end plan for an order

## Control Center components

- Event bus and workflow registry
- Access control (agent roles)
- Command router
- Incident manager
- Integration status (honest `NOT_CONFIGURED` without credentials)
- End-to-end order lifecycle plan

## Note

Builds on MAXIMAL platform layer (`vmax`) and all V1/V2 engines.
Does not connect to buzzard24.de automatically.
