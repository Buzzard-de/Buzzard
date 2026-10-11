# Test Results

All commands below were run on isolated local data or observed GitHub Actions. No production database. `BUZZARD_SALES_ENABLED` stayed unset / `0`.

## Suites

| Command | Exit | Passed | Failed | Notes |
| --- | --- | --- | --- | --- |
| `npm run test:unit` (local) | 0 | 717 | 0 | 58 vitest files. Shared local SQLite had public PIM rows. |
| `npm run test:unit` (CI `25a48da`) | 1 | 715 | 2 | `part8Foundation` cart + checkout assumed leftover public catalog. |
| `vitest part8Foundation` after fixture | 0 | 17 | 0 | Seeds a READY/PUBLIC `UNIT-CART-*` fixture. Not ACTIVE. |
| `npm run test:ai` | 0 | 58 | 0 | Memory restart, Guardian, approval, workers |
| `npm run test:software` | 0 | 27 | 0 | CI on `25a48da` also SUCCESS |
| `npm run test:part24` | 0 | 10 | 0 | `node --test` |
| `npm run test:part27` | 0 | 18 | 0 | `node --test` |
| `npm run test:part28` | 0 | 24 | 0 | publishing asserts `enabled===false` + numeric count |
| `npm run test:part29` | 0 | 36 | 0 | same publishing assertion |
| `npm run test:part30` | 0 | 22 | 0 | |
| `npm run test:part31` | 0 | 24 | 0 | |
| `npm run test:part32` | 0 | 15 | 0 | |
| `npm run test:part33` | 0 | 21 | 0 | |
| `npm run test:part34` | 0 | 26 | 0 | |
| `npm run test:part35` | 0 | 25 | 0 | |
| Playwright `homepage-viewports` | 0 | 18 | 0 | static `out/` on `:3040`; CI `e2e-storefront` SUCCESS |
| Playwright `admin.spec` | 1 | 2 | 2 | login + dashboard OK; Control Center / Sessions failed |
| Playwright `admin-pim-core` browser | — | — | — | **NOT VERIFIED** (static AdminGuard / session) |
| Playwright `customer-journey` page loads | 0 | 2 | 0 | homepage + `/warenkorb/` |
| Playwright `customer-journey` checkout UI | — | — | — | **NOT VERIFIED** |
| Playwright commerce API | 0 | 12 | 0 | API `:3001`, sales locked |
| GitHub Actions `7f81585` | 0 | quality + e2e-storefront | 0 | run 38144084891; includes `test:unit` |

## Required scenarios → tests

| # | Scenario | Evidence |
| --- | --- | --- |
| 1 | Product dry-run | `softwareCompletion` it 1; `productCore.createProduct({dryRun:true})` |
| 2 | ACTIVE rejected | it 2 |
| 3 | Canonical price | it 3; `software.pricing.quote`; commerce price-tamper e2e |
| 4 | Unreliable stock blocked | it 4; estimate + stale |
| 5 | Safe order draft | it 5 |
| 6 | PO draft not sent | it 6 |
| 7 | No double claim | it 7; `SOFTWARE_ISOLATED` |
| 8 | Restart keeps task/state | it 8-9; second Node process |
| 9 | Memory/tracking readable in other process | same; `softwareRestartChild.cjs` |
| 10 | Guardian denies dangerous | it 10; `supplier.order.submit` |
| 11 | Approval input change | it 11 |
| 12 | No financial auto-retry | it 12 |
| 13 | Customs fail-closed | it 13 |
| 14 | Supplier mock errors | it 14 |
| 15 | Marketplace mock errors | it 15 |
| 16 | Tracking own order only | it 16-17 |
| 17 | Other customer denied | it 16-17; cart IDOR e2e |
| 18 | Arabic RTL | it 18 + homepage Playwright AR landscape/portrait `dir=rtl` |
| 19 | Language ≠ market | it 19 + languageIndependence + DE/TR locale controls |
| 20 | Sales lock | it 20; `/api/health/software` `salesEnabled:false`; commercial checkout blocked |
| 21 | Missing externals BLOCKED | it 21; live health payload |
| 22 | Secrets not logged | it 22 |
| 23 | Worker crash recovery | it 23; expired lock reclaim |
| 24 | Transaction rollback | it 24 |
| 25 | Consistent API/idempotent reserve | it 25; checkout idempotency e2e |
| 26 | Returns ledger does not assume supplier credit | it 26 |
| 27 | Reporting does not invent revenue | it 27 |
| 28 | Canonical search does not invent products | it 28 |
| 29 | Specialist assistants recommendation-only | it 29 |

