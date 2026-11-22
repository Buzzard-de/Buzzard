# Buzzard — Phase 1–21 master status

**Checkpoint:** `9b86c1b7` (`9b86c1b70159c32d644f2596f61ae8388ad401ec`)  
**Branch:** `cursor/save-full-worktree-c293`  
**Worktree:** `/home/ubuntu/buzzard-worktrees/save-full-worktree-c293`  
**PR:** https://github.com/Buzzard-de/Buzzard/pull/509 (not merged)  
**Phase 21 update:** 21.11.2026, 18:22 Avrupa/Berlin. Uncommitted. No push, no merge.  
**Phase 10 update:** 21.11.2026, 18:53 Avrupa/Berlin. Uncommitted. No push, no merge.  
**Workstream 17 → 11 → 8 → 9 → 15 → 20:** 21.11.2026, 19:50 Avrupa/Berlin. Uncommitted. No push, no merge. Every phase below stays PARTIAL.

## Workstream status after phases 17, 11, 8, 9, 15, and 20

**All six remain PARTIAL.** None is `VERIFIED_COMPLETE`.

On 21.11.2026 at 19:50 Avrupa/Berlin the phase evidence files and the seven gate files passed together: 13 files, 45 tests, 0 failed, exit code 0. The existing JWT, CSRF, egress, admin-session, and route-matrix files passed in a separate run at 19:49 Avrupa/Berlin: 13 files, 308 tests, 0 failed, exit code 0.

Phase 17 calls `evaluateEgress`, the approval queue, Esat’s audit store, RBAC, and memory isolation. A forbidden AI host is denied. A missing JWT configuration is a weakness. An unknown agent is `UNKNOWN_IDENTITY`. Cross-agent memory is `MEMORY_ISOLATION_DENIED`. Human approval expires and a second decision is `ALREADY_DECIDED`. `SEC_LIVE_RESTART` stays `BLOCKED_EXTERNAL`. Dependency advisory lookup and a backup-restore drill were not run in this session.

Phase 11 no longer reads phase 3’s percent. The product source of truth stays inactive unless both activation flags are set, and those flags are restored. Duplicate EAN `5901234999993` is `duplicate_ean`. A second source on the same SKU is `CONFLICT`. An incomplete product is not published. `PIM_LIVE_PUBLISH` stays blocked. Production source of truth was not activated.

Phase 8 exercises DHL, DPD, GLS, Hermes, and UPS through the existing adapters. Empty address data returns the adapter’s missing-field code. A complete fixture returns `HUMAN_GATE_REQUIRED` and `liveShipment: false`. Duplicate and older tracking events are ignored. A later `FAILED` event becomes the status. Quoted cost stays `UNKNOWN`. `LOG_LIVE_RATES` stays blocked. No label was bought.

Phase 9 records a measurement only with consent, recommends workwear for a work occasion, returns `NO_MEASUREMENTS` when none exist, and keeps the demo try-on at `liveTryOn: false`. The image adapter stays `BLOCKED`. `TEX_LIVE_TRYON` stays blocked.

Phase 15 service checks passed and the browser check did not run. Hub coverage is 50 with no missing primary label. An empty device report has 8 missing controls. Arabic is `rtl`. Cart tax is 19 for DE and 20 for FR. Checkout returns `sales_disabled` / 403. `SF_BROWSER` is `NOT_RUN` and is counted, so `percentComplete` is 83.3 and `ok` is false. `SF_LIVE_CDN` stays `BLOCKED_EXTERNAL`. Playwright was not pointed at port 3000.

Phase 20 measured 20 iterations of a 2,000-row `searchAndSort`, 20 pricing quotes, and 20 `sqlite_master` counts in one process. Search p50 0.500 ms, p95 1.392 ms, max 2.331 ms. Quote p95 0.138 ms. Query p95 0.011 ms. Heap moved from 7,189,856 to 8,306,904 bytes. Failures 0. Concurrency 1. A synthetic queue fault returned to `QUEUED`. `productionVerification` is false. `PERF_LOAD_TEST` stays `BLOCKED_EXTERNAL`. These numbers are not production performance.

The 14:58 audit text below is kept. Where a phase section and this banner disagree, this banner is the later run.

T-15.2 browser continuation, 21.11.2026 21:35 Avrupa/Berlin: all 30 locale homepages were opened in Chromium on ports 3010 and 3011. Phase 15 stays PARTIAL. `SF_BROWSER` in the gate is still `NOT_RUN`. `SF_LIVE_CDN` stays blocked. The chrome matched each locale. Category names and the country selector still mix languages, so this is not a completion claim.

