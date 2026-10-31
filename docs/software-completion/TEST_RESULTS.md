# Test Results

All commands below were run on isolated local data or observed GitHub Actions. No production database. `BUZZARD_SALES_ENABLED` stayed unset / `0`.

## Ultimate finalization pass (local, unpushed)

Implementation SHA: `99b694cc880827b8ea505b7cffb70b7c71ef815f`. Commands below ran on the working tree that became this commit.

| Command | Exit | Passed | Failed | Notes |
| --- | --- | --- | --- | --- |
| `npx vitest run desktopBridge productArchitecture softwareCompletion` | 0 | 81 | 0 | schema, size, production-claim, port retry, UI HTTP |
| `npm run test:bridge` | 0 | 15 | 0 | |
| `npm run test:software` | 0 | 67 | 0 | includes software 63 migration simulation |
| `npm run test:ai` | 0 | 58 | 0 | |
| `npm run test:unit` | 0 | 801 | 0 | 66 files |
| `npm run lint` | 0 | — | — | |
| `npm run typecheck` | 0 | — | — | |
| `npm run build` | 0 | — | — | |
| `npm run security:check` | 0 | — | 1 warning | braces/micromatch |
| `npm run diagnostics:providers` | 0 | 31 NOT_CONFIGURED | — | dry-run |
| `npm run test:backup-restore` | 0 | dry-run | — | |
| `npm audit --omit=dev` | 0 | 0 vulns | — | |
| Playwright E2E | not run | — | — | NOT_VERIFIED |
| Windows installer | not run | — | — | Linux host; NOT_VERIFIED |
| CI / push | not run | — | — | forbidden |

## Architecture inventory + desktop bridge (local, unpushed)

Implementation SHA: `bb5cb02e2775d70b53d2d608f08bf395a5002ce0`. Commands below ran on the working tree that became this commit (docs SHA stamp may follow).

| Command | Exit | Passed | Failed | Notes |
| --- | --- | --- | --- | --- |
| `npx vitest run desktopBridge productArchitecture productWriteBoundary softwareCompletion` | 0 | 92 | 0 | focused |
| `npm run test:bridge` | 0 | 11 | 0 | file handoff, traversal, redaction, approval, recover, loopback 401 |
| `npm run test:software` | 0 | 66 | 0 | includes software 62 |
| `npm run test:ai` | 0 | 58 | 0 | Pusat unchanged |
| `npm run test:unit` | 0 | 795 | 0 | 66 files |
| `npm run lint` | 0 | — | — | no errors |
| `npm run typecheck` | 0 | — | — | PASS (existing `.next/types`) |
| `npm run build` | 0 | — | — | Next static export; desktop-bridge is Node, not part of Next |
| `npm run security:check` | 0 | — | 1 warning | braces/micromatch via eslint-config-next |
| `npm run diagnostics:providers` | 0 | 31 | — | dry-run, all NOT_CONFIGURED, live=0 |
| `npm run test:backup-restore` | 0 | dry-run | — | local only |
| `npm audit --omit=dev` | 0 | 0 vulns | — | production tree |
| `node desktop-bridge/src/index.js status` | 0 | — | — | twoWayDirect false; ChatGPT session NOT_AVAILABLE |
| Playwright E2E | not run | — | — | NOT_VERIFIED |
| Windows installer | not run | — | — | Linux environment; NOT_VERIFIED |
| CI / push | not run | — | — | this task forbade push |

## Product write boundary phase 4 — productStore + authorizeUpdate (local HEAD `2f09db7`, unpushed)

Code SHA for these commands: `2f09db7915ca77580a88ae2981391446ad05df5e`. Docs-only follow-up commits do not change this implementation SHA.

| Command | Exit | Passed | Failed | Notes |
| --- | --- | --- | --- | --- |
| `npx vitest run productWriteBoundary catalogSeoPlugin pimCatalogPlugin softwareCompletion part6Foundation` | 0 | 100 | 0 | JSON catalog isolated via temp path; ACTIVE create/update/delete gated; SKU collide 409 |
| `npm run test:software` | 0 | 65 | 0 | includes software 61 |
| `npm run test:ai` | 0 | 58 | 0 | Pusat unchanged |
| `npm run test:unit` | 0 | 779 | 0 | 64 files |
| `npm run lint` | 0 | — | — | no errors |
| `npm run build` | 0 | — | — | Next static export |
| `npm run typecheck` | 0 | — | — | PASS after build generated `.next/types`; first run failed TS6053 while `.next` was incomplete |
| `npm run security:check` | 0 | — | 1 warning | braces/micromatch via eslint-config-next |
| `npm run diagnostics:providers` | 0 | 31 | — | dry-run, all NOT_CONFIGURED, live=0, no sockets |
| `npm run test:backup-restore` | 0 | dry-run | — | local only |
| `npm audit --omit=dev` | 0 | 0 vulns | — | production tree |
| Playwright E2E | not run | — | — | NOT_VERIFIED on this HEAD; historical CI on `0d76330` does not substitute |
| CI / push | not run | — | — | this task forbade push |

## Product write boundary phase 3 — catalogSeo (local, unpushed)

| Command | Exit | Passed | Failed | Notes |
| --- | --- | --- | --- | --- |
| `npx vitest run productWriteBoundary catalogSeoPlugin pimCatalogPlugin softwareCompletion` | 0 | 74 | 0 | unauthorized / ACTIVE / `active:true` / sku+name required / duplicate 409 / persist `products` only / inactive→active blocked / plugin 403 |
| `npm run test:software` | 0 | 64 | 0 | includes software 60 |
| `npm run test:ai` | 0 | 58 | 0 | Pusat unchanged |
| `npm run test:unit` | 0 | 775 | 0 | 64 files |
| `npm run lint` | 0 | — | — | no errors |
| `npm run typecheck` | 0 | — | — | no errors |
| `npm run build` | 0 | — | — | Next static export |
| CI / push | not run | — | — | this task forbade push |

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
