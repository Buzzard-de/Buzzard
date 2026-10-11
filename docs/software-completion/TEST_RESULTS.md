# Test Results

All commands below were run on isolated local data or observed GitHub Actions. No production database. `BUZZARD_SALES_ENABLED` stayed unset / `0`.

## Suites

| Command | Exit | Passed | Failed | Notes |
| --- | --- | --- | --- | --- |
| `npm run test:software` | 0 | 31 | 0 | Includes feed preview, message drafts, WMS audit, auth 401 |
| `npm run test:ai` | 0 | 58 | 0 | Memory restart, Guardian, approval, workers |
| `npm run test:unit` (local, before unique draft) | 1 | 723 | 1 | Shared SQLite leftover `BLOCKED` draft hash; fixed in `f967c01` |
| `vitest run softwareCompletion` after unique draft | 0 | 31 | 0 | Isolated message body |
| Playwright admin + PIM + customer-journey | 0 | 26 | 0 | 1 skipped (phone-only UX) |
| GitHub Actions `a273651` | 1 | quality + e2e-storefront | e2e-admin | run 38149927916; login submit hit storefront search |
| GitHub Actions `a2879e4` | 0 | quality + e2e-storefront + e2e-admin | 0 | run 38150381530 |
| GitHub Actions `de6b95c` | 1 | — | quality | run 38150791513; leftover draft-hash collision; fixed in `f967c01` |
| GitHub Actions `f967c01` | 0 | quality + e2e-storefront + e2e-admin | 0 | run 38150911437 |
| GitHub Actions `0d71a18` (HEAD) | 0 | quality + e2e-storefront + e2e-admin | 0 | run 38150996642 |

## Required scenarios → tests

| # | Scenario | Evidence |
| --- | --- | --- |
| 1–29 | Prior softwareCompletion cases | still passing |
| 30 | CSV/XML feed preview | it 30; `written:false`, `purchaseOrderSent:false` |
| 31 | Message draft never sends | it 31; send path `BLOCKED`, `sent=0` |
| 32 | WMS vs commercial reserve | it 32; `sharedAuthority:false` |
| 33 | API 401 + health fail-closed | it 33 + Playwright unauth admin APIs |

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
| Unauth `/api/admin/software/*` | 401 |
| Admin PIM Core / demo SKU / Validate / dry-run / Brands | 5/5 passed |
| customer-journey homepage + warenkorb + catalog/blocked checkout | 18 passed / 1 skipped |
| `POST /api/commerce/checkout/attempt` | `blocked:true`, `salesEnabled:false`, `commercialOrders:0` |

## Live local API (sales locked)

`GET /api/health/software` → `ready:true`, `liveReady:false`, `salesEnabled:false`, `productSourceOfTruthActive:false`, `version:1.2.0`.

## GitHub Actions

Observed, not inferred:

| SHA | Run | quality | e2e-storefront | e2e-admin |
| --- | --- | --- | --- | --- |
| `7f81585` | [38144084891](https://github.com/Buzzard-de/Buzzard/actions/runs/38144084891) | SUCCESS | SUCCESS | n/a |
| `a273651` | [38149927916](https://github.com/Buzzard-de/Buzzard/actions/runs/38149927916) | SUCCESS | SUCCESS | **FAILURE** (login → `/products/`) |
| `a2879e4` | [38150381530](https://github.com/Buzzard-de/Buzzard/actions/runs/38150381530) | SUCCESS | SUCCESS | **SUCCESS** |
| `de6b95c` | [38150791513](https://github.com/Buzzard-de/Buzzard/actions/runs/38150791513) | **FAILURE** (`test:unit` leftover draft hash) | SUCCESS | SUCCESS |
| `f967c01` | [38150911437](https://github.com/Buzzard-de/Buzzard/actions/runs/38150911437) | SUCCESS | SUCCESS | SUCCESS |
| `0d71a18` | [38150996642](https://github.com/Buzzard-de/Buzzard/actions/runs/38150996642) | SUCCESS | SUCCESS | SUCCESS |

Current workflow: `quality` (lint, typecheck, build, `test:ai`, `test:software`, `test:unit`, preflight, `security:check`), `e2e-storefront` (homepage on `out/:3040`), `e2e-admin` (API `:3001` + static `:3040` + admin / PIM / journey).

## What tests do not prove

- Live OpenAI / Anthropic / Google.
- Live Stripe / PayPal / Twilio / DHL / marketplace / supplier PO.
- Production SQLite on Render disk.
- Full customer-journey checkout form while sales are locked.
- Production verification (`PRODUCTION_VERIFIED` stays 0).
- Production verification (`PRODUCTION_VERIFIED` stays 0). HEAD `0d71a18` CI is observed green and still does not prove live providers.
