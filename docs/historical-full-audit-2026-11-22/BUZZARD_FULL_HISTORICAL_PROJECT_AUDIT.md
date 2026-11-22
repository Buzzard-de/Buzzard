# Buzzard full historical project audit

Audit date: 22 November 2026, Europe/Berlin.  
Mode: read-only. No source file was edited. No commit, push, merge, or deploy.  
Worktree: `/home/ubuntu/buzzard-worktrees/save-full-worktree-c293`  
HEAD: `9b86c1b70159c32d644f2596f61ae8388ad401ec`  
Branch: `cursor/save-full-worktree-c293`  
`/workspace` is a different checkout (`cursor/pim-catalog-foundation-c293`, `d413d13a`) and was not used as the evidence tree.

## Executive summary

Buzzard’s earliest commit in this repository is 25 July 2026, 17:11 Europe/Berlin: a static site and a GitHub Pages workflow. From that commit through HEAD there are 746 commits. Across all reachable refs there are 1,347 commits. The current tree is a catalog-and-commerce codebase with sales locked and egress default deny. It is not release-ready.

This audit did not find an original authored 237-item checklist, an 80-item plan, a 257-item task list, or a numbered 10-module completion program. A constructed 237-slot register exists only on `cursor/software-completion-local-c293`. That commit is not an ancestor of HEAD. Its own header says the original titles and acceptance criteria are unknown. Those 237 slots are kept as historical records and their current status is `UNKNOWN_UNVERIFIED`.

The numbered lists that do exist in the current tree were extracted: the 51-item development list, the 21-phase task register (52 unique task IDs), the binding 16-item special command, an earlier 8-phase master command, the incomplete checklist, the missing-features list, the August 2026 Cursor Aufgaben pack, and three checkbox lists. Together with the 237 slots that is 597 historical task records and 590 distinct tasks after 7 exact duplicates.

No distinct task is `VERIFIED_COMPLETE`. Local software that has a named passing test on this worktree is `COMPLETE_WITH_LIMITATIONS` because sales stay off, live providers are not connected, and production is not verified. Cursor chat history for the project is not accessible from this environment.

## What was inspected

- Git history from the root commit to HEAD, plus `git log --all` for registers that are not in HEAD.
- Tags `catalog-snapshot-2026-08-08` and `snapshot-2026-08-08-final`.
- Reflog on this worktree: 2 entries, both at the current HEAD. It does not contain the July-to-October history.
- 4,661 project files in the worktree, excluding `.git`, `node_modules` (19,336 files), `.next` (82 files), `dist`, `coverage`, and `.turbo`.
- The 237 register blob from commit `6e9d1926df05b4205748bc53b58fd9070c9c465a` (6,359 lines), read from git without checking it out.
- Current uncommitted software-completion documents. They were read and not edited.
- `data/security/egress_policy.v1.json` default action is DENY. `isSalesEnabled()` is false unless `BUZZARD_SALES_ENABLED` is exactly `1`.

Historical Cursor conversations are not in the repository. This audit cannot reconstruct requests that were never written into a file or a commit.

## Repository facts

| Fact | Evidence |
|------|----------|
| Earliest commit | `d4f8ddc2661b3d6f51173825df25f9ab9ffa77eb`, 2026-07-25T17:11:04+02:00, “Initial commit: Buzzard static site and GitHub Pages workflow” |
| Current HEAD | `9b86c1b7`, 2026-11-19T17:49:29Z (18:49 Europe/Berlin), “Save the full worktree before the pause.” |
| Commits reachable from HEAD | 746 |
| Commits reachable from all refs | 1,347 |
| Local branches | 3 |
| Remote-tracking branches | 394 |
| Tags | 2 |
| Markdown files in the worktree | 858, plus 17 `.txt` files |
| Checkpoint filenames | 19 |
| Report-like filenames | 183 |
| Paths seen in `git log --all --name-only` but absent from this worktree | 4,581. These paths were not opened one by one. |

Commits by month on HEAD: July 9, August 570, September 79, October 3, November 85.

## Major architectural changes that are in the history

1. 25 July 2026: static site.
2. 8–13 August 2026: sales disabled and catalog-only mode. Prices hidden. API sales gate added.
3. 9 August 2026: PIM product catalog module.
4. 28–30 August 2026: Part 6 product core, Part 7 storefront bridge, Part 15 catalog import pipeline.
5. 27 September 2026: product source-of-truth foundation and sales safety gate.
6. 14–18 October 2026, other branch only: 237-slot execution register. Not merged into this HEAD.
7. 1 November 2026: special-16 command and Esat Bey hooks. Sales remain off.
8. 8 November 2026: native-AI phases 10–18. Live media and clone operations stay blocked in the commit subjects.
9. 19 November 2026: full worktree saved at the current HEAD.
10. After that commit, uncommitted work on this worktree continued the 21-phase program, the canonical order writer, the canonical product writer, and the 51-item behavior tests. That work is not in HEAD. This audit did not change it.

## Registers that were replaced or never found

- The 237 register says it superseded a missing original checklist. Later November work does not carry that file. The 21-phase register and the 51-item list are separate numbering systems.
- `MASTER_TASKS.json` (8 phases, 1 November 2026) is an earlier command. `SPECIAL_16_TASKS.json` says it is a different list and that the older file was not deleted.
- The August 2026 Cursor Aufgaben status marks deploy and production readiness complete. November audits and the current sales lock contradict that. Those checkmarks are not current completion.
- The 80-item plan, the 257-item list, and a 10-module program were searched for in filenames, commit subjects, and the current tree. They were not found as numbered task lists. The number 257 occurs as pull request #257, as a line count, and as a count of `.mjs` files in a size audit. None of those is a 257-item register.

## Safety observed during the audit

- Sales lock code is unchanged. Egress default is DENY.
- `productionReady` and `live` are not claimed.
- Ports 3000 and 3001 were not restarted. PID 2129 and PID 2215 still show a start of 21 November 2026, 14:53 Europe/Berlin.
- No worktree `server/data/buzzard.db` was present. The production database was not opened.
- No commit, push, merge, or deploy.

## How to read the other files

The CSV and JSON are the task inventory. The cross-reference explains which registers are the same requirement. The file inventory is a classification, not a claim that every file was read line by line. The timeline is taken from commit dates. The status matrix uses only the statuses defined for this audit. Unknown evidence is listed on its own. Duplicate rows are kept in the inventory and excluded from the distinct count.
