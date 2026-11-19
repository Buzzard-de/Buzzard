# BUZZARD — Final Baseline Scorecard

**Establishes measured baseline for operator approval**  
**Date:** 2026-11-19, 15:52 Europe/Berlin  
**Method:** Weighted verified judgments + test execution — **not** phase-gate averages alone

## A. Overall percentages

| Metric | % | Denominator / method |
|--------|--:|----------------------|
| **A. Overall software completion** | **59.8** | Unweighted mean of 21 phase **verified** % (`BUZZARD_21_PHASE_REAL_COMPLETION_AUDIT.md`) |
| B. Backend completion | **68** | Effective server code + integration tests passing / known backend criteria |
| C. Frontend completion | **62** | `app/` + `components/` + storefront bridge; limited live UX proof |
| D. AI & automation completion | **45** | Native core + registry vs unwired `intelligence/` tree |
| E. E-commerce engine completion | **64** | `engineRegistry` 11/11 present, 0 live; dry paths tested |
| F. Security completion (software) | **72** | Vitest security suite on worktree |
| G. Test coverage & verification | **78** | 1949/1950 server tests PASS; E2E partial |
| H. Integration readiness (adapters) | **52** | Sandbox adapters built; credentials absent |
| **I. Live integration readiness** | **24** | Critical six + egress + SALES |
| **J. Production readiness** | **0** | `productionReady=false`, explicit operator rules |

## Test execution (current)

| Scope | Files | Pass | Fail | Skip | When |
|-------|------:|-----:|-----:|-----:|------|
| `server/__tests__` | 159 | 1949 | 0 | 1 | 2026-11-19, `BUZZARD_DB_PATH=/tmp/buzzard-inventory-audit.db` |
| Misconfigured run | 159 | 1591 | 347 | 12 | `BUZZARD_DB_ENABLED=0` — **invalid for baseline** |

**Protected DB:** unchanged SHA `f5617f67…` across inventory test run.

## Phase counts

| Status | Phases |
|--------|-------:|
| SOFTWARE_COMPLETE (≥95%) | 0 |
| PARTIAL | 21 |
| NOT_STARTED (whole phase) | 0 |
| FAIL criteria inside phases | Multiple (SoT, textile live, marketing) |
| BLOCKED_EXTERNAL live paths | All 21 phases have at least one |

## Live-blocked integrations (critical six +)

1. TecDoc live  
2. Supplier live API  
3. Payment capture  
4. Refund  
5. Tax Connect live  
6. Carrier live rates  
7. Marketplace OAuth publish  
8. Textile vision  
9. SMTP live  
10. Live API patch apply (:3001)

## Architecture counts

| Item | Count |
|------|------:|
| Plugins `register(app)` | 92 |
| HTTP route handlers (static grep) | 772 |
| Commerce engines registered | 11 |
| Vitest test files (`server/__tests__/*.mjs`) | 173 |
| Application source files | 1,550 |
| Effective application code lines | 169,831 |
| Backend effective lines | 80,912 |
| Frontend effective lines | 67,083 |

## Repository files

| | |
|-|-:|
| Total files (excl. node_modules etc.) | 4,480 |
| Uncommitted changes | 196 |
| Untracked | 110 |

## Production readiness status

**NOT READY** — SALES locked, egress deny, live integrations blocked, merge conflicts on security/phases PRs, live API not re-verified.

## Top 5 remaining tasks (post-baseline)

1. **Restore or bless `buzzard.db` baseline** and enforce test DB isolation (`BUZZARD_DB_PATH` temp) in CI docs.  
2. **Merge/reconcile PR #507 + #508** into a single security+phases integration branch with clean mergeable state.  
3. **Unify order + product SoT** (deprecate parallel stores/plugins).  
4. **Apply server security graph to live API** in an authorized maintenance window and re-smoke.  
5. **HTTP/browser E2E** checkout → order persistence → fulfillment stub on storefront (port policy permitting).

---

**Baseline locked for operator review.** No implementation started after this inventory per directive §15.