T-15.2 label close, 21.11.2026 22:23 Avrupa/Berlin: the live catalog has 53 main categories, not 50, and all 53 have a label in each of the 30 locales. The textile tree is 78 nodes, plus four clothing leaves outside it (`cat-14-06-02`, `cat-17-01-05`, `cat-17-01-06`, `cat-17-01-07`). German leaves are German and Turkish parents are Turkish. The 27 EU country names, and the other countries in the selector, are localized in the display layer. The stored country file is still German. Chromium opened all 30 locales on ports 3010 and 3011: 10 Playwright tests passed, exit 0. `SF_BROWSER` is `PASS` because `docs/software-completion/t15-2/locales.json` satisfied the checks. Phase 15 `percentComplete` is 100 and `ok` is true only because `SF_LIVE_CDN` is excluded. `completeClaim` is false and `live` is false. Phase 15 stays PARTIAL. Phase 6 now rejects a cancel with no order id and no longer sets `completeClaim` while `ORD_LIVE_SUBMIT` is blocked. The phase 6 test and the 6–21 gate passed: 17 tests, exit 0, 22:23 Avrupa/Berlin. Phases 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, and 21 stay PARTIAL. None is `VERIFIED_COMPLETE`.

## Phase 10 status after the marketplace run

**PARTIAL.** Not `VERIFIED_COMPLETE`.

The shallow registry and validation checks are gone. `evaluatePhase10Marketplace` now calls `runPhase10Evidence`, which uses the existing connector registry, marketplace hub, merchant-feed validator, pricing quote, and AB27 VAT snapshot. On 21.11.2026 at 18:53 Avrupa/Berlin the phase 10 tests and the seven gate files passed: 11 files, 40 tests, 0 failed.

What that run proved on synthetic data: 10 sandbox channels, all `live: false` and publish blocked; unknown channel `CHANNEL_UNKNOWN`; a short credential and a publish flag without a credential stay unpublished; a valid listing maps to `AMZ-PHASE10-SYN-001` with price 49.5 EUR; an invalid GTIN is rejected; Amazon fee 15 and eBay fee 12 on a gross of 100; DE VAT 19 and FR VAT 20; available stock 3 from 4 minus 1, and zero stock is not sellable; one imported order stays one row when the same external id is sent again; a failed sync job records 2 attempts; `de-DE`/`DE` and `fr-FR`/`FR` stay distinct; sales stay off. An armed credential still returns `HUMAN_APPROVAL_REQUIRED` with `live: false`.

`MKT_LIVE_PUBLISH` stays `BLOCKED_EXTERNAL`. `completeClaim` is false. A software percent of 100 only means the blocked live check was left out of the denominator.

## Phase 21 status after the integration run

**PARTIAL.** Not `VERIFIED_COMPLETE`.

The local synthetic workflow now executes the existing journey, Pusat queue, memory, VAT, locale templates, supplier dry sync, carrier contract, and egress policy. `server/__tests__/phase21Integration.test.mjs` and the phase 21 case in `phases6to21Gate.test.mjs` assert those outputs. `E2E_ORDER_AUTO` is gone.

`finalizePhase` still reports `percentComplete: 100` and `ok: true` because `E2E_PRODUCTION_RUN` is excluded from the denominator. That percentage is not the completion proof. `completeClaim` is false. `live` is false. `productionReady` is false. Sales is `LOCKED`. Payment `captured` is false and `moneyMoved` is false. Refund code is `REAL_REFUND_BLOCKED` and `issued` is false. Notification `sent` is false. Supplier stock `applied` is false and `liveImport` is false.

The sections below are the 21.11.2026 14:58 Avrupa/Berlin audit. They are kept as the earlier record. The phase 21 row and the phase 21 section are updated to this run.

**Audit time:** 21.11.2026, 14:58 Avrupa/Berlin  
**Mode of that audit:** Read-only. The phase 21 work after it is local and uncommitted.

This workspace is currently `cursor/pim-catalog-foundation-c293` at `d413d13a`. The phase code was read from commit `9b86c1b7` via Git, then executed in a detached worktree at `/tmp/bz-9b86`. That worktree was removed after the test. The checkpoint commit was not moved.

Ledger file `data/master/buzzard_ordered_phases.v1.json` at this commit says every phase is `SOFTWARE_PARTIAL`, `gatePercent: 100`, `completeClaim: false`, and quotes an older vitest total of 1949/0/1. Those percentages and the 1949 figure are **not** results of this audit.

## Numbering

Two different lists exist in the same commit.

| List | Where | Count |
|------|--------|------:|
| This report | `data/master/buzzard_ordered_phases.v1.json` and `server/lib/platform/phase1`…`phase21` | 21 |
| Older plan | `BUZZARD_MASTER_DEVELOPMENT_PLAN.md` sections “Phase 1–18” | 18, **different names** |

Example: plan “Phase 8” is TecDoc. Ordered phase 8 is logistics. This report follows the 21-phase ledger only. The plan’s “COMPLETE” cells are not accepted as proof.

## How a status was chosen

`phases6to21Gate.test.mjs` only checks `percentComplete === 100` and `ok === true`. `finalizePhase` drops ids marked blocked, then can still report 100. A passing gate is not `VERIFIED_COMPLETE`.

One status per phase:

| Status | Used when |
|--------|-----------|
| VERIFIED_COMPLETE | Required behavior proved on this commit by a test that checks the behavior |
| PARTIAL | Real local code exists and does part of the job |
| SCAFFOLD_ONLY | The check is a stand-in, not the required system |
| TEST_PENDING | No test was attempted |
| NOT_IMPLEMENTED | No implementation |
| BLOCKED_EXTERNAL | The phase’s own work cannot proceed without an outside account, and local code does not yet do the job |
| BLOCKED_SECURITY | A security defect stops the phase |
| FAILED_VERIFICATION | An assertion about the phase’s behavior failed |

