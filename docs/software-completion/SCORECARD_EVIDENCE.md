# Scorecard Evidence

Weights were **not** changed.

## Software — `whole-software-weighted-v1` (148)

| Layer | Previous | Now | Evidence class |
| --- | --- | --- | --- |
| Code | 80.6% | **81.0%** | local implementation |
| Tests | 80.5% | **80.8%** | local 51/51 + 744 unit; CI SUCCESS `de95d5f` run 38163750323 |
| Integration | 63.2% | **63.2%** | no new live wiring |
| Operations | 19.4% | **19.4%** | sales locked; providers NOT_CONFIGURED |
| Production | 0.0% | **0.0%** | no production access |

## AI — 161 weights (unchanged)

| Layer | Score | Evidence class |
| --- | --- | --- |
| Code | 72.2% | prior Pusat slice |
| Tests | 71.9% | `test:ai` 58/58 |
| Operations | 23.1% | stub LLM |
| Production | 0.0% | none |
