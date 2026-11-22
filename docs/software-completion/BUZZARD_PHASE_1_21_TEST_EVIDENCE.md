# Buzzard — Phase 1–21 test evidence

**Checkpoint:** `9b86c1b70159c32d644f2596f61ae8388ad401ec`  
**Branch:** `cursor/save-full-worktree-c293`  
**Worktree:** `/home/ubuntu/buzzard-worktrees/save-full-worktree-c293`  
**Run:** 21.11.2026, 18:22 Avrupa/Berlin (17:22:50 UTC)  
**Result:** 9 files, 35 tests, 0 failed, 0 skipped, 1.88s  
**Commit:** none. `/workspace` was not modified.

## Command

Working directory: `/home/ubuntu/buzzard-worktrees/save-full-worktree-c293`

```
BUZZARD_DB_PATH=/tmp/buzzard-phase-gates-9b86/isolated.db \
BUZZARD_BACKUP_DIR=/tmp/buzzard-phase-gates-9b86/backups \
BUZZARD_DATA_DIR=/tmp/buzzard-phase21-data \
BUZZARD_SALES_ENABLED=0 \
NEXT_PUBLIC_SALES_ENABLED=0 \
BUZZARD_STRIPE_ENABLED=0 \
BUZZARD_PAYPAL_ENABLED=0 \
PAYMENT_LIVE=0 SUPPLIER_LIVE=0 FULFILLMENT_LIVE=0 \
TRACKING_LIVE=0 RETURN_LIVE=0 REFUND_LIVE=0 \
REAL_SUPPLIER_LIVE_IMPORT=0 REAL_SUPPLIER_DRY_RUN=1 \
./node_modules/.bin/vitest run \
  server/__tests__/syntheticCustomerJourney.test.mjs \
  server/__tests__/phase21Integration.test.mjs \
  server/__tests__/phase1CoreIntegrity.test.mjs \
  server/__tests__/phase2CategoryInfrastructure.test.mjs \
  server/__tests__/phase3ProductPim.test.mjs \
  server/__tests__/phase4SupplierAutomation.test.mjs \
  server/__tests__/phase5PricingProfit.test.mjs \
  server/__tests__/phase6OrderManagement.test.mjs \
  server/__tests__/phases6to21Gate.test.mjs \
  --maxWorkers=1 --reporter=verbose
```

Exit code 0.

| File | Tests |
|------|------:|
| `phase21Integration.test.mjs` | 3 passed |
| `syntheticCustomerJourney.test.mjs` | 1 passed |
| `phases6to21Gate.test.mjs` | 16 passed |
| `phase1CoreIntegrity.test.mjs` | 7 passed |
| `phase2CategoryInfrastructure.test.mjs` | 1 passed |
| `phase3ProductPim.test.mjs` | 1 passed |
| `phase4SupplierAutomation.test.mjs` | 2 passed |
| `phase5PricingProfit.test.mjs` | 3 passed |
| `phase6OrderManagement.test.mjs` | 1 passed |

Phases 6–20 still pass by `percentComplete === 100`. Phase 21’s case asserts the evidence object and does not treat that percentage as completion.

## Phase 21 evaluator output

Taken from `evaluatePhase21E2eAutomation()` on the same isolated database, sales disabled.

| Field | Value |
|-------|--------|
| `completeClaim` | false |
| `live` | false |
| `productionReady` | false |
| `percentComplete` | 100, because `E2E_PRODUCTION_RUN` is excluded |
| `blockedExternal` | `E2E_PRODUCTION_RUN` |
| `E2E_WORKFLOW` | ok |
| `E2E_SALES_LOCKED` | ok, status `LOCKED` |
| `E2E_NO_CAPTURE` | ok |
| `E2E_AUTOMATION_EXECUTED` | ok |
| `E2E_CROSS_MODULE` | ok |
| `E2E_PRODUCTION_RUN` | ok false, `BLOCKED_EXTERNAL` |
| `E2E_ORDER_AUTO` | absent |

## What the assertions executed

| Check | Observed |
|-------|----------|
| Workflow | 13 ids, no failed step. Search sku `JOURNEY-SKU-001`, `liveIndex` false |
| Product validation | Unique GTIN `5901234999993`, taxonomy `cat-05-03`, pipeline ok |
| Pricing | `livePublish` false |
| VAT | DE rate 19, FR rate 20, filing not ready. Sinan `PERMISSION_DENIED` |
| Inventory | available stock equals supplier stock minus reserved stock |
| Payment | authorize only, `captured` false, `moneyMoved` false |
| Order | `supplierPurchase` false |
| Supplier stock | sku `JOURNEY-SKU-001`, `applied` false, `liveImport` false |
| Carrier | DHL `IN_TRANSIT` then `DELIVERED`, `liveShipment` false |
| Notification | `sent` false. `new_order` German and English subjects differ. Locale `zz` uses the German subject |
| Return / refund | refund code `REAL_REFUND_BLOCKED`, `issued` false |
| Pusat queue | enqueued, unauthorized owner `PERMISSION_DENIED`, fault retried to `QUEUED`, same state after close and reopen |
| Memory | Sinan reads his note. Esat gets `MEMORY_ISOLATION_DENIED` |
| Egress | `https://api.openai.com/v1/chat` is `EXTERNAL_AI_EGRESS_DENIED` |

