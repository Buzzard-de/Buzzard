# Completion Percentages

Two scoring systems are kept **separate**. Method name remains `whole-software-weighted-v1`. Weights were not changed.

## 1. Whole software (this slice)

| Layer | Previous | Now | Meaning |
| --- | --- | --- | --- |
| Code implementation | 81.9% | **82.0%** | SW-SOT impl 0.55→0.60. All known master writers on the shared policy; stores still unconsolidated. |
| Test verification | 82.3% | **82.4%** | Automated tests cover the module |
| Integration verification | 65.0% | **65.1%** | JSON catalog + update paths wired in tests |
| Operational readiness | 19.4% | **19.4%** | Could run with current env/locks |
| Production verification | 0.0% | **0.0%** | No production evidence |

Fractions rose only for SW-SOT (last master writer + `authorizeUpdate`). Ops and production did not rise. Product SoT remains inactive.

Local suites after phase 4 are recorded in `TEST_RESULTS.md`. Push and CI were not authorized for this task.

## 1b. After architecture inventory + desktop bridge (same method)

Buzzard weights stay **148**. The desktop app is **not** a 149th Buzzard module.

SW-SOT fractions moved to impl **0.62** / test **0.64** / integ **0.36** (reader inventory encoded + projection labeled). Rounded Buzzard scores are **unchanged**: **82.0 / 82.4 / 65.1 / 19.4 / 0.0**. Raw code 0.820405 still rounds to 82.0.

### Windows Desktop Bridge (separate, not mixed into 148)

| Slice | Score | Evidence |
| --- | --- | --- |
| Source implementation | 85% | Node engine + loopback UI + Windows `.cmd` |
| Automated tests | 80% | `npm run test:bridge` 11/11 |
| Build/package | 20% | launcher scripts; installer **NOT_VERIFIED** on Linux |
| Cursor connection | 40% | file handoff; CLI optional |
| ChatGPT/OpenAI | 25% | session **NOT_AVAILABLE**; file/clipboard implemented; API **NOT_CONFIGURED** |
| Security | 75% | path allowlist, token, redaction, no command exec |
| Recovery | 80% | RUNNING → BLOCKED on restart |
| User acceptance | 0% | no Windows UAT |
| Windows verification | 0% | environment is Linux |

## 2. AI / automation (unchanged)

| Layer | Score |
| --- | --- |
| Code implementation | **72.2%** |
| Test verification | **71.9%** |
| Operational readiness | **23.1%** |
| Production verification | **0.0%** |
