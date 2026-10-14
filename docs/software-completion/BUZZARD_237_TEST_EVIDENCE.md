# Buzzard 237 — Test evidence

Date: 2026-10-14  
Branch: `cursor/software-completion-local-c293`  
Starting HEAD this pass: `31d968b596c0a049a8ca700602a40f1d1a644402`

Safety at evidence time:

- `BUZZARD_SALES_ENABLED=0`
- `BUZZARD_PRODUCT_SOT_ACTIVE` unset
- `BUZZARD_LIVE_PAYMENTS` unset
- `:3000` left running (not killed)
- Isolated Playwright used `:3010` static `out/` + `:3001` API
- `BUZZARD_TEST_MODE` was **not** set

Nothing below is production verification. Nothing is LIVE_VERIFIED.

## Commands on current code

Working directory: `/workspace`

| Command | Exit | Totals |
| --- | --- | --- |
| Focused vitest (softwareReliabilityBatch + softwareCompletion + pusatTaskApprovalHold) | 0 | **86 passed** |
| `npx vitest run` | 0 | 92 files, **978 passed**, 0 failed |
| `npx tsc --noEmit` | 0 | clean |
| `npx next lint` | 0 | No ESLint warnings or errors |
| `npm run test:backup-restore` | 0 | dry-run only |
| `NODE_ENV=production npx next build` | 0 | 2044 pages |
| Isolated Playwright after export settled | 0 | **107 passed, 12 skipped, 0 failed** (47.9s) |

Isolated Playwright:

```
PLAYWRIGHT_SKIP_WEBSERVER=1 \
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3010 \
BUZZARD_API_URL=http://127.0.0.1:3001 \
NEXT_PUBLIC_BUZZARD_API_URL=http://127.0.0.1:3001 \
npx playwright test
```

## New tests this pass

| File | Established coverage |
| --- | --- |
| `server/__tests__/softwareReliabilityBatch.test.mjs` | Payment fees, draft/order cancel idempotency, estimated vs actual returns, marketplace dry-run/auth/rate-limit, supplier sourceId + invalid cost |
| `server/__tests__/pusatTaskApprovalHold.test.mjs` | Consume after expiry refused |

## Original 237 source search

Searched: repository files, `docs/`, `git log --all`, `FINAL_MASTER_CHECKLIST.md` (89 lines), GitHub issues. The numbered register first appears at `4b0ce17`. **Original titles and acceptance criteria remain UNKNOWN.**

## GitHub CI

UNKNOWN. Push was not performed.