Missing `better-sqlite3` stopped many suites before any assertion. That is recorded as **test not executed**, not as `FAILED_VERIFICATION` of the product rule.

## Test run on this commit

Command, from `/tmp/bz-9b86` at `9b86c1b7`, 21.11.2026 13:58:47 UTC (14:58 Avrupa/Berlin):

`BUZZARD_SALES_ENABLED=0 BUZZARD_DB_PATH=/tmp/buzzard-phase-audit-9b86.db vitest run` on:

- `server/__tests__/phase1CoreIntegrity.test.mjs`
- `server/__tests__/phase2CategoryInfrastructure.test.mjs`
- `server/__tests__/phase3ProductPim.test.mjs`
- `server/__tests__/phase4SupplierAutomation.test.mjs`
- `server/__tests__/phase5PricingProfit.test.mjs`
- `server/__tests__/phase6OrderManagement.test.mjs`
- `server/__tests__/phases6to21Gate.test.mjs`

`better-sqlite3` is not installed in this machine’s `node_modules`. `server/lib/db.js` requires it. Suites that import `db.js` die at load.

| Result | Count |
|--------|------:|
| Test files | 7 failed |
| Tests | **5 passed, 11 failed**, 16 total |
| Duration | 620 ms |
| Skipped | 0 |

Passed (gate-only: `percentComplete === 100`): phase **8, 9, 14, 18, 20**.

Failed before assertion, all `MODULE_NOT_FOUND: better-sqlite3`: phase files 1–6, and gate cases **6, 7, 10, 11, 12, 13, 15, 16, 17, 19, 21**.

No full-suite run was done. The ledger’s 1949 passes are **not** evidence for `9b86c1b7`.

## Locks observed in code at `9b86c1b7`

- `server/lib/salesSafetyGate.js`: sales allowed only if every P0 flag is `"1"` and `BUZZARD_SALES_ENABLED=1`. Default is locked.
- `data/security/egress_policy.v1.json`: `default` is `DENY`.
- Phase evaluators set live checks to `ok: false` with `BLOCKED_EXTERNAL`.
- `DEV_ONLY_CHANGE_ME` is **not** in `dbAuth.js` or `identitySecurity.js` at this commit. Both require `server/lib/jwtSecret.js`.
- `POST /api/orders/dry-rehearsal` is in `server/plugins/ordersPlugin.js` at line 247.
- `server/data/**` is **not** in the commit. Phase 1’s hash check cannot be reproduced from Git alone.

## Master table

