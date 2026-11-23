# Generator script analysis

Both scripts first appear in `4b0ce171`. Neither script has a version that points at an external checklist.

## scripts/generate-237-register.mjs

Header, from the first version and still present at `6e9d1926`:

"Generates the 237-item execution register from directive category bands. Does NOT invent a canonical original checklist. Original titles remain UNKNOWN because no numbered 1–237 source file exists in this repository."

What it reads: nothing. The latest copy has no `readFile` and no `readFileSync`.

What it holds:

- `BANDS`: 14 ranges, such as items 1–19 and 227–237. These are category labels, not 237 original tasks.
- `SCOPES`: 237 entries. Each entry is a working label, a working criterion, a file note, a state, a percentage, and a gap note. The script comment says these are established from the missing directive plus the code that was visible that day.

How numbers are made: `for (const [a, b, title] of BANDS)` then `for (let n = a; n <= b; n++)`.

Where UNKNOWN is inserted: the markdown row is a fixed string.

`Original title | **UNKNOWN** — canonical numbered 237-item checklist file was not found`

`Original acceptance criteria | **UNKNOWN as authored.** Established criteria: ${criteria}`

The working criterion is written beside the UNKNOWN marker. It is not stored as the original acceptance text.

Later commits through `bf67dd79` and `6e9d1926` change scores inside `SCOPES`. They do not add a source path and they do not replace UNKNOWN with recovered titles.

## scripts/emit-237-register.py

Only commit: `4b0ce171`.

It reads `scripts/generate-237-register.mjs` and parses `SCOPES` with a regular expression. It writes the same UNKNOWN title row. It names no other input file.

## Temporary files

No temp input path is referenced. Output is only `docs/software-completion/BUZZARD_237_MASTER_EXECUTION_REGISTER.md`.

## Conclusion

The generators are the origin of the numbered register. They are not a recovery tool for a lost list. They record that the list was already missing on 14 October 2026.