## Not proved

- A production rehearsal.
- A real payment, refund, supplier purchase, customer send, or carrier-rate request.
- Phases 6–20 behavior beyond their existing percent gates.
- The protected database under `/workspace/server/data`. This run did not open it.

## Safety during the run

`BUZZARD_SALES_ENABLED=0`. Database path and data directory were under `/tmp`. Ports 3000 and 3001 were not restarted. No commit, push, or merge.

## Phase 10 marketplace run

**When:** 21.11.2026, 18:53 Avrupa/Berlin (17:53:06 UTC)  
**Result:** 11 files, 40 tests, 0 failed, 0 skipped, 2.14s. Exit code 0.  
**Database:** `/tmp/buzzard-phase-gates-9b86/isolated.db`

Same environment as the phase 21 command, plus:

- `server/__tests__/phase10Integration.test.mjs`
- `server/__tests__/marketplaceHubPreflight.test.mjs`
- `server/__tests__/marketplaceConnectorRegistry.test.mjs`
- `server/__tests__/marketplaceListingValidation.test.mjs`
- the seven phase gate files

| Check | Observed |
|-------|----------|
| Registry | 10 channels, `anyLive` false, `allBlocked` true |
| Unknown channel | `CHANNEL_UNKNOWN`. Hub update of an unknown code returns 404 |
| Short credential | `credentialsConfigured` false. Publish flag without a credential stays `publishAllowed` false |
| Valid listing | Stored sku `PHASE10-SYN-001`, channel sku `AMZ-PHASE10-SYN-001`, price 49.5, currency EUR, status draft |
| Invalid listing | GTIN `123` rejected. Missing image is `IMAGE_MISSING` |
| Publish | `LIVE_CONNECTION_BLOCKED`. Armed credential still `HUMAN_APPROVAL_REQUIRED`, `live` false |
| Price | Amazon fee 15, eBay fee 12, on gross 100. Both `live` false |
| VAT | DE rate 19, FR rate 20. Country `ZZ` is `VAT_UNKNOWN` |
| Stock | Available 3 from supplier 4 minus reserved 1. Zero stock is not sellable. `liveSync` false |
| Order | One row for `PHASE10-SYN-ORDER`, status `imported`, country DE. A second post does not add a row |
| Retry | Failed job attempts 2, status `failed`, last error `SYNTHETIC_RETRY`. Missing job returns 404 |
| Locale | `de-DE`/`DE` and `fr-FR`/`FR`. `salesEnabled` false |
| Live publish | `MKT_LIVE_PUBLISH` blocked. `completeClaim` false |

Connector `syncStock`, `syncPrice`, `importOrders`, and `syncReturns` returned `dryRun: true`, `live: false`, and `updated: 0` or an empty list. They did not call a marketplace.

## Workstream run for phases 17, 11, 8, 9, 15, and 20

**When:** 21.11.2026, 19:50 Avrupa/Berlin (18:50:51 UTC)  
**Result:** 13 files, 45 tests, 0 failed, exit code 0, 2.82s.  
**Database:** `/tmp/buzzard-phase-gates-9b86/isolated.db`  
**Data directory:** `/tmp/buzzard-phase17-data`  
**Sales:** `BUZZARD_SALES_ENABLED=0`

Files in that run:

- `server/__tests__/phase17Integration.test.mjs`
- `server/__tests__/phase11Integration.test.mjs`
- `server/__tests__/phase8Integration.test.mjs`
- `server/__tests__/phase9Integration.test.mjs`
- `server/__tests__/phase10Integration.test.mjs`
- `server/__tests__/phase21Integration.test.mjs`
- `server/__tests__/phase1CoreIntegrity.test.mjs`
- `server/__tests__/phase2CategoryInfrastructure.test.mjs`
- `server/__tests__/phase3ProductPim.test.mjs`
- `server/__tests__/phase4SupplierAutomation.test.mjs`
- `server/__tests__/phase5PricingProfit.test.mjs`
- `server/__tests__/phase6OrderManagement.test.mjs`
- `server/__tests__/phases6to21Gate.test.mjs`

An earlier attempt at 18:50:13 UTC failed 2 phase 1 tests because a diagnostic Node process had created `server/data/buzzard.db` inside this worktree. That file was not open, was not the database under `/workspace`, and was removed. The 19:50 run is the one after that removal. Phase 1 then passed 7 tests.

### Phase 17

