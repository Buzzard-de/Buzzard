# Legacy Commerce Migration (Part 12)

## Status by endpoint group

| Route prefix | Status | Replacement | Server guard |
|--------------|--------|-------------|--------------|
| `/api/cart/*` | **LEGACY** | `/api/commerce/cart` | Catalog mode; deprecation headers |
| `/api/cart-checkout/*` | **LEGACY** | `/api/commerce/checkout` | `assertSalesEnabled` on complete |
| `/api/orders`, `/api/db/orders` | **LEGACY** | `/api/commerce/orders` | `requireSalesEnabled` on POST |
| `/api/products` | **LEGACY** | `/api/catalog/products` | Public read |
| `/api/commerce/*` | **ACTIVE** | — | Commerce guards + salesGuard |

## Deprecation headers

All legacy commerce responses include:

- `x-buzzard-legacy-commerce: true`
- `Deprecation: true`
- `Link: </api/commerce/...>; rel="successor-version"`

## Part 12 hardening

- `legacyCommerce.requireLegacyCommerceAllowed()` — blocks commercial actions when SALES=0
- Legacy fulfillment pipeline gated via `salesGuard.assertSupplierOrderAllowed()`
- Supplier hub + integration hub require admin auth + supplier guard

## Migration guidance

1. Set `NEXT_PUBLIC_COMMERCE_CORE=1` on storefront
2. Route cart/checkout through `lib/commerce/*`
3. Remove direct calls to `/api/cart`, `/api/orders` from new code
4. Do not remove legacy plugins until all clients migrated

## Do not delete

Legacy plugins remain registered for compatibility. Removal requires dependency audit.
