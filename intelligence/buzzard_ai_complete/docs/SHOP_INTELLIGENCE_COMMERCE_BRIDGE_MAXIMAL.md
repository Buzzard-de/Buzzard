# Shop ↔ Intelligence ↔ Commerce Bridge MAXIMAL

Storefront → readiness gate → checkout → order pipeline → payment → fulfillment → shipping → delivery → commerce events → analytics/decision hooks.

Sales remain blocked unless catalog, payment, shipping, order pipeline and intelligence bridge explicitly report READY. No provider success or live credentials are fabricated.

## Capabilities

- **ShopIntelligenceBridge** — connects Production catalog/checkout with commerce event store
- **SalesGate** — blocks sales until all prerequisites are READY
- **OrderPipeline** — payment → fulfillment → shipping → delivery lifecycle
- **CommerceEventStore** — ORDER_CREATED, PAYMENT_CONFIRMED, SHIPMENT_CREATED, ORDER_DELIVERED
- **CommerceAnalyticsAdapter** — maps events to analytics rows (ORDER, SALE, DELIVERED)
- **IntelligenceHooks** — optional analytics/decision attachment points

## CLI

```bash
cd intelligence
python3 main.py complete-shop-bridge-demo
python3 main.py complete-shop-bridge-readiness
python3 main.py complete-shop-bridge-docs
```

## API

- `GET /shop-bridge/readiness` — sales gate status (payment/shipping blocked by default)
- `GET /shop-bridge/demo` — full order lifecycle demo with events

## Node Shop Bridge

The Node shop (`buzzard24.de`) connects via `BUZZARD_INTELLIGENCE_API_URL` and reads `/shop-bridge/readiness` alongside `/production/readiness`. Sales stay off in catalog mode (`BUZZARD_SALES_ENABLED=0`).
