# Buzzard 237 — Final handover (this execution)

Date: 2026-10-14  
This document is a session handover, not a claim that 237/237 items are complete.

## Git

| Field | Value |
| --- | --- |
| Branch | `cursor/software-completion-local-c293` |
| Starting HEAD | `90d9a14884af317db972822b28ce6b1adf937e7f` |
| Ending HEAD (code) | see git after local commit |
| Push / merge / deploy / PR | **not performed** |

## Totals

Canonical original titles: **UNKNOWN**. Register first created in `4b0ce17`; no earlier 237 source recovered.

| Final state | Count | % of 237 |
| --- | --- | --- |
| VERIFIED_100 | 0 | 0.0% |
| PARTIAL | 216 | 91.1% |
| HUMAN_APPROVAL_REQUIRED | 13 | 5.5% |
| BLOCKED_EXTERNAL_DEPENDENCY | 7 | 3.0% |
| NOT_APPLICABLE_WITH_EVIDENCE | 1 | 0.4% |

Mean established-scope completion: **69.4%** (was 69.3%; register average 69.38%). Not 237/237. Not +1 pp.

## What was implemented this pass

- Public error keys sanitized; Control Center / Pusat submit no longer return exception text.
- Commerce idempotency fingerprints payloads (409) and does not store failures.
- Incoming correlation/request IDs reject injection/oversize.
- Reservation expire parses SQLite timestamps; job FAILED retries backups only, never financial ops.
- Production backup destination under `/tmp` fail-closed.
- Vitest 991 passed. Playwright not re-run this pass.

## Highest-priority remaining work

1. Recover original 237 titles/criteria or obtain an explicit waiver.
2. Remaining PARTIAL: remaining plugin error leaks, item 109 webhook live verify, item 187 production restore HUMAN, live inventory/supplier BLOCKED.
3. Human approvals and external credentials (never invent LIVE_VERIFIED).
4. Isolated Playwright after `:3010`/`:3001` are dedicated — not re-run this pass.
