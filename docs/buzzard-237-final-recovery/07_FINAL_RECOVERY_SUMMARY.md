# Final recovery summary

Search date: 22 November 2026, evening Europe/Berlin.

Mode: read-only. No source file was edited. No git commit, push, merge, or deploy was made. No live API was called. `salesLocked` stays true, `productionReady` stays false, and egress stays deny.

The three searches are separate. Counts below are from this pass.

## 1. Cursor history

The conversation that ordered the 237-item execution is the desktop cloud chat [German language request](https://cursor.com/agents/bc-a02d07fa-e72e-400c-892f-ce9921a3c293), user message index 106849.

That message names items 1 through 237 and gives fourteen range sentences. It says those sentences are navigation aids and are not the original items or the full acceptance criteria. It tells the agent not to invent the missing checklist.

Original titles in that message: 0.
Original descriptions: 0.
Acceptance criteria: 0.

The other desktop chat, “Devam eden iş”, and the eleven internal transcripts from 10–12 October 2026 do not contain the checklist. No cloud agent in this environment was created from 13 October through 18 October 2026 UTC.

## 2. Computer and backups

The worktree, the `/workspace` checkout, the preserve folder, Cursor stores, and 273 zip archives on this machine were searched. The only phrase hit inside a zip is the 22 November audit cross-reference, which records that the original checklist was missing.

Desktop, Documents, Downloads, the Turkish folder names, and `/opt/backups` are not on this machine. `/mnt` and `/media` are empty.

## 3. Old project documents

The 65-checkbox master checklist, the 48-checkbox go-live checklist, the 26-checkbox Part 4 checklist, the 45 `MF-*` rows, the 15 Cursor Aufgaben, the 51-item evaluator, the 21 phases, the phase register (69 rows, 50 distinct IDs), the 16 special tasks, the 8 master-command phases, and the 34-row incomplete checklist are all present as their own lists.

An 80-title plan and a 257-item list were not in the searched trees.

None of these documents was matched to item numbers 1–237.

## Answers

1. The original 237-task list, with a title for each number, was not found.
2. Cursor history contains the order to use that list and the fourteen range sentences. It does not contain the list.
3. Computer and backup paths on this machine do not contain it.
4. The old project documents on this machine do not contain it.
5. Original task titles recovered: 0.
6. Original descriptions recovered: 0.
7. Acceptance criteria recovered: 0.
8. Items 1–237 still have no original title, description, or acceptance criteria. Every row is `PARTIALLY_FOUND` only because the creating message assigns that number to a range sentence. The title fields stay `UNKNOWN`.
9. Sources that could not be read:
   - The Cursor chat database on the user’s own computer.
   - The user’s Desktop, Documents, Downloads, and backup disks.
   - Mounted external or shared disks (`/mnt` and `/media` are empty).
   - Internal explore-agent transcripts from August and September 2026 beyond the first 20 names.
   - The ChatGPT thread mentioned in message index 122595. Only a 458-character paste is in the Cursor transcript, and that paste says the titles were not available.

## Status counts

| Status | Items |
|---|---:|
| ORIGINAL_FOUND | 0 |
| PARTIALLY_FOUND | 237 |
| MATCHED_FROM_MULTIPLE_SOURCES | 0 |
| NOT_FOUND | 0 |
| ACCESS_BLOCKED | 0 |

`ACCESS_BLOCKED` is reserved for the unreadable locations above. It is not applied to an item number, because no blocked file was shown to hold a specific item.

Per-item rows: `04_RECOVERED_TASKS_237.md`, `05_RECOVERED_TASKS_237.csv`, `06_RECOVERED_TASKS_237.json`.

Recovery of a replacement list was not started. This folder is the investigation record only. Approval is required before any reconstruction, move, or rewrite.
