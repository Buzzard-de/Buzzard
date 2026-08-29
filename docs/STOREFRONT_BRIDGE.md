# Storefront Bridge (Part 7)

## Architecture

```
PIM Core (pim_core_*)
        ↓
catalogReadService.js  (read-only, visibility filters)
        ↓
publicProductMapper.js (strip admin/supplier fields)
        ↓
catalogCache.js        (TTL cache + invalidation)
        ↓
GET /api/catalog/*     (public API)
        ↓
lib/storefront/        (Next.js client)
        ↓
Buzzard24.de storefront
```

Storefront **never** reads SQLite/PIM tables directly.

## Enable

- Server: `BUZZARD_PIM_STOREFRONT=1` (default on when DB enabled)
- Client: `NEXT_PUBLIC_PIM_STOREFRONT=1` + `NEXT_PUBLIC_BUZZARD_API_URL`

## Product visibility

Public when ALL true:
- Status: `READY` or `ACTIVE`
- Visibility: `PUBLIC` or `CATALOG`
- Category: customer-visible (`ACTIVE` / `COMING_SOON`)
- Validation: not `FAIL`
- Not `DRAFT`, `HIDDEN`, `BLOCKED`, `ARCHIVED`

## Safety

- `BUZZARD_SALES_ENABLED=0` — `catalogMode: true`, no buy/checkout
- No supplier credentials, audit, or AI internal data in public API

## Admin

- `GET /api/admin/storefront/preview/products` — preview as customer
- `POST /api/admin/storefront/sync` — cache sync (dry-run default)
- Control Center: `STOREFRONT_CATALOG` service status

## Worker

- Job type: `CATALOG_SYNC` — sync PIM → storefront cache index

## Legacy catalog

JSON catalog (`buzzard_products.json`) remains for static export. PIM products merge when live API enabled.
