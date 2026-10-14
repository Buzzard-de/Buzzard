# Buzzard 237 — Final handover (this execution)

Date: 2026-10-14  
This document is a session handover, not a claim that 237/237 items are complete.

## Git

| Field | Value |
| --- | --- |
| Branch | `cursor/software-completion-local-c293` |
| Starting HEAD | `6790de4ab3a8dcd8bbddd7ce1a91f7fbbae6c881` |
| Push / merge / deploy | **not performed** |
| Working tree at handover | software + evidence docs for this continuation |

## Totals

Canonical original titles: **UNKNOWN** (checklist file not in the repository after another history/docs search).  
Established-scope register: **exactly 237 items**, numbers 1–237 in order.

| Final state | Count | % of 237 |
| --- | --- | --- |
| VERIFIED_100 | 0 | 0.0% |
| PARTIAL | 216 | 91.1% |
| HUMAN_APPROVAL_REQUIRED | 13 | 5.5% |
| BLOCKED_EXTERNAL_DEPENDENCY | 7 | 3.0% |
| BLOCKED_AUTHORIZATION | 0 | 0.0% |
| BLOCKED_SECURITY | 0 | 0.0% |
| FAILED_VERIFICATION | 0 | 0.0% |
| NOT_IMPLEMENTED | 0 | 0.0% |
| NOT_APPLICABLE_WITH_EVIDENCE | 1 | 0.4% |

Mean established-scope completion: **69.1%** (was 68.9%). This is not 237/237 done. Original titles and acceptance criteria remain UNKNOWN.

Items blocked by missing original acceptance criteria: **all 237** cannot be VERIFIED_100. Confirmed original requirements: **none recovered**.

Separate dimensions:

| Dimension | This session |
| --- | --- |
| Implementation (local software, established scope) | ~69.1% mean; no VERIFIED_100 |
| Automated tests | Full vitest **971/971** (91 files); tsc 0; next lint 0; backup dry-run 0; production build 2044 pages; isolated Playwright **107 passed / 12 skipped / 0 failed** |
| Integration | ADAPTER_IMPLEMENTED / MOCK_OR_SIMULATED; not LIVE |
| Sandbox | UNKNOWN |
| Production | UNKNOWN (no probe/deploy) |
| Human approval | Pending for every high-impact action in `BUZZARD_237_HUMAN_APPROVAL_BLOCKERS.md` |

## Unresolved Playwright failures

**None on the isolated re-run after the mega-menu TEST_DEFECT selector fix.** 12 skips remain (filters).

## What was implemented this pass

- Item 42 dispatch idempotency on existing `core_ai_task_meta` (replay, conflict 409, RUNNING in-progress, FAILED replay, UNIQUE-race orphan cancel). Historical `67d82d4` on `cursor/pusat-idempotency-c293` was **not** copied (would be a second store).
- Approval expireDue `Date.parse`; `latestForTask` rowid tie-break; no remint after REJECTED/CANCELLED/EXECUTION_FAILED; EXPIRED remints.
- Public information disclosure: `GET /api/health/pusat` and `GET /api/health/software` require `system.read`.
- Inter-Cars classified locally; supplier feed preview locally idempotent.
- Mega-menu Playwright locator locale-safe.
- Register + companion docs updated. No push.

## What remains unverified

- Original 237 titles and acceptance criteria (UNKNOWN for all items).
- Live payments, Product SoT, sales, production DB, deploy, Render, CI on this SHA.
- Inter-Cars / TecDoc / alerting / production persistence (external).
- Human approval items 67, 73, 115/129, 155/165, 182, 213, 214, 219, 221, 225, 226.

## Highest-priority remaining work

1. Independent human recovery of the original 237-item checklist (or explicit waiver).
2. Remaining PARTIAL items whose established criteria are still incomplete (workers, durable feed cache, remaining public readiness pages).
3. External credentials only after human authorization (never invent LIVE_VERIFIED).
