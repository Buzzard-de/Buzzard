# Production Hardening (Part 10)

Part 10 hardens the Buzzard commerce stack for production readiness **without enabling sales**.

## Scope

| Area | Part 10 change |
|------|----------------|
| Coupon validation | Server-authoritative via `/api/commerce/coupons/validate` and cart coupon endpoints |
| E2E | Playwright starts API + Next.js automatically (`scripts/e2e-webserver.mjs`) |
| Legacy commerce | Deprecation headers on `/api/cart/*`, `/api/orders`, `/api/cart-checkout/*` |
| Safety guard | `npm run test:production-safety` |
| Sales | **Remain OFF** (`BUZZARD_SALES_ENABLED=0`) |

## Safety invariants

- Commercial orders blocked
- Real payment blocked
- Supplier orders blocked
- Go-live approval cannot auto-enable sales (`PRODUCTION_SAFETY_LOCK`)
- Child feature flags cannot bypass `SALES=0`

## Commands

```bash
npm run test:part10
npm run test:production-safety
npm run test:e2e
npm run test:e2e:api   # API-only, no webserver
```

## Deferred (non-blocking)

- Full Render live deployment verification (documented in `PART10_FINAL_REPORT.md`)
- Redis rate-limit restart test in CI (requires Redis instance)
- Full accessibility audit tooling (manual keyboard checks in E2E)
