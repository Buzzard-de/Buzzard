# Buzzard 237 — Final handover (this execution)

Date: 2026-10-15  
This document is a session handover, not a claim that 237/237 items are complete.

## Git

| Field | Value |
| --- | --- |
| Branch | `cursor/software-completion-local-c293` |
| Starting HEAD | `18dda24` |
| Ending HEAD (code) | `444dae1` |
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

Mean established-scope completion: **72.69%** (was 72.18%). This pass **+0.51 pp**. Target +1.0 **NOT MET** (237 puan gerekir; 120 puan gerçek iş).

## What was implemented this pass

- Plugin admin/auth responses use `security.adminRequired` / `security.authRequired` instead of English prose.
- `dbAuth`, `salesMode`, commerce guards, OMS, identity, WMS, supplier, checkout, payments, and product store return keys.
- Plugin `{ error: result.error }` goes through `sendKeyedResult` (`success: false, errorKey`).
- Insufficient stock no longer includes SKU. Guardian/orchestrator 502 omit `detail`.
- Vitest 1055 passed. tsc clean.

## Highest-priority remaining work

1. Recover original 237 titles/criteria or obtain an explicit waiver.
2. Leftover English `error:` strings in some lib modules.
3. Contact German UX `message`; generic SQLITE_CONSTRAINT text.
4. Marketplace/carrier adapters, item 185 EXTERNAL, live webhook, 187 HUMAN.
5. Human approvals and external credentials (never invent LIVE_VERIFIED).
