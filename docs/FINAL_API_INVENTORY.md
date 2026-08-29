# Buzzard — Final API Inventory (Part 11)

**Generated:** 2026-08-29  
**Server:** Custom Node HTTP router (`server/server.js`)

Legend: **Auth** = none | admin | customer | service | mixed  
**RL** = rate limited | **IF** = idempotency key supported

---

## Critical Public Endpoints

| Method | Path | Auth | Permission | RL | Notes |
|--------|------|------|------------|-----|-------|
| GET | `/api/health` | none | — | — | Includes commercial.salesEnabled |
| GET | `/api/health/db` | none | — | — | SQLite status |
| GET | `/api/health/ai` | none | — | — | AI bridge status |
| GET | `/api/health/commerce` | none | — | — | Commerce flags |
| GET | `/api/security/health` | none | — | — | RBAC, rate limit backend |
| GET | `/api/catalog/products` | none | — | global | Public catalog only |
| GET | `/api/catalog/products/:id` | none | — | global | Visibility filtered |
| GET | `/api/catalog/categories` | none | — | global | 53 L1 taxonomy |
| GET | `/api/catalog/search` | none | — | global | No hidden products |
| GET | `/api/commerce/status` | none | — | — | Feature flags |
| POST | `/api/commerce/cart` | none | — | cart RL | Session/customer bound |
| GET | `/api/commerce/cart/:id` | none | ownership | cart RL | IDOR check |
| POST | `/api/commerce/cart/:id/items` | none | ownership | cart RL | Server price |
| POST | `/api/commerce/coupons/validate` | none | — | cart RL | Tamper detection |
| POST | `/api/commerce/checkout/start` | none | — | checkout RL | Dry-run when SALES=0 |
| POST | `/api/commerce/checkout/attempt` | none | — | readiness RL | Safety probe |
| POST | `/api/commerce/checkout/:id/complete` | none | — | order RL | COMMERCIAL blocked |

---

## Admin Endpoints (sample — all require admin auth)

| Method | Path | Permission | Notes |
|--------|------|------------|-------|
| POST | `/api/admin/login` | public | Rate limited |
| GET | `/api/admin/me` | admin | Session info |
| GET | `/api/admin/control-center/status` | admin + RBAC | Dashboard |
| GET | `/api/admin/sessions` | admin | Session mgmt |
| GET | `/api/admin/security/events` | security.read | Paginated |
| GET | `/api/admin/commerce/overview` | system.read | Commerce dashboard |
| POST | `/api/admin/commerce/go-live/request` | system.configure | Does NOT enable sales |
| GET | `/api/admin/pim-core/products` | catalog.read | PIM |
| POST | `/api/admin/pim-core/import` | catalog.write | Supplier import |
| GET | `/api/admin/automation/worker` | system.read | Worker status |
| POST | `/api/admin/automation/jobs` | system.configure | Job enqueue |
| GET | `/api/admin/ai/tasks` | ai.read | AI tasks |
| POST | `/api/admin/approvals/:id/decide` | approvals.write | Approval flow |

**Global rule:** All `/api/admin/*` routes wrapped by `globalAuthMiddleware` → 401 if unauthenticated.

---

## Legacy Endpoints (DEPRECATED — compatibility)

| Method | Path | Header | Replacement |
|--------|------|--------|-------------|
| GET/POST | `/api/cart/*` | `x-buzzard-legacy-commerce` | `/api/commerce/cart` |
| GET/POST | `/api/cart-checkout/*` | legacy marker | `/api/commerce/checkout` |
| GET/POST | `/api/orders`, `/api/db/orders` | legacy marker | `/api/commerce/orders` |
| GET | `/api/products` | — | `/api/catalog/products` |

---

## Auth Endpoints

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/auth/register` | none | JWT registration |
| POST | `/api/auth/login` | none | JWT login |
| GET | `/api/me` | JWT | Customer profile |
| POST | `/api/admin/login` | none | Admin session |
| POST | `/api/admin/logout` | admin | Session revoke |

---

## Observability Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/guardian/health` | Guardian bridge |
| GET | `/api/orchestrator/status` | Orchestrator |
| GET | `/api/p1/health` | P1 catalog platform |
| GET | `/api/storefront/health` | Storefront bridge |

---

## Feature Flag Enforcement

Commerce mutations consult `commerceFeatureFlags.js`:
- Parent: `BUZZARD_SALES_ENABLED`
- Children gated: payment, stripe, paypal, supplier orders

Audit logging via `securityLog` + `coreAudit` on admin mutations.

---

## Inconsistencies Found

1. **Dual product APIs:** `/api/admin/products` vs `/api/admin/pim-core/products` — P2
2. **Dual cart systems:** legacy vs commerce — P2 (deprecation headers added)
3. **Public `/api/products`** still serves legacy DB products — verify visibility rules if used by old clients

---

## Endpoint Count

- **~59 plugin files** registering routes
- **~400+ routes** total (including versioned module duplicates)
- **Critical commerce path:** 29 routes in `commerceCorePlugin.js`
