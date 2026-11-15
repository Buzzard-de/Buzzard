# Egress inventory beyond Node guardedFetch / Python guarded_request

**Status:** CODE = inventory document from static search. TEST = no live outbound probes. INTEGRATION = not closed. LIVE = **not claimed**. SECURITY = Egress 4.4 DEFAULT DENY **unchanged**.  
**Date:** 8 November 2026, Europe/Berlin  
**Node unit tests this lineage:** `server/__tests__/egress44.test.mjs` — **11 tests** (do not cite 30/30).  
**Python unit tests:** `intelligence/security/test_egress.py` — **6 tests**.  
**No host firewall / Render WAF change. No extra-host allowlist change.**

Guarded paths (in scope of 4.4, listed for contrast):

| Path | Function | Library | Gate |
| --- | --- | --- | --- |
| `server/lib/security/egressGuard.js` | `guardedFetch` | Node `fetch` + `dns.lookup` | `evaluateEgress` then fetch `redirect: manual` |
| `intelligence/security/guarded_fetch.py` | `guarded_get` | requests session, `trust_env=False` | `evaluate_egress` |
| `lib/security/browserFetch.ts` | `browserFetch` | browser `fetch` | `evaluateBrowserConnect` |
| `intelligence/live_connectors/public_fetch.py` | `PublicFetcher.fetch` | `guarded_get` | yes |

## Paths **outside** or **beside** the 4.4 gate

Risk: **H** = can leave the host if invoked; **M** = local/subprocess, may still hit network; **L** = local only or fail-closed.

| File | Function / use | Library / method | Target host | Method | Uses 4.4 gate? | Auth / flag | Risk | Tests |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `scripts/*.mjs` (`p1-smoke`, `final-audit`, `finish-production`, `render-preflight`, `verify-admin-pages-deploy`, `mc3-local-latency`, …) | smoke / health | Node `fetch` | `BUZZARD_API_URL`, `buzzard24.de`, Render | HTTP | **no** | operator running script | H if run | not egress44 |
| `scripts/run-production-guard.mjs` | spawn Python guard | `child_process.spawn` → Python | API/site URLs | HTTP via child | child may or may not use guarded_fetch | env URLs | H if run | no |
| `intelligence/buzzard_ai_complete/research/providers.py` | `HttpSearchProvider.search` | `urllib.request.urlopen` | **configured endpoint** | HTTP | **no** | api_key header | **H** | no 4.4 |
| `intelligence/buzzard_ai_complete/research/engine.py` | fetch URL | `urllib.request.urlopen` | caller URL | HTTP | **no** | none | **H** | no 4.4 |
| `intelligence/buzzard_ai_complete/production/preflight.py` | HTTP preflight | `urllib.request` | health URLs | HTTP | **no** | none | H if run | no 4.4 |
| `intelligence/archive/buzzard_production_bridge_max_single.py` (and `aktiv/archive` copy) | GET | `urllib.request.urlopen` | caller | HTTP | **no** | none | H (archive) | no |
| `server/lib/commercialIntegrations.js` | Stripe/PayPal session | `guardedFetch` | `api.stripe.com`, PayPal | HTTPS | **yes** — expected **PAYMENT_EGRESS_LOCKED** | `STRIPE_SECRET_KEY` | L while deny holds | payment lock tested in egress44 |
| `server/lib/commerce/paymentService.js` | Stripe/PayPal classes | in-process 403 | none | none | n/a | flags off | L | code review |
| `lib/security.ts` CSP | analytics hosts in CSP **when marketing IDs set** | browser | GA/GTM/Meta/TikTok | HTTPS | browser layer; **not** Node guardedFetch | `NEXT_PUBLIC_*` | M if IDs set | egress44 empty-ID case |
| `lib/security/browserConnect.js` | allow `.onrender.com`, `buzzard24.de` | policy | those suffixes | HTTPS | browser policy | none | M | 11 Node tests include browser deny |
| `server/lib/buzzardNative/thinking/hardwareProbe.js` | `nvidia-smi` | `execFileSync` | local binary | subprocess | **no** (local) | none | L (could hang) | not network-tested |
| `server/lib/deploymentIdentity.js` | `git rev-parse` | `execSync` | local git | subprocess | no | none | L | no |
| `server/lib/backupAutomation.js` | `execSync` | child_process | local backup dir `/var/data/backups` | subprocess | no | `BUZZARD_BACKUP_DIR` | M if command interpolates unsafely; **not proven WORM** | no live backup this task |
| `server/lib/db.js` | SQLite | `better-sqlite3` | local file | IPC/file | n/a | none | L unless loadable extensions added (none found) | app tests |
| DNS | `egressGuard.js` `dns.lookup` | Node DNS | resolver | DNS | used **by** the gate | none | M (resolver poisoning still a class of issue) | rebind unit test |
| Proxy | `HTTP_PROXY` et al. | env | proxy | HTTP | **denied** by 4.4 tests | env | L under tests | 11 Node + 6 Python |
| Redirect | `guardedFetch` `redirect: manual` | fetch | Location host | HTTP | re-eval required | none | L under tests | Python `test_redirect_not_followed` |
| WebSocket | — | — | — | — | **no WS client found** in app TS/JS/PY search | — | none found | n/a |
| WebRTC | Zeynep/voice | flags `sip: false` | none | — | **not connected** | SIP/Twilio env absent | L | voice BLOCKED |
| Telemetry / crash | `@opentelemetry/api` in lockfile; Sentry DSN in **tests** | possible SDK | Sentry if DSN set | HTTPS | **not proven gated** | `SENTRY_DSN` | M if a runtime sets DSN | test_production_bridge mocks DSN |
| Updates / installers | `npm`, `pip`, OS | operator shell | registry.npmjs.org, pypi | HTTPS | **no** | human | H on `npm i` | not run this task |
| Scheduled jobs | `core_background_jobs` in db.js | in-process | depends on job | mixed | **job body not universally gated** | flags | M | not inventoried per job |
| Third-party clients | marketplace Python zips, ebay client | mixed | ebay etc. | HTTP | ebay token path **denied until host approved** (Python test) | tokens | H if EXTRA_HOSTS + approval | Python 6 |
| Twilio | `sandboxReadiness.js` env probe | env read | none until SDK | — | no live SDK call found | `BUZZARD_TWILIO_*` | L | probe only |

## Browser fetch

`lib/**` storefront/admin clients use `browserFetch` (dozens of modules). Raw `fetch(` under `lib/` besides `browserFetch.ts` was **not** found in this search. **Scripts and some server paths still use unguarded `fetch`.** Historical “134 conversions” was **not** re-counted; this inventory does not restore the 30/30 Node claim.

## What 4.4 does **not** cover

- Operator laptops, CI runners, `npm`/`pip`, `curl` in a shell
- Python `urllib.request` callers that skip `guarded_get`
- Node scripts that call `fetch` directly
- Child processes
- Future native addons / SQLite extensions
- Host firewall and Render WAF (untouched, unverified live)

## Egress policy

`data/security/egress_policy.v1.json` remains `default: DENY`. `BUZZARD_EGRESS_EXTRA_HOSTS` still cannot unlock AI or payments. **No live connection test was performed.**
