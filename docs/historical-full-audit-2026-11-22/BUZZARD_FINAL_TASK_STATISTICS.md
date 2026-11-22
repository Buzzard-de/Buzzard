# Final task statistics

Generated from `BUZZARD_MASTER_TASK_INVENTORY.json` on 22 November 2026.  
Distinct statuses sum to the distinct task count. Duplicate rows are outside that sum.

## Reconciliation

| | Count |
|--|------:|
| Historical task records | 597 |
| Exact duplicates | 7 |
| Distinct tasks | 590 |
| 590 status cells | 0 + 109 + 30 + 8 + 55 + 0 + 0 + 0 + 0 + 0 + 0 + 388 |

Status arithmetic: 109 + 30 + 8 + 55 + 388 = 590.

## Requirement classes

Each distinct task has one class. The classes sum to 590. They are not a second counting of the same task under several headings. Security work that sits inside an H237 slot or a phase task keeps that row’s class. A keyword search was not used, because words such as “checklist” would count the same row twice.

| Class | Distinct tasks |
|-------|---------------:|
| Software requirements | 487 |
| Architectural requirements | 42 |
| Integration requirements | 43 |
| Security requirements | 2 |
| Testing requirements | 10 |
| Operational requirements | 6 |
| Future-project requirements | 0 |
| Total | 590 |

Future names Buzzard Film and Buzzard Bank were not found as numbered tasks or as modules. Buzzard Logistics exists as intelligence documents and as carrier code, and those rows are already inside the classes above. They were not added again.

## Status totals

| Status | Distinct tasks |
|--------|---------------:|
| Verified complete | 0 |
| Complete with limitations | 109 |
| Partial | 30 |
| Not started | 8 |
| External blockers | 55 |
| Authorization blockers | 0 |
| Security blockers | 0 |
| Deferred | 0 |
| Cancelled | 0 |
| Superseded | 0 |
| Duplicates (not in the distinct total) | 7 |
| Unknown or unverified | 388 |

Overlapping distinct tasks, recorded but not removed: 31.

## Other counts, not tasks

| Object | Count |
|--------|------:|
| Commits on HEAD | 746 |
| Commits on all reachable refs | 1,347 |
| Remote-tracking branches | 394 |
| Local branches | 3 |
| Tags | 2 |
| Worktree files classified | 4,661 |
| Markdown files | 858 |
| Text files | 17 |
| Checkpoint filenames | 19 |
| Report-like filenames | 183 |
| `node_modules` files excluded | 19,336 |
| `.next` files excluded | 82 |
| Historical paths absent from the worktree | 4,581 |
| Ordered phases | 21, all `completeClaim` false |
| Dev-list items | 51 |
| H237 slots | 237 |

## Identity checks

- Every inventory row has a unique `id`.
- Every inventory row has a `source` path or an explicit not-found note is in the cross-reference for lists that were not extracted.
- The 7 duplicate rows name the dev-list row they repeat.
- 237, 51, 52 phase-task IDs, 16, and 8 were extracted from their files. 257 and the 10-module program had no file to extract. The 80-item plan had no numbered file to extract.

## Limits

`COMPLETE_WITH_LIMITATIONS` means a local software claim with a cited test or a source status of code-ready. It does not mean live, production, or sales-enabled. `UNKNOWN_UNVERIFIED` is used where the criterion is missing or the evidence is on a branch that is not in HEAD. No total here was estimated.
