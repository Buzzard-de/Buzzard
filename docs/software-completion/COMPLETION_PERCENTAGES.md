# Completion Percentages

Two scoring systems are kept **separate**. Method name remains `whole-software-weighted-v1`. Weights were not changed.

## 1. Whole software (this slice)

Source: `SOFTWARE_COMPLETION_DATA.json`  
Method: `score = Σ(weight × fraction) / Σ(weight)`  
Total weight: **148** (not the AI 161 list).  
AI 161 weights were **not** edited.

| Layer | Previous verification | Now | Meaning |
| --- | --- | --- | --- |
| Code implementation | 76.4% | **78.0%** | Code exists and is reachable in-repo |
| Test verification | 73.6% | **76.1%** | Automated tests cover the module |
| Integration verification | 56.8% | **59.2%** | Wired to another real module in tests |
| Operational readiness | 19.4% | **19.4%** | Could run with current env/locks |
| Production verification | 0.0% | **0.0%** | No production evidence |

Code/test/integration rose only for modules that gained real wiring or tests this pass: returns ledger, catalog search, diagnostic reporting, extra specialist assistants, admin API PIM proof, CI job expansion. Operational stays **19.4%** because sales remain locked, live providers stay BLOCKED/NOT_CONFIGURED, and nothing was staged. Production stays **0.0%**.

CI `quality` on `25a48da` **failed** (`test:unit` 715/717). After the isolated cart fixture, run [38144084891](https://github.com/Buzzard-de/Buzzard/actions/runs/38144084891) on `7f81585` observed **quality SUCCESS** (including `test:unit`, preflight, `security:check`) and **e2e-storefront SUCCESS**. That raises only the CI module test/integration fractions. Ops and production stay unchanged.

## 2. AI / automation (unchanged)

Source: `docs/ai-automation-completion/AI_AUTOMATION_COMPLETION_DATA.json` (161 weights).

| Layer | Score |
| --- | --- |
| Code implementation | **72.2%** |
| Test verification | **71.9%** |
| Operational readiness | **23.1%** |
| Production verification | **0.0%** |

## How not to read these numbers

- Do not average 78.0% and 72.2% into a single “Buzzard is X% done”.
- Do not promote test % into production %.
- Do not treat mock connector tests as live marketplace completion.
- Do not treat `/api/health/software` `ready:true` as `liveReady`.
- Do not treat homepage Playwright on static `:3040` as production Pages verification.
- Do not treat a local 717/717 as GitHub-proven without an observed Actions run. `7f81585` now has that observation.

## Module fractions

Every module row with `impl` / `test` / `integ` / `ops` / `prod` is in `SOFTWARE_COMPLETION_DATA.json`. LIVE/blocked modules contribute ~0 to ops and prod.

Largest honest moves this pass: returns, search, observability, specialist agents, admin API, CI job presence. Admin Control Center UI and live providers were **not** raised to verified.