| Phase | Title | Status | What the gate actually checks | This commit’s test |
|------:|-------|--------|-------------------------------|--------------------|
| 1 | Core and data integrity | PARTIAL | 11 engines not live, sales locked, egress default DENY, sample egress blocked, config, taxonomy 50, dev-list not FAILED and exactly 6 LIVE_BLOCKED, production lock, no demo admin in production, protected files present | Not executed (sqlite module missing) |
| 2 | Categories, attributes, filters | PARTIAL | Brake alias maps to `automotive/bremssystem`, L2 profile depth, taxonomy 50, 50 L1 templates, 330 L2, 50 hub SEO | Not executed |
| 3 | Product PIM (dry) | PARTIAL | Bind category, EAN, brand, demo media blocked, origin DRY_RUN vs DEMO, dry import, search order | Not executed |
| 4 | Supplier automation | PARTIAL | API/XML/CSV adapters `networkBlocked`, registry size, dry import/sync, selection, dry order, no pre-buy. Live API forced false | Not executed |
| 5 | Pricing and profit | PARTIAL | Sample quote: cost 40, fees, VAT, €0.50 net, undercut, margins 11/7/15, loss blocked, anomaly flag. Live write forced false | Not executed |
| 6 | Order management | PARTIAL | In-memory dry pipeline, reserve/cancel, dry supplier forward, source text contains `/api/orders/dry-rehearsal`. Live submit forced false | Not executed |
| 7 | Payment and finance | PARTIAL | Sandbox auth not captured, capture fails, coupon tamper rejected, dry return, refund not issued, VAT and tax pools, tax connect disconnected. Live capture/refund/filing forced false | Not executed |
| 8 | Logistics | PARTIAL | Five carrier adapters, `HUMAN_GATE_REQUIRED`, folded tracking ends `FAILED`, DE/FR postcodes, quote `UNKNOWN`, return `RETURN_REQUESTED`. Live rates stay blocked | 21.11.2026 19:50 Avrupa/Berlin: phase 8 tests passed. No live tariff |
| 9 | Textile AI | PARTIAL | Consent, size, workwear recommendation, demo try-on `liveTryOn` false, image adapter `BLOCKED`. Live vision stays blocked | 21.11.2026 19:50 Avrupa/Berlin: phase 9 tests passed. No live renderer |
| 10 | Marketplace | PARTIAL | Ten sandbox channels, account and credential refusal, listing field mapping, Amazon/eBay fees, DE/FR VAT, stock and one-row order import, rejection, retry attempts, locale. Live publish stays `BLOCKED_EXTERNAL` | 21.11.2026 18:53 Avrupa/Berlin: phase 10 tests passed. `percentComplete` 100 is not the proof |
| 11 | PIM source of truth | PARTIAL | Canonical target stays inactive, duplicate EAN rejected, source conflict recorded, incomplete publish refused. Live publish stays blocked | 21.11.2026 19:50 Avrupa/Berlin: phase 11 tests passed. Production SoT was not activated |
| 12 | Customer support | PARTIAL | Intent `order_status`; desk ok **or** response non-null; inbound ok **or** queued. Live inbox forced false | Not executed |
| 13 | Pusat and council | PARTIAL | Health `live === false` and live calls not unblocked; council length > 0; scorecard not live. Voice forced false | Not executed |
| 14 | AI specialists | PARTIAL | Inventory count === 17, unique namespaces, Pusat assign, refunds gated. Live council forced false | Gate passed. Count check only |
| 15 | Storefront | PARTIAL | 50 hubs, empty device report missing controls, 30 locales, RTL, DE/FR cart tax, checkout `sales_disabled`. Browser check is `NOT_RUN` and counts. CDN stays blocked | 21.11.2026 19:50 Avrupa/Berlin: `percentComplete` 83.3, `ok` false. No Playwright against port 3000 |
| 16 | Tax and compliance | PARTIAL | Sanctions: ok **or** not blocked **or** status non-null; AB27 vat ok and not enabled; DE post ok; Elster not live **or** not filed. Live filing forced false | Not executed. Sanctions predicate is weak |
| 17 | Security | PARTIAL | Egress deny, missing secret closed, RBAC, memory isolation, approval expiry and replay, persisted redacted audit, CSRF, path, rate limit. Live restart stays blocked | 21.11.2026 19:49 and 19:50 Avrupa/Berlin: phase 17 tests and 308 existing security tests passed |
| 18 | Marketing | PARTIAL | Brand disclosure required; ≥ 2 synthetic identities; campaign draft not publishable. Live ads forced false | Gate passed |
| 19 | Admin reporting | PARTIAL | Integration status sales disabled; operational **or** connectors non-null; finance and hub snapshots non-null. Live BI forced false | Not executed |
| 20 | Performance | PARTIAL | 20 samples of search, quote, and sqlite count; queue recovery; heap recorded. External load harness stays blocked. Not a production measurement | 21.11.2026 19:50 Avrupa/Berlin: search p95 1.392 ms on 2,000 synthetic rows, concurrency 1 |
| 21 | End-to-end automation | PARTIAL | Workflow inputs and outputs, sales locked, no capture, Pusat queue execute/deny/retry/reopen, memory isolation, DE/FR VAT, locale templates, dry stock not applied, carrier status change, egress deny. Production run stays `BLOCKED_EXTERNAL` | 21.11.2026 18:22 Avrupa/Berlin: 3 phase 21 tests passed. `percentComplete` 100 is not the proof |

## Totals

| Status | Phases |
|--------|-------:|
| VERIFIED_COMPLETE | **0** |
| PARTIAL | **21** |
| SCAFFOLD_ONLY | **0** |
| TEST_PENDING | **0** (a run was attempted; see test section) |
| NOT_IMPLEMENTED | **0** |
| BLOCKED_EXTERNAL | **0** as the sole status |
| BLOCKED_SECURITY | **0** as the sole status |
| FAILED_VERIFICATION | **0** as the sole status |

External work is still blocked **inside** phases 1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, and 21. That does not make the whole phase `BLOCKED_EXTERNAL`, because local dry or lock code exists.

No phase is 100 percent. No phase is `VERIFIED_COMPLETE`.

## Per phase

### 1 — PARTIAL

Purpose on the ledger: core system and data integrity. The evaluator checks engine count 11, sales locked, egress DENY, taxonomy of 50, six live-blocked dev-list items, and that protected JSON files plus `buzzard.db` exist. Live API on port 3001 is listed separately and is not applied.

Implemented: those checks and the modules they call. Not in Git: `server/data`. So the hash half cannot be verified from the commit. Test did not run.

### 2 — PARTIAL

Purpose: categories, attributes, filters, 50 L1, brake alias, 330 L2 profiles, hub SEO. Code for those checks is in `phase2CategoryInfrastructure.js`. L2 translated copy is explicitly out of this phase. Test did not run.

### 3 — PARTIAL

Purpose: create and validate a product without live publish. Checks bind, EAN, brand, block demo media, mark dry-run vs demo, dry import, and a two-item sort. There is still a second catalog path (`p1CatalogPlatform`). Test did not run.

### 4 — PARTIAL

Purpose: supplier import and stock without live purchase. Adapters must have `networkBlocked === true`. Selection predicate uses `&&` then `||`, so a fallback object can pass when `picked.ok` is false. Live API is forced false. Test did not run.

### 5 — PARTIAL

Purpose: landed cost, minimum net €0.50, undercut €0.10, category margins, block a loss, report an anomaly. This is calculated on one sample record (`supplier_price` 40). It does not write a live price. Test did not run.

### 6 — PARTIAL

