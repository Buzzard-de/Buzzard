# Buzzard 237 — Final handover (this execution)

Date: 2026-10-15  
This document is a session handover, not a claim that 237/237 items are complete.

## Git

| Field | Value |
| --- | --- |
| Branch | `cursor/software-completion-local-c293` |
| Starting HEAD | `000954b` |
| Ending HEAD (code) | `76eecce` |
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

Mean established-scope completion: **72.05%** (was 71.97%). This pass **+0.08 pp**. Target +1.0 **NOT MET** (237 puan gerekir; ~19 puan gerçek iş).

## What was implemented this pass

- `isUniqueConstraint` prefers `SQLITE_CONSTRAINT_UNIQUE` / `PRIMARYKEY`; generic `SQLITE_CONSTRAINT`/`19` only then reads constraint-failed text.
- tracking, deliveryProof, Pusat submit, paymentLifecycle no longer `/UNIQUE/i` on free text.
- Contact plugin returns `errorKey`; logs `{ received: true, id }` without email.
- Vitest 1042 passed. tsc clean.

## Highest-priority remaining work

1. Recover original 237 titles/criteria or obtain an explicit waiver.
2. Generic SQLITE_CONSTRAINT still reads constraint-failed message internally.
3. jobWorker `classifyError` still substring-scans `err.message`.
4. Marketplace/carrier adapters, item 185 EXTERNAL, 109 live webhook, 187 HUMAN.
5. Human approvals and external credentials (never invent LIVE_VERIFIED).
