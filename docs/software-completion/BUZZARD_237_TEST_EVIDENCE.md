# Buzzard 237 — Test evidence

Date: 2026-10-14  
Branch: `cursor/software-completion-local-c293`  
Starting HEAD this pass: `96aa360da9b92d14c28e054c5a45f947ee4c60d1`  
Code HEAD this pass: working tree (command 2/10)

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
| Focused vitest (`continuousIntegrity241` + pusatOrchestrator + exceptions + 240) | 0 | **25 passed** |
| `npx vitest run` | 0 | 98 files, **1012 passed**, 0 failed |
| `npm run build` | 0 | Compiled successfully; 2044 static pages exported locally (no deploy) |
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

## Original 237 source search

Searched: repository files, `docs/`, `git log --all`, `FINAL_MASTER_CHECKLIST.md` (89 lines), GitHub issues. The numbered register first appears at `4b0ce17`. **Original titles and acceptance criteria remain UNKNOWN.**

## GitHub CI

UNKNOWN. Push was not performed.