Purpose: order lifecycle without live supplier submit. `runDryOrderPipeline` runs in memory. The HTTP check is `ordersPlugin.js` containing the string `/api/orders/dry-rehearsal`. That route exists at line 247 of this commit. `POST /api/orders` is a different function and is behind the sales gate. Test did not run. `ORD_CANCEL_RULE` is true when no tracked id exists.

### 7 — PARTIAL

Purpose: payment, coupon, return, VAT, tax pools, no live capture or refund. Sandbox authorize must not capture. `capture` and `refundMoney` must fail. This is a lock test, not a payment integration. Test did not run.

### 8 — PARTIAL

Purpose: shipping and tracking. Gate passed. The shipment check accepts `HUMAN_GATE_REQUIRED` **or** `ok === true`, as long as `liveShipment === false`. Live rates are forced false. No carrier account was called.

Later run, 21.11.2026 19:50 Avrupa/Berlin: the OR is gone. `createShipment` on a complete fixture must return `HUMAN_GATE_REQUIRED`. `foldTrackingEvents` ignores a duplicate and an older `CREATED`, then accepts `FAILED`. `quoteCost` total is `UNKNOWN`. `LOG_LIVE_RATES` remains blocked.

### 9 — PARTIAL

Purpose: textile recommendation without a live vision model. Gate passed because the sandbox sets `liveVerified` and `completeClaim` to false. That is the opposite of a completed try-on.

Later run, 21.11.2026 19:50 Avrupa/Berlin: the pass is a workwear recommendation, `NO_MEASUREMENTS` without a measurement, consent required before storage, and an image adapter status `BLOCKED`. `TEX_LIVE_TRYON` remains blocked. No renderer was called.

### 10 — PARTIAL

Purpose on the ledger: marketplace automation, `completeClaim: false`. The empty-array registry check and the `validation != null` check are removed.

Executed on isolated synthetic data, 21.11.2026 18:53 Avrupa/Berlin, through `snapshot`, `createConnector`, `publishDecision`, `publishListing`, `validateMarketplaceListing`, `preflightListing`, `upsertListing`, `upsertSkuMapping`, `dryMarketplaceCommission`, `autoQuoteFromSupplierRecord`, `estimateVat`, `evaluateCommercialStock`, `queueStockSync`, `updateSyncJobResult`, `importOrderWebhook`, and `buildEligibleFeedItems`.

Not done: live OAuth publish. `MKT_LIVE_PUBLISH` is `ok: false` and `BLOCKED_EXTERNAL`. Connector `syncStock`, `syncPrice`, `importOrders`, and `syncReturns` stay dry-run and update nothing remotely.

### 11 — PARTIAL

Purpose: one product source of truth. The first check is “phase 3 reports 100”. Publish passes if `validation` is not null. That does not prove a single writer. Test did not run.

Later run, 21.11.2026 19:50 Avrupa/Berlin: `PIM_SOT_PHASE3` is gone. `isSotActive()` is false after the flags are restored. Creating `PHASE11-SYN-DUP` with EAN `5901234999993` throws `duplicate_ean`. Source B is `CONFLICT`. Transition toward `ACTIVE` does not leave the row `ACTIVE`. `PIM_LIVE_PUBLISH` remains blocked. The journey’s later validation GTIN is `4006381333937` so it does not collide with this synthetic EAN. The 18:22 phase 21 record above still describes the earlier GTIN.

### 12 — PARTIAL

Purpose: classify and queue support mail. Intent must be `order_status` on the sample. Desk passes if `ok` or any `response`. Live IMAP/SMTP is forced false. Test did not run.

### 13 — PARTIAL

Purpose: Pusat health and council roster, no live voice. Council check is `length > 0`. Health must be not live. Test did not run.

### 14 — PARTIAL

Purpose: 17 specialist identities and gated refunds. Gate passed on `count === 17` and namespace uniqueness. Live LLM council is forced false. No live model call was made.

### 15 — PARTIAL

Purpose: storefront hubs, devices, 30 locales, RTL. Gate passed. Device check **requires** `completeClaim === false`, so an unfinished device claim is a pass. CDN warm is forced false.

Later run, 21.11.2026 19:50 Avrupa/Berlin: an empty device report fails the checklist with 8 missing controls. A filled checklist without device attestation still has `completeClaim` false, and that false value is not the pass. Checkout is `sales_disabled`. `SF_BROWSER` is `NOT_RUN`, so the phase `ok` is false and `percentComplete` is 83.3. Homepage, mobile, desktop, and accessibility were not opened in a browser. `SF_LIVE_CDN` remains blocked.

T-15.2, 21.11.2026 20:33 Avrupa/Berlin: the existing `commerce-storefront` and `commerce-security` Playwright specs passed against this worktree on ports 3010 and 3011, 9 tests, exit 0. Sales stayed off. A homepage capture then found duplicate key `cat-14-01`; the repeated `cat-14` entry in `getDiversePopularCategories` was removed and the capture no longer reports that key. A hydration warning on the search field remains. One page per locale was not run. Phase 15 stays PARTIAL.

