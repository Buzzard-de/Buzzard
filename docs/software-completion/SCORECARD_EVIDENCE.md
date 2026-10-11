# Scorecard Evidence

Weights were **not** changed.

## Software — `whole-software-weighted-v1` (148)

| Layer | Previous | Now | Evidence class |
| --- | --- | --- | --- |
| Code | 80.3% | **80.6%** | local implementation |
| Tests | 79.9% | **80.5%** | local automated (`test:software` 46/46, `test:ai` 58/58) |
| Integration | 63.2% | **63.2%** | module-to-module tests; no new live wiring |
| Operations | 19.4% | **19.4%** | sales locked; providers NOT_CONFIGURED |
| Production | 0.0% | **0.0%** | no production access |

Fractions moved only for fail-closed payment/marketplace/returns/workers/persistence/security tests. Live providers were not raised. CI for this HEAD is recorded only after the matching Actions run.

## AI — 161 weights (unchanged)

| Layer | Score | Evidence class |
| --- | --- | --- |
| Code | 72.2% | prior Pusat slice |
| Tests | 71.9% | `test:ai` 58/58 |
| Operations | 23.1% | stub LLM; no live probe |
| Production | 0.0% | none |

Do not average the two scorecards.
