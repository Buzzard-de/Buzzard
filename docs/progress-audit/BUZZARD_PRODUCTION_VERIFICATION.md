# Buzzard Production Verification

**Probed:** 2026-10-11T10:24:35Z (read-only HTTP).  
**Live API commit:** `84166bb363f3` = `origin/main` `84166bb`.  
**Site:** https://buzzard24.de HTTP 200.

## Verified in production

| Item | Evidence | Label |
|------|----------|-------|
| Static storefront | HTTP 200 | VERIFIED |
| API health | HTTP 200, commit match, drift false | VERIFIED |
| Persistent SQLite | `/var/data/buzzard.db` persistent=True | VERIFIED |
| Sales lock | salesEnabled=False goLiveLock=True | VERIFIED |
| Empty sellable catalog | productCount=0 | VERIFIED |
| Legacy products row count | 26 (not PIM ACTIVE) | VERIFIED |
| Orders | 0 | VERIFIED |
| Supplier | connected=False dryRun=True MOCK | VERIFIED |
| Payments (commerce flags) | mock=True stripe=False paypal=False | VERIFIED |
| Worker | RUNNING; supplierOrdersBlocked=True | VERIFIED |
| Backup files | latestValid=True; cron=None | PARTIALLY VERIFIED |
| Intelligence bridge | LIVE; catalog BLOCKED | PARTIALLY VERIFIED |
| Orchestrator up | HTTP 200; DB `/tmp/buzzard_orchestrator.db` | VERIFIED (ephemeral) |
| Guardian up | HTTP 200; DB `/tmp/buzzard_guardian.sqlite3` | VERIFIED (ephemeral) |
| Go-live gate | BLOCKED autoActivate false | VERIFIED |
| CI quality on main | lint/typecheck/build/preflight/security:check SUCCESS; unit/e2e NOT IN CI | VERIFIED |
| Taxonomy | count 53 | VERIFIED |

## Code only / not production-operational

| Area | Code | Production |
|------|------|------------|
| PIM / SoT | productCore.js | 0 ACTIVE |
| Supplier adapters | API/XML/CSV | MOCK / dry-run |
| Pricing €0.50 | profit.py | not checkout |
| €0.10 undercut | none | none |
| Checkout / OMS | services + plugins | 0 orders, dry-run |
| Stripe/PayPal classes | adapters | flags false |
| Marketplace hub | Amazon/eBay/Google/TikTok rows | no channel HTTP |
| EU marketplaces | metadata | not implemented |
| Carriers | seeded stubs | all false |
| AI agents | simulation handlers | /tmp memory |
| Voice / digital human | python stubs / unmerged PRs | not on main |
| Return recovery | types + wrong admin URL | no API |
| Unit/e2e | large suites | NOT TESTED |

## External blockers

| Blocker | Access needed |
|---------|----------------|
| Supplier contract + API/XML/CSV | Operator credentials (not bypassed) |
| PSP dashboard / live keys | Human Render/PSP |
| Carrier contracts | Human |
| Marketplace partner accounts | Human |
| LLM keys | Optional, not for sales |
| Admin password verification | Not attempted |
| RENDER_API_KEY / dashboard write | Not used |

## Tests and deploy

| Check | Result |
|-------|--------|
| This audit ran unit/e2e | **NOT TESTED** (not executed) |
| CI lint/typecheck/build | SUCCESS on 84166bb |
| Pages + API deploy | SUCCESS / SYNCED |
| Historical August smoke | Not reused as PASS |

## Contradiction checks applied

- Interface / queue / flag / health ≠ business ready
- Persistent DB ≠ restore proven
- Agent definition ≠ autonomous operation
- Mock payment ≠ real payment
- Marketplace metadata ≠ connector
- DEMO tracking ≠ carrier tracking
- GPS not claimed