T-15.2 continuation, 21.11.2026 21:35 Avrupa/Berlin: each of the 30 supported locales was opened in Chromium through `/{locale}/` on the same isolated ports. `html` lang, direction, the search placeholder, and the home and category nav labels matched that locale's catalog. Arabic was `rtl`. The final pass recorded no console error and no hydration error. The commerce specs were run again: 9 passed, exit 0. The language selector had been updating the catalog locale without the interface language; that split is fixed for the selector and the locale landing. The newsletter honeypot no longer uses an inline style. The Arabic phone screenshot was blank until the skip link stopped using `left: -999px`. Category labels for the 26 locales other than de, en, tr, and ar are still the German source names, textile leaves still include Turkish names, and the country selector still shows German country names. Those remain open. `SF_BROWSER` was not changed in the gate. Phase 15 stays PARTIAL.

### 16 — PARTIAL

Purpose: sanctions screen, AB27 VAT, German posting, Elster dry, no live filing. Sanctions passes if `ok` or `blocked === false` or `status` is not null. Elster passes if not live or not filed. Test did not run.

### 17 — PARTIAL

Purpose: security readiness without restarting the API. `SEC_EGRESS` passes when `egress.api` and `egress.storefront` are truthy, not when a forbidden host is denied. JWT static fallback is absent in this commit; that was read from the file, not proven by this test run. Live process on port 3001 was not restarted and was not probed. Test did not run.

Later run, 21.11.2026 19:50 Avrupa/Berlin: `SEC_EGRESS` requires `EXTERNAL_AI_EGRESS_DENIED` for `api.openai.com`, plus Stripe, loopback, non-HTTPS, and userinfo denials. Approval expiry is `EXPIRED`. A second human decision is `ALREADY_DECIDED`. The audit row stores the SQL-looking note and redacts the password. `SEC_LIVE_RESTART` remains blocked. `npm audit` was not run. Ports 3000 and 3001 were not restarted.

### 18 — PARTIAL

Purpose: brand disclosure and a campaign draft that cannot publish. Gate passed. Paid ads are forced false.

### 19 — PARTIAL

Purpose: admin integration status with sales off, plus finance and SEO snapshots. `operational` **or** `connectors` is enough. Live BI is forced false. Test did not run.

### 20 — SCAFFOLD_ONLY

Purpose on the ledger: performance and resilience. The code sorts 2,000 plain objects and checks the clock. Gate passed. There is no HTTP, database, or load harness. The load-test id is forced false.

Later run, 21.11.2026 19:50 Avrupa/Berlin: the same 2,000 rows go through `searchAndSort` 20 times. p50 0.500 ms, p95 1.392 ms, max 2.331 ms. Pricing quote p95 0.138 ms. `SELECT COUNT(*) FROM sqlite_master` p95 0.011 ms. Heap 7,189,856 then 8,306,904 bytes. One queue fault returns to `QUEUED`. Concurrency is 1. Failures 0. `productionVerification` is false. `PERF_LOAD_TEST` remains blocked. This is a synthetic single-process measurement.

### 21 — PARTIAL

Purpose on the ledger: end-to-end automation, `completeClaim: false`. The boolean `E2E_ORDER_AUTO` check is removed.

Executed on isolated synthetic data, 21.11.2026 18:22 Avrupa/Berlin:

- Customer classification `order_status`, not persisted.
- Product search finds `JOURNEY-SKU-001` with `liveIndex` false.
- Product validation binds `cat-05` and the pipeline accepts a unique GTIN `5901234999993` on taxonomy `cat-05-03`.
- Pricing quote `livePublish` false. VAT DE 19 and FR 20, `filingReady` false. Sinan is `PERMISSION_DENIED` for tax.
- Inventory available stock is supplier stock minus reserved stock.
- Order draft `supplierPurchase` false. Payment authorize state is not `CAPTURED`. `moneyMoved` false.
- Supplier routing does not buy. Dry stock update `applied` false.
- DHL tracking moves `IN_TRANSIT` to `DELIVERED` with `liveShipment` false.
- Notification draft `sent` false and `autoSendAuthorized` false. `new_order` German and English subjects differ. Unknown locale `zz` falls back to German.
- Return request succeeds in the dry store. `refundMoney` returns `REAL_REFUND_BLOCKED`.
- Pusat enqueues a task for Sinan, denies `not_an_agent` with `PERMISSION_DENIED`, retries `SYNTHETIC_FAULT` back to `QUEUED`, and the same row is `QUEUED` after the sqlite file is closed and reopened.
- Esat reading Sinan’s personal memory returns `MEMORY_ISOLATION_DENIED`.
- Egress to `https://api.openai.com/v1/chat` returns `EXTERNAL_AI_EGRESS_DENIED`.

Not done: `E2E_PRODUCTION_RUN`. No live TecDoc, supplier order, payment capture, customer notification, refund, or carrier rate. `runConnected("happy")` can record a sandbox capture state inside the isolated order module; the journey evidence still requires `moneyMoved` false and does not treat that as money moved.

## External dependencies still required

From the ledger’s critical six, and from the forced-false checks: live TecDoc, live supplier API, payment capture, money refund, Tax Connect filing, live carrier rates. Also live marketplace publish, live inbox, live voice, live vision try-on, live ads, live BI, CDN warm, and a production rehearsal. None of these were called.

## Security

