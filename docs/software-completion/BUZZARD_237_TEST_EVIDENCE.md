# Buzzard 237 — Test evidence

Date: 2026-10-15  
Branch: `cursor/software-completion-local-c293`  
Starting HEAD this pass: `87a5e30`

Safety at evidence time:

- `BUZZARD_SALES_ENABLED=0`
- `BUZZARD_PRODUCT_SOT_ACTIVE` unset
- `BUZZARD_LIVE_PAYMENTS` unset
- `:3000` left running (HTTP 200 before and after production `next build`)
- Isolated backup restore used `server/data/test-scratch` only
- No live email, payment, carrier buy, marketplace publish, SOC/SIEM

Nothing is LIVE_VERIFIED. Isolated restore is **not** production RESTORE_TESTED.

## Commands

| Command | Exit | Totals |
| --- | --- | --- |
| Focused vitest 254–256 + approval + backupRestoreIntegrity | 0 | 26 passed |
| `npx vitest run` | 0 | 113 files, **1084 passed**, 0 failed |
| `npx tsc --noEmit` | 0 | clean |
| `npx next lint --dir components/account --dir lib/account` | 0 | no warnings/errors |
| `NODE_ENV=production npx next build` | 0 | 2044 pages; distDir `.next`; `:3000` stayed 200 |
| `PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test e2e/commerce-security.spec.ts` | 0 | **6 passed** (security spec only, not full Playwright suite) |

## New tests

| File | Coverage |
| --- | --- |
| `continuousIntegrity256.test.mjs` | public login/register wrap; 2FA not enabled before confirm; recovery one-time; HAC unauthorized/self-approve/cancel/reject/action mismatch/replay/execution_failed; circular payload; circuit open; incident transitions |

## Original 237 source

Still UNKNOWN (`4b0ce17` first appearance).
