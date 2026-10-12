# Scorecard Evidence

Weights were **not** changed.

## Software — `whole-software-weighted-v1` (148)

| Layer | Previous | Now | Evidence class |
| --- | --- | --- | --- |
| Code | 81.9% | **82.0%** | SW-SOT impl 0.55→0.60 (`productStore` + `authorizeUpdate`). Raw 82.0. SoT inactive. |
| Tests | 82.3% | **82.4%** | local software 65/65, AI 58/58, unit 779/779 |
| Integration | 65.0% | **65.1%** | JSON catalog persist-only; update paths fail closed |
| Operations | 19.4% | **19.4%** | sales locked; 31 providers NOT_CONFIGURED |
| Production | 0.0% | **0.0%** | no production access |

Fractions moved only for SW-SOT in this phase. Ops and production did not rise. A mock is not a live integration. Scores use `whole-software-weighted-v1` rounded to 1 decimal; they are not increased merely because files were added.

## AI — 161 weights (unchanged)

| Layer | Score | Evidence class |
| --- | --- | --- |
| Code | 72.2% | prior Pusat slice |
| Tests | 71.9% | `test:ai` 58/58 |
| Operations | 23.1% | stub LLM |
| Production | 0.0% | none |
