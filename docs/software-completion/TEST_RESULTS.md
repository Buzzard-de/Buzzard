# Test Results

All commands below were run on isolated local data or observed GitHub Actions. No production database. `BUZZARD_SALES_ENABLED` stayed unset / `0`.

## Product write boundary phase 2 — pimCatalog (local, unpushed)

| Command | Exit | Passed | Failed | Notes |
| --- | --- | --- | --- | --- |
| `npx vitest run productWriteBoundary pimCatalogPlugin softwareCompletion` | 0 | 68 | 0 | unauthorized / ACTIVE / sku required / duplicate 409 / no dual-write / conflict 409 / plugin 403 |
| `npm run test:software` | 0 | 63 | 0 | includes software 59 persist-only `pim_products` |
| `npm run test:ai` | 0 | 58 | 0 | Pusat unchanged |
| `npm run test:unit` | 0 | 769 | 0 | 63 files |
| `npm run lint` | 0 | — | — | no errors |
| `npm run typecheck` | 0 | — | — | no errors |
| `npm run build` | 0 | — | — | Next static export |
| CI / push | not run | — | — | this task forbade push |

## Product write boundary (local, unpushed)

| Command | Exit | Passed | Failed | Notes |
| --- | --- | --- | --- | --- |
| `npx vitest run productWriteBoundary` | 0 | 6 | 0 | unauthorized / ACTIVE / conflict / no dual-write |
| `npm run test:software` | 0 | 62 | 0 | includes software 58 |
| `npm run test:ai` | 0 | 58 | 0 | Pusat unchanged |
| `npm run test:unit` | 0 | 763 | 0 | 62 files |
| CI / push | not run | — | — | this task forbade push |

## Current SHA `0d76330` (2026-10-12)

| Command | Exit | Passed | Failed | Notes |
| --- | --- | --- | --- | --- |
| `npm run test:software` | 0 | 61 | 0 | 55 software + 6 lifecycle; TEST_VERIFIED only |
| `npm run test:ai` | 0 | 58 | 0 | Pusat/Guardian unchanged |
| `npm run test:unit` | 0 | 756 | 0 | 61 files |
| `npm run lint` | 0 | — | — | no errors |
| `npm run typecheck` | 0 | — | — | no errors |
| `npm run build` | 0 | — | — | Next static export |
| `npm run security:check` | 0 | — | — | 1 warning (braces/micromatch) |
| `npm audit --omit=dev` | 0 | 0 vulns | — | production tree |
| `node scripts/provider-diagnostics.mjs` | 0 | 31 NOT_CONFIGURED | — | dry-run, no sockets |
| `npm run test:backup-restore` | 0 | dry-run | — | local only |
| GitHub Actions `0d76330` | 0 | quality + e2e-storefront + e2e-admin | 0 | run 38245468242 |

## Suites

| Command | Exit | Passed | Failed | Notes |
| --- | --- | --- | --- | --- |
| `npm run test:software` | 0 | 36 | 0 | Adds refund UNCERTAIN, workflow audit, voice env names, worker recover/DLQ |
| `npm run test:ai` | 0 | 58 | 0 | Memory restart, Guardian, approval, workers |
| `npm run test:unit` | 0 | 728 | 0 | 59 files |
| Playwright admin + PIM + customer-journey | 0 | 37 | 0 | 4 skipped (viewport/project filters) |
| Playwright homepage viewports | 0 | 18 | 0 | DE/EN/TR/FR/AR including Arabic RTL |
| Playwright admin + PIM after workflow 401 | 0 | 13 | 0 | includes unauth `safe-workflow` 401 |
| `render:preflight` | 0 | — | — | 2 warnings; deploy not executed |
| `security:check` | 0 | — | — | 2 warnings (contact time-trap) |
| GitHub Actions `a26b51d` | 0 | quality + e2e-storefront + e2e-admin | 0 | run 38153709074 |

