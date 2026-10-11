# Test Results

All commands below were run in this session on isolated local data. No production database.

## Suites

| Command | Exit | Passed | Failed | Notes |
| --- | --- | --- | --- | --- |
| `npm run test:ai` | 0 | 58 | 0 | Reconfirmed previous AI slice |
| `npm run test:software` | 0 | 23 | 0 | 25 required scenarios mapped below |
| `vitest run languageIndependence marketEngine localeMarketRtl` | 0 | 82 | 0 | Locale ≠ market; 35 markets; RTL |
| `npm run lint` | 0 | — | — | Next lint clean |
| `npm run typecheck` | 0 | — | — | `tsc --noEmit` |
| `npm run build` | 0 | — | — | Static export succeeded |
| `npm run security:check` | 0 | — | — | 2 pre-existing warnings |

Not run as proof: full `npm run test:unit`, Playwright `test:e2e`, live `production:verify:live`.

## Required scenarios → tests

| # | Scenario | Evidence |
| --- | --- | --- |
| 1 | Product dry-run | `softwareCompletion` it 1; `productCore.createProduct({dryRun:true})` |
| 2 | ACTIVE rejected | it 2 |
| 3 | Canonical price | it 3; `software.pricing.quote` |
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
| 17 | Other customer denied | it 16-17 |
| 18 | Arabic RTL | it 18 + `styles/rtl.css` overflow-x clip |
| 19 | Language ≠ market | it 19 + languageIndependence |
| 20 | Sales lock | it 20 |
| 21 | Missing externals BLOCKED | it 21 |
| 22 | Secrets not logged | it 22 |
| 23 | Worker crash recovery | it 23; expired lock reclaim |
| 24 | Transaction rollback | it 24 |
| 25 | Consistent API/idempotent reserve | it 25 |

## Restart proof

`server/__tests__/helpers/softwareRestartChild.cjs` writes a shipment into `BUZZARD_DB_PATH` in process A and reads it in process B. PIDs differ; record id matches.

## What tests do not prove

- Live OpenAI / Anthropic / Google.
- Live Stripe / PayPal / Twilio / DHL / marketplace.
- Production SQLite on Render disk.
- Storefront visual layout on phone/desktop.
- GitHub Actions result for this PR.
