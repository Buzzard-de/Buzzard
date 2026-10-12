# Completion Percentages

Two scoring systems are kept **separate**. Method name remains `whole-software-weighted-v1`. Weights were not changed.

## 1. Whole software (this slice)

| Layer | Previous | Now | Meaning |
| --- | --- | --- | --- |
| Code implementation | 81.6% | **81.8%** | Code exists and is reachable in-repo |
| Test verification | 81.8% | **82.1%** | Automated tests cover the module |
| Integration verification | 64.6% | **64.8%** | Wired to another real module in tests |
| Operational readiness | 19.4% | **19.4%** | Could run with current env/locks |
| Production verification | 0.0% | **0.0%** | No production evidence |

Fractions rose only for SW-SOT (shared write policy, still inactive). Ops and production did not rise. Remaining product writers are not consolidated.

Local suites after this increment: software 62/62, AI 58/58, unit 763/763. Push and CI were not authorized for this task.

## 2. AI / automation (unchanged)

| Layer | Score |
| --- | --- |
| Code implementation | **72.2%** |
| Test verification | **71.9%** |
| Operational readiness | **23.1%** |
| Production verification | **0.0%** |
