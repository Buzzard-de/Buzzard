# Unknown and missing evidence

## Missing documents

| Looked for | Result |
|------------|--------|
| Original 237-item checklist with authored titles and acceptance criteria | Not in git history, according to the 14 October 2026 register that searched for it, and not in HEAD. |
| Numbered 80-item plan | The 17 October 2026 comparison says it was not found. |
| 257-item task list | Not found. Unrelated uses of the number 257 exist. |
| 10-module completion program | Not found. |
| Cursor chat history from the start of the project | Not accessible here. |
| Worktree reflog before the current HEAD | Only two reflog entries, both at `9b86c1b7`. |

## Unknown tasks

388 distinct tasks are `UNKNOWN_UNVERIFIED`.

- 237 of them are H237 slots. The register’s original-title cell is the sentence that the canonical checklist was not found. Established-scope scores from October cannot be checked against this HEAD without a mapping the source does not provide.
- 15 are the August Cursor Aufgaben. Their status file claims completion that later documents contradict. The current code was not re-tested against each Aufgaben file in this audit.
- The rest are checkbox lines whose boxes were not re-executed, plus missing-feature rows whose class is G (not traced).

## Acceptance criteria that are missing

- Every H237 item: original acceptance criteria are marked unknown in the source.
- Ordered phases have a status and a percent. They do not restate a full acceptance test beyond the evidence filename.
- Checkbox lines are the whole criterion.
- Several `MF-*` rows say the feature was not traced (`class G`).

## Evidence that was not opened

4,581 historical paths are in the all-ref name log and absent from the worktree. Opening them would require checking out other commits. That was not done, because this audit must not change the worktree. The 237 register was the exception: it was read with `git show` into `/tmp`.

## What this audit did not do

- Did not re-run Vitest or Playwright.
- Did not open the production database.
- Did not read secret values into the report.
- Did not treat a file’s existence as completion.
- Did not treat the October “about 100 percent” established-scope mean as completion.
