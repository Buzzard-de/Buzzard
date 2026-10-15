# Buzzard 237 — Test evidence

Date: 2026-10-15  
Branch: `cursor/software-completion-local-c293`  
Starting HEAD this pass: `12e24c5`  
Code HEAD this pass: `af95675`

Safety at evidence time:

- `BUZZARD_SALES_ENABLED=0`
- `BUZZARD_PRODUCT_SOT_ACTIVE` unset
- `BUZZARD_LIVE_PAYMENTS` unset
- Environment had `BUZZARD_TEST_MODE=1` (E2E isolation). Rate-limit assertion unset it only inside test G, then restored.
- `:3000` next-server left running; `next build` skipped
- Isolated Playwright not re-run
- No live customer email / password-reset message sent

Nothing below is production verification. Nothing is LIVE_VERIFIED.

## Commands on current code

Working directory: `/workspace`

| Command | Exit | Totals |
| --- | --- | --- |
| Focused vitest (`continuousIntegrity253`, `routePermissions`, `rateLimitStore`) | 0 | **13 passed** (after limiter per-call check) |
| `npx vitest run` | 0 | 110 files, **1069 passed**, 0 failed |
| `npx tsc --noEmit` | 0 | clean |
| `npx next lint --dir components/account --dir lib/account` | 0 | no warnings/errors |
| `NODE_ENV=production npx next build` | skipped | `:3000` owns `.next` |
| Isolated Playwright | skipped | last recorded 107 passed / 12 skipped |

## New tests this pass

| File | Established coverage |
| --- | --- |
| `server/__tests__/continuousIntegrity253.test.mjs` | A–I: no resetToken in HTTP; same body for unknown email; confirm/expiry/reuse; HTTP 429; submissions 401/403/200 |

## Original 237 source search

Unchanged: register first appears at `4b0ce17`. **Original titles and acceptance criteria remain UNKNOWN.**

## GitHub CI

UNKNOWN. Push was not performed.
