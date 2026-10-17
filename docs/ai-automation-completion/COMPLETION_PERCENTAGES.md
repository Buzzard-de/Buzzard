# Completion Percentages

Weight total remains **161**. No weights were changed. Only fractions on completed items were updated after new tests.

| Layer | Baseline | After previous Pusat pass | After this pass |
| --- | --- | --- | --- |
| Code implementation | 33.0% | 70.5% | **72.2%** |
| Test verification | — | 69.4% | **71.9%** |
| Operational readiness | 10.8% | 22.9% | **23.1%** |
| Production verification | — | 0.0% | **0.0%** |

Production stays 0% because nothing was deployed or live-probed. Passing local tests does not increase production verification.

## Fraction updates this pass (weights unchanged)

| ID | Change | Why |
| --- | --- | --- |
| MEM-06 | test 0.3→0.8 | invalidate/delete covered |
| MEM-07 | impl/test → 1.0 | Cross-process SQLite restart proven |
| AUT-01 | 0.7→0.9 | `productCore.createProduct` dry-run + ACTIVE reject |
| AUT-07 | 0.5/0.5 → 0.8/0.9 | `validateCustoms` exported; fail-closed decision |
| WRK-01 / WRK-02 | raised | Isolated job-type claim; no double-claim |

LIVE-01…LIVE-08 remain 0 or near-0 (blocked / not implemented).

Source of truth: `AI_AUTOMATION_COMPLETION_DATA.json`.
