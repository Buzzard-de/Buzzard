# Buzzard 237 — Test evidence

Date: 2026-10-14  
Branch: `cursor/software-completion-local-c293`  
Starting HEAD this pass: `6790de4ab3a8dcd8bbddd7ce1a91f7fbbae6c881` (docs; code parent `71db6b5`)  
Quality evidence applies to the working tree after this pass (commit SHA recorded at git commit time).

Safety at evidence time:

- `BUZZARD_SALES_ENABLED=0`; running API `version.salesEnabled: false`
- `BUZZARD_PRODUCT_SOT_ACTIVE` unset
- `BUZZARD_LIVE_PAYMENTS` unset
- `:3000` left running (not killed)
- `:3001/api/health` HTTP 200, `salesEnabled: false`
- Isolated Playwright used `:3010` static `out/` + `:3001` API
- `BUZZARD_TEST_MODE` was **not** set

Nothing below is production verification. Nothing is LIVE_VERIFIED.

## Commands on current code

Working directory: `/workspace`

| Command | Exit | Totals | Duration |
| --- | --- | --- | --- |
| Focused vitest (7 files: dispatch, approval hold, exceptions, fortress, integrations, feeds, routePermissions) | 0 | **44 passed**, 0 failed | 1.76s |
| `npx vitest run` | 0 | 91 files, **971 passed**, 0 failed | 37.60s |
| `npx tsc --noEmit` | 0 | clean | with lint ~4.0s |
| `npx next lint` | 0 | No ESLint warnings or errors | same |
| `npm run test:backup-restore` | 0 | dry-run only; not a production restore | <1s |
| `NODE_ENV=production npx next build` | 0 | 2044 pages | ~27s |
| Isolated Playwright after export settled | 0 | **107 passed, 12 skipped, 0 failed** | 49.3s |

Isolated Playwright:

```
PLAYWRIGHT_SKIP_WEBSERVER=1 \
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3010 \
BUZZARD_API_URL=http://127.0.0.1:3001 \
NEXT_PUBLIC_BUZZARD_API_URL=http://127.0.0.1:3001 \
npx playwright test
```

First Playwright run after this build: 106 passed, 1 failed, 12 skipped. Failure: mega-menu opener used German-only `Kategorien` while the exported shell’s nav button is `ALL CATEGORIES` (English default). Classification: **TEST_DEFECT**. Selector updated to nav role+name `/all categories|alle kategorien|kategorien/i`. Re-run: 107/12/0. Not an application defect.

## New / extended tests this pass

| File | Established coverage |
| --- | --- |
| `server/__tests__/pusatDispatchIdempotency.test.mjs` | Replay, 409 conflict, RUNNING in-progress, FAILED replay, serial concurrent same key |
| `server/__tests__/pusatTaskApprovalHold.test.mjs` | Expire remint; EXECUTION_FAILED no remint |
| `server/__tests__/pusatApprovalExceptions.test.mjs` | Consume-once; consume with different payload `input_changed` |
| `server/__tests__/fortressAuthz.test.mjs` | `GET /api/health/pusat` and `/api/health/software` 401 |
| `server/__tests__/externalIntegrationHonesty.test.mjs` | Inter-Cars + TecDoc classified, not live |
| `server/__tests__/supplierFeedIdempotency.test.mjs` | Local feed preview replay/conflict |
| `e2e/storefront-bridge.spec.ts` | Desktop mega-menu opener locale-safe |

## GitHub CI

UNKNOWN. Push was not performed.

Canonical original 237-item checklist: **not found**.