| Check | Observed |
|-------|----------|
| Egress | `api.openai.com` is `EXTERNAL_AI_EGRESS_DENIED`. Stripe, `127.0.0.1`, plain HTTP, and a userinfo URL are denied |
| Secrets | Empty JWT configuration and `DEV_ONLY_CHANGE_ME` are weaknesses. Sales gate is `LOCKED` |
| Authorization | `PAYMENT_ACTIVATE` is `HUMAN_GATE_REQUIRED`. Unknown identity is `UNKNOWN_IDENTITY`. Staff cannot `security.manage` |
| Memory | Esat reading Sinan’s note is `MEMORY_ISOLATION_DENIED` |
| Approval | Human decision is `APPROVED`. A second decision is `ALREADY_DECIDED`. `ttlMs` of -1000 is `EXPIRED`. Sinan cannot decide |
| Audit | The SQL-looking note is stored. The password value is redacted and is absent from the evidence JSON |
| Input | Path traversal is `PATH_TRAVERSAL`. CSRF mismatch is denied. One request in a fresh bucket is allowed and the next is limited |
| Live restart | `SEC_LIVE_RESTART` blocked. `completeClaim` false |

Separate security regression at 21.11.2026 19:49 Avrupa/Berlin (18:49:12 UTC): 13 files, 308 tests, exit code 0, 50.89s. Files: `jwtSecretHardening`, `esatBey`, `csrf`, `egress42`, `egress43`, `egress44`, `egressHardening45`, `adminRouteMatrix`, `adminRoutePermissions`, `adminSessionSecurity`, `adminSessionHttp`, `adminSessionLifecycle`, `routePermissions`.

Not run: `npm audit`, a backup-restore drill, and a reload of the process on port 3001.

### Phase 11

| Check | Observed |
|-------|----------|
| Identity | Target `D`, table `pim_core_products`. Flag alone does not activate. Both flags activate, then the environment is restored and `isSotActive()` is false |
| Validation | EAN `5901234999993` is valid. `123` is not. Missing SKU throws. Second product with the same EAN is `duplicate_ean` |
| Mapping | Source A is mapped. The same source replay keeps the row. Source B is `CONFLICT` |
| Publish | Incomplete product is `VALIDATION_FAILED`. Dry-run publish does not change sales or payments. A draft does not become `ACTIVE` |
| Live | `PIM_LIVE_PUBLISH` blocked |

### Phase 8

| Check | Observed |
|-------|----------|
| Carriers | DHL, DPD, GLS, Hermes, UPS. Credentials are not stored. Snapshots are not live |
| Shipment | Missing address returns the adapter missing code. A complete fixture is `HUMAN_GATE_REQUIRED`, `liveShipment` false |
| Tracking | In transit and delivered map from the fixture. A duplicate event is ignored. An older `CREATED` is ignored. Final status is `FAILED` |
| Webhook | Missing secret is `WEBHOOK_SECRET_REQUIRED`. A second identical payload is `REPLAY` |
| Country | German `ABCDE` fails and `10115` passes. French `7500` fails and `75001` passes |
| Cost | Quote total `UNKNOWN`, `estimateIsNotPrice` true, `liveRate` false |
| Return | `RETURN_REQUESTED`, `live` false |
| Live rates | `LOG_LIVE_RATES` blocked |

### Phase 9

| Check | Observed |
|-------|----------|
| Consent | A measurement without consent is `CONSENT_REQUIRED` and is not stored |
| Size | No measurements gives size null and `NO_MEASUREMENTS`. Chest 100 and height 180 give `M_ESTIMATE`, `fitGuarantee` false |
| Recommendation | Work occasion includes workwear. Unknown occasion is daily |
| Try-on | Demo without photo consent fails. With consent, `demo` true and `liveTryOn` false |
| Image | Provider none, status `BLOCKED`, `live` false |
| Privacy | Deleting personal data removes the photo and measurements |

### Phase 15

| Check | Observed |
|-------|----------|
| Hubs | 50 hubs, no missing primary label. German `Automotive`, Turkish `Otomotiv` |
| Locales | 30. Arabic `rtl`, German `ltr` |
| Device | Empty report missing 8 controls. `completeClaim` stays false |
| Cart | Invalid quantity is 400. A second add of the same SKU raises quantity from 1 to 2. DE tax rate 19, FR tax rate 20 |
| Checkout | `sales_disabled`, status 403. Completing a missing token is also `sales_disabled` |
| Browser | `SF_BROWSER` `NOT_RUN`. Phase `percentComplete` 83.3, `ok` false |
| CDN | `SF_LIVE_CDN` blocked |

### Phase 20

Environment: isolated synthetic data, one vitest worker, Node on this worktree. Workload: 2,000 catalog rows, 20 iterations, 1 queue task. Concurrency: 1. Duration is the sum of the samples. Production verification: false.

| Measure | p50 | p95 | max | samples | total |
|---------|----:|----:|----:|--------:|------:|
| `searchAndSort` | 0.500 ms | 1.392 ms | 2.331 ms | 20 | 13.91 ms |
| Pricing quote | 0.029 ms | 0.138 ms | 0.648 ms | 20 | 1.36 ms |
| `sqlite_master` count | 0.006 ms | 0.011 ms | 0.046 ms | 20 | 0.17 ms |

