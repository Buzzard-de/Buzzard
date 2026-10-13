# Buzzard Phase 13 — Fortress Security Audit Report

Version: 13.0  
Date: 2026-10-13  
Branch: `cursor/final-completion-execution-c293`  
Start HEAD: `7561ad3d8c4179c714ab35b6c86cfc1c07abbd9b`  
Final HEAD: `7561ad3d8c4179c714ab35b6c86cfc1c07abbd9b` (no commit, push, PR, merge, or deploy)

This report is a **local repository and isolated-test audit**. It does **not** prove that any deployed host is secure.

No overall security percentage. No capability is marked `LIVE_VERIFIED`.

---

## A. Baseline

| Field | Value |
| --- | --- |
| Branch | `cursor/final-completion-execution-c293` |
| HEAD | `7561ad3d8c4179c714ab35b6c86cfc1c07abbd9b` |
| Phase 12 report | **Not present** in `docs/software-completion/` |
| Prior reports read | Phase 9, Phase 10, Phase 11 (untracked local file) |
| Sales | `BUZZARD_SALES_ENABLED=0`, `NEXT_PUBLIC_SALES_ENABLED=0` |
| Product SoT | `BUZZARD_PRODUCT_SOT_ACTIVE` unset (inactive in software health) |
| Live payments | `BUZZARD_LIVE_PAYMENTS` unset (not `"1"`) |
| Lockfiles | root `package-lock.json`, `server/package-lock.json` present |
| `npm audit --omit=dev` | exit **0**, 0 vulnerabilities |
| `npm --prefix server audit` | exit **0**, 0 vulnerabilities |
| `npm audit --audit-level=high` | exit **1**, **5 HIGH**, 0 CRITICAL |

Working tree at start of this phase (preserved Phase 11 leftovers, not reverted):

- `lib/market/languageIndependence.test.ts`
- `scripts/production-safety.mjs`
- `server/__tests__/part8Foundation.test.mjs`
- `server/__tests__/softwareMasterCompletion.test.mjs`
- untracked Phase 11 report
- untracked `server/__tests__/backupRestoreIntegrity.test.mjs`

`git reset --hard` / `git clean -fd` were **not** used. Phase 11 files were **not** reverted.

---

## B. Attack-surface inventory (repository routing)

Reachability classes used below:

1. **Potentially reachable** if the Node API (`server/server.js`) is exposed.
2. **Local development** (loopback CORS, `.next-dev`, default admin password in non-production).
3. **Unknown in production** — Render/firewall/TLS not inspected (production probing forbidden).

All plugin routes are registered through `addRoute` → `wrapRouteHandler`. **Unlisted non-admin routes previously received `resolveRoutePermission` = `null`, so the wrapper skipped auth entirely.** Admin `/api/admin/*` paths were covered. That gap is the primary authorization finding of this phase.

### Public / intended anonymous

| Surface | Auth | Notes |
| --- | --- | --- |
| `GET /api/health` and many `/api/health/*` readiness probes | public | Diagnostic; some previously leaked filesystem path |
| Catalog visibility, commerce status/readiness, shipping methods, payment providers | public | Read-only |
| `POST /api/commerce/cart*` / checkout APIs | none (session cart) | Rate limited (commerce-cart 120/min); sales lock still blocks real checkout |
| `POST /api/contact` | none | Form intake |
| `POST /api/commerce/webhooks/:provider` | public + provider signature in dual-payment engine | Official payment ingress |
| `POST /api/admin/login` (+ 2FA) | public | Rate limited |
| `GET /api/payments-finance/methods` | public (after this phase) | Method list only |
| Unsigned legacy webhooks | public sinks | Do **not** mark paid (`UNSIGNED_WEBHOOK_ISOLATED`) |

### Protected admin

| Surface | Auth |
| --- | --- |
| `/api/admin/*` | Bearer admin session + RBAC (`routePermissions`) |
| `/api/security/admin*` | admin |
| `/api/product-catalog-pim` **writes** | `products.write` |

### Previously unlisted privileged families (now RBAC-prefixed)

`/api/payments-finance` (except methods + unsigned webhook sinks), `/api/payments-v36`, `/api/order-management-v32`, `/api/fulfillment-v33`, `/api/logistics-v34`, `/api/marketplace-v35`, `/api/international-v37`, `/api/security-v38`, `/api/analytics-v39`, `/api/master-admin-v40`, `/api/supplier-integration-hub`, `/api/marketing-loyalty` (except campaign `apply`).

### Other plugin writes still unlisted (`policy === null`)

