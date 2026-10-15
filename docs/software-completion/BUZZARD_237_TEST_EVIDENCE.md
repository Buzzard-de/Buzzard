# Buzzard 237 — Test evidence

Date: 2026-10-15  
Branch: `cursor/software-completion-local-c293`  
Starting HEAD this pass: `1096f29`  
Code HEAD this pass: `adc36a7` (+ lifecycle quote fix)

Safety at evidence time:

- `BUZZARD_SALES_ENABLED=0`
- `BUZZARD_PRODUCT_SOT_ACTIVE` unset
- `BUZZARD_LIVE_PAYMENTS` unset
- `BUZZARD_TEST_MODE=1` in environment (not written to production config)
- `:3000` left running; `next build` skipped
- Isolated Playwright not re-run
- No live email, payment, carrier buy, marketplace publish

Nothing is LIVE_VERIFIED.

## Commands

| Command | Exit | Totals |
| --- | --- | --- |
| Focused vitest 253/254/guardian/approval | 0 | 27 passed |
| `npx vitest run` after lifecycle quote fix | 0 | 111 files, **1073 passed**, 0 failed |
| `npx tsc --noEmit` | 0 | clean |
| `npx next lint --dir components/account --dir lib/account` | 0 | no warnings/errors |
| `next build` | skipped | `:3000` owns `.next` |
| Playwright | skipped | last recorded 107/12 |

## New tests

| File | Coverage |
| --- | --- |
| `continuousIntegrity253.test.mjs` | hashed storage, read_only 403, security.manage |
| `continuousIntegrity254.test.mjs` | tokenHash only; 2FA unauth; injection/escalation/isolation; money circuit; HAC self-approve deny |

## Original 237 source

Still UNKNOWN (`4b0ce17` first appearance).
