# Buzzard — Final System Architecture (Part 11)

**Audit date:** 2026-08-29  
**Branch:** `cursor/final-system-audit-part11-c293`  
**Safety state:** `BUZZARD_SALES_ENABLED=0`, Go-Live Lock ACTIVE

## Executive Summary

| Area | Status | Notes |
|------|--------|-------|
| Storefront (Next.js) | **PASS** | Commerce bridge via `lib/commerce/*` when `NEXT_PUBLIC_COMMERCE_CORE=1` |
| API (Node custom HTTP) | **PASS** | 59+ plugins, global RBAC wrapper on routes |
| Admin / Control Center | **PASS** | RBAC enforced server-side |
| PIM Core | **PASS** | ACTIVE blocked when SALES=0 |
| Catalog / Storefront Bridge | **PASS** | PIM → catalogReadService → publicProductMapper |
| Commerce Core | **PASS** | `/api/commerce/*` authoritative; dry-run only |
| Auth (Unified Facade) | **GO WITH CONDITIONS** | Facade exists; legacy paths remain |
| RBAC | **PASS** | Global middleware + per-route `requirePermission` |
| AI / Orchestrator / Worker | **PASS** | Permission + approval gates; no sales bypass found |
| Payment | **PASS** | Mock only; Stripe/PayPal gated on SALES=1 |
| Supplier boundary | **GO WITH CONDITIONS** | Commerce blocked; legacy fulfillment paths exist |
| Security / Guardian | **PASS** | Events logged; security dashboard available |
| Database (SQLite) | **GO WITH CONDITIONS** | Works locally; Render free tier ephemeral |
| Redis | **DEFERRED** | Optional; memory/file fallback; not production-validated |
| Deployment (Render) | **BLOCKED** | Persistent disk required for production commerce data |

---

