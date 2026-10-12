# Scorecard Evidence

Weights were **not** changed.

## Software — `whole-software-weighted-v1` (148)

| Layer | Previous | Now | Evidence class |
| --- | --- | --- | --- |
| Code | 81.6% | **81.8%** | product write boundary; SoT still inactive |
| Tests | 81.8% | **82.1%** | local software 62/62, AI 58/58, unit 763/763 |
| Integration | 64.6% | **64.8%** | catalog-PIM create routed through shared policy |
| Operations | 19.4% | **19.4%** | sales locked; providers NOT_CONFIGURED |
| Production | 0.0% | **0.0%** | no production access |

Fractions moved only for SW-INV, SW-SHIP, SW-CUS, SW-SEC. Ops and production did not rise. A mock is not a live integration.

## AI — 161 weights (unchanged)

| Layer | Score | Evidence class |
| --- | --- | --- |
| Code | 72.2% | prior Pusat slice |
| Tests | 71.9% | `test:ai` 58/58 |
| Operations | 23.1% | stub LLM |
| Production | 0.0% | none |
