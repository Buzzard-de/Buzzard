# Taxonomy REVIEW_REQUIRED — human review pack

**Status:** BLOCKED_APPROVAL. This file does **not** approve mappings.  
**Do not merge PR #492.** Do not overwrite `origin/main`. Do not delete or silently renumber codes.

Source: `data/taxonomy/lossless_reconciliation_proposal.v1.json`  
Master 50 is preserved. Retired `bz.20`, `bz.25`, `bz.26` stay historical.

## How to read a row

| Field | Meaning |
| --- | --- |
| Proposed resolution | Suggestion only. Human must confirm. |
| Product relationship risk | Unknown counts locally (null). Assume URL/SKU hold until counted in production DB (not done here). |

## New on master 50 (not on origin/main 48)

| Code | Current | Proposed | Conflict | Risk | Proposed resolution | Uncertainty |
| --- | --- | --- | --- | --- | --- | --- |
| bz.49 | absent on origin/main 48 | Fahrrad & E-Bike on master 50 | NOT_ON_ORIGIN_MAIN_48 | MEDIUM — new L1 | Keep as additive 50-master row; do not reuse a retired code | Whether shop mobility/hubs already cover this |
| bz.50 | absent | Erneuerbare Energie | NOT_ON_ORIGIN_MAIN_48 | MEDIUM | Additive | Overlap with existing energy shop L1 |
| bz.51 | absent | Tierfutter | NOT_ON_ORIGIN_MAIN_48 | MEDIUM | Additive; shop cat-26 currently maps to bz.36 | Dual mapping vs Haustier |
| bz.52 | absent | Fahrzeug & Mobilität | NOT_ON_ORIGIN_MAIN_48 | MEDIUM | Additive | Overlap with bz.01 Automotive |
| bz.53 | absent | Verpackung & Versand | NOT_ON_ORIGIN_MAIN_48 | MEDIUM | Additive | Shop cat-29 already notes packaging under Industrie |

## Ambiguous shop L1 → master (many shop IDs share one master code)

These are **REVIEW_REQUIRED** because more than one storefront L1 points at the same `bz.*`. Codes are not changed.

| Shop id | Master code | Conflict | Risk | Proposed resolution | Uncertainty |
| --- | --- | --- | --- | --- | --- |
| cat-05 | bz.01 | AMBIGUOUS_SHOP_TO_MASTER | MEDIUM | Keep shop slug; confirm Kfz vs mobility split | Product mix in cat-05 vs bz.52 |
| cat-06 | bz.36 | AMBIGUOUS | MEDIUM | Pets vs petfood (bz.51) | cat-26 also → bz.36 |
| cat-12 | bz.12 | AMBIGUOUS | MEDIUM | Electronics vs photo subset | cat-37 also electronics |
| cat-20 | bz.37 | AMBIGUOUS | MEDIUM | Confirm unique L1 | mapping table cardinality |
| cat-21 | bz.04 | AMBIGUOUS | MEDIUM | DIY/construction overlap | |
| cat-26 | bz.36 | AMBIGUOUS | MEDIUM | Prefer bz.51 once approved | Food/pet hold rules |
| cat-29 | bz.38 | AMBIGUOUS | MEDIUM | Prefer bz.53 once approved | |
| cat-32 / cat-40 | bz.40 | AMBIGUOUS | MEDIUM | Travel vs mobility | |
| cat-37 | bz.12 | AMBIGUOUS | MEDIUM | Foto under Elektronik | |
| remaining rows in JSON | (see proposal file) | AMBIGUOUS | MEDIUM | Do not auto-merge | Owner must pick canonical shop L1 |

Retired shop holds (cat-25, cat-43, cat-46) stay `SHOP_RETIRED_HOLD` / `SHOP_POINTS_AT_RETIRED`. **Not deleted.**

## Automated validation (separate)

`validateTaxonomy()` checks duplicate IDs, invalid `bz.NN` codes, mapping presence, circular stubs. It does **not** approve REVIEW_REQUIRED rows. Product orphan counts are **null** until a production catalog extract is authorized.
