# Task register cross-reference

Each register keeps its own numbering. Rows are not merged into one title.

## Registers investigated

| Register | File | In HEAD? | Numbered items extracted | Verdict |
|----------|------|----------|--------------------------:|---------|
| 237-slot execution register | `docs/software-completion/BUZZARD_237_MASTER_EXECUTION_REGISTER.md` at `6e9d192` | No | 237 | Constructed. Original checklist not found. |
| 80-item plan | Cited by `BUZZARD_80_TASKS_OLD_VS_CURRENT_2026-10-17.md` on that same branch | No | 0 | The document says the numbered plan was not found. |
| 257-item list | Not found | No | 0 | No such register. |
| 51-item development list | `server/lib/platform/devList51.js` | Yes | 51 | Current. |
| 21-phase task register | `docs/software-completion/BUZZARD_PHASE_1_21_TASK_REGISTER.md` | Uncommitted only | 52 unique IDs (71 table rows, later row kept) | Current worktree ledger. |
| 21 ordered phases | `data/master/buzzard_ordered_phases.v1.json` | Yes | 21 phases | Phase status, not a second task list. Not added again as tasks. |
| Special 16 | `docs/MASTER_COMMAND/SPECIAL_16_TASKS.json` | Yes | 16 | Binding list of a different command. |
| Master command phases | `docs/MASTER_COMMAND/MASTER_TASKS.json` | Yes | 8 | Earlier command. Kept. |
| Incomplete checklist | `data/master/buzzard_incomplete_checklist.v1.json` | Yes | 34 | 7 rows duplicate the 51-list. |
| Missing features | `BUZZARD_MISSING_FEATURES_MASTER_LIST.md` | Yes | 45 `MF-*` | Overlaps the 51-list where the evidence cites a dev-list number. |
| Cursor Aufgaben | `exports/Buzzard24_Cursor_Aufgaben/` | Yes | 15 | August 2026. Second export copy not counted again. |
| Final master checklist | `intelligence/production/FINAL_MASTER_CHECKLIST.md` | Yes | 65 checkboxes | October audit said this is not the 237 register. |
| Go-live checklist | `data/BUZZARD_FINAL_GO_LIVE_CHECKLIST.md` | Yes | 48 checkboxes | Operational lines. |
| Part 4 deploy checklist | `docs/PART4_DEPLOY_CHECKLIST.md` | Yes | 26 checkboxes | Deploy lines. |
| 10-module program | Not found | No | 0 | No numbered program under that name. |

## Exact duplicates

These incomplete-checklist rows cite a dev-list number or are the same live supplier requirement. They stay in the inventory as `DUPLICATE` and point at the dev-list row.

| Duplicate ID | Same requirement |
|--------------|------------------|
| INC-live_supplier_api | DL51-20 |
| INC-1 | Live TecDoc, DL51-19 |
| INC-2 | Live supplier, DL51-20 |
| INC-3 | Live capture, DL51-28 |
| INC-4 | Live refund, DL51-30 |
| INC-5 | Tax Connect, DL51-37 |
| INC-6 | Live carrier rate, DL51-41 |

The second copy of `exports/buzzard24-cursor-aufgaben/` was not ingested. The `intelligence/buzzard_ki_gesamt/aktiv/` tree repeats many intelligence documents. Those files are duplicate files. Their tasks were not entered twice.

## Overlaps that are not the same ID

- `P21-T-1.3` is the task that required one assertion per `DL51-*` item. The 51 items remain the requirements. T-1.3 is the verification task.
- `MF-*` rows that mention `dev-list #N` describe the same gap as `DL51-N`. They are overlapping records because the wording and the source differ. They were not collapsed.
- `S16-01` (Textile AI, virtual try-on) overlaps phase 9 and `MF-TEX-*`. The special-16 acceptance status is still `COMMAND_GIVEN`, so it stays `NOT_STARTED` as a product requirement even where a dry textile recommendation exists.
- `MC16-*` overlaps `S16-*` by theme. The source file says they are different commands.
- `CUR-*` overlaps later phase tasks. The August status marks are not treated as the current state.
- Checkbox rows in the three checklists overlap deploy, payment, and supplier tasks. Their current status stays `UNKNOWN_UNVERIFIED` or `BLOCKED_EXTERNAL`. They were not matched line-by-line to the 237 slots, because those slots have no original titles.

## Incorrect earlier completion claims

- The 237 register’s established-scope mean was written as about 100 percent while `VERIFIED_100` was 0 and original criteria were unknown. That percentage is not completion.
- Cursor Aufgaben on 28 August 2026 marks production readiness and deploy as done. The current tree still has sales locked, egress deny, and no production verification.
- Ordered-phase `gatePercent` of 100 is a software-gate figure. `completeClaim` is false on those phase objects. The November worktree status file still classifies all 21 phases as PARTIAL.

## Tasks in an older register and absent from a newer one

The 237 slots are not copied into the 21-phase register. Because their original titles are unknown, this audit cannot say which of them are missing from the newer register and which were rewritten. That gap is recorded as unknown, not as a guessed mapping.

The six live-blocked dev-list items are present in the 51-list, the incomplete checklist, and the phase register as separate blocked tasks (`T-4.2`, `T-7.2`, `T-8.2`, `T-10.3`, `T-16.3`, and the related live rows). The numbering is not the same.
