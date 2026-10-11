# Scorecard Evidence

Weights were **not** changed.

## Software — `whole-software-weighted-v1` (148)

| Layer | Previous | Now | Evidence class |
| --- | --- | --- | --- |
| Code | 81.0% | **81.2%** | local implementation `8ed00ba` |
| Tests | 80.8% | **81.3%** | local 56/56 + 749 unit on `8ed00ba` |
| Integration | 63.2% | **64.1%** | lifecycle traces wire existing engines |
| Operations | 19.4% | **19.4%** | sales locked; providers NOT_CONFIGURED |
| Production | 0.0% | **0.0%** | no production access |

## AI — 161 weights (unchanged)

| Layer | Score | Evidence class |
| --- | --- | --- |
| Code | 72.2% | prior Pusat slice |
| Tests | 71.9% | `test:ai` 58/58 |
| Operations | 23.1% | stub LLM |
| Production | 0.0% | none |
