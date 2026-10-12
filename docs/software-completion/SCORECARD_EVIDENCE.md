# Scorecard Evidence

Weights were **not** changed.

## Software — `whole-software-weighted-v1` (148)

| Layer | Previous | Now | Evidence class |
| --- | --- | --- | --- |
| Code | 81.2% | **81.6%** | implementation `0d76330` (PIM write auth, supplier conflict, tracking/comms fail-closed) |
| Tests | 81.3% | **81.8%** | local software 61/61, AI 58/58, unit 756/756 on `0d76330` |
| Integration | 64.1% | **64.6%** | lifecycle C/G/I extended; PIM routePermissions |
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