Storefront/customer-shaped routes remain outside global admin RBAC by design: commerce cart/checkout, contact, customer support tickets, returns create, QR scan, marketing-center events, WMS scan, AI chat. **Residual:** any additional internal write route not in the prefix list is still unauthenticated at the wrapper. That is **OPEN_SECURITY** as a class, not a claim that every leftover path is exploitable.

---

## C. Confirmed findings

| ID | Severity | Class | Status |
| --- | --- | --- | --- |
| P13-01 Unauthenticated finance mutations (`intents` / `confirm` / `refunds` / `invoices`) | P0/P1 | CONFIRMED_VULNERABILITY | **FIXED_AND_VERIFIED** (unit wrap + plugin `requireAnyAdmin`) |
| P13-02 Unauthenticated privileged engine CRUD (`payments-v36`, logistics-v34, order-management-v32, supplier-integration-hub, marketing-loyalty points/campaigns, sibling v3x record APIs) | P1 | CONFIRMED_VULNERABILITY | **FIXED_AND_VERIFIED** (central PREFIX + wrap 401) |
| P13-03 CORS allow-list included opaque origin `null` | P2 | CONFIRMED_SECURITY_WEAKNESS | **FIXED_AND_VERIFIED** |
| P13-04 Public DB health returned filesystem `path`, backup dir, table counts | P2 | CONFIRMED_SECURITY_WEAKNESS | **FIXED_AND_VERIFIED** for `/api/health`, `/api/health/db`, `/api/health/pusat`, `/api/health/production` path fields |
| P13-05 Admin Bearer token in `sessionStorage` | P1 | CONFIRMED_SECURITY_WEAKNESS | **OPEN_SOFTWARE** (HttpOnly cutover blocked; same as Phase 11) |
| P13-06 CSRF enforcement off unless `BUZZARD_CSRF_ENFORCE=1`; Bearer exempt | P2 | CONFIRMED_SECURITY_WEAKNESS | **OPEN_SECURITY** (by design until cookie sessions exist) |
| P13-07 GHSA-vfj7-8cjw-p6xm `braces@3.0.3` via `eslint-config-next` | HIGH paper / P2 runtime | CONFIRMED (dev-only) | **OPEN_SECURITY** / **BLOCKED_EXTERNAL** |
| P13-08 Seed / default admin password in repo and non-prod `dbAuth` | P1 if used in production | CONFIRMED_SECURITY_WEAKNESS | **OPEN_SECURITY** locally; production `ensureAdmin` fail-closed when `NODE_ENV=production` without `ADMIN_PASSWORD` |
| P13-09 Wrap still skips auth when permission map is `null` | P1 class | CONFIRMED_SECURITY_WEAKNESS | **OPEN_SECURITY** (mitigated for listed prefixes; fail-closed for *all* writes not applied — would break storefront) |
| P13-10 Remaining public readiness endpoints may still embed internal diagnostics | P3 | POTENTIAL_RISK_REQUIRES_VERIFICATION | **OPEN_SECURITY** |
| P13-11 Dual catalog JSON vs PIM / sales locks | P2 architecture | from Phase 11 | **OPEN_SOFTWARE** / sales lock **VERIFIED_NO_DEFECT_FOUND** this env |
| P13-12 Render `/var/data` persistence | P1 prod | — | **NOT_VERIFIABLE_LOCALLY** |
| P13-13 Production TLS, WAF, actual public exposure | — | — | **NOT_VERIFIABLE_LOCALLY** / **BLOCKED_EXTERNAL** |
| P13-14 XSS via `dangerouslySetInnerHTML` | — | inspected | **VERIFIED_NO_DEFECT_FOUND** for storefront layout (static locale bootstrap) and JSON-LD (`JSON.stringify`) |
| P13-15 Official Stripe/PayPal webhook signatures | — | code path exists | **NOT_VERIFIABLE_LOCALLY** (no live provider calls) |
| P13-16 Unsigned legacy payment webhooks | P2 | isolated no-op | **VERIFIED_NO_DEFECT_FOUND** for paid-state mutation (`applied: false`) |

---

## D. P13-01 / P13-02 — Authorization gap

### Original behavior

`wrapRouteHandler` returned the raw handler when `resolveRoutePermission` was `null`. PREFIX matching ran **only** for `/api/admin/*`.

`paymentsFinancePlugin` registered unauthenticated:

- `POST /api/payments-finance/intents`
- `POST /api/payments-finance/intents/:id/confirm` — sets status `succeeded` and writes a capture transaction **without a payment provider**
- `POST /api/payments-finance/intents/:id/refunds`
- `POST /api/payments-finance/invoices`

Sibling v3x plugins exposed `POST /api/.../records` and `PATCH` without handler auth (only admin *overview* used `requireAnyAdmin`).