## Dependency Map (High Level)

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Storefront     │────▶│  Catalog API     │────▶│  PIM Core       │
│  (Next.js)      │     │  /api/catalog/*  │     │  productCore    │
└────────┬────────┘     └──────────────────┘     └─────────────────┘
         │
         │ NEXT_PUBLIC_COMMERCE_CORE=1
         ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  lib/commerce/* │────▶│  Commerce Core   │────▶│  SQLite (db.js) │
│  cart/checkout  │     │  /api/commerce/* │     │  commerce_*     │
└─────────────────┘     └────────┬─────────┘     └─────────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ MockPayment     │     │ commerceGuards   │     │ securityLog     │
│ Provider        │     │ goLiveApproval   │     │ RBAC / CSRF     │
└─────────────────┘     └──────────────────┘     └─────────────────┘

┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Admin UI        │────▶│ Unified Auth     │────▶│ adminProvider   │
│ Control Center  │     │ core/auth/       │     │ customerProvider│
└─────────────────┘     └──────────────────┘     └─────────────────┘

┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ AI Employees    │────▶│ Orchestrator     │────▶│ Worker / Jobs   │
│ Control Center  │     │ Bridge           │     │ automationPlugin│
└─────────────────┘     └──────────────────┘     └─────────────────┘

LEGACY (COMPATIBILITY — still registered):
  /api/cart/*           databasePlugin
  /api/orders           databasePlugin, ordersPlugin
  /api/cart-checkout/*  cartCheckoutPlugin
  fulfillmentPipeline   supplier submit (demo path)
```

---

## Component Inventory

### Storefront
- **Path:** `/`, `components/`, `lib/commerce/`, `lib/cart.tsx`
- **Mode:** Catalog mode when `BUZZARD_SALES_ENABLED=0`
- **Status:** **PASS**

### API Server
- **Path:** `server/server.js`, `server/plugins/*.js`
- **Routing:** Custom matcher (not Express); `wrapRouteHandler` applies global admin RBAC
- **Status:** **PASS**

### PIM
- **Path:** `server/lib/pim/productCore.js`, `server/plugins/pimCorePlugin.js`
- **Rules:** BLOCKED cannot become ACTIVE incorrectly; ACTIVE prohibited when SALES=0
- **Status:** **PASS**

### Catalog
- **Path:** `server/lib/storefront/catalogReadService.js`, `publicProductMapper.js`, `storefrontBridgePlugin.js`
- **Visibility:** ACTIVE, COMING_SOON, HIDDEN, DRAFT, BLOCKED enforced in mapper
- **Status:** **PASS**

### Commerce Core (Authoritative)
- **Path:** `server/plugins/commerceCorePlugin.js`, `server/lib/commerce/*`
- **Endpoints:** cart, checkout, coupons, orders (readiness/test only)
- **Status:** **PASS**

### Legacy Commerce (Compatibility)
- **Paths:** `databasePlugin`, `cartCheckoutPlugin`, `ordersPlugin`, `logisticsPlugin`
- **Headers:** `x-buzzard-legacy-commerce` deprecation marker (Part 10)
- **Status:** **COMPATIBILITY** — parallel implementation; migrate callers to `/api/commerce/*`

### Authentication
| System | Location | Realm | Status |
|--------|----------|-------|--------|
| Unified Auth Facade | `server/core/auth/` | admin, customer, service, ai | **Authoritative for new code** |
| Admin file sessions | `server/lib/auth.js` | admin | **COMPATIBILITY** via adminProvider |
| Customer auth | `server/lib/customerAuth.js` | customer | **ACTIVE** |
| DB JWT auth | `server/lib/dbAuth.js` | service | **ACTIVE** (`/api/auth/*`, `/api/me`) |
| AI header auth | `server/core/auth/providers/aiProvider.js` | ai | **ACTIVE** |

**Migration requirement:** Audit each plugin for direct `requireAdmin` / legacy JWT usage; route through unified facade.

### RBAC
- **Path:** `server/lib/rbac.js`, `server/lib/globalAuthMiddleware.js`
- **Roles:** administrator, catalog_manager, order_manager, read_only (+ AI employees)
- **Status:** **PASS** — `/api/admin/*` denied without auth (401/403)

### AI / Automation
- **Paths:** `controlCenterPlugin`, `automationPlugin`, `orchestratorBridgePlugin`, `guardianBridgePlugin`
- **Flow:** task → permission → approval → queue → worker → audit
- **Status:** **PASS** — cannot enable sales or create commercial orders in tests

### Payment Abstraction
- **Path:** `server/lib/commerce/paymentProviders.js`
- **Effective:** MockPaymentProvider only when SALES=0
- **Status:** **PASS**

### Supplier Abstraction
- **Commerce:** `orderService.submitSupplierOrder()` → **403 blocked**
- **Legacy:** `fulfillmentPipeline.submitSupplierOrder()` — demo path without API secret
- **Status:** **GO WITH CONDITIONS** — legacy path exists but requires SALES + secrets for real submission

---

## Duplicates & Parallel Implementations

| Capability | Modern | Legacy | Classification |
|------------|--------|--------|----------------|
| Cart | `/api/commerce/cart` | `/api/cart/*`, `/api/cart-checkout/*` | COMPATIBILITY |
| Checkout | `/api/commerce/checkout/*` | `/api/cart-checkout/sessions/*` | COMPATIBILITY |
| Orders | `/api/commerce/orders/*` | `/api/orders`, `/api/db/orders` | COMPATIBILITY |
| Products (admin) | `/api/admin/pim-core/*` | `/api/admin/products`, `/api/db/admin/products` | COMPATIBILITY |
| Taxonomy | 53 L1 (`buzzard_categories.json`) | 48-category engines (`smartMenu48Plugin`) | P2 — dual taxonomy |
| Auth | Unified facade | dbAuth JWT, direct admin sessions | COMPATIBILITY |

---

## Dead Code / Unused Services

- Multiple versioned plugins (`*V32`, `*V33`, etc.) register routes but overlap with newer modules — **not removed** (dependency unverified).
- `exports/` and `intelligence/buzzard_ki_gesamt/` are snapshot copies — **not loaded at runtime**.

---

## Circular Dependencies

No critical circular dependency blocking startup detected. Commerce services use lazy `require()` in hot paths to avoid load cycles.

---

## Inconsistent APIs

- Legacy cart uses `productId`; commerce cart uses `productId` + server price snapshot — **documented**.
- Some admin routes use inline auth checks vs `requirePermission` — global middleware covers `/api/admin/*` baseline.