Heap before 7,189,856 bytes. Heap after 8,306,904 bytes. Failures 0. The queue fault returned to `QUEUED`. `PERF_LOAD_TEST` stays blocked. These figures are not production latency.

### Safety during the workstream run

`BUZZARD_SALES_ENABLED=0`. No payment, refund, supplier order, marketplace listing, customer notification, or carrier purchase. Ports 3000 and 3001 were not restarted. No commit, push, or merge. `/workspace` was not modified.

## T-15.2 isolated Playwright run

**When:** 21.11.2026, 20:29 Avrupa/Berlin (19:29:22 UTC). Rerun after the highlight-key fix: 20:33 Avrupa/Berlin (19:33:06 UTC).  
**Command:** `scripts/isolated/e2e.sh --api-port 3011 --web-port 3010 -- e2e/commerce-storefront.spec.ts e2e/commerce-security.spec.ts --project=api`  
**Result:** 9 passed, 0 failed, exit 0. The rerun repeated those 9 and passed.  
**Stack:** API `http://127.0.0.1:3011`, storefront `http://127.0.0.1:3010`. Loopback-only network namespace. `BUZZARD_SALES_ENABLED=0`. Database and `server/data` were a throwaway directory. The isolation check reported throwaway storage, and the admin login form addressed `http://127.0.0.1:3011`.  
**Protected processes:** port 3000 PID 2129 and port 3001 PID 2215 stayed at their 14:53 Avrupa/Berlin start. Real `server/data` and `data/` hashes were unchanged (0 and 141 files).

| Spec | Observed |
|------|----------|
| Commercial checkout | `commercialOrders` 0, `realPayment` false, `supplierOrders` 0, `salesEnabled` false |
| Cart | A catalog product was added. `priceSnapshot` was greater than 0 |
| Readiness order | `orderType` `READINESS_TEST`. `realMoneyMovement` false |
| Price tamper | `clientPrice` 0.01 rejected with `price_tampering` |
| Coupon tamper | `clientDiscount` 999 rejected with `coupon_tampering` |
| Server coupon | `WELCOME10` applied, discount greater than 0 |
| Foreign cart | Status 403 or 404 |
| Duplicate complete | Same idempotency key accepted as a replay |

The two specifications use Playwright’s API request fixture. They do not open a storefront page, so they produced no page screenshot and no page console log. A separate homepage capture on the same isolated stack, desktop 1280 and mobile 375, plus `/admin/login/`, wrote:

- `docs/software-completion/t15-2/home-desktop.png`
- `docs/software-completion/t15-2/home-mobile.png`
- `docs/software-completion/t15-2/admin-login.png`
- `docs/software-completion/t15-2/browser-console.json`

First capture console: duplicate React key `cat-14-01`, and a hydration mismatch. `getDiversePopularCategories` listed `cat-14` twice, so Fitness was rendered twice. The duplicate id was removed from `lib/categories.ts`. The rerun console has no duplicate-key error.

Remaining console error: hydration mismatch on the search input (`style={{}}`) and the newsletter honeypot. The search component does not set that style. It was not changed. Google Fonts failed inside the loopback namespace (`fonts.googleapis.com`); Next used the fallback font. That is the isolation policy, not a storefront defect to open the network for.

Not done at 20:33: one storefront page per locale, and `SF_BROWSER` in the phase 15 gate. Phase 15 stays PARTIAL. Sales stayed locked. No live checkout, payment, supplier order, or carrier call.

## T-15.2 locale browser continuation

**When:** 21.11.2026, 21:35 Avrupa/Berlin (20:35 UTC).  
**Stack:** the same isolated storefront on port 3010 and API on port 3011. `BUZZARD_SALES_ENABLED=0`. Loopback only. Real `server/data` and `data/` hashes unchanged. Ports 3000 and 3001 were not restarted. PID 2129 and PID 2215 still showed the 14:53 Avrupa/Berlin start. No commit, push, merge, or deploy. `/workspace` was not modified.

### Hydration

The 20:33 `browser-console.json` recorded one hydration warning. React printed the search input as an extra empty `style` on the server side and the newsletter honeypot as `display:none` on both sides. Dedicated reloads of `/` and `/de/` in later isolated sessions did not emit that warning. On `/de/`, the live honeypot attribute was `display: none` (with a space). React's own style string is `display:none`, so the browser's serialization is the mismatch the earlier warning described. The search input's server HTML had no style attribute, and a later reload did not show a search-field style mismatch, so the search input was not changed and `suppressHydrationWarning` was not added.

The honeypot inline style was removed. It is now `class="form-honeypot"` with `display: none` in `styles/pusart.css`. The final 30-locale pass recorded no hydration error and no other console error.

### Language

The header language control called `setLocale`, and `t()` reads `language`. Those stayed apart, so choosing Arabic set `dir=rtl` and an Arabic category while the search placeholder and nav stayed in the browser language. `setLocale` now sets the language as well, the first client read uses a manual locale as the language, and the `/{locale}/` landing stores both. After that, every locale below matched its own catalog strings.

### Locales actually opened