**Impact:** any client that can reach the API process could create finance intents, mark them succeeded, issue refunds/invoices, and mutate engine records. Live card capture is still gated by sales/live-payment flags; this is **internal ledger integrity**, not a claim of real-money movement in this environment.

**Exploitability:** local/API-exposed. Production exposure **unknown** (not probed).

### Correction

1. PREFIX rules now apply to **any** matching path, longest prefix wins.
2. Privileged non-admin prefixes added (orders/logistics/suppliers/analytics/security/system as appropriate).
3. Public exceptions: payment methods, unsigned webhook sinks, loyalty `apply`.
4. Handler-level `requireAnyAdmin` on finance intent/confirm/refund/invoice (defense in depth).

### Verification

Command: `npx vitest run server/__tests__/routePermissions.test.mjs server/__tests__/corsOrigins.test.mjs server/__tests__/fortressAuthz.test.mjs server/__tests__/csrf.test.mjs`

- Exit: **0**
- Files: 4 passed
- Tests: **22 passed**, 0 failed, 0 skipped

Unauthenticated wrapped confirm/refund/invoice/payments-v36 records return **401** `admin.auth.required`. GET methods remain callable.

Residual: other unlisted write routes still skip the wrapper. Do not treat PREFIX coverage as a complete API allow-list.

---

## E. Admin session security (P13-05)

Reconfirmed in source (`lib/admin/client.ts`, 40+ `sessionStorage` consumers, `server/lib/auth.js`):

- Token: 32-byte hex, TTL **8 hours**, stored under `buzzard_admin_token`.
- Server authorization is the session file / `requireAuth`, not frontend flags.
- Production admin API base remains fail-closed (`lib/admin/apiBase.ts`).

**HttpOnly cookie migration: not implemented.** Incomplete dual-auth would be worse.

Blockers unchanged from Phase 11:

- ~40+ Bearer clients
- Cross-origin storefront `:3000` → API `:3001`
- CSRF currently Bearer-exempt; cookie sessions need CSRF on
- Playwright helpers poll `sessionStorage`

XSS that runs in an authenticated admin origin can steal the Bearer token. That is **not** remote anonymous admin takeover by itself.

---

## F. XSS / CSRF / CORS / headers

| Topic | Result |
| --- | --- |
| XSS storefront | Layout script is a **static** IIFE; locale comes from `localStorage` key names only. JSON-LD uses `JSON.stringify`. **VERIFIED_NO_DEFECT_FOUND** in those two sites. Product HTML import sanitization was not exhaustively fuzzed. |
| CSP | API `setSecurityHeaders` sets a restrictive CSP when `BUZZARD_CSP !== "0"`. Next app uses meta headers. CSP is **not** a complete XSS control. |
| CSRF | Enforced only if `BUZZARD_CSRF_ENFORCE=1`. Bearer exempt. **OPEN** until cookie migration. |
| CORS | Removed default `"null"`. Opaque `null` allowed only if explicitly listed in `BUZZARD_CORS_ORIGINS`. Loopback HTTP still allowed outside production. Credentials are **not** CORS-authenticated. |
| Headers | `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options DENY`, COOP/CORP, Permissions-Policy; HSTS when production or `BUZZARD_HSTS=1`. Production CDN/TLS headers **NOT_VERIFIABLE_LOCALLY**. |

---

## G. Webhooks and replay

| Path | Behavior |
| --- | --- |
| `/api/commerce/webhooks/:provider` | Official Stripe/PayPal path (`officialPaymentIngress.js`). Live signature **not** exercised (no paid APIs). |
| `/api/payments-finance/webhook` and payout/dispute | Audit sink; `applied: false`. |
| `/api/webhooks/payment` | Order-automation unsigned; does not mark paid. |
| `/api/webhooks/:provider` (commercial integrations) | **501** adapter not configured. |

---

## H. Customer data isolation

Admin routes require admin. Customer `/api/account/*` uses customer realm in `core/auth` **when** `wrapRouteHandler` has a policy. Unlisted account routes may still rely on handler-level checks. Loyalty `GET /api/marketing-loyalty/:customerId` is now behind `analytics.read` (admin), which **closes anonymous IDOR** on that path; a customer-scoped self-read API was **not** added (no new product features).

Full IDOR matrix across all order/return identifiers: **POTENTIAL_RISK_REQUIRES_VERIFICATION** beyond the families locked this phase.

---

## I. Secrets and logging

- `redactForLog` in `server/lib/security.js` redacts password/token/secret keys.
- Seed file `data/buzzard_admin_users.seed.json` and non-prod `dbAuth.ensureAdmin` contain **default local admin password material**. Values are **not** reproduced here. If this repository or a deploy ever used those defaults, **rotate through an authorized process**. Do not treat this audit as rotation.
- `scripts/*.mjs` smoke tests hard-code the same local default. Production `ensureAdmin` does not insert a default password when `NODE_ENV=production` unless `ADMIN_PASSWORD` is set.
- Frontend bundles were not rebuilt in this phase; do not claim production JS is free of the seed string.

