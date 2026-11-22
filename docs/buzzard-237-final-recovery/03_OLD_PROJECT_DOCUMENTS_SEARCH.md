# Old project documents search

Search date: 22 November 2026, evening Europe/Berlin.

These are separate documents. A similar subject is not treated as the same task. None of them numbers items 1–237 with an original title.

Filesystem checkout time for most of these files is 21 November 2026, 16:12 Europe/Berlin. The date column uses the date written in the file when the file has one.

| File | Location | Source type | Date | Item count on disk | Original 237 list? | Copy? | Incomplete for this search? | Reliability |
|---|---|---|---|---|---|---|---|---|
| User message 106849, section C | Cursor transcript `bc-a02d07fa` | Creating directive | Immediately before the follow-up that names HEAD `4b0ce17` | 14 range sentences covering numbers 1–237; 0 titles | It names the checklist and withholds its text | No | Yes | High |
| `intelligence/production/FINAL_MASTER_CHECKLIST.md` | worktree | Architecture checklist | No internal calendar date in the heading | 65 checkboxes | No | A duplicate tree exists under `intelligence/buzzard_ki_gesamt/aktiv/` | Different list | High |
| `data/BUZZARD_FINAL_GO_LIVE_CHECKLIST.md` | worktree | Go-live checklist | No internal calendar date in the heading | 48 checkboxes | No | No second copy counted | Different list | High |
| `docs/PART4_DEPLOY_CHECKLIST.md` | worktree | Deploy checklist | No internal calendar date in the heading | 26 checkboxes | No | No | Different list | High |
| `BUZZARD_MISSING_FEATURES_MASTER_LIST.md` | worktree root | Missing-feature inventory | No single calendar date in the heading | 45 distinct `MF-*` identifiers | No | No | Different list | High |
| `exports/Buzzard24_Cursor_Aufgaben/` | worktree | Cursor task pack | `STATUS.md` says 28 August 2026 | 15 numbered files, 01–15, plus README, STATUS, a do-not-do file, and a master prompt | No | The pack is the export itself | Different list | High for those 15 German headings |
| `docs/software-completion/BUZZARD_PHASE_1_21_TASK_REGISTER.md` | worktree | Phase ledger | Updates dated 21 November 2026, Europe/Berlin | 69 table rows, 50 distinct `T-n.n` identifiers; 19 identifiers appear twice | No | A copy is in `/home/ubuntu/buzzard-checkpoint-audit-preserve/` | Different list | High for this recount |
| `docs/software-completion/BUZZARD_PHASE_1_21_MASTER_STATUS.md` | worktree | Phase status | 21 November 2026, Europe/Berlin | 21 phases, all left PARTIAL in the file | No | Preserve-folder copy | Status, not the 237 titles | High |
| `data/master/buzzard_ordered_phases.v1.json` | worktree | Ordered phases | See `updatedAt` inside the file | 21 phases | No | No | Different list | High |
| `server/lib/platform/devList51.js` | worktree | Code evaluator | Comment: “51-item development close-out.” | The function asserts `items.length === 51` | No | No | Different list; items are code checks, not a pasted title list | High |
| `data/master/buzzard_incomplete_checklist.v1.json` | worktree | Incomplete-work JSON | `updatedAt` 19 November 2026, 15:38 Europe/Berlin | 34 rows that carry a status | No | No | Different list. Six rows cite dev-list numbers 19, 20, 28, 30, 37, and 41 | High |
| `docs/MASTER_COMMAND/MASTER_TASKS.json` | worktree | Master command | `updatedAt` 1 November 2026, 15:00 Europe/Berlin | 8 phases | No | No | Different list | High |
| `docs/MASTER_COMMAND/SPECIAL_16_TASKS.json` | worktree | Special command | `updatedAt` 1 November 2026, 21:25 Europe/Berlin | 16 items | No | No | Different list | High |
| `BUZZARD_MASTER_DEVELOPMENT_PLAN.md` | worktree root | Development plan | 19 November 2026, 15:40 Europe/Berlin | Points at the 21 phases and the 51-item evaluator | No | No | Different list | High |
| `exports/Buzzard24_Cursor_Aufgaben/STATUS.md` | worktree | Status of the 15 Aufgaben | 28 August 2026 | 15 rows | No | No | Different list | High |

## Documents named in the request and not present as a numbered source

| Named document | On-disk result |
|---|---|
| 80-item plan | `BUZZARD_MASTER_DEVELOPMENT_PLAN.md` and later chat messages say “80 maddelik” and “1–80”. No file in this worktree contains 80 numbered original titles. The 17 October 2026 chat orders a report on items 1–80. That order does not paste the 80 titles. |
| 257-item list | No file with a 257-item task list. Inbox filenames containing `257` are hex fragments. |
| 10-module program | No numbered program under that name in the searched trees. |
| 52 phase task IDs | The current phase register recount is 50 distinct `T-n.n` identifiers and 69 rows. This recount stands on its own. |
| 45 missing features | Present, as the 45 `MF-*` rows. Different identifiers. |
| 15 Cursor Aufgaben | Present, files 01–15. German headings belong to that August pack. |
| 65, 48, and 26 checklists | Present, as the three checkbox files above. |

## Matching rule

No row in those lists was paired with an item number from 1 to 237. The creating directive says the range sentences are navigation aids. The later lists use their own numbers (`MF-*`, `DL51` positions, `T-n.n`, Aufgabe 01–15, checkbox lines). Shared themes such as payment, shipping, or security are not evidence that two rows are the same task.
