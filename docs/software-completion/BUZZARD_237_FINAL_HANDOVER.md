# Buzzard 237 — Final handover (this execution)

Date: 2026-10-15  
This document is a session handover, not a claim that 237/237 items are complete.

## Git

| Field | Value |
| --- | --- |
| Branch | `cursor/software-completion-local-c293` |
| Starting HEAD | `8fb4cf7` |
| Ending HEAD (code) | `f69cb46` |
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

Mean established-scope completion: **72.14%** (was 72.05%). This pass **+0.09 pp**. Target +1.0 **NOT MET** (237 puan gerekir; ~21 puan gerçek iş).

## What was implemented this pass

- `classifySystemFailure` maps AbortError/timeout/network/SQLite **codes**, not free-text.
- jobWorker `classifyError` no longer substring-scans `err.message`.
- Pusat exceptions prefer structured/system codes before `inferCode`.
- API 413 uses `PAYLOAD_TOO_LARGE` only; static 403 is `security.forbidden`.
- Desktop-bridge 401/404/stderr emit keys.
- Automation dashboard timeout/cost counts use exception keys.
- Vitest 1048 passed. tsc clean.

## Highest-priority remaining work

1. Recover original 237 titles/criteria or obtain an explicit waiver.
2. `inferCode` still scans free-text when no structured code (kept for existing 401/429 tests).
3. Generic SQLITE_CONSTRAINT still reads constraint-failed message internally.
4. Marketplace/carrier adapters, item 185 EXTERNAL, 109 live webhook, 187 HUMAN.
5. Human approvals and external credentials (never invent LIVE_VERIFIED).
