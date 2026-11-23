# Recovery evidence

| Claim | Evidence |
|---|---|
| Numbers 1–237 exist once each | `generate-237-register.mjs` at `6e9d1926` parses to 237 unique keys, minimum 1, maximum 237, no gaps. |
| Original title is explicitly unknown | Same file, markdown template line for `Original title`. |
| Script does not read a checklist | No `readFile` or `readFileSync` in that file. Python emitter reads only the `.mjs`. |
| File did not exist one commit earlier | `git grep` on `5ba16b2` for the 237-item phrases returned nothing. `git ls-tree` of `docs/software-completion` on that commit has no 237 register. |
| File was not deleted later | `git log --all --diff-filter=D` for the register path is empty. |
| File is on one branch tip | `git cat-file -e origin/cursor/software-completion-local-c293:docs/software-completion/BUZZARD_237_MASTER_EXECUTION_REGISTER.md` succeeds. |
| Current HEAD does not contain the commit | `git merge-base --is-ancestor 4b0ce171 HEAD` exits 1. |
| No dangling copy | `git fsck --unreachable --no-reflogs` produced no objects. |
| An earlier forensic pass reached the same conclusion | `a4b84b90`, file `docs/software-completion/BUZZARD_237_CRITERIA_SOURCE_FORENSIC_AUDIT_2026-10-15.md`, section 9: the original checklist was not found in accessible history. |

Dates in this report use Europe/Berlin. 14 October 2026 was still on summer time, UTC+2, so commit `4b0ce171` at 14:00:06 UTC is 16:00 in Berlin. Commit `6e9d1926` at 14:58:54 UTC on 18 October 2026 is 16:58 in Berlin.