Entry was `/{code}/`, which stores the choice and returns to `/`. The final pass is `e2e/device-regression-locales.spec.ts`, 1 test, exit 0, about 41 seconds. Log root `/tmp/buzzard-isolated.8JA9LK`. Per-locale result: `docs/software-completion/t15-2/locales.json`. Screenshots: `docs/software-completion/t15-2/locales/{code}-desktop.png`, `{code}-categories.png`, `{code}-mobile.png`.

| Code | Lang | Dir | Search placeholder matched | Nav matched | First category | Hydration |
|------|------|-----|----------------------------|-------------|----------------|-----------|
| de | de | ltr | yes | yes | 01. TEXTIL | no |
| en | en | ltr | yes | yes | 01. TEXTILES | no |
| tr | tr | ltr | yes | yes | 01. TEKSTİL | no |
| ar | ar | rtl | yes | yes | 01. النسيج | no |
| fr | fr | ltr | yes | yes | 01. TEXTIL | no |
| nl | nl | ltr | yes | yes | 01. TEXTIL | no |
| bg | bg | ltr | yes | yes | 01. TEXTIL | no |
| hr | hr | ltr | yes | yes | 01. TEXTIL | no |
| el | el | ltr | yes | yes | 01. TEXTIL | no |
| cs | cs | ltr | yes | yes | 01. TEXTIL | no |
| da | da | ltr | yes | yes | 01. TEXTIL | no |
| et | et | ltr | yes | yes | 01. TEXTIL | no |
| fi | fi | ltr | yes | yes | 01. TEXTIL | no |
| hu | hu | ltr | yes | yes | 01. TEXTIL | no |
| it | it | ltr | yes | yes | 01. TEXTIL | no |
| lv | lv | ltr | yes | yes | 01. TEXTIL | no |
| lt | lt | ltr | yes | yes | 01. TEXTIL | no |
| lb | lb | ltr | yes | yes | 01. TEXTIL | no |
| mt | mt | ltr | yes | yes | 01. TEXTIL | no |
| pl | pl | ltr | yes | yes | 01. TEXTIL | no |
| pt | pt | ltr | yes | yes | 01. TEXTIL | no |
| ro | ro | ltr | yes | yes | 01. TEXTIL | no |
| sk | sk | ltr | yes | yes | 01. TEXTIL | no |
| sl | sl | ltr | yes | yes | 01. TEXTIL | no |
| es | es | ltr | yes | yes | 01. TEXTIL | no |
| ca | ca | ltr | yes | yes | 01. TEXTIL | no |
| eu | eu | ltr | yes | yes | 01. TEXTIL | no |
| gl | gl | ltr | yes | yes | 01. TEXTIL | no |
| sv | sv | ltr | yes | yes | 01. TEXTIL | no |
| ga | ga | ltr | yes | yes | 01. TEXTIL | no |

Desktop 1280×720 and phone 375×812 were captured for each code. The desktop search field accepted `sku` and was cleared. Hovering the first category opened the mega panel on every code. The phone header was inside the 375px viewport on every code.

Category translations exist only for de, en, tr, and ar. The other 26 first labels are the German source name `01. TEXTIL`. That is a mixed-language interface and is not claimed as a pass. The opened textile menu, seen on the German and French category screenshots, also mixes German subcategory names with Turkish leaves (`Elbise`, `Bluz`, `Gomlek`, `Kazak & Triko`, `Pantolon`). Those names were not rewritten.

The country selector reads `name` from `data/buzzard_europe_countries.json`. Those names are German (`Deutschland`, `Irland`, and the rest) in every locale. The Arabic phone screenshot shows `Irland` in the country control beside Arabic chrome.

### Arabic phone layout

The first Arabic phone screenshot was a solid black 375×812 image. `documentElement.scrollWidth` was 1374. The skip link used `left: -999px`, and 999 + 375 is 1374. In the RTL document that off-screen offset left the captured viewport on empty background. The rule now clips the link instead of shifting it with `left`. A fresh phone load of `/ar/` then showed the Arabic header, search, category button, and footer (`docs/software-completion/t15-2/ar-mobile-after-skip-link.png`). The final sweep's `ar-mobile.png` is the same layout, 80,575 bytes, not the blank image. Desktop Arabic is `rtl` with Arabic chrome.

### Commerce specs after these edits

`scripts/isolated/e2e.sh --api-port 3011 --web-port 3010 -- e2e/commerce-storefront.spec.ts e2e/commerce-security.spec.ts --project=api`  
9 passed, 0 failed, exit 0. Root `/tmp/buzzard-isolated.JAH148`. Sales stayed off. No real order, payment, or external call.

`SF_BROWSER` in `evaluatePhase15Storefront` was not edited and remains `NOT_RUN`. `SF_LIVE_CDN` remains `BLOCKED_EXTERNAL`. Phase 15 stays PARTIAL. `completeClaim` stays false.

## T-15.2 locale labels and browser gate

