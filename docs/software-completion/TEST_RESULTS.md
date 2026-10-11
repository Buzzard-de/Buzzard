# Test Results

All commands below were run in this verification session on isolated local data. No production database. `BUZZARD_SALES_ENABLED` stayed unset / `0`.

## Suites

| Command | Exit | Passed | Failed | Notes |
| --- | --- | --- | --- | --- |
| `npm run test:unit` | 0 | 713 | 0 | 58 vitest files. `fileParallelism: false`. 10 `node:test` part files excluded. |
| `npm run test:ai` | 0 | 58 | 0 | Memory restart, Guardian, approval, workers |
| `npm run test:software` | 0 | 23 | 0 | 25 required scenarios mapped below |
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
| Playwright `homepage-viewports` | 0 | 18 | 0 | static `out/` on `:3040` |
| Playwright `admin.spec` | 1 | 2 | 2 | login + dashboard OK; Control Center / Sessions failed |
| Playwright commerce API (storefront + security) | 0 | 9 | 0 | API `:3001`, sales locked |

Not run as proof: live `production:verify:live`, `customer-journey` on a Next server, `admin-pim-core` browser clicks, Playwright `commerce-readiness.spec.ts` (file is not in a Playwright project `testMatch`). Admin commerce overview was checked with the same HTTP calls that spec uses.

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

## Storefront browser

Served today's `out/` on **`:3040`**. Stale Next on `:3000` was not used.

Passed (18/18): German 390/320/393/430/landscape, desktop 1440, tablet 768, DE/TR locale controls, mobile search → `/products/?q=textil`, AR landscape RTL, portrait de/en/tr/fr/ar.

Not claimed: live production Pages, customer-journey click path on Next, Arabic Germany photo band (AR shot has RTL chrome; the DE flag panel is German-locale specific).

## Admin

| Check | Result |
| --- | --- |
| `/admin/login/` browser | passed |
| login → `/admin/` dashboard | passed |
| `/admin/control-center/` browser | **failed** — static export returned the login form again |
| `/admin/sessions/` browser | **failed** — same |
| `POST /api/admin/login` | 200, token issued |
| `GET /api/admin/commerce/overview` with bearer | 200, `salesEnabled:false`, 24 checks |
| `GET /api/admin/approvals` with bearer | 200 |
| same admin routes without auth | 401 |

## Live local API (sales locked)

`GET /api/health/software` → `ready:true`, `liveReady:false`, `salesEnabled:false`, `productSourceOfTruthActive:false`, `marketUndercutImplemented:false`. Blocked ids: `llm_live`, `stripe`, `twilio`, `marketplace_publish`, `carrier_shipment_create`, `supplier_purchase_order_send`, `customer_message_send`, `product_source_of_truth`, `sales_unlock`.

`POST /api/commerce/checkout/attempt` after the diagnostic fix → HTTP 200, `blocked:true`, `commercialOrders:0`, `salesEnabled:false` (demo SKU is not storefront-visible).

## GitHub Actions

Observed, not inferred:

| SHA | Run | Job | Conclusion |
| --- | --- | --- | --- |
| `8adcc87` | [38138267824](https://github.com/Buzzard-de/Buzzard/actions/runs/38138267824) | quality | SUCCESS |
| `ba95c26` | [38140924702](https://github.com/Buzzard-de/Buzzard/actions/runs/38140924702) | quality | SUCCESS |
| `a56674d` | [38141461171](https://github.com/Buzzard-de/Buzzard/actions/runs/38141461171) | quality | SUCCESS |

CI `quality` runs lint, typecheck, build, `test:ai`, `test:software`, `render:preflight`, `security:check`. It does **not** run `test:unit` or Playwright.

## What tests do not prove

- Live OpenAI / Anthropic / Google.
- Live Stripe / PayPal / Twilio / DHL / marketplace.
- Production SQLite on Render disk.
- Admin Control Center / Sessions in a browser against a session-aware Next server.
- Production verification (`PRODUCTION_VERIFIED` stays 0).
