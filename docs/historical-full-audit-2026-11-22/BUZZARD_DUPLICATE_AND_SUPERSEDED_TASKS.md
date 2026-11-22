# Duplicate and superseded tasks

Historical records are kept. Nothing in an older register was deleted by this audit.

## Counts

| Measure | Count | Rule |
|---------|------:|------|
| Historical task records | 597 | Every extracted numbered row |
| Distinct tasks | 590 | Records whose status is not `DUPLICATE` |
| Exact duplicates | 7 | Incomplete-checklist rows that are the same requirement as a dev-list row |
| Overlapping distinct tasks | 31 | Distinct rows whose `overlap_with` field names another ID or register |
| Superseded tasks | 0 | No row was given status `SUPERSEDED`. Superseded documents are listed below instead of being guessed onto task IDs. |
| Cancelled tasks | 0 | No register row was marked cancelled. |
| Unknown tasks | 388 | `UNKNOWN_UNVERIFIED` |

590 + 7 = 597.

## Exact duplicate records

| Record | Points at |
|--------|-----------|
| INC-live_supplier_api | DL51-20 |
| INC-1 | DL51-19 |
| INC-2 | DL51-20 |
| INC-3 | DL51-28 |
| INC-4 | DL51-30 |
| INC-5 | DL51-37 |
| INC-6 | DL51-41 |

## Overlapping names

These are not counted twice in the distinct total only when they are the seven rows above. The overlaps below remain distinct because the source text is a different requirement or a different layer of the same theme.

- Phase task `P21-T-1.3` versus the 51 dev-list items. T-1.3 is the demand for one assertion each. The items are the requirements.
- `MF-*` rows that cite `dev-list #N` versus `DL51-N`.
- `S16-01` textile try-on versus phase 9 and `MF-TEX-*`. Dry recommendation code does not make the try-on product started. S16-01 stays `NOT_STARTED`.
- `MC16-*` versus `S16-*`. The special-16 file says the older 16-area command is a different list.
- `CUR-*` versus later phase tasks. August completion marks are not the current status.
- Checkbox rows versus payment, supplier, and deploy tasks. No line was proven to be the same sentence as an H237 slot.

## Reported complete, then contradicted

- H237 established-scope percentages, including a mean written near 100 percent. The same file sets `VERIFIED_100` to 0 and says original criteria are unknown. Current status of those slots is unknown, not complete.
- Cursor Aufgaben 01 and 15 (deploy and production readiness) marked done on 28 August 2026. Current code keeps sales off and the November phase ledger keeps every phase partial.
- Ordered-phase `gatePercent` 100. `completeClaim` is false in that JSON.

## Reported unfinished, then locally closed

The 21-phase register’s later cells mark local closures for T-00, T-01, T-1.1, T-1.3, T-3.1, T-6.1, T-7.1, and the other “Done” rows. Those are `COMPLETE_WITH_LIMITATIONS` in this inventory. The live half of the same cells stays blocked. This audit did not re-run the tests named in those cells.

## Abandoned or replaced documents

- Static Pages site, replaced by the application tree. The first commit remains the start of the history.
- 237 register branch, not contained in HEAD. The file is absent from the worktree.
- 8-phase master command, still on disk, no longer described as the binding 16.
- August production-readiness checkmark, contradicted by later audits.

No task ID was assigned the status `CANCELLED` or `SUPERSEDED`, because the sources do not use those words for a numbered item. The documents above are the superseded artifacts.