**When:** 21.11.2026, 22:22–22:23 Avrupa/Berlin (21:22–21:23 UTC).  
**Where:** the same worktree. Ports 3010 and 3011 inside `scripts/isolated/e2e.sh`. Ports 3000 and 3001 were not used.

The live storefront catalog has 53 main categories (`cat-01` through `cat-53`). All 53 have an explicit label in each of the 30 supported locales. The textile tree under `cat-01` is 78 nodes. Four clothing leaves outside that tree are included: `cat-14-06-02` (German `Trekkinghose`), `cat-17-01-05`, `cat-17-01-06`, and `cat-17-01-07` (German `Babykleid`). `node --test server/__tests__/catalogLocaleLabels.test.mjs` passed 3 tests. Other subcategory leaves still use the older generated maps or the German source name. They are not claimed as translated.

The country selector displays localized names for the 27 EU members and the other deliverable countries. `data/buzzard_europe_countries.json` still stores the German names.

Chromium opened `/{locale}/` for de, en, tr, ar, fr, nl, bg, hr, el, cs, da, et, fi, hu, it, lv, lt, lb, mt, pl, pt, ro, sk, sl, es, ca, eu, gl, sv, and ga. The same command also ran the commerce specs.

`scripts/isolated/e2e.sh --api-port 3011 --web-port 3010 -- e2e/commerce-storefront.spec.ts e2e/commerce-security.spec.ts e2e/device-regression-locales.spec.ts --project=api --project=chromium-desktop`  
10 passed, 0 failed, 42.3s, exit 0. Root `/tmp/buzzard-isolated.Zc8uZV`. Sales stayed off.

The copied report is `docs/software-completion/t15-2/locales.json` with 90 screenshots in `docs/software-completion/t15-2/locales/`. Every row had matching lang and direction, a localized first category, the textile women and dress labels, a localized selected country, search text `sku`, an open mega panel, no hydration error, and an empty console. `mixedTurkish` and `mixedGerman` were false on all 30. Arabic `dir` was `rtl` and the phone header width was 375. The smallest screenshot in that copy is 82,979 bytes.

`runPhase15Evidence` sets `browserVerified` from that file. A missing file, a failed row, or a screenshot under 8,000 bytes leaves it false. The gate at 22:23 Avrupa/Berlin read `browserVerified` true, `browserLocales` 30, and `SF_BROWSER` status `PASS`. `percentComplete` was 100 and `ok` was true because `SF_LIVE_CDN` is excluded from the denominator. `completeClaim` was false. `live` was false. Phase 15 stays PARTIAL.

## Phase 6 cancel rule

**When:** 21.11.2026, 22:23 Avrupa/Berlin.  
`cancelOrderDry("")` returns `MISSING_ORDER_ID`. `cancelOrderDry("missing-order")` returns `ORDER_NOT_FOUND`. A tracked dry order still cancels, with no refund. `evaluatePhase6OrderManagement` uses `finalizePhase`, so `completeClaim` is false while `ORD_LIVE_SUBMIT` is blocked. `server/__tests__/phase6OrderManagement.test.mjs` and `server/__tests__/phases6to21Gate.test.mjs` passed together: 17 tests, 0 failed, exit 0. Start 21:23:16 UTC, which is 22:23 Avrupa/Berlin. T-6.1 and T-6.2 stay open. Phase 6 stays PARTIAL.

## Phase 7 payment denial in the gate

**When:** 21.11.2026, 22:24 Avrupa/Berlin (21:24 UTC).  
`evaluatePhase7PaymentFinance` now returns the sandbox results. The gate asserts `captured` false, capture not accepted, coupon code `coupon_tampering`, `refundIssued` false, and filing disabled. `PAY_LIVE_CAPTURE`, `PAY_LIVE_REFUND`, and `PAY_TAX_CONNECT_LIVE` stay blocked. `completeClaim` is false. The same 17-test run passed again, start 21:24:17 UTC. This is not an HTTP test, so T-7.1 stays open. Phase 7 stays PARTIAL.

## T-01 outcome gates for phases 12, 13, 14, 16, 18, and 19

**When:** 21.11.2026, 22:55 Avrupa/Berlin (21:55 UTC).  
`phases6to21Gate.test.mjs` passed 16 tests. None of phases 6–21 now stop at `percentComplete === 100`.

- Phase 12: weather text is not an order. A missing order id is `UNVERIFIED_ORDER`. Blank input is `EMPTY_INPUT`. The return mail is `return_status` and is not auto-sent. `CS_LIVE_INBOX` stays blocked.
- Phase 13: the Kurmay roster must match `MEMBERS`. Dropping Sinan or Pusat fails. The specialist seed is 17. The scorecard `live` and `completeClaim` are false. `PUSAT_LIVE_VOICE` stays blocked.
- Phase 14: Banu `CUSTOMER_REFUND` is `HUMAN_GATE_REQUIRED`. `SPEC_LIVE_COUNCIL` stays blocked.
- Phase 16: a prohibited party is `LISTED_PARTY`. No list is `HUMAN_REVIEW`. A bare `{ status: "CLEARED" }` is not accepted. ELSTER dry is `filed` false and `live` false. `TAX_CONNECT_LIVE` stays blocked.
- Phase 18: `publishCampaign` is `PUBLISH_BLOCKED`. `MKT_LIVE_ADS` stays blocked.
- Phase 19: operational snapshot has 10 channels, sales off, filing not live, 50 hubs. `ADM_LIVE_BI` stays blocked. `GET /api/admin/integrations` on an ephemeral port: anonymous 401, catalog manager 403, administrator 200 with `salesEnabled: false`.

