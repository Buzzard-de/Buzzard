# Completion Percentages

Two scoring systems are kept **separate**.

## 1. Whole software (this slice)

Source: `SOFTWARE_COMPLETION_DATA.json`  
Method: `score = Σ(weight × fraction) / Σ(weight)`  
Total weight: **148** (new method; not the AI 161 list).  
AI 161 weights were **not** edited to improve the number.

| Layer | Previous | Now | Meaning |
| --- | --- | --- | --- |
| Code implementation | 76.3% | **76.4%** | Code exists and is reachable in-repo |
| Test verification | 68.4% | **73.6%** | Automated tests cover the module |
| Integration verification | 53.4% | **56.8%** | Wired to another real module in tests |
| Operational readiness | 19.1% | **19.4%** | Could run with current env/locks |
| Production verification | 0.0% | **0.0%** | No production evidence |

Test % rose because this session ran full `test:unit`, homepage Playwright, commerce API Playwright, and observed CI — not because modules were rewritten. Code % barely moved (checkout diagnostic + guest-cart guard only). Operational stays low because sales are locked, providers are stub/BLOCKED, and nothing was staged. Production stays 0% even when local tests pass.

## 2. AI / automation (unchanged)

Source: `docs/ai-automation-completion/AI_AUTOMATION_COMPLETION_DATA.json` (161 weights).

| Layer | Score |
| --- | --- |
| Code implementation | **72.2%** |
| Test verification | **71.9%** |
| Operational readiness | **23.1%** |
| Production verification | **0.0%** |

## How not to read these numbers

- Do not average 76.4% and 72.2% into a single “Buzzard is X% done”.
- Do not promote test % into production %.
- Do not treat mock connector tests as live marketplace completion.
- Do not treat `/api/health/software` `code.ok` as `liveReady`.
- Do not treat homepage Playwright on static `:3040` as production Pages verification.
- Do not treat CI `quality` SUCCESS as `test:unit` / Playwright green in GitHub Actions.

## Module fractions

Every module row with `impl` / `test` / `integ` / `ops` / `prod` is in `SOFTWARE_COMPLETION_DATA.json`. LIVE/blocked modules contribute ~0 to ops and prod.

Largest honest test-fraction moves this session: storefront (Playwright 18/18), security/commerce API (9/9), CI (observed SUCCESS), admin (login + API only). Admin Control Center UI and live providers were **not** raised to verified.
