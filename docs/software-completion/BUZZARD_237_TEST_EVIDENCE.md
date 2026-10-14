# Buzzard 237 — Test evidence

Date: 2026-10-14  
Branch: `cursor/software-completion-local-c293`  
Quality HEAD: working tree after items 39/47/49/51/54/55 (commit follows)

Safety at evidence time:

- `BUZZARD_SALES_ENABLED=0`; running API `version.salesEnabled: false`
- `BUZZARD_PRODUCT_SOT_ACTIVE` unset
- `BUZZARD_LIVE_PAYMENTS` unset
- `:3000` left running (not killed)
- `:3001/api/health` HTTP 200, `salesEnabled: false`
- Isolated Playwright used `:3010` static `out/` + `:3001` API

Nothing below is production verification. Nothing is LIVE_VERIFIED.

## Commands on current code

Working directory: `/workspace`

| Command | Exit | Totals | Duration |
| --- | --- | --- | --- |
| `npx vitest run` | 0 | 88 files, **961 passed**, 0 failed | 35.89s |
| `npx tsc --noEmit` | 0 | clean | with lint ~3.8s |
| `npx next lint` | 0 | No ESLint warnings or errors | same |
| `npm run test:backup-restore` | 0 | dry-run only; not a production restore | <1s |
| `NODE_ENV=production npx next build` | 0 | 2044 pages | ~31s |
| Isolated Playwright (after export settled) | 0 | **107 passed, 12 skipped, 0 failed** | 47.1s |

Isolated Playwright:

```
PLAYWRIGHT_SKIP_WEBSERVER=1 \
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3010 \
BUZZARD_API_URL=http://127.0.0.1:3001 \
NEXT_PUBLIC_BUZZARD_API_URL=http://127.0.0.1:3001 \
npx playwright test
```

`BUZZARD_TEST_MODE` was **not** set.

First Playwright run overlapped `next build` rewriting `out/` on `:3010`: 105 passed, 2 failed, 12 skipped. Classification: **ENVIRONMENT_MISMATCH** (mega-menu opener timeout; admin `h1` "Error response"). After export settled: full suite **107/12/0**. Not an application defect.

## New tests this pass

| File | Established coverage |
| --- | --- |
| `server/__tests__/pusatTaskApprovalHold.test.mjs` | No remint after reject/cancel; employee identity deny; provider honesty; recommendation-only execute |
| `server/__tests__/fortressAuthz.test.mjs` | `GET /api/orchestrator/status` 401 without session |

## GitHub CI

UNKNOWN. Push was not performed.

Canonical original 237-item checklist: **not found**.
