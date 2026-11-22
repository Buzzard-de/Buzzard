# Computer and backup search

Search date: 22 November 2026, evening Europe/Berlin.

Only paths that exist on this machine were opened. Missing folders were recorded as absent. They were not treated as scanned.

## Paths that exist and were searched

| Path | What was done |
|---|---|
| `/home/ubuntu/buzzard-worktrees/save-full-worktree-c293` | Filename inventory and content search of `.md`, `.txt`, `.csv`, `.json`. All 273 `.zip` members were opened in memory and searched. |
| `/workspace` | Second checkout on `cursor/pim-catalog-foundation-c293`. Filename inventory. Its `intelligence/archive` zip names and sizes match the worktree copies. Those zip bytes were not opened a second time. |
| `/home/ubuntu/buzzard-checkpoint-audit-preserve` | Two phase-register copies. Phrase search: no 237-item checklist. |
| `/cursor/stores/bc-a02d07fa-e72e-400c-892f-ce9921a3c293` | Checkpoint notes and an inbox. Phrase search: no checklist. Two inbox filenames contain the hex fragment `257`. That is not a 257-item list. |
| `/home/ubuntu/.cursor` | Project and plugin files. No chat database. Phrase search: no checklist. |
| `/tmp/cursor/cloud-agent-transcripts/` | Transcripts fetched for this search. Results are in `01_CURSOR_HISTORY_SEARCH.md`. |

Worktree file counts, excluding `node_modules` and `.git`: 904 `.md`, 17 `.txt`, 33 `.csv`, 316 `.json`, 273 `.zip`, 0 `.docx`, 0 `.xlsx`, 0 `.pdf`, 0 `.rar`, 0 `.7z`.

Keywords used in names and contents: BUZZARD, 237, MASTER, EXECUTION, TASK, CHECKLIST, ROADMAP, SOFTWARE COMPLETION, PROJECT PLAN, plus the Turkish phrases `237 maddelik` and `237 görev`.

## Zip result

One zip member matched the 237-list phrases:

`/home/ubuntu/buzzard-worktrees/save-full-worktree-c293/BUZZARD_FULL_AUDIT.zip`

Member: `docs/historical-full-audit-2026-11-22/BUZZARD_TASK_REGISTER_CROSS_REFERENCE.md`

The zip listing is 11 files, about 1.46 MB, timestamps 22 November 2026 01:24–01:26. It is a copy of the 22 November historical audit. It says the original 237 checklist was not found. It does not contain original titles.

The intelligence archive zips (taxonomy, commerce engines, council packages) did not contain the phrases.

## Paths that are not on this machine

These were checked for existence only. They are absent, so they were not scanned:

- `/home/ubuntu/Desktop`
- `/home/ubuntu/Documents`
- `/home/ubuntu/Downloads`
- `/home/ubuntu/Masaüstü`
- `/home/ubuntu/Belgeler`
- `/home/ubuntu/İndirilenler`
- `/opt/backups`

`/mnt` and `/media` exist and are empty. No disk, phone, or shared folder is mounted there.

The user’s own computer, its backup disks, and its Downloads folder are not available from this environment.

## Document classification for files that matched by name

Filesystem time on the worktree files is 21 November 2026, 16:12 Europe/Berlin, except the phase register and `devList51.js`, which are 22 November 2026, 00:55–00:58 Europe/Berlin. That time is the worktree checkout time. Dates below are the dates written inside each document when one is present.

| File | Location | Source type | Date inside the file | Item count | Original 237 list? | Copy? | Incomplete? | Reliability |
|---|---|---|---|---|---|---|---|---|
| `BUZZARD_FULL_AUDIT.zip` | worktree root | Audit archive | 22 November 2026 | The cross-reference, not 237 titles | No | Copy of the 22 November audit | Yes, titles absent | High for the audit statement that the checklist was missing |
| `intelligence/archive/*.zip` | worktree and `/workspace` | Module packages | Checkout time only | Not a 237 task list | No | Workspace copies share names and sizes with the worktree | Not a task list | High that the phrases are absent from the worktree zip contents |

No original 237-title file was found in any location this machine can read.
