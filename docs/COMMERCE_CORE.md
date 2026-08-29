# Commerce Core (Part 8)

Central commerce layer at `server/lib/commerce/` — category-agnostic, compatibility layer over legacy cart/checkout/orders.

## Architecture

```
Storefront / Client
       ↓
/api/commerce/*  (commerceCorePlugin)
       ↓
Commerce Core
  cartService → PIM authoritative pricing
  checkoutService → state machine + validation pipeline
  orderService → DRY_RUN / TEST / COMMERCIAL boundary
  paymentService → Mock (default), Stripe/PayPal OFF
       ↓
PIM Core (catalogReadService) + legacy cc_* (unchanged)
```

## Safety

- `BUZZARD_SALES_ENABLED=0` — never changed in Part 8
- Commercial orders blocked; dry-run / test orders only
- No real payment, supplier orders, or stock reservation

## Feature flags

| Flag | Default | Notes |
|------|---------|-------|
| `BUZZARD_SALES_ENABLED` | `0` | Master gate |
| `BUZZARD_CHECKOUT_ENABLED` | `1` | Dry-run checkout allowed |
| `BUZZARD_PAYMENT_ENABLED` | `0` | Blocked while SALES=0 |
| `BUZZARD_SUPPLIER_ORDERS_ENABLED` | `0` | Blocked while SALES=0 |
| `BUZZARD_COMMERCE_CORE` | `1` | Disable plugin if `0` |

Child flags cannot activate real commerce while `SALES=0`.

## API

- `GET /api/health/commerce`
- `GET /api/commerce/status`
- `GET /api/commerce/readiness`
- `POST /api/commerce/cart`
- `POST /api/commerce/checkout/start`
- `POST /api/commerce/checkout/:id/validate`
- `POST /api/commerce/checkout/:id/complete`
- `POST /api/commerce/checkout/attempt` — critical safety test endpoint

Admin: `/api/admin/commerce/*`

## Legacy compatibility

Legacy systems (`cartCheckout.js`, `ordersPlugin.js`, `paymentsFinance.js`) remain untouched. New code routes through Commerce Core for hardened validation.
