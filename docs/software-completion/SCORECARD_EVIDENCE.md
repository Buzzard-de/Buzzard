# Scorecard Evidence

Weights were **not** changed.

## Software — `whole-software-weighted-v1` (148)

| Layer | Previous | Now | Evidence class |
| --- | --- | --- | --- |
| Code | 81.8% | **81.8%** | SW-SOT impl 0.48→0.52 (`pimCatalog` on the shared policy). Weighted raw 81.8378 still rounds to 81.8. SoT inactive. |
| Tests | 82.1% | **82.2%** | local software / AI / unit after phase 2; see TEST_RESULTS.md |
| Integration | 64.8% | **64.9%** | authorized draft persists `pim_products` only; no dual-write |
| Operations | 19.4% | **19.4%** | sales locked; providers NOT_CONFIGURED |
| Production | 0.0% | **0.0%** | no production access |

Fractions moved only for SW-SOT in this phase. Ops and production did not rise. A mock is not a live integration. Scores use `whole-software-weighted-v1` rounded to 1 decimal; they are not increased merely because files were added.

## AI — 161 weights (unchanged)

| Layer | Score | Evidence class |
| --- | --- | --- |
| Code | 72.2% | prior Pusat slice |
| Tests | 71.9% | `test:ai` 58/58 |
| Operations | 23.1% | stub LLM |
| Production | 0.0% | none |