## Storefront browser

Served `out/` on **`:3040`**. Stale Next on `:3000` was not used.

Passed (18/18): German 390/320/393/430/landscape, desktop 1440, tablet 768, DE/TR locale controls, mobile search → `/products/?q=textil`, AR landscape RTL, portrait de/en/tr/fr/ar.

CI `e2e-storefront` on `25a48da` reproduced the homepage suite successfully.

Not claimed: live production Pages, full customer-journey checkout UI, Arabic Germany photo band (DE-locale specific).

## Admin

| Check | Result |
| --- | --- |
| `/admin/login/` browser | passed |
| login → `/admin/` dashboard | passed |
| `/admin/control-center/` browser | **NOT VERIFIED** — static export returned the login form |
| `/admin/sessions/` browser | **NOT VERIFIED** — same |
| `/admin/pim-core/` browser | **NOT VERIFIED** — same AdminGuard/session issue |
| `POST /api/admin/login` | 200, token issued (rate-limited after many attempts; token cache added) |
| Admin PIM products | 50 rows; demo `HIDDEN` |
| Admin PIM validate | WARNING |
| Admin PIM import dry-run | `written:false` |
| `GET /api/admin/commerce/overview` with bearer | 200, `salesEnabled:false` |
| `GET /api/admin/approvals` with bearer | 200 |
| same admin routes without auth | 401 |

## Live local API (sales locked)

`GET /api/health/software` → `ready:true`, `liveReady:false`, `salesEnabled:false`, `productSourceOfTruthActive:false`, `marketUndercutImplemented:false`.

Engine map (explicit, not inferred from process health): payment/marketplace/tracking **BLOCKED**, voice **NOT_CONFIGURED**, production **NOT_TESTED**.

`POST /api/commerce/checkout/attempt` → HTTP 200, `blocked:true`, `commercialOrders:0`, `salesEnabled:false`.

## GitHub Actions

Observed, not inferred:

| SHA | Run | quality | e2e-storefront |
| --- | --- | --- | --- |
| `8adcc87` | [38138267824](https://github.com/Buzzard-de/Buzzard/actions/runs/38138267824) | SUCCESS | n/a |
| `ba95c26` | [38140924702](https://github.com/Buzzard-de/Buzzard/actions/runs/38140924702) | SUCCESS | n/a |
| `a56674d` | [38141461171](https://github.com/Buzzard-de/Buzzard/actions/runs/38141461171) | SUCCESS | n/a |
| `65a5b3a` | [38141677035](https://github.com/Buzzard-de/Buzzard/actions/runs/38141677035) | SUCCESS | n/a |
| `25a48da` | [38143086398](https://github.com/Buzzard-de/Buzzard/actions/runs/38143086398) / [38143084048](https://github.com/Buzzard-de/Buzzard/actions/runs/38143084048) | **FAILURE** (`test:unit` 2 failed) | **SUCCESS** |
| `7f81585` | [38144084891](https://github.com/Buzzard-de/Buzzard/actions/runs/38144084891) | **SUCCESS** (lint, typecheck, build, `test:ai`, `test:software`, `test:unit`, preflight, `security:check`) | **SUCCESS** |

Current workflow: `quality` runs lint, typecheck, build, `test:ai`, `test:software`, `test:unit`, `render:preflight`, `security:check`. Separate `e2e-storefront` serves `out/` on `:3040` and runs homepage Playwright. The empty-CI catalog failure on `25a48da` is fixed and observed green on `7f81585`.

## What tests do not prove

- Live OpenAI / Anthropic / Google.
- Live Stripe / PayPal / Twilio / DHL / marketplace.
- Production SQLite on Render disk.
- Admin Control Center / Sessions / PIM in a browser against a session-aware Next server.
- Full customer-journey checkout UI.
- Production verification (`PRODUCTION_VERIFIED` stays 0).
- Authenticated admin Control Center / PIM browser tests (still not in CI).
