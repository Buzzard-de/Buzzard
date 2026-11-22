# Git commit analysis

Read-only. No reset, clean, gc, or prune.

## First commit

`4b0ce17148d4221f8986f5c04ca758eb69dc37fc`

Parent: `5ba16b2d5549e8b759d023a13d6555291971fb63`

Message: "Record the 237-item execution register and fail-closed flag/approval gaps."

Date: 14 October 2026, 16:00 Europe/Berlin.

The commit adds the register and the generators in the same change. It does not rename or copy an older checklist into that path. `git log --diff-filter=R` produced no rename onto this path.

## Questions

1. First source of the 237 list: not found. The first Git object is the generated register.
2. The register was produced by `scripts/generate-237-register.mjs` and `scripts/emit-237-register.py`.
3. A separate original list file was not in the parent tree and was not found later.
4. The numbers were not extracted from an older task file. They are a loop from 1 to 237 over a hardcoded `SCOPES` object.
5. No delete commit removes an earlier 237 checklist. The path keyword scan of all deleted `.md`, `.csv`, `.json`, `.txt`, `.yml`, and `.yaml` names returned nothing for 237, checklist, Aufgabe, Checkliste, roadmap, or görev.
6. The register was not moved to another branch. It remains on `origin/cursor/software-completion-local-c293`. Other current branches do not contain commit `4b0ce171`.
7. The 237 definitions were not found split across older files. Category bands inside the generator are 14 ranges, not 237 original tasks.

## History searched

- `git log --all` for the register path, both scripts, and the phrase "directive section C".
- `git grep` on parent `5ba16b2` for the 237 phrases.
- `git log --all --until` the register timestamp with `--grep=237`. No earlier commit message mentions it.
- `git reflog` in this clone has 9 entries, all from November 2026 work on later branches. It does not contain October's register creation.
- `git tag -l` shows two August 2026 snapshot tags, before the register existed.
- `git fsck --unreachable --no-reflogs` printed no dangling objects.

Commits before the register that mention the digits 237 are pull-request numbers, an EAN, and unrelated SHA fragments. They are recorded in the parent grep and are not a task list.
