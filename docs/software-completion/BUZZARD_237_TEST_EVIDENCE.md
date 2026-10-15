# Buzzard 237 — Test evidence

Date: 2026-10-14  
Branch: `cursor/software-completion-local-c293`  
Starting HEAD this pass: `5f9263d0727daad7b6250f591587d8cf85b3d2df`  
Code HEAD this pass: `861adaacd22559630fb326cd51305cf91e895160`

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
| Focused vitest (`continuousIntegrity240` + part16 + 238/239 + fortressAuthz) | 0 | **51 passed** |
| `npx vitest run` | 0 | 97 files, **1008 passed**, 0 failed |
| Playwright API (`commerce-security` + `commerce-readiness`, skip webserver, `:3001`) | 0 | **9 passed** |
| `next build` | skipped | Running `next-server` on `:3000` uses `.next`; production export would clobber it |
| `npx tsc --noEmit` | 0 | clean |
| `npx next lint` | 0 | No ESLint warnings or errors |
| `npm run test:backup-restore` | 0 | dry-run only |
| `NODE_ENV=production npx next build` | skipped | server-only changes this pass |
| Isolated Playwright this pass | skipped | not re-run; last recorded 107 passed / 12 skipped on `6f6c672` |

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
| `server/__tests__/commerceIntegrityBatch.test.mjs` | VAT unknown fail-closed; AUTH/RATE_LIMIT; reservation expire; €0.50 floor |
| `server/__tests__/continuousIntegrity237.test.mjs` | public error keys; idempotency fingerprint 409; correlation sanitize; sqlite reservation expire; financial job no-retry; production /tmp backup refuse |
| `server/__tests__/continuousIntegrity238.test.mjs` | plugin public errors; webhook redaction; stale `t=` timestamp; uncertain no-capture; ephemeral restore blocked |
| `server/__tests__/continuousIntegrity239.test.mjs` | secret-string redact; health.probeFailed; payment session codes; VAT no input echo; job.failed |
| `server/__tests__/continuousIntegrity240.test.mjs` | productionHealth probeFailure has no SQL/path; version payload slim |

## Original 237 source search

Searched: repository files, `docs/`, `git log --all`, `FINAL_MASTER_CHECKLIST.md` (89 lines), GitHub issues. The numbered register first appears at `4b0ce17`. **Original titles and acceptance criteria remain UNKNOWN.**

## GitHub CI

UNKNOWN. Push was not performed.