`server/__tests__/phase6DryRehearsalRoute.test.mjs` passed at 22:56 Avrupa/Berlin. `POST /api/orders/dry-rehearsal` returned 200, `live: false`, for `DRY-SKU-001`. T-6.1 stays open. Phases 12, 13, 14, 16, 18, and 19 stay PARTIAL.

## T-6.1 one canonical order writer

**When:** 21.11.2026, 23:41 Avrupa/Berlin (22:41 UTC).  
Database: `/tmp/buzzard-phase-gates-9b86/canonical.db`. Sales `BUZZARD_SALES_ENABLED=0`.

`orderService.recordCanonicalOrder` inserts the `commerce_orders` row. The checkout, OMS create, OMS split, cart checkout, storefront JSON order, and dry orchestrator call that function first. A blocked result does not write the older projection. The same idempotency key returns `created: false` and the same id. A commercial order returns `sales_disabled`. `payment.captured === true` returns `PAYMENT_NOT_LIVE` and `captured: false`. Cart checkout with sales off returns `sales_disabled` and does not change stock. An OMS order cancels to `cancelled`. The canonical row then transitions to `CANCELLED`. Commercial count stayed 0.

`canonicalOrderWriter.test.mjs`: 4 passed, 0 failed, start 22:41:56 UTC.  
`part8Foundation.test.mjs`: 17 passed.  
`phase6DryRehearsalRoute.test.mjs`: 1 passed.  
`phase6OrderManagement.test.mjs`: 1 passed.  
`phases6to21Gate.test.mjs`: 16 passed, start 22:41:47 UTC.

The first canonical run in that gate process had 2 failures because `canon-once` and `oms-delegate-1` were already stored in the isolated database. The test now uses a fresh key. The rerun passed. Phase 6 stays PARTIAL. `ORD_LIVE_SUBMIT` stays BLOCKED_EXTERNAL. No commit.

## T-3.1 canonical product writer and the following local checks

**When:** 22.11.2026, 00:13–00:16 Avrupa/Berlin (21.11.2026 23:13–23:16 UTC).  
Database: `/tmp/buzzard-phase-gates-9b86/products.db`. Catalog copy: `/tmp/buzzard-phase3-catalog`. Sales off.

`canonicalProductWriter.test.mjs`: 2 passed. A blank SKU does not insert. One SKU created through the PIM catalog is read by admin, storefront preview, and the import JSON row. A second SEO create does not add a core row. Search and PIM30 creates use their own core ids.

`phase1CoreIntegrity.test.mjs`: 7 passed. Clean checkout is `ABSENT_IN_CLEAN_CHECKOUT`.

`phase2CategoryInfrastructure.test.mjs`: 1 passed. Alias `automotive/bremssystem`, L1 50, L2 330.

`phase3ProductPim.test.mjs`: 1 passed. Missing EAN is rejected. `PIM_LIVE_PUBLISH` is blocked. `completeClaim` is false.

`phase4SupplierAutomation.test.mjs`: 2 passed. A selection with `ok: false` and a fallback object is rejected.

`phase5PricingProfit.test.mjs`: 3 passed. Margin, floor, undercut, and loss checks passed. Live price write stays blocked.

`phase7CaptureRoute.test.mjs`: 1 passed. Ephemeral port, not 3000 or 3001. Confirm is 403 `PAYMENT_NOT_LIVE`. Refund is 403 `REFUND_NOT_LIVE`. Sandbox `captured` is false.

`phases6to21Gate.test.mjs`: 16 passed at 23:15:26 UTC. No commit.

## T-00 configured Vitest suite

**When:** 22.11.2026, 00:22 Avrupa/Berlin (21.11.2026 23:20:06 UTC).  
Database: `/tmp/buzzard-phase-gates-9b86/full.db`. Sales off. Workers 1.

The first run, start 23:17:00 UTC, failed 2 of 2007 tests. `catalogLocaleLabels.test.mjs` had no Vitest suite because it used `node:test`. `lib/categories/i18n.test.ts` expected the German cat-05 label `Automotive`; the catalog source name is `Automotive & Kfz`, and English stays `Automotive`.

The rerun passed: 179 files, 2009 tests, 1 skipped, 0 failed, 155.81s. `vitest.config.ts` still excludes `part24` through `part35`. No commit.

## T-1.3 one assertion per dev-list item

**When:** 22.11.2026, 00:55 Avrupa/Berlin (21.11.2026 23:55:49 UTC).  
Database: `/tmp/buzzard-phase-gates-9b86/devlist.db`. Sales off. Workers 1.

