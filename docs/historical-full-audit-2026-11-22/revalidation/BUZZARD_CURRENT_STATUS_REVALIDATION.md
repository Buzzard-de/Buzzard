# Buzzard current status revalidation

Date: 22 November 2026, Europe/Berlin.
Mode: read-only. No source file, task register, database, port, order, payment, or deploy was changed by this pass.
HEAD: `63e55af5a367b8841b771d6e06be846369129009` on `cursor/close-three-finance-gaps-c293`.
Previous audit HEAD: `9b86c1b70159c32d644f2596f61ae8388ad401ec` on `cursor/save-full-worktree-c293`.

## Method

The previous inventory has 597 rows and 590 distinct task ids. Seven rows are exact duplicates. This pass reread that inventory, the phase registers, the L2 audit, the sales lock, the marketplace registry, and the files named by the 109 limited-complete rows. It did not rerun the full historical test suite and it did not treat an old status as automatically still true.

A status moved only when today's code contradicts the old class:

- Eight `NOT_STARTED` rows now have local fail-closed code and a passing local test file. They are `PARTIAL`. Product and live acceptance are still open.
- `P21-T-16.1` no longer passes a prohibited party. It is `COMPLETE_WITH_LIMITATIONS`. Live tax filing stays blocked on other ids.
- Every other row keeps its class. The 237 original titles and acceptance lines were not found, so those rows stay `UNKNOWN_UNVERIFIED`.

## Previous technical claims

| Claim | Today |
|---|---|
| T-1.3 closed | `P21-T-1.3` is still `COMPLETE_WITH_LIMITATIONS`. The closure is a local hash/register close, not a live proof. |
| 51-item tests PASS | The register still records local pass evidence. This pass did not rerun those 51 tests. |
| T-2.1 PARTIAL | Unchanged. 330 L2 nodes, 9 reviewed labels in each of 30 locales, 321 unreviewed. |
| 18 live tasks blocked | The 18 named live ids are still `BLOCKED_EXTERNAL`. |
| 21 phases PARTIAL | Each phase gate still has a blocked live check or an explicit `completeClaim: false`. |
| productionReady=false, live=false | Unchanged in the phase gates. |
| Sales locked | `isSalesEnabled()` is false unless `BUZZARD_SALES_ENABLED` is exactly `1`. |
| Capture/refund 403 | Confirm, refund, intent create, invoice create, and signed finance webhooks return 403 while sales are locked. |
| Egress default deny | Unchanged. This pass did not open a live egress path. |
| PR deploy blocked | No deploy was run. Open phase PRs were not merged. |
| Render API keys missing | No Render key was added. |
| HEAD `9b86c1b7` | That commit is an ancestor. Current HEAD is `63e55af5`. |

## What moved since the previous audit

Local only, and already recorded on this branch before this read-only pass:

- Staff payment routes require an admin session.
- Unsigned finance webhooks stay closed when no secret is configured.
- Signed finance webhooks do not write payment, payout, or dispute rows while sales are locked.
- Holiday drafts and device reviews are capped at 64 in process memory.
- Eight previously empty surfaces now have local gates. None of them call a live model, ad network, camera upload, or supplier.

## Registers searched again

Found and used: the 597-row inventory, the 51-item list, the 21-phase register, the 45 missing-feature ids, the 16 special items, the 15 Cursor Aufgaben, and the 65, 48, and 26 checkbox lists cited by the previous cross-reference.

Not found, and not invented:

- The original numbered 237-item checklist. The file that first appears at `4b0ce17` says the original titles and acceptance criteria are unknown.
- A 257-item list.
- An 80-item plan.
- A 10-module program as a task register.

## Current record

597 rows. 590 distinct. 7 duplicates.

| Status | Count |
|---|--:|
| VERIFIED_COMPLETE | 0 |
| COMPLETE_WITH_LIMITATIONS | 110 |
| PARTIAL | 38 |
| NOT_STARTED | 0 |
| BLOCKED_EXTERNAL | 54 |
| BLOCKED_AUTHORIZATION | 0 |
| BLOCKED_SECURITY | 0 |
| DUPLICATE | 7 |
| UNKNOWN_UNVERIFIED | 388 |

110 + 38 + 0 + 54 + 7 + 388 = 597.

No row is verified complete. Code, a passing local test, a sandbox adapter, or a document is not production proof.
