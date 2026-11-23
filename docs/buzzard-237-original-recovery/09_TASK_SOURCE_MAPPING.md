# Task source mapping

No original sentence was matched to an item number.

The only safe map is numerical.

| Item | Original text | Number source | Status |
|---|---|---|---|
| 1–237 | UNKNOWN | `### Item N` in the register at `6e9d1926` | ONLY_TASK_NUMBER_FOUND |

The `SCOPES` lines in `scripts/generate-237-register.mjs` are working labels created with the register. The script prints them as "Established scope" and prints the original title as UNKNOWN. They are not mapped here as original titles. Similarity to later Buzzard modules is not identity.

## Rejected candidate maps

| Candidate | Why it was not linked to items 1–237 |
|---|---|
| 14 `BANDS` in the generator | Ranges of numbers, not 237 task definitions. |
| `FINAL_MASTER_CHECKLIST.md` | Different length and different wording. The generator says so. |
| Cursor Aufgaben 01–15 | Fifteen files from August 2026. No item numbers 1–237. |
| Phase reports from 12–13 October 2026 | Present on the parent commit. None is a 237-line task definition list. |
| Phase 11 "section C" | A cookie and CSRF note. The words "section C" match. The content does not. |

Items with no original text: 237. Items matched from several sources: 0. Items partially found: 0.
