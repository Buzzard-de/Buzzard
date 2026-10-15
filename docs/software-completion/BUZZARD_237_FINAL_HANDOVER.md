# Buzzard 237 — Final handover (this execution)

Date: 2026-10-15  
This document is a session handover, not a claim that 237/237 items are complete.

## Git

| Field | Value |
| --- | --- |
| Branch | `cursor/software-completion-local-c293` |
| Starting HEAD | `c2d7c8f` (claimed 9424e73 / 72.18% was stale) |
| Ending HEAD (code) | local commits after `ebcdcdf` |
| Push / merge / deploy / PR | **not performed** (KOMUT 5) |

## Totals

Canonical original titles: **UNKNOWN**. Register first created in `4b0ce17`; no earlier 237 source recovered.

| Final state | Count | % of 237 |
| --- | --- | --- |
| VERIFIED_100 | 0 | 0.0% |
| PARTIAL | 216 | 91.1% |
| HUMAN_APPROVAL_REQUIRED | 13 | 5.5% |
| BLOCKED_EXTERNAL_DEPENDENCY | 7 | 3.0% |
| NOT_APPLICABLE_WITH_EVIDENCE | 1 | 0.4% |

Mean established-scope completion: **73.12%** (was 73.03%). This pass **+0.09 pp**. Target +0.30 **NOT MET** (22 puan gerçek iş / 237).

## What was implemented this pass

- SQLite UNIQUE/PRIMARY classified separately from CHECK/FK; public responses use `db.uniqueConstraint` / `db.constraint` / `db.error`.
- UNIQUE conflicts are `CONFLICT` → `PUSAT_VALIDATION_FAILED` and are not retried as generic database failures.
- Pusat submit unique-race no longer rethrows raw sqlite errors.
- Contact file write is fail-closed; German UX `message` kept.
- Account and analytics exports drop secret-shaped fields.
- Marketplace/carrier inspected only: still blocked stubs, not LIVE_VERIFIED.
- Esat Bey items 227–237 were **not** started.

## Highest-priority remaining work

1. Recover original 237 titles/criteria or obtain an explicit waiver.
2. Marketplace/carrier adapters remain BLOCKED_EXTERNAL / unpublished.
3. Item 185 alerting; live webhook HUMAN; item 187 restore HUMAN.
4. Human Approval Center work, then Esat Bey maximum-security stage.
