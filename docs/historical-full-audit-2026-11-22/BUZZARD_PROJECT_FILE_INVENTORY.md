# Project file inventory

Worktree file walk on 22 November 2026. Excluded from the counts below: `.git`, `node_modules` (19,336 files), `.next` (82 files), `dist`, `coverage`, `.turbo`. The new audit directory is not included. Total files classified: 4,661.

Classification is by path and filename. A file in `intelligence/` is counted under AI material even when it is also source code. Counts are therefore mutually exclusive.

| Code | Class | Files | Main locations |
|------|--------|------:|----------------|
| A | Application source | 1,324 | `server/`, `app/`, `lib/`, `components/`, `scripts/` |
| B | Tests | 218 | `server/__tests__/`, `e2e/`, `*.test.*`, `*.spec.*` |
| C | Documentation | 482 | `docs/`, root `BUZZARD_*.md` |
| D | Architecture specifications | 14 | filenames containing architecture or ADR |
| E | Task registers and checklists | 41 | `docs/MASTER_COMMAND/`, `docs/software-completion/`, `data/master/` |
| F | Development instructions | 14 | `exports/Buzzard24_Cursor_Aufgaben/` |
| G | AI and agent material | 1,594 | `intelligence/` |
| H | Schemas and migrations | 35 | paths containing migration or schema |
| I | API integrations | included in A when the file is source | supplier, payment, and carrier code under `server/lib` |
| J | Security configuration | 4 | `data/security/`, egress policy |
| K | Deployment configuration | 13 | `.github/`, Docker and Render files |
| L | Localization | 162 | locale, i18n, translation paths |
| M | Generated data | 6 | `*.generated.ts`, `catalog-locale.json`, `country-names.json` |
| N | Archived and export copies | 472 | `exports/`, `intelligence/archive/` |
| O | Checkpoints and recovery filenames | 29 | filename contains checkpoint or recovery |
| P | Other project files | 253 | JSON catalogs, images, and files that match none of the rules above |

Sum of the classes is 4,661.

## Historical versus current

- 4,581 paths appear in `git log --all --name-only` and are not in this worktree. They include deleted site files (`404.html`, `CNAME`) and documents that lived only on other branches, including the 237 register. They were not opened individually.
- Uncommitted and untracked work exists on this worktree from earlier sessions, including `docs/software-completion/` and source edits. This audit added only `docs/historical-full-audit-2026-11-22/`.
- `/workspace` has its own untracked `docs/software-completion/` and was not modified.

## Duplicates and superseded documents

- `exports/buzzard24-cursor-aufgaben/` repeats `exports/Buzzard24_Cursor_Aufgaben/`.
- `intelligence/buzzard_ki_gesamt/aktiv/` repeats large parts of `intelligence/`. A name-suffix check did not prove byte-identical pairs for every file, so this inventory does not claim a byte-duplicate count.
- The 237 register, its test-evidence file, and its handover file are superseded as working copies: they are absent from HEAD. The git objects remain on `origin/cursor/software-completion-local-c293`.
- Root reports dated 17–18 November 2026 (`BUZZARD_*AUDIT*.md`, security sprint reports) are historical reports. Later uncommitted phase documents do not delete them.

## Missing referenced files

- Original 237-item checklist: missing, including inside the register that looked for it.
- Numbered 80-item plan: missing, as stated by the 17 October 2026 comparison note.
- 257-item task list: missing.
- 10-module completion program: missing.
- `docs/software-completion/BUZZARD_237_MASTER_EXECUTION_REGISTER.md` is not in HEAD.

## Files whose status cannot be established

- Anything that existed only in a Cursor chat and was never committed.
- The 4,581 historical paths that were not opened.
- Protected runtime data. `server/data/buzzard.db` is not in this worktree. The process on port 3001 uses the server under `/workspace`. That database was not read.

## Secrets

No credential values were copied into this audit. Admin seed files that contain passwords were not quoted.
