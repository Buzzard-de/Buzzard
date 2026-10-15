# Buzzard 237 — Test evidence

Date: 2026-10-14  
Branch: `cursor/software-completion-local-c293`  
Starting HEAD this pass: `28e45999fcd4d3355539f753d07b051c2fa5453a`  
Code HEAD this pass: `95d7b0a86e057e0c749914d15e10471f1d772168`

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
| Focused vitest (`continuousIntegrity242` + commerceIntegrity + exceptions + fortressAuthz) | 0 | **28 passed** |
| `npx vitest run` | 0 | 99 files, **1016 passed**, 0 failed |
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
| `server/__tests__/continuousIntegrity241.test.mjs` | publicTaskError; mapTaskRow sanitizes SQL; lifecycle/orchestrator source |
| `server/__tests__/continuousIntegrity242.test.mjs` | exceptions lastError keys; 401 on admin list; legacy SQL row sanitized |

## Original 237 source search

Searched: repository files, `docs/`, `git log --all`, `FINAL_MASTER_CHECKLIST.md` (89 lines), GitHub issues. The numbered register first appears at `4b0ce17`. **Original titles and acceptance criteria remain UNKNOWN.**

## GitHub CI

UNKNOWN. Push was not performed.