At `9b86c1b7`, customer and identity JWTs use `jwtSecret.js` (random per process when unset). That removes the old `DEV_ONLY_CHANGE_ME` fallback **in this commit**. It does not prove the running API loaded that file. Phase 17’s live-restart check is still false. Port 3000 and 3001 were not touched.

The 19:49 Avrupa/Berlin security run executed the existing JWT, session, CSRF, egress, and route tests in this worktree. It did not reload the process on port 3001.

## Database note

`server/data/buzzard.db` is not part of commit `9b86c1b7`. This workspace’s copy is on `cursor/pim-catalog-foundation-c293` and is gitignored. Its SHA-256 was `b07b97c7…` at the start of the audit and changed twice during the hour while this process could not load `better-sqlite3`. The writer was not identified. This audit did not copy, restore, or intentionally write that file. Do not treat any of those hashes as the checkpoint baseline.

## Next recommended task

Phases 8, 9, 10, 11, 17, 20, and 21 now assert function outputs. Phase 15 asserts those outputs and also keeps `SF_BROWSER` failed, so its percent is 83.3. Phases 6, 7, 12, 13, 14, 16, 18, and 19 still assert `percentComplete === 100`.

Next local action: T-01 for phases 7, 12, 13, 14, 16, 18, and 19. Those gates still treat `percentComplete === 100` as the assertion. Phase 6 is no longer in that list. T-6.1 and T-6.2 remain open. `SF_LIVE_CDN` stays blocked, so Phase 15 stays PARTIAL. Do not point Playwright at port 3000 or 3001.

Do not merge PR #509 from this worktree. Do not commit until that is explicitly requested. The `/workspace` checkout stays on `cursor/pim-catalog-foundation-c293`. Sales stays locked. `live` stays false.

## Resume checkpoint

**Saved:** 21.11.2026, 22:23 Avrupa/Berlin.  
**Branch:** `cursor/save-full-worktree-c293`  
**HEAD:** `9b86c1b70159c32d644f2596f61ae8388ad401ec`  
**Worktree:** `/home/ubuntu/buzzard-worktrees/save-full-worktree-c293`  
**Do not commit, push, merge, or deploy.** Do not touch `/workspace`, ports 3000 and 3001, or `server/data/buzzard.db`.

Completed in this continuation: T-15.2 for the stated scope, and T-6.3. Phase 15 browser evidence is `docs/software-completion/t15-2/locales.json` plus 90 screenshots. `SF_BROWSER` is `PASS`. `SF_LIVE_CDN` is `BLOCKED_EXTERNAL`. Phase 15 and phase 6 stay PARTIAL.

Exact next task: T-6.1. Make one order writer. `POST /api/orders` in `server/plugins/ordersPlugin.js` writes a JSON order, `dbOrders.createOrderFromCartWithPayment` writes a cart order, `orderManagement.createOrder` writes `oms_orders`, and `orderService.createOrderFromCheckout` writes `commerce_orders`. Keep sales disabled while they are joined. Do not repeat T-01.

T-01 is closed for phases 6–21 as of 22:55 Avrupa/Berlin. The gate asserts outputs. `completeClaim` stays false while a blocked id remains. T-6.2 is closed by `server/__tests__/phase6DryRehearsalRoute.test.mjs`: ephemeral port, 200, `live: false`, SKU `DRY-SKU-001`. T-12.1, T-13.1, T-14.1, T-16.1, T-16.2, T-18.1, and T-19.1 are closed for the local checks named in the task register. Phases 12, 13, 14, 16, 18, and 19 stay PARTIAL because their live checks are BLOCKED_EXTERNAL.

Last green tests at 22:55–22:56 Avrupa/Berlin: phases 6–21 gate, 16 passed; admin route, dry rehearsal, incoming email, scorecard, and the continuation suites that touch the desk, 48 passed in one run and the rehearsal file passed alone. No commit. HEAD remains `9b86c1b70159c32d644f2596f61ae8388ad401ec`.

## Resume checkpoint — 21.11.2026, 23:42 Avrupa/Berlin

T-6.1 is closed for the local writer. `orderService.recordCanonicalOrder` is the only insert into `commerce_orders`. `createOrderFromCheckout`, `orderManagement.createOrder`, `orderManagement.splitOrder`, `dbOrders.createOrderFromCart`, `POST /api/orders`, and `runDryOrderPipeline` call it before their older projections. A blocked or failed canonical result does not write the older row. A repeated idempotency key returns the same commerce id. Commercial orders and `payment.captured === true` are refused while sales are off. The older `orders`, `oms_orders`, and `orders.json` rows remain projections. Phase 6 stays PARTIAL because `ORD_LIVE_SUBMIT` is BLOCKED_EXTERNAL.

Tests on `/tmp/buzzard-phase-gates-9b86/canonical.db`: `canonicalOrderWriter.test.mjs` 4 passed at 22:41:56 UTC (23:41 Avrupa/Berlin). `part8Foundation.test.mjs` 17, `phase6DryRehearsalRoute.test.mjs` 1, `phase6OrderManagement.test.mjs` 1, and `phases6to21Gate.test.mjs` 16 passed in the run that started at 22:41:47 UTC. The two canonical failures in that first gate run were leftover idempotency keys in the isolated database. Unique keys then passed. No commit.