---

## J. Rate limiting

- Global API limiter: 180/min (`server/server.js`).
- Admin login: 8 / 15 min (Phase 11).
- Commerce cart: 120/min IP.
- `BUZZARD_TEST_MODE` disables some limiters (test-only). Public input cannot be assumed to set this in production (`environmentValidation` rejects test mode when `NODE_ENV=production`). **NOT_VERIFIABLE_LOCALLY** on Render.

---

## K. Dependency audit (P13-07)

Advisory: **GHSA-vfj7-8cjw-p6xm**  
Package: **braces@3.0.3** (latest on npm still **3.0.3**; no patched 3.0.4+).

Chain: `eslint-config-next@15.5.27` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces@3.0.3`  
Five HIGH rows, one chain. `fixAvailable` still points at eslint-config-next **14.x** (`isSemVerMajor: true`) vs Next **15.5.27**.

**Not applied:** `npm audit fix --force`, Next 14 downgrade, audit suppression, braces override to a non-existent patched version.

Production/runtime (`--omit=dev` and `server/`): **clean**.

---

## L. Build / environment separation

- Sales / SoT / live payments remain locked in this environment.
- Default JWT/admin password insertion is production fail-closed in `dbAuth`.
- `distDir` `.next-dev` vs `.next` not re-litigated; Phase 11 **VERIFIED_NO_DEFECT_FOUND**.
- Debug: unlisted diagnostic health routes remain public by design (now with less path leakage).

---

## M. Regression test evidence

```
npx vitest run server/__tests__/routePermissions.test.mjs \
  server/__tests__/corsOrigins.test.mjs \
  server/__tests__/fortressAuthz.test.mjs \
  server/__tests__/csrf.test.mjs
```

Exit **0** — 4 files, **22 passed**.

Environment: Cloud workspace, `BUZZARD_SALES_ENABLED=0`. No production HTTP. No paid provider calls. No real orders/payments.

Full Playwright / full unit suite was **not** re-run this phase (scope: security remediations + targeted tests). Residual risk: an unrelated suite could still fail for non-security reasons.

---

## N. External verification checklist (authorized later; not done)

Do **not** run against production without separate authorization.

1. Confirm which hostnames terminate TLS and which process serves `/api/*`.
2. Confirm Render persistent disk path and that public health no longer returns it.
3. Confirm production `ADMIN_PASSWORD` is unique and seed defaults were never used.
4. Confirm `BUZZARD_CORS_ORIGINS` does not include `null` or `*`.
5. Confirm `BUZZARD_CSRF_ENFORCE` plan after any cookie migration.
6. Confirm Stripe/PayPal webhook secrets and signature verification on the official path only.
7. Confirm WAF / rate-limit at the edge vs in-process.
8. Confirm sales, SoT, and live payments flags on the running service.
9. Authorized pentest of remaining unlisted routes after PREFIX changes are deployed.
10. Dependency: wait for braces >3.0.3 or Next eslint chain without the advisory.

---

## O. Files changed this phase (security only)

- `server/lib/routePermissions.js`
- `server/lib/corsOrigins.js`
- `server/lib/db.js`
- `server/plugins/paymentsFinancePlugin.js`
- `server/plugins/controlCenterPlugin.js`
- `server/plugins/aiAutomationPlugin.js`
- `server/plugins/pusatPlugin.js`
- `server/plugins/productionHealthPlugin.js`
- `server/__tests__/routePermissions.test.mjs`
- `server/__tests__/corsOrigins.test.mjs`
- `server/__tests__/fortressAuthz.test.mjs` (new)

Phase 11 dirty files remain as they were.

---

## P. Final safety confirmation

- Sales remain disabled (`BUZZARD_SALES_ENABLED=0`, `NEXT_PUBLIC_SALES_ENABLED=0`).
- Product SoT remains inactive (flag unset; software health forces inactive).
- Live payments remain disabled (flag unset).
- No real transactions, refunds, transfers, or supplier actions.
- No paid provider API calls.
- No production data or configuration changes.
- No deployment, push, PR, or merge.
- User/Phase 11 working-tree files were preserved.
- `git reset --hard` / `git clean -fd` / `npm audit fix --force` were not used.

This audit closed the **confirmed, locally fixable** authorization and disclosure defects listed as FIXED_AND_VERIFIED. It does **not** mean the platform is secure, that production is safe, or that every vulnerability was found.
