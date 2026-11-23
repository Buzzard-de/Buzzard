# Deleted files

Search: `git log --all --diff-filter=D` for the register path, and a name scan of every deleted `.md`, `.csv`, `.json`, `.txt`, `.yml`, and `.yaml` path for 237, checklist, Aufgabe, Checkliste, roadmap, görev, and gorev.

## Register path

No commit deletes `docs/software-completion/BUZZARD_237_MASTER_EXECUTION_REGISTER.md`.

The file is present at `origin/cursor/software-completion-local-c293` at `6e9d1926`.

It is absent from current HEAD because `4b0ce171` is not an ancestor of `63e55af5`.

## Older checklist names

The deleted-path scan returned no matching name. This does not prove a file never existed outside Git. It does show that reachable history has no deleted document whose path contains those words.

## Unreachable objects

`git fsck --unreachable --no-reflogs` returned no dangling commits, trees, or blobs. There is no unreachable document in this clone to recover.

`.docx`, `.xlsx`, and `.pdf` originals were not found as a 237-item list. The search of history was by Git path and content phrases, not by opening binary office files that are not in the tree.

## Reflog

This clone's reflog has nine entries from the November 2026 branches. It does not hold an October working tree in which a source checklist existed and was then discarded.