## Required scenarios → tests

| # | Scenario | Evidence |
| --- | --- | --- |
| 1–33 | Prior softwareCompletion cases | still passing |
| 34 | Payment/refund timeout is UNCERTAIN | it 34; `retryable:false` |
| 35 | Carriers fail closed | it 35 |
| 36 | External checklist, no secrets, honest OTTO flag | it 36; `voice_realtime` has `OPENAI_API_KEY` |
| 37 | Safe customer workflow + audit | it 37; `commercialOrders:0`; audit row persisted |
| 38 | Worker recover + dead-letter + no financial retry | it 38 |

## Authenticated browser

Served `out/` on **`:3040`** against API **`:3001`**. Sales locked.

| Check | Result |
| --- | --- |
| Admin login page | passed |
| Unauth Control Center → login | passed |
| Login form stores session token | passed |
| Authenticated dashboard | passed |
| Control Center page | passed |
| Sessions page | passed |
| Control Center tabs: Onaylar / Commerce / Workers / Entegrasyonlar | passed |
| Unauth `/api/admin/software/*` including checklist + safe-workflow | 401 |
| Admin PIM Core / demo SKU / Validate / dry-run / Brands | 5/5 passed |
| customer-journey homepage + warenkorb + catalog/blocked checkout | desktop + mobile passed |
| Homepage DE/TR/AR RTL + locale ≠ market | 18/18 passed |
| `POST /api/commerce/checkout/attempt` | `blocked:true`, `salesEnabled:false`, `commercialOrders:0` |

## Live local API (sales locked)

`GET /api/health` → `salesEnabled:false`, `orders:0`.  
`GET /api/health/software` → `ready:true`, `liveReady:false`, `salesEnabled:false`, `productSourceOfTruthActive:false`.  
`POST /api/admin/software/safe-workflow` without auth → **401**.

## GitHub Actions

Observed, not inferred:

| SHA | Run | quality | e2e-storefront | e2e-admin |
| --- | --- | --- | --- | --- |
| `a273651` | [38149927916](https://github.com/Buzzard-de/Buzzard/actions/runs/38149927916) | SUCCESS | SUCCESS | **FAILURE** (login → `/products/`) |
| `a2879e4` | [38150381530](https://github.com/Buzzard-de/Buzzard/actions/runs/38150381530) | SUCCESS | SUCCESS | SUCCESS |
| `de6b95c` | [38150791513](https://github.com/Buzzard-de/Buzzard/actions/runs/38150791513) | **FAILURE** | SUCCESS | SUCCESS |
| `f967c01` | [38150911437](https://github.com/Buzzard-de/Buzzard/actions/runs/38150911437) | SUCCESS | SUCCESS | SUCCESS |
| `0d71a18` | [38150996642](https://github.com/Buzzard-de/Buzzard/actions/runs/38150996642) | SUCCESS | SUCCESS | SUCCESS |
| `7afcb7b` | [38151203856](https://github.com/Buzzard-de/Buzzard/actions/runs/38151203856) | SUCCESS | SUCCESS | SUCCESS |
| `a26b51d` | [38153709074](https://github.com/Buzzard-de/Buzzard/actions/runs/38153709074) | SUCCESS | SUCCESS | SUCCESS |

Current workflow: `quality` (lint, typecheck, build, `test:ai`, `test:software`, `test:unit`, preflight, `security:check`), `e2e-storefront` (homepage on `out/:3040`), `e2e-admin` (API `:3001` + static `:3040` + admin / PIM / journey).

## What tests do not prove

- Live OpenAI / Anthropic / Google.
- Live Stripe / PayPal / Twilio / DHL / marketplace / supplier PO.
- Production SQLite on Render disk.
- Full customer-journey checkout form while sales are locked.
- Production verification (`PRODUCTION_VERIFIED` stays 0).
- CI on the documentation/gap-close commit that follows `a26b51d` until that run is observed.
