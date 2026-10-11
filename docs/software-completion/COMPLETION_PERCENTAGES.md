# Completion Percentages

Two scoring systems are kept **separate**. Method name remains `whole-software-weighted-v1`. Weights were not changed.

## 1. Whole software (this slice)

Source: `SOFTWARE_COMPLETION_DATA.json`  
Method: `score = Σ(weight × fraction) / Σ(weight)`  
Total weight: **148** (not the AI 161 list).  
AI 161 weights were **not** edited.

| Layer | Previous verification | Now | Meaning |
| --- | --- | --- | --- |
| Code implementation | 79.1% | **79.7%** | Code exists and is reachable in-repo |
| Test verification | 78.2% | **78.9%** | Automated tests cover the module |
| Integration verification | 61.5% | **62.5%** | Wired to another real module in tests |
| Operational readiness | 19.4% | **19.4%** | Could run with current env/locks |
| Production verification | 0.0% | **0.0%** | No production evidence |

Fractions rose only for modules that gained real wiring or observed evidence this pass: supplier feed dry-run preview, customer message drafts, WMS reservation audit, Control Center tab browser coverage, and CI `e2e-admin` SUCCESS on `a2879e4` (run 38150381530). Operational stays **19.4%** because sales remain locked, live providers stay BLOCKED/NOT_CONFIGURED, and nothing was staged. Production stays **0.0%**.

CI `e2e-admin` on superseded `a273651` (run 38149927916) **failed** (`Admin login → dashboard` navigated to `/products/` via the storefront header). `a2879e4` token/session path is observed green. HEAD `0d71a18` run 38150996642 is quality + e2e-storefront + e2e-admin SUCCESS. `de6b95c` quality FAILURE was the leftover draft-hash collision and is fixed.

## 2. AI / automation (unchanged)

Source: `docs/ai-automation-completion/AI_AUTOMATION_COMPLETION_DATA.json` (161 weights).

| Layer | Score |
| --- | --- |
| Code implementation | **72.2%** |
| Test verification | **71.9%** |
| Operational readiness | **23.1%** |
| Production verification | **0.0%** |

## How not to read these numbers

- Do not average 79.1% and 72.2% into a single “Buzzard is X% done”.
- Do not promote test % into production %.
- Do not treat mock connector tests as live marketplace completion.
- Do not treat `/api/health/software` `ready:true` as `liveReady`.
- Do not treat homepage Playwright on static `:3040` as production Pages verification.
- Do not treat a local 31/31 or 26/26 browser pass as production verification.

## Module fractions

Every module row with `impl` / `test` / `integ` / `ops` / `prod` is in `SOFTWARE_COMPLETION_DATA.json`. LIVE/blocked modules contribute ~0 to ops and prod.

Largest honest moves this pass: supplier feed preview, communications drafts, admin Control Center tabs, CI `e2e-admin`. Live providers were **not** raised.
