# Scorecard Evidence

Weights were **not** changed.

## Software — `whole-software-weighted-v1` (148)

| Layer | Previous | Now | Evidence class |
| --- | --- | --- | --- |
| Code | 81.8% | **81.9%** | SW-SOT impl 0.52→0.55 (`catalogSeo` on the shared policy). Weighted raw 81.8986 rounds to 81.9. SoT inactive. |
| Tests | 82.2% | **82.3%** | local software 64/64, AI 58/58, unit 775/775 |
| Integration | 64.9% | **65.0%** | authorized draft persists `products` only, `active=0`; no dual-write |
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
