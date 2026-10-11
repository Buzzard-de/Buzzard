# Completion Percentages

Two scoring systems are kept **separate**. Method name remains `whole-software-weighted-v1`. Weights were not changed.

## 1. Whole software (this slice)

| Layer | Previous | Now | Meaning |
| --- | --- | --- | --- |
| Code implementation | 81.0% | **81.2%** | Code exists and is reachable in-repo |
| Test verification | 80.8% | **81.3%** | Automated tests cover the module |
| Integration verification | 63.2% | **64.1%** | Wired to another real module in tests |
| Operational readiness | 19.4% | **19.4%** | Could run with current env/locks |
| Production verification | 0.0% | **0.0%** | No production evidence |

Fractions rose for the A–K lifecycle harness, marketplace safe-adapter interface, and health readiness split. Ops and production did not rise. Live providers stay NOT_CONFIGURED.

Local suites on `8ed00ba`: software 56/56, AI 58/58, unit 749/749, lint/typecheck/build pass. CI SUCCESS on `5cd97d0` run **38169328697** (quality, e2e-storefront, e2e-admin). That SHA includes implementation `8ed00ba`.

## 2. AI / automation (unchanged)

| Layer | Score |
| --- | --- |
| Code implementation | **72.2%** |
| Test verification | **71.9%** |
| Operational readiness | **23.1%** |
| Production verification | **0.0%** |
