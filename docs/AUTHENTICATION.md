# Authentication (Part 12)

## Authoritative system

**Unified Auth Facade** — `server/core/auth/index.js`

| Realm | Provider | Paths | Status |
|-------|----------|-------|--------|
| admin | `adminProvider.js` | `/api/admin/*` | **AUTHORITATIVE** |
| customer | `customerProvider.js` | `/api/account/*`, `/api/customer/*` | **AUTHORITATIVE** |
| service | `serviceProvider.js` | `/api/auth/*`, `/api/db/*` | **AUTHORITATIVE** |
| ai | `aiProvider.js` | `/api/ai/internal/*` | **AUTHORITATIVE** |

Global RBAC: `server/lib/globalAuthMiddleware.js` wraps routes via `wrapRouteHandler`.

## Legacy (compatibility — wrapped by providers)

| System | File | Role |
|--------|------|------|
| Admin file sessions | `server/lib/auth.js` | Used by `adminProvider` |
| Customer sessions | `server/lib/customerAuth.js` | Used by `customerProvider` |
| JWT (dbAuth) | `server/lib/dbAuth.js` | Used by `serviceProvider` |

**Do not remove** legacy modules — they are internal implementations behind the facade.

## Part 12 changes

- Supplier integration hub `POST /orders` now requires admin auth (was unauthenticated)
- All supplier order paths use `salesGuard` regardless of auth realm
- AI employees cannot inherit admin supplier permissions

## CSRF

Cookie-based admin mutations require CSRF when `BUZZARD_CSRF_ENFORCE=1`. Bearer flows exempt on login paths.

## Session security

- TTL enforced
- Revocation via `DELETE /api/admin/sessions/:id`
- Invalid sessions → 401
