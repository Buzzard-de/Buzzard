# Completion status matrix

Status values are the audit vocabulary. A passing local test is not `VERIFIED_COMPLETE`. A connector with `networkBlocked` or `PUBLISH_BLOCKED` is not a live integration. The 21 ordered phases in `buzzard_ordered_phases.v1.json` all have `completeClaim: false`. The uncommitted phase status document still marks phases 1–21 PARTIAL. That phase rollup is not the same object as the task counts below.

## Distinct tasks by status

| Status | Count |
|--------|------:|
| VERIFIED_COMPLETE | 0 |
| COMPLETE_WITH_LIMITATIONS | 109 |
| PARTIAL | 30 |
| NOT_STARTED | 8 |
| BLOCKED_EXTERNAL | 55 |
| BLOCKED_AUTHORIZATION | 0 |
| BLOCKED_SECURITY | 0 |
| DEFERRED | 0 |
| CANCELLED | 0 |
| SUPERSEDED | 0 |
| FAILED_VERIFICATION | 0 |
| UNKNOWN_UNVERIFIED | 388 |
| Distinct total | 590 |

`DUPLICATE` rows: 7. They are not in the table. 590 + 7 = 597 historical records.

## Where each status comes from

| Group | Records | Current status rule |
|-------|--------:|---------------------|
| H237-001 … H237-237 | 237 | `UNKNOWN_UNVERIFIED`. Original criteria unknown. Scoring branch is not in HEAD. Historical file said PARTIAL and VERIFIED_100 = 0. |
| DL51-01 … DL51-51 | 51 | 45 `COMPLETE_WITH_LIMITATIONS` from the 22 November behavior tests. 6 `BLOCKED_EXTERNAL` (19, 20, 28, 30, 37, 41). |
| P21-T-* | 52 | 32 local closures `COMPLETE_WITH_LIMITATIONS`. 19 open live or port-restart rows `BLOCKED_EXTERNAL`. T-2.1 `PARTIAL` (321 of 330 L2 nodes lack reviewed non-German labels). |
| S16-01 … S16-16 | 16 | Mapped from the file’s acceptance status. `CODE_READY` is `COMPLETE_WITH_LIMITATIONS`. `BLOCKED` is `BLOCKED_EXTERNAL`. `COMMAND_GIVEN` is `NOT_STARTED`. `PARTIAL` stays `PARTIAL`. |
| MC16-01 … MC16-08 | 8 | `COMPLETE` and `CODE_READY` in that old file are `COMPLETE_WITH_LIMITATIONS`, not verified production. |
| INC-* except the 7 duplicates | 27 | Legend in the checklist, with dev-list copies removed from this count. |
| MF-* | 45 | Class E blocked, B partial, D or C not started, G unknown. |
| CUR-01 … CUR-15 | 15 | `UNKNOWN_UNVERIFIED`. August checkmarks are not accepted. |
| CHK-FINAL, CHK-GOLIVE, CHK-P4 | 139 | Unchecked live or credential lines `BLOCKED_EXTERNAL`. Every other checkbox `UNKNOWN_UNVERIFIED`. |

## Dimensions that stay separate

| Question | Result |
|----------|--------|
| Implemented in local code? | Yes for the closed dev-list items, the closed phase tasks, and many engines under `server/lib`. No for live provider calls. |
| Tested? | The 51-item file, the phase gates, and the 22 November isolated runs are recorded in `docs/software-completion/`. This audit did not re-run them. |
| Integration completed? | Dry adapters and blocked connectors only. No live supplier, payment, marketplace, carrier, or tax filing. |
| Security verified? | Egress default DENY and the sales lock are present in code. A live reload of the process on port 3001 was not performed. T-1.2 and T-17.3 stay blocked for that reason. |
| Sandbox verified? | Payment sandbox capture returns a refusal. That is a lock, not a successful payment sandbox with a provider. |
| Live verified? | No task. |
| Production verified? | No task. |
| Human approval | Required for sales, payments, supplier purchases, marketplace publishing, customer messages, carrier purchases, deploy, and port restart. |

## Not started

`S16-01` Textile AI product scope, `S16-06` AB-27 national days, `MF-SUP-02` supplier order orchestrator with no `require` references found by that audit, `MF-TEX-01`, `MF-TEX-02`, `MF-SF-02`, `MF-MKTG-01`, `MF-MKTG-02`.

These are the rows whose source text says the function or product surface is absent. Other unfinished live work is `BLOCKED_EXTERNAL` because a dry path exists and the live step is the blocker.
