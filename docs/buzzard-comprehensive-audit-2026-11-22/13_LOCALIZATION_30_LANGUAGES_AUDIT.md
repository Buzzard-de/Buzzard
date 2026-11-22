# Thirty languages

Date: 22 November 2026. No translator invented a string in this pass.

`lib/i18n/supported-locales.json` lists 30 codes: de, en, tr, ar, fr, nl, bg, hr, el, cs, da, et, fi, hu, it, lv, lt, lb, mt, pl, pt, ro, sk, sl, es, ca, eu, gl, sv, ga.

A locale code is not a finished language.

## Category copy

`auditL2ReviewedCopy` reports 330 L2 nodes. Reviewed non-source labels are 9 in every locale, including German, English, Turkish, and Arabic. 321 nodes are unreviewed. `completeClaim` is false. German source names exist as the fallback. They are not counted as reviewed translations.

| Group | What exists | What is missing |
|---|---|---|
| de | Source labels and hub strings | 321 reviewed L2 strings |
| en, tr, ar | Primary hub strings and 9 reviewed L2 leaves | The same 321 gap |
| Other 26 | Keys exist. `humanReviewed` is false for the UI pack. | Professional review |

## Other formats

- Arabic RTL is set in `lib/i18n/localeAudit.ts` when the locale is `ar`, and applied in the locale context. A direction flag is not a reviewed Arabic catalog.
- `lib/i18n/format.ts` uses `Intl` for price, number, and date. Tests exist in `localeAudit.test.ts`. They were not rerun today.
- Mixed-language pages were not browsed in this pass.

STATUS: PARTIAL.
RISK LEVEL: P2. Publishing unreviewed category names would show German source text in other languages.
RECOMMENDED ACTION: Do not generate the 321 strings inside an audit. A human reviews them.
CONFIDENCE: High for the 9 and 321 counts from the current audit function. The function was not executed again in this pass. The previous count on this same HEAD is the evidence.
