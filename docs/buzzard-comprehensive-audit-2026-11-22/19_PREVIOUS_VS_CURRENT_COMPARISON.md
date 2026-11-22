# Previous versus current

The 22 November revalidation is unchanged on disk. This file is a new comparison.

| | Revalidation | This audit |
|---|--:|--:|
| Rows | 597 | 597 |
| Distinct | 590 | 590 |
| Duplicates | 7 | 7 |
| VERIFIED_COMPLETE | 0 | 0 |
| COMPLETE_WITH_LIMITATIONS | 110 | 110 |
| PARTIAL | 38 | 38 |
| NOT_IMPLEMENTED | 0 | 2 |
| BLOCKED_EXTERNAL | 54 | 54 |
| UNKNOWN_UNVERIFIED | 388 | 386 |

## What changed

| ID | Previous | Current | Evidence |
|---|---|---|---|
| MF-ORD-03 | UNKNOWN_UNVERIFIED | NOT_IMPLEMENTED | `orderManagement.js` `cancelOrder` sets the whole order to `cancelled`. `splitOrder` creates another order. No selected-line cancel on the same order was found under `server/`. |
| MF-LOG-03 | UNKNOWN_UNVERIFIED | NOT_IMPLEMENTED | `carrierContract.js` includes a `LOST` status. No timed lost-shipment detector, customer alert, or next-step automation was found. `notifyStub.js` returns `sent: false`. |

## What did not change

- 237 slots still have no original title. Commit `a4b84b90` already recorded that the checklist was absent from local history. This pass searched `git log --all --grep=237` again and found the same register, not an earlier numbered source.
- 149 known-text tasks stay UNKNOWN_UNVERIFIED because their checkboxes and August marks were not re-run.
- 110 limited-complete, 38 partial, 54 external-blocked, and 7 duplicate rows keep their revalidation class. This pass re-read the locks those classes depend on. It did not rerun every historical test, so none of them became VERIFIED_COMPLETE.
- HEAD moved earlier from `9b86c1b7` to `63e55af5` before this audit. This audit did not add a commit.

## 388 split, then and now

| | Last unknown-task review | This audit |
|---|--:|--:|
| Unknown original title | 237 | 237, still UNKNOWN TITLE |
| Known source text | 151 | 151 |
| Named gap | 2, reported as code not found | 2, now NOT_IMPLEMENTED |
| Still unverified | 386 | 386 |
