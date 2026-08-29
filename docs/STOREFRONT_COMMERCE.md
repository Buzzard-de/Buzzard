# Storefront Commerce Bridge (Part 9)

Connects Buzzard24.de storefront UI to Part 8 Commerce Core.

## Flow

```
Product (ProductCard / ProductDetail)
       ↓
lib/commerce/cartBridge → POST /api/commerce/cart/*/items
       ↓
/warenkorb/ (CartView)
       ↓
/checkout/ (CheckoutForm)
       ↓
lib/commerce/checkoutBridge → checkout start / validate / complete
       ↓
READINESS_TEST / DRY_RUN order (SALES=0)
```

## Client modules

| Module | Role |
|--------|------|
| `lib/commerce/client.ts` | HTTP client for Commerce Core |
| `lib/commerce/cartBridge.ts` | CartProvider ↔ API sync |
| `lib/commerce/checkoutBridge.ts` | Checkout submit + quote preview |
| `lib/commerce/map.ts` | DTO mapping |
| `lib/commerce/runtime.ts` | Feature flag + session/cart storage |

## Feature flags

| Flag | Default | Effect |
|------|---------|--------|
| `NEXT_PUBLIC_COMMERCE_CORE` | `1` (when API URL set) | Enable storefront bridge |
| `NEXT_PUBLIC_SALES_ENABLED` | `0` | Must stay `0` |
| `BUZZARD_SALES_ENABLED` | `0` | Server gate unchanged |

When commerce core is on but sales is off: **dry-run checkout** with banner UI.

## Legacy paths (unchanged)

- `/api/cart/*` — SQLite store sync (disabled when commerce bridge active for cart mutations)
- `/api/orders` — legacy order plugin
- `/api/customer/checkout/*` — optional quotes

New storefront flow uses `/api/commerce/*` only.

## Safety

- No real commercial orders while `BUZZARD_SALES_ENABLED=0`
- Server-authoritative pricing
- Idempotency on checkout submit
- Price tampering rejected