Exact next task: T-3.1. One product writer. Storefront, import, and admin still read product ids through more than one module. After that, T-1.1, then T-7.1. The capture refusal is still the in-process `completeCheckout` branch, not a new HTTP proof. Do not repeat T-6.1. Do not enable sales. Do not commit.

## Resume checkpoint — 22.11.2026, 00:16 Avrupa/Berlin

T-3.1 is closed. `productService.recordCanonicalProduct` is the only insert into `pim_core_products`. The PIM catalog, PIM30, catalog SEO, search index, JSON import, and catalog sync call it before their own projections. A blank SKU writes nothing. The same SKU returns the same `pim_prod_` id. Storefront preview, the import JSON row, and `productCore.getProduct` read that id. A draft product stays off the public storefront.

T-1.1 is closed for the clean checkout. The seven protected files are gitignored and absent. The check is `ok: true` and `hashVerified: false`. A present file is accepted only when its SHA-256 matches.

T-2.2, T-3.2, T-4.1, T-5.1, and T-7.1 are closed for the local checks. Missing EAN is rejected. Supplier selection requires `ok === true`. Price rules are asserted. Capture and refund HTTP routes return 403 while sales are off. Phases 3, 4, and 5 keep `completeClaim` false because live publish, live supplier HTTP, and live price write stay blocked.

Tests on `/tmp/buzzard-phase-gates-9b86/products.db`, sales off, start 23:13–23:16 UTC (00:13–00:16 Avrupa/Berlin): canonical product writer 2 passed; phase 1 integrity 7 passed; phase 2, 3, 4, and 5 passed; capture route 1 passed; phases 6–21 gate 16 passed. No commit. HEAD remains `9b86c1b70159c32d644f2596f61ae8388ad401ec`.

Exact next task: T-00. Run the Vitest suite with `BUZZARD_DB_PATH` on a temp file. Then T-1.3, then T-2.1. Do not restart ports 3000 and 3001. Do not enable sales. Do not commit.

## Resume checkpoint — 22.11.2026, 00:22 Avrupa/Berlin

T-00 is closed for the configured Vitest suite. Database `/tmp/buzzard-phase-gates-9b86/full.db`. 179 files, 2009 passed, 1 skipped, 0 failed, 155.81s, start 23:20:06 UTC. The first run failed two tests: `catalogLocaleLabels.test.mjs` was a node:test file, and `cat-05` German is now `Automotive & Kfz`. Both were corrected and the suite passed. `part24` through `part35` remain excluded by `vitest.config.ts`.

HEAD remains `9b86c1b70159c32d644f2596f61ae8388ad401ec`. No commit. Sales stayed off. Ports 3000 and 3001 were not restarted.

Exact next task: T-1.3. Assert each dev-list item on its own. Then T-2.1. Do not enable sales. Do not commit.

## Resume checkpoint — 22.11.2026, 00:57 Avrupa/Berlin

T-1.3 is closed. `server/__tests__/devList51Items.test.mjs` has a separate behavior assertion for all 51 dev-list items. The phase-1 gate no longer passes on `status !== "FAILED"`. The six live items stay blocked: 19 TecDoc, 20 live supplier, 28 capture, 30 refund, 37 Tax Connect, 41 carrier rate. `devList51Items` 51 passed, `devList51Remainder` 9 passed, and `phase1CoreIntegrity` 7 passed at 23:55:49 UTC. Phase 1 stays PARTIAL.

T-2.1 is not closed. Hub and L2 metadata now say `reviewed: false` and `fallbackFrom: "source"` when the requested locale has no string of its own. A French textile leaf uses the existing label `Robe`. Of 330 L2 nodes, 9 have reviewed labels for every non-German locale and 321 do not. Those 321 strings were not written. Phase 2 `completeClaim` is false. `phase2L2SeoCopy` 4 passed and `phase2CategoryInfrastructure` 1 passed at 23:57:05 UTC.

No other local task remains in the register. T-1.2, T-17.3, and the 16 P3 rows stay BLOCKED_EXTERNAL. Sales stayed off. Ports 3000 and 3001 were not restarted. PID 2129 and PID 2215 still show the 21.11.2026 13:53 UTC start. An isolated Node process created `server/data/buzzard.db` in this worktree at 23:57 UTC. Nothing held the file. It was deleted. The production database was not opened.

HEAD remains `9b86c1b70159c32d644f2596f61ae8388ad401ec`. No commit.

Source recount in this worktree, skipping `.git`, `node_modules`, `.next`, `dist`, `coverage`, and `.turbo`:

| Kind | Lines | Files |
|------|------:|------:|
| Production | 167582 | 1417 |
| Tests | 26630 | 217 |
| Documentation | 60639 | 857 |
| Generated | 6674 | 6 |
| Configuration | 1143 | 19 |

All 21 phases stay PARTIAL. None is VERIFIED_COMPLETE. `productionReady` is false. `live` is false. This build is not release-ready.

Exact next work: reviewed L2 copy for the 321 uncovered nodes, which is product copy and was not invented here. Do not restart ports 3000 and 3001. Do not enable sales. Do not commit.
