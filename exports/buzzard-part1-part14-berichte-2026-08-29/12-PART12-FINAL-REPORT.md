# Part 12 — P1 Production Hardening Report

**Branch:** `cursor/p1-production-hardening-part12-c293`  
**Date:** 2026-08-29  
**Safety:** `BUZZARD_SALES_ENABLED=0` (unchanged)

## Summary

Part 12 addresses Part 11 P1 production blockers without enabling sales.

| P1 Item | Status |
|---------|--------|
| R-P1-01 SQLite persistence | **ADDRESSED** — central `dbPaths`, health metadata, backup/restore, deploy checklist |
| R-P1-02 Legacy fulfillment supplier bypass | **CLOSED** — `salesGuard` gates all supplier paths |
| R-P1-03 Multiple auth systems | **ADDRESSED** — facade documented authoritative; supplier hub auth fixed |
| R-P1-04 E2E rate-limit flake | **ADDRESSED** — `BUZZARD_TEST_MODE` disables limits in tests |
| R-P1-05 Live Render verification | **PENDING** — `test:part12:live` script; requires deployed URL |

## New files

- `server/lib/dbPaths.js` — central DB path + persistence info
- `server/lib/commerce/salesGuard.js` — unified commercial/supplier/go-live gate
- `server/lib/taxonomyCanonical.js` — 53-category authoritative source
- `scripts/backup-db.mjs`, `scripts/restore-db.mjs`
- `scripts/part12-smoke.mjs`, `scripts/part12-live-smoke.mjs`
- `server/__tests__/part12Foundation.test.mjs`
- `docs/PART12_DEPLOY_CHECKLIST.md`, `docs/PART12_FINAL_REPORT.md`

## Modified files

- `server/lib/db.js` — persistence in health
- `server/lib/fulfillmentPipeline.js` — supplier guard
- `server/lib/supplierHub.js`, `supplierIntegrationHub.js` — supplier guard
- `server/plugins/supplierHubPlugin.js`, `supplierIntegrationHubPlugin.js` — pass req, admin auth
- `server/plugins/ordersPlugin.js`, `logisticsPlugin.js` — pass req to fulfillment
- `server/lib/commerce/commerceGuards.js` — `supplier_order_blocked` event
- `server/lib/rateLimitStore.js` — test mode bypass
- `server/lib/legacyCommerce.js` — `requireLegacyCommerceAllowed`
- `server/lib/commercialIntegrations.js` — dropship guard
- `styles/storefront-responsive.css` — 320px overflow fixes
- `e2e/customer-journey.spec.ts` — 320px test re-enabled
- `render.yaml`, `docs/BACKUP_RESTORE.md`, `docs/LEGACY_MIGRATION.md`, `docs/AUTHENTICATION.md`

## Security changes

- No path can submit supplier orders when SALES=0
- Legacy fulfillment demo auto-success blocked at server
- Supplier integration hub orders require admin auth
- Go-live lock remains active

## Test results

Run after deploy:

```
npm run test:part2 … test:part10
npm run test:production-safety
npm run test:final-audit
npm run test:part12
npm run test:unit
npm run typecheck && npm run lint && npm run build
```

Live (when URL available):

```
BUZZARD_API_URL=https://buzzard-api.onrender.com npm run test:part12:live
```

## Remaining risks

| ID | Item | Status |
|----|------|--------|
| R-P1-05 | Live Render not verified in CI | **LIVE VERIFICATION PENDING** |
| R-P2-02 | Full browser checkout E2E | Improved; may need live Next.js |
| R-P2-03 | 320px overflow | CSS fixes applied; E2E re-enabled |
| R-P2-05 | Redis multi-instance | Documented; requires Upstash credentials in prod |

## Go-live

**NO-GO for commercial launch.** Part 12 improves production readiness infrastructure only.

Sales remain disabled: `BUZZARD_SALES_ENABLED=0`.
