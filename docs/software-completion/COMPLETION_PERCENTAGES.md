# Completion Percentages

Two scoring systems are kept **separate**.

## 1. Whole software (this slice)

Source: `SOFTWARE_COMPLETION_DATA.json`  
Method: `score = Σ(weight × fraction) / Σ(weight)`  
Total weight: **148** (new method; not the AI 161 list).  
AI 161 weights were **not** edited to improve the number.

| Layer | Score | Meaning |
| --- | --- | --- |
| Code implementation | **76.3%** | Code exists and is reachable in-repo |
| Test verification | **68.4%** | Automated tests cover the module |
| Integration verification | **53.4%** | Wired to another real module in tests |
| Operational readiness | **19.1%** | Could run with current env/locks |
| Production verification | **0.0%** | No production evidence |

Operational stays low because sales are locked, providers are stub/BLOCKED, and nothing was staged. Production stays 0% even when local tests pass.

## 2. AI / automation (unchanged)

Source: `docs/ai-automation-completion/AI_AUTOMATION_COMPLETION_DATA.json` (161 weights).

| Layer | Score |
| --- | --- |
| Code implementation | **72.2%** |
| Test verification | **71.9%** |
| Operational readiness | **23.1%** |
| Production verification | **0.0%** |

## How not to read these numbers

- Do not average 76.3% and 72.2% into a single “Buzzard is X% done”.
- Do not promote test % into production %.
- Do not treat mock connector tests as live marketplace completion.
- Do not treat `/api/health/software` code.ok as liveReady.

## Module fractions

Every module row with `impl` / `test` / `integ` / `ops` / `prod` is in `SOFTWARE_COMPLETION_DATA.json`. LIVE/blocked modules contribute ~0 to ops and prod.

## Commands behind the numbers

- `npm run test:ai` → 58/58
- `npm run test:software` → 23/23
- locale/market/RTL vitest → 82/82
- lint / typecheck / build → 0
- security:check → 0 (2 existing warnings)