`devList51Items.test.mjs`: 51 passed, 0 failed. Each item calls the function it names.

1. Master taxonomy `master50` 50 and `ok` true.  
2. Active level-1 count 50.  
3. `cat-25`, `getraenke`, and `schmuck-uhren` return `CATEGORY_RETIRED`.  
4. Hub coverage 50 and `livePublish` false.  
5. Textile hub titles start with Textil, Textiles, and Tekstil.  
6. A mapped brake binds. An unknown category does not.  
7. EAN `5901234123457` passes. `123` fails.  
8. A real image is accepted. A demo image is `MEDIA_DEMO_BLOCKED`.  
9. ATE normalizes and `dbWrite` is false.  
10. Dry SKU is `DRY_RUN`. Demo SKU is `DEMO`.  
11. Demo publish is `SKIPPED_DEMO` and `ok` false.  
12. Search sorts the cheaper row first and `liveIndex` is false.  
13. API, XML, and CSV dry suppliers have `ordersEnabled` false and `canGoLive` false.  
14. API adapter `networkBlocked` true.  
15. XML adapter `networkBlocked` true.  
16. CSV adapter `networkBlocked` true.  
17. A valid dry import catalogs one row and writes no PIM row. A missing EAN is rejected.  
18. The brake alias returns a category id.  
19. TecDoc is `LIVE_BLOCKED` / `TECDOC_LIVE_BLOCKED`.  
20. Live supplier is `LIVE_BLOCKED` / `LIVE_SUPPLIER_BLOCKED`.  
21. A quote is calculated and `salesEnabled` is false.  
22. Stock 12 is `IN_STOCK`. Stock 0 is not.  
23. A complete dry run is `LOCKED` and `READY_FOR_REVIEW`.  
24. Realized profit is 24. An unreimbursed return is null.  
25. A changed client price is tampering. The same price is not.  
26. Pending can become cancelled. Cancelled cannot become paid.  
27. The dry draft count is at least 1 and `paymentCaptured` is false.  
28. Capture is `SALES_LOCKED` and `captured` false.  
29. A return request has `refundIssued` false.  
30. `refundMoney` is `REAL_REFUND_BLOCKED`.  
31. Discount 100 against server discount 5 is `coupon_tampering`. A matching discount is accepted.  
32. The automation job is admitted and sales stay `LOCKED`.  
33. Germany VAT estimates for one of 27 countries.  
34. Country `XX` is `VAT_UNKNOWN`.  
35. France reserves 25. Germany is `DE_USES_PRIOR_APPROVAL_RULE`. The pool length is 26.  
36. A German net posting has `pool` false and `elsterLive` false.  
37. `submitFiling` is `TAX_CONNECT_BLOCKED` and `filingEnabled` false.  
38. Iran is `OUTSIDE_AB27`, not auto-cleared.  
39. Value 10000 to France is `HIGH_VALUE`.  
40. The carrier catalog is local and `live` false.  
41. A live carrier rate is `LIVE_CARRIER_RATE_BLOCKED`.  
42. DHL create is `HUMAN_GATE_REQUIRED` and `liveShipment` false.  
43. Transit tracking is `IN_TRANSIT` and not a live call.  
44. A Berlin address passes. A short postcode fails.  
45. A logistics return has `customerRefundIssued` false.  
46. The locale list has 30 codes, including `ar` and `de`.  
47. The language key is `buzzard_locale`. The language selector does not set the country.  
48. The country key is `buzzard_market_country`. The country selector does not set the language.  
49. The product envelope lists 30 locales and `professional` is false.  
50. Arabic is `rtl`. German is `ltr`. The price field stays isolated.  
51. The sales gate is `LOCKED` and no item is `PARTIAL`.

`devList51Remainder.test.mjs`: 9 passed.  
`phase1CoreIntegrity.test.mjs`: 7 passed. `percentComplete` 100. `CORE_DEVLIST_EACH_ITEM` passed. Protected-file `hashVerified` stays false on a clean checkout. Phase 1 stays PARTIAL.

## T-2.1 explicit locale fallback

**When:** 22.11.2026, 00:57 Avrupa/Berlin (21.11.2026 23:57:05 UTC).  
Same isolated database. Sales off.

`phase2L2SeoCopy.test.mjs`: 4 passed. French textile leaf `cat-01-01-01` is the reviewed label `Robe`. An L2 node without a French label is `reviewed: false` and `fallbackFrom: "source"`. The audit is 330 L2 nodes, 9 reviewed for every non-German locale, 321 missing. `completeClaim` is false. Phase 2 percent stays 100 because the missing copy is not turned into a fake pass and is not dropped from a completed claim.

`phase2CategoryInfrastructure.test.mjs`: 1 passed, including `completeClaim` false.  
`hubSeoLocaleService.test.mjs`: 3 passed.  
`devList51Items.test.mjs`: 51 passed in the same run.

T-2.1 is not closed. The remaining 321 L2 nodes need reviewed copy. No commit.
