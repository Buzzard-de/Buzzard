# Legacy Commerce Migration

Storefront default path (when `NEXT_PUBLIC_COMMERCE_CORE=1`):

```
/api/commerce/cart/*
/api/commerce/checkout/*
/api/commerce/orders/*
```

## Route classification

| Route | Status | Storefront usage (COMMERCE_CORE=1) | Replacement |
|-------|--------|-----------------------------------|-------------|
| `/api/commerce/*` | **ACTIVE** | Primary | — |
| `/api/cart/*` | **LEGACY** | Bypassed (`lib/store/client.ts`) | `/api/commerce/cart/*` |
| `/api/orders` | **LEGACY** | Bypassed (`lib/orders/client.ts` when commerce on) | `/api/commerce/checkout/*` |
| `/api/cart-checkout/*` | **LEGACY** | Unused by storefront bridge | `/api/commerce/*` |
| `/api/customer/checkout/*` | **DEPRECATED** | Bypassed in commerce mode | `/api/commerce/checkout/*` |
| `/api/customer/coupons/validate` | **DEPRECATED** | Bypassed | `/api/commerce/coupons/validate` |

## Deprecation markers

Legacy responses include:

- `Deprecation: true`
- `X-Buzzard-Legacy-Commerce: true`
- `Link: </api/commerce/...>; rel="successor-version"`

## Removal policy

Legacy routes are **not deleted** in Part 10. Removal requires:

1. Zero production component references
2. Migration period documented
3. Admin tooling updated

## Remaining references

| File | Path | Action |
|------|------|--------|
| `lib/store/client.ts` | `/api/cart/*` | Used when `NEXT_PUBLIC_SQLITE_STORE=1` |
| `lib/orders/client.ts` | `/api/orders` | Used when commerce core off |
| `scripts/smoke-core.mjs` | `/api/cart/*` | Legacy smoke — keep for SQLite store |
