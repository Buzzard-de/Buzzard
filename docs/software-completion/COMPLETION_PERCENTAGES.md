# Completion Percentages

Two scoring systems are kept **separate**. Method name remains `whole-software-weighted-v1`. Weights were not changed.

## 1. Whole software (this slice)

| Layer | Previous | Now | Meaning |
| --- | --- | --- | --- |
| Code implementation | 80.6% | **81.0%** | Code exists and is reachable in-repo |
| Test verification | 80.5% | **80.8%** | Automated tests cover the module |
| Integration verification | 63.2% | **63.2%** | Wired to another real module in tests |
| Operational readiness | 19.4% | **19.4%** | Could run with current env/locks |
| Production verification | 0.0% | **0.0%** | No production evidence |

Fractions rose for Vitest 5 / audit remediations, production path fail-closed, and diagnostic honesty. Ops and production did not rise. Live providers stay NOT_CONFIGURED.

Local suites on `70c77d3`: software 51/51, AI 58/58, unit 744/744, lint/typecheck/build pass. CI SUCCESS on current HEAD `de95d5f` run **38163750323** (quality, e2e-storefront, e2e-admin). Implementation SHA `70c77d3` also SUCCESS run 38163582824.

## 2. AI / automation (unchanged)

| Layer | Score |
| --- | --- |
| Code implementation | **72.2%** |
| Test verification | **71.9%** |
| Operational readiness | **23.1%** |
| Production verification | **0.0%** |
