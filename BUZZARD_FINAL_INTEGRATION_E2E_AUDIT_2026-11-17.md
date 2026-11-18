# BUZZARD Final Integration and E2E Audit

Date: 17 November 2026, 18:29 Europe/Berlin  
HEAD: `cursor/dev-list-51-remainder-c293` @ `fdc3132c`  
No commit, push, merge, deploy, or branch change was made.

## 1. Executive Summary

The 45 completed items still satisfy their in-repo contracts. `evaluateDevList51()` returned **45 complete, 0 partial, 6 blocked, 0 not started**. Sales stays `LOCKED`. Egress stays `DENY`. `productionReady` is `false`. `live` is `false`.

An isolated API on port 3011 and storefront on port 3010, using `/tmp/buzzard-sprint-e2e/catalog.sqlite`, proved the HTTP path from catalog to cart, price rejection, coupon authority, and a `READINESS_TEST` order with `realMoneyMovement: false`. The same run did not prove a populated EAN, brand, or category on that synthetic shelf item.

Playwright against those ports: the configured suite of 77 tests finished **56 passed, 21 skipped, 0 failed**. The 20 API-project tests all passed. A second run of the 15 tests that had skipped for a missing `NEXT_PUBLIC_BUZZARD_API_URL` finished **6 passed, 9 failed**. The nine failures are admin login: the browser stayed on `/admin/login/` and the form showed an invalid-credentials message.

`git merge-tree origin/main HEAD` exits 1 with **43** conflict lines. PR #500 is `mergeable: false` against its base because `server/lib/supplier/supplierMappingService.js` conflicts in four hunks. PR #504 and PR #506 are clean against their immediate parents and additive. None of the three is safe to merge into `main`.

Production decision: **not ready**.

## 2. Initial Git State

Verified before any test process was started.

| Check | Result |
| --- | --- |
| Branch | `cursor/dev-list-51-remainder-c293` |
| Commit | `fdc3132c308cb3ae36a07b21d5e66b6544fb2515` |
| Working tree | clean (`git status --porcelain` empty) |
| Untracked files | none |
| `origin/main` | `bd3dc910451c41911716855b565b67e9e5c9bc78` |
| Foundation base | `d413d13a` `cursor/pim-catalog-foundation-c293` |
| PR #500 head | `8817422b` |
| PR #504 head | `df9c12ec` |
| PR #506 head | `fdc3132c` (this checkout) |

The expected branch and commit matched. No repair was applied.

Stack, from GitHub at 17 Nov 2026:

| PR | Base | Head | Commits in PR | GitHub merge state | Stack position |
| --- | --- | --- | --- | --- | --- |
| [#500](https://github.com/Buzzard-de/Buzzard/pull/500) | `cursor/pim-catalog-foundation-c293` | `cursor/buzzard-autonomous-continuation-c293` | 111 | `dirty`, `mergeable: false` | 1 of 3 |
| [#504](https://github.com/Buzzard-de/Buzzard/pull/504) | `cursor/buzzard-autonomous-continuation-c293` | `cursor/dry-order-draft-remainder-c293` | 1 | `clean`, `mergeable: true` | 2 of 3 |
| [#506](https://github.com/Buzzard-de/Buzzard/pull/506) | `cursor/dry-order-draft-remainder-c293` | `cursor/dev-list-51-remainder-c293` | 1 | `clean`, `mergeable: true` | 3 of 3 |

Ancestry on the local refs: #500 is an ancestor of #504, and #504 is an ancestor of #506.

Checks API for `8817422b`, `df9c12ec`, and `fdc3132c`: `total_count: 0`. No GitHub check run is recorded on these three heads. Absence of a check run is not a passing CI result.

`/tmp/buzzard-eu27/server/data/buzzard.db` is absent. `memory/pusat/` is absent. PR #502 and `cursor/buzzard-fin-m25-consent-schema-4be7` were not checked out, fetched for writing, or edited.

Ports 3000 and 3001 were already listening (Next pid 2092, `server.js` pid 10152). They were left running.

## 3. 51-Item Verification

Command: `evaluateDevList51()` with `BUZZARD_DB_PATH=/tmp/buzzard-score-isolated.sqlite` and `BUZZARD_SALES_ENABLED=0`.

| Mark | Count |
| --- | ---: |
| Complete | 45 |
| Partial | 0 |
| Blocked | 6 |
| Not started | 0 |

`productionReady: false`. `live: false`.

`evaluateSalesGate()`: `status: LOCKED`, `allowed: false`, `envWantsSales: false`. Failed conditions include `PRODUCT_SOT_ACTIVE`, `PAYMENT_LIVE`, `SUPPLIER_LIVE`, `FULFILLMENT_LIVE`, `TRACKING_LIVE`, `RETURN_LIVE`, `REFUND_LIVE`, `CRITICAL_E2E_PASS`, `SECURITY_GATE_PASS`, `PUSAT_RUNTIME_HEALTHY`.

Egress default in `server/lib/security/egressPolicy.js`: `DENY`.

| Probe | Code |
| --- | --- |
| `https://api.openai.com/v1` | `EXTERNAL_AI_EGRESS_DENIED` |
| `https://api.stripe.com/v1` | `PAYMENT_EGRESS_LOCKED` |
| Unlisted TecDoc-style host | `HOST_NOT_ALLOWLISTED` |

The six blocked items and the code the scorecard recorded:

| Item | Evidence |
| ---: | --- |
| 19 Live TecDoc | `TECDOC_LIVE_BLOCKED` |
| 20 Live supplier | `LIVE_SUPPLIER_BLOCKED` |
| 28 Payment capture | `SALES_LOCKED` |
| 30 Real refund | `REAL_REFUND_BLOCKED` |
| 37 Tax Connect | `TAX_CONNECT_BLOCKED` |
| 41 Live carrier rates | `LIVE_CARRIER_RATE_BLOCKED` |

Direct calls matched those gates: `capture()` returned `SALES_LOCKED`, `refundMoney()` returned `REAL_REFUND_BLOCKED`, `submitFiling()` returned `TAX_CONNECT_BLOCKED`, `submitElster()` returned `ELSTER_BLOCKED`. No live network client was invoked for these probes.

The score was not expanded. FIN-M25 was not added. A file existing on disk was not treated as completion; the score function and the gate calls above are the evidence.

## 4. PR Dependency Analysis

Required order, and the only order that preserves the stack:

1. Resolve PR #500 against `cursor/pim-catalog-foundation-c293`.
2. Merge or rebase PR #504 onto the resolved #500.
3. Merge or rebase PR #506 onto the resolved #504.
4. Only after that, plan a separate integration with `origin/main`.

#504 and #506 do not edit the same files. `git diff` name lists are disjoint.

#504 vs #500 (`df9c12ec`, 6 files, +560 / −9):

- `docs/council/BUZZARD_DRY_ORDER_DRAFT_REMAINDER_2026-11-17.md`
- `server/__tests__/dryOrderDraft.test.mjs`
- `server/__tests__/part6Foundation.test.mjs`
- `server/lib/adapters/mockSupplierAdapter.js`
- `server/lib/commerce/dryOrderDraft.js`
- `server/lib/supplier/dryRunSupplierAdapter.js`

#506 vs #504 (`fdc3132c`, 13 files, +1339 / −0):

- `docs/council/BUZZARD_DEV_LIST_51_REMAINDER_2026-11-17.md`
- `server/__tests__/devList51Remainder.test.mjs`
- `server/lib/commerce/dryReturnRequest.js`
- `server/lib/commerce/germanyTaxPath.js`
- `server/lib/commerce/taxPoolLedger.js`
- `server/lib/i18n/rtlDir.js`
- `server/lib/logistics/addressVerification.js`
- `server/lib/pim/catalogSearchSort.js`
- `server/lib/pim/mediaReadiness.js`
- `server/lib/pim/productCategoryBind.js`
- `server/lib/pim/productContentI18n.js`
- `server/lib/pim/productOrigin.js`
- `server/lib/platform/devList51.js`

`git merge-tree` of #504 into #506 exits 0. `git merge-tree` of the foundation tip into #500 exits 1.

## 5. PR #500 Analysis

Decision: **BLOCKED**.

GitHub: open, 111 commits, 1165 files, +934411 / −1920, `mergeable_state: dirty`. Local divergence from its base: 111 commits on the PR, 1 commit on the base that is not in the PR. That base commit is `d413d13a` (`feat(pim): catalog foundation`). Merge-base of the two tips is `442340fb`, not `d413d13a`.

The only content conflict is `server/lib/supplier/supplierMappingService.js`, in four hunks (`git merge-file` against the ancestor).

Foundation side (`d413d13a`) maps through `resolveProductCategory()` and returns `CATEGORY_UNMAPPED` / `CATEGORY_UNKNOWN` from that resolver.

This branch loads `buzzard_categories.json`, the retired shop list, the 50-category master, the crosswalk, and the hub file. `loadActiveCatalog()` throws `ACTIVE_CATEGORY_COUNT_<n>` unless the active level-1 count is 50. Retired ids, hubs, and ambiguous tokens are refused. `mapActiveCatalogCategory()` is what `productCategoryBind.js` calls.

Safe resolution: keep this branch's loader and the 50-count guard. Replaying the foundation function on top would drop the retired-category and active-count checks. Do not take either side blindly, and do not auto-merge. `lib/admin/pimCore.ts`, `package.json`, and `server/plugins/pimCorePlugin.js` auto-merged in `git merge-tree` and are not the blocker.

This PR is also 183 commits behind `origin/main` when measured from current HEAD (`git rev-list --left-right --count`: 183 on main, 83 on HEAD). A green merge into the foundation branch would still leave the main conflicts in section 8.

Test status for the code that sits on this PR: see sections 10 and 20. Those tests ran on #506, which contains #500.

## 6. PR #504 Analysis

Decision: **NOT_READY** to merge through to `main`. Its own patch is clean against #500.

Dependency: parent #500 is BLOCKED, so this PR cannot land on the foundation branch until #500 does.

Compatibility of the patch itself:

- `dryOrderDraft.js` creates drafts only from `READY_FOR_REVIEW`, with sales still locked and payment capture false. In-process run: 1 record in, 1 draft, `paymentCaptured` false.
- Sample supplier category in the dry-run and mock adapters is `automotive/bremssystem`.
- `bindProductCategory({ supplier_category: "automotive/brakes" })` returns `CATEGORY_UNMAPPED`, `categoryId: null`, `published: false`.
- `bindProductCategory({ supplier_category: "automotive/bremssystem" })` returns `CATEGORY_MATCHED`, `categoryId: cat-05`, subcategory `cat-05-03` Bremssystem. No PIM write.

The `automotive/brakes` mapping was not changed in this sprint.

Test status: `server/__tests__/dryOrderDraft.test.mjs` passed inside the clean unit run (5 tests). The part6 job-approval assertion change is in this PR and the part6 file passed in the same unit run.

## 7. PR #506 Analysis

Decision: **NOT_READY** to merge through to `main`. Its own patch is clean against #504 and is additions only.

Dependency: blocked by #500, then by #504's position in the stack.

The patch adds the scorecard, local address rules, Germany tax path, the 26-country pool ledger, dry returns, RTL dir, search/sort, media readiness, category bind, product origin, and the 30-locale product envelope. It does not open TecDoc, supplier live calls, payment capture, real refunds, Tax Connect, or live carrier rates.

Test status: `server/__tests__/devList51Remainder.test.mjs` passed in the clean unit run. Scorecard result is in section 3.

## 8. Main Conflict Analysis

`git merge-tree origin/main HEAD` exit code **1**. Conflict lines: **43**. Merge-base used by the classification script is the merge-base of `origin/main` and HEAD. No file in the worktree was edited to resolve these.

Counts below are `git diff --numstat` from that merge-base: `main added/deleted` and `head added/deleted`.

### 8.1 Category and storefront files

| File | Kind | Main vs base | Head vs base | Why | Main behavior | This branch | Risk | Safe next step |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `app/kategorie/[...slug]/page.tsx` | content | +109/−47 | +28/−1 | Both edited the category page after the fork. Main's last touch is `fd3c2afb` (machinery hub frames). Head's last touch is `89dab973` (50-master, retired food/jewelry). | Later visual/hub layout | Category routing from the 50-master lock | Category page can lose either hub frames or the retirement rules | Replay main's layout onto this branch's category ids. Do not take one whole file. |
| `components/CategorySidebar.tsx` | content | +47/−13 | +1/−2 | Same fork. | Sidebar follows main's category presentation | Small edit on the locked tree | Sidebar can show retired categories or drop main's labels | Merge by hand against the 50 active ids |
| `lib/categories.ts` | content | +19/−7 | +10/−2 | Main last touch `92fc6d31` (construction and livestock photos). Head last touch `89dab973`. | Photo and hub data | Retirement and 50-count | Category loss if photos are kept without the retirement filter, or photo loss if head is kept whole | Keep retirement filter, then re-apply main's photo fields |
| `lib/categories/i18n.ts` | content | +66/−17 | +1/−1 | Main grew category translations | Broader category i18n | Tiny delta | Language loss if head overwrites main | Keep main's translation body, re-apply head's one-line change |
| `lib/categories/i18n.test.ts` | content | +64/−10 | +27/−0 | Tests diverged with the maps | Main's expectations | Head's expectations | Test risk: one side's assertions fail | Update tests after the map merge, do not delete either assertion set until the map is chosen |
| `lib/categories/service.ts` | content | +40/−2 | +44/−4 | Both changed the category service | Main service behavior | Head service behavior | Category lookup can change ids | Diff the functions; keep 50-active and retired guards |

Data-loss risk for this group is category identity and photos, not the order database. Routing risk is the category page and sidebar. Language risk is the category i18n maps.

### 8.2 Locale and translation files

| File | Kind | Main vs base | Head vs base | Notes |
| --- | --- | --- | --- | --- |
| `lib/i18n/locales/en.ts` | content | +46/−2 | +12/−0 | Main last touch `d6939b51` renames the automotive category on the storefront. Head last touch `6fd86fae`. |
| `lib/i18n/locales/bg.ts` | add/add | file absent at merge-base | both added | main 475 lines, head 520 lines |
| `lib/i18n/locales/ca.ts` | add/add | same | same | 475 vs 520 |
| `lib/i18n/locales/cs.ts` | add/add | same | same | 475 vs 520 |
| `lib/i18n/locales/da.ts` | add/add | same | same | 475 vs 520 |
| `lib/i18n/locales/el.ts` | add/add | same | same | 475 vs 520 |
| `lib/i18n/locales/es.ts` | add/add | same | same | 475 vs 520 |
| `lib/i18n/locales/et.ts` | add/add | same | same | 475 vs 520 |
| `lib/i18n/locales/eu.ts` | add/add | same | same | 475 vs 520 |
| `lib/i18n/locales/fi.ts` | add/add | same | same | 475 vs 520 |
| `lib/i18n/locales/fr.ts` | add/add | same | same | 475 vs 520. Main last touch `1631e638`. Head last touch `ab19247f`. |
| `lib/i18n/locales/ga.ts` | add/add | same | same | 475 vs 520 |
| `lib/i18n/locales/gl.ts` | add/add | same | same | 475 vs 520 |
| `lib/i18n/locales/hr.ts` | add/add | same | same | 475 vs 520 |
| `lib/i18n/locales/hu.ts` | add/add | same | same | 475 vs 520 |
| `lib/i18n/locales/it.ts` | add/add | same | same | 475 vs 520 |
| `lib/i18n/locales/lb.ts` | add/add | same | same | 475 vs 520 |
| `lib/i18n/locales/lt.ts` | add/add | same | same | 475 vs 520 |
| `lib/i18n/locales/lv.ts` | add/add | same | same | 475 vs 520 |
| `lib/i18n/locales/mt.ts` | add/add | same | same | 475 vs 520 |
| `lib/i18n/locales/nl.ts` | add/add | same | same | 475 vs 520 |
| `lib/i18n/locales/pl.ts` | add/add | same | same | 475 vs 520 |
| `lib/i18n/locales/pt.ts` | add/add | same | same | 475 vs 520 |
| `lib/i18n/locales/ro.ts` | add/add | same | same | 475 vs 520 |
| `lib/i18n/locales/sk.ts` | add/add | same | same | 475 vs 520 |
| `lib/i18n/locales/sl.ts` | add/add | same | same | 475 vs 520 |
| `lib/i18n/locales/sv.ts` | add/add | same | same | 475 vs 520 |
| `lib/i18n/translations.ts` | content | +141/−12 | +90/−5 | Main last touch `441e8ea2` (30-locale backend). Head last touch `ab19247f`. |
| `lib/i18n/types.ts` | content | +132/−6 | +8/−11 | Main last touch `ea351392` (50 customer L1 labels and RTL CSS). Head last touch `89dab973`. |
| `lib/i18n/routing.ts` | content | +40/−8 | +2/−1 | Both edited locale routing. |
| `lib/i18n/format.ts` | content | +57/−16 | +33/−9 | Both edited formatting. |
| `lib/i18n/context.tsx` | content | +10/−7 | +28/−14 | Both edited the locale provider. |
| `lib/i18n/catalog.test.ts` | content | +17/−0 | +4/−0 | Test expectations diverged. |

Cause of the 26 add/add files: neither side had the file at the merge-base; both added a locale module later. Head's copies are longer (520 vs 475). Taking main drops the extra head strings. Taking head drops whatever main added that head does not contain. Language-loss risk is real. Category-loss risk is indirect: `en.ts` and `types.ts` carry the automotive rename and the 50 L1 labels.

Safe step: merge locale objects by key. Keep a key if either side has it. Where the value differs, keep this branch's category retirement wording and main's newer storefront wording only after a human reads the pair. Do not pick a whole file.

### 8.3 Home, stats, product AI, Vitest

| File | Kind | Main vs base | Head vs base | Why | Safe next step |
| --- | --- | --- | --- | --- | --- |
| `lib/navigation/home-config.ts` | content | +5/−30 | +2/−2 | Main last touch `b74f1bf5` rebuilds the multicategory homepage and deletes lines. Head last touch `89dab973`. | Keep main's homepage structure, then re-apply the retirement ids from this branch. Data-loss risk is homepage entries, not orders. |
| `lib/site/catalog-stats.ts` | content | +4/−4 | +8/−3 | Both changed the published counts. Main last touch `ea351392`. | Recompute the numbers from the merged category list. Do not keep either hard-coded count. |
| `server/lib/productAi.js` | content | +2/−1 | +32/−56 | Main's change is the small i18n edit `441e8ea2`. Head's change is `f5286dfb`, which keeps AI commerce actions behind the approval gate. | Keep the approval gate. Port main's two-line i18n edit onto it. Dropping head would weaken the gate. |
| `vitest.config.ts` | content | +13/−0 | +17/−0 | Both added includes. Main last touch `fd3c2afb`. Head last touch `294ab079`. | Union the test include lists. Test risk is a suite silently not running if one side's include is dropped. |

Routing risk is concentrated in `routing.ts`, `app/kategorie/[...slug]/page.tsx`, and `home-config.ts`. No conflict was found in the commerce order engine, the sales gate, or the egress policy.

## 9. E2E Environment Isolation

The existing listeners on 3000 and 3001 were not stopped and were not the test targets.

Isolated processes:

| Role | Bind | PID | Database env |
| --- | --- | ---: | --- |
| API `node server/server.js` | `0.0.0.0:3011` | 41487 | `BUZZARD_DB_PATH=/tmp/buzzard-sprint-e2e/catalog.sqlite` |
| Next `next dev -p 3010 -H 127.0.0.1` | `127.0.0.1:3010` | 41524 | same path, so Next could not fall through to the protected file |

Also set on the API only: `BUZZARD_E2E_DB=1`, `BUZZARD_TEST_MODE=1`, `BUZZARD_SALES_ENABLED=0`, `BUZZARD_COMMERCE_CORE=1`, `BUZZARD_BACKUP_DIR=/tmp/buzzard-sprint-e2e/backups`, `BUZZARD_CORS_ORIGINS=http://127.0.0.1:3010,http://localhost:3010`.

Playwright was started with `PLAYWRIGHT_SKIP_WEBSERVER=1`, `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3010`, `BUZZARD_API_URL=http://127.0.0.1:3011`. That bypasses `reuseExistingServer` in `playwright.config.ts`.

Process environ confirmed the API's `BUZZARD_DB_PATH` was the temp file. `/workspace/server/data/buzzard.db` size stayed **1761280** and mtime stayed **17:52:20 Europe/Berlin** (the earlier probe, not this sprint).

The temp database, after migrate, had 218 tables, 2 `pim_core_products` rows, 0 `orders`, 0 `commerce_orders`. The visible row is the synthetic fixture `pim_prod_e2e_visible` / `BZ-E2E-VISIBLE-001`. The other row is the hidden demo `BZ-CORE-DEMO-001`.

Limitation: `server/lib/auth.js` still reads and writes `server/data/admin-users.json`, `admin-sessions.json`, `security-log.json`, `audit-log.json`, and the API also appended `automation-events.json`. Those paths are not switched by `BUZZARD_DB_PATH`. This sprint's admin login attempts updated:

| File | mtime Europe/Berlin | Size |
| --- | --- | ---: |
| `server/data/admin-sessions.json` | 18:28:21 | 1078 |
| `server/data/audit-log.json` | 18:29:07 | 2552 |
| `server/data/security-log.json` | 18:29:21 | 398824 |
| `server/data/automation-events.json` | 18:29:21 | 7274 |

`admin-users.json` mtime stayed 17:52:15. Those logs were left in place. They were not deleted and not committed.

Both isolated processes were stopped with SIGTERM after the tests. Ports 3000 and 3001 were still listening afterward. Ports 3010 and 3011 were not.

## 10. Playwright Results

Runner: Playwright 1.62.1, Chromium already installed. Workers: 1. No test file and no assertion was edited.

### 10.1 Full configured suite

Command environment: `PLAYWRIGHT_SKIP_WEBSERVER=1`, base `http://127.0.0.1:3010`, API `http://127.0.0.1:3011`. `NEXT_PUBLIC_BUZZARD_API_URL` was set on the Next process, and was **not** set in this Playwright process.

Result: **77 tests, 56 passed, 21 skipped, 0 failed**. Duration about 1.1 minutes. Log: `/tmp/pw-sprint.log`. Exit 0.

API project (`e2e/commerce-readiness.spec.ts`, `commerce-security.spec.ts`, `commerce-storefront.spec.ts`, `egress-security.spec.ts`, `master-command-acceptance.spec.ts`, `master-command-chromium.spec.ts`, `master-command-locales.spec.ts`, `master-command-mobile-rtl.spec.ts`): **20 passed, 0 failed, 0 skipped**. This is the 20/20 API target, on the isolated server.

Skipped, and why:

| Count | Where | Reason |
| ---: | --- | --- |
| 5 | `e2e/admin-pim-core.spec.ts` on `chromium-desktop` | `test.skip(!process.env.NEXT_PUBLIC_BUZZARD_API_URL)` in the test process |
| 4 | `e2e/admin.spec.ts` on `chromium-desktop` | same guard |
| 6 | `e2e/storefront-bridge.spec.ts` on `chromium-desktop` | same guard |
| 3 | overflow tests labeled `desktop*` on `chromium-mobile` | `customer-journey.spec.ts` skips desktop labels outside `chromium-desktop` |
| 3 | overflow tests labeled `desktop*` on `chromium-tablet` | same |

Projects that did run in this pass:

| Project | What ran | Passed | Failed | Skipped |
| --- | --- | ---: | ---: | ---: |
| api | commerce, egress, locales, RTL, home | 20 | 0 | 0 |
| chromium-desktop | customer journey, overflow viewports, master-command pages | the non-admin portion of the 56 | 0 | 15 (admin, PIM, storefront bridge) |
| chromium-mobile | customer journey, phone RTL, overflow except desktop labels | included in the 56 | 0 | 3 |
| chromium-tablet | customer journey and overflow except desktop labels | included in the 56 | 0 | 3 |

There is no separate Playwright project named Admin, Admin PIM, Storefront Bridge, Desktop, Mobile, or Tablet. Admin and storefront bridge are files inside `chromium-desktop`. Desktop, mobile, and tablet are `chromium-desktop`, `chromium-mobile`, and `chromium-tablet`.

### 10.2 Second run of the 15 skipped UI files

`NEXT_PUBLIC_BUZZARD_API_URL=http://127.0.0.1:3011` was set in the Playwright process. Same isolated ports. Files: `e2e/admin.spec.ts`, `e2e/admin-pim-core.spec.ts`, `e2e/storefront-bridge.spec.ts`. Project: `chromium-desktop`.

Result: **15 tests, 6 passed, 9 failed, 0 skipped**. Duration 2.6 minutes. Exit 1. Log: `/tmp/pw-admin.log`.

Passed:

- `e2e/admin.spec.ts` — Admin login page loads
- `e2e/storefront-bridge.spec.ts` — Homepage loads without horizontal overflow
- Category page product grid at mobile 320px
- Mega menu: subcategories hidden until main category click
- Product listing via category
- Search page loads

Failed: all nine call `adminLogin()` and time out at `page.waitForURL(/\/admin\/?$/, { timeout: 15_000 })`.

| Test | File | Error | Class | Priority |
| --- | --- | --- | --- | --- |
| PIM Core page loads | `e2e/admin-pim-core.spec.ts:17` | TimeoutError 15000ms | environment plus admin auth store | high for admin UI, not a sales-gate failure |
| Product list shows demo SKU | same file :23 | same | same | high |
| Validation tab workflow | same file :29 | same | same | high |
| Import dry-run | same file :37 | same | same | high |
| Brands section | same file :45 | same | same | high |
| Admin login → dashboard | `e2e/admin.spec.ts:14` | same | same | high |
| Control Center loads | `e2e/admin.spec.ts:23` | same | same | high |
| Sessions page loads | `e2e/admin.spec.ts:33` | same | same | high |
| Admin storefront health | `e2e/storefront-bridge.spec.ts:56` | same, via `adminLogin` | same | high |

Root cause from the failure screenshot and the code: the login card stayed on screen and rendered `Anmeldung fehlgeschlagen. E-Mail oder Passwort ungültig.` That string is the generic `catch` in `components/admin/AdminLoginForm.tsx` for every error other than API-unavailable, lockout, rate limit, and a bad 2FA code. The isolated sqlite `users` table does contain `admin@buzzard.de` with role `admin`. The route `POST /api/admin/login` does not read that table. `server/plugins/adminAuthPlugin.js` calls `login()` in `server/lib/auth.js`, which loads `server/data/admin-users.json`. The network status of the failed browser request was not captured, so this audit does not claim the hash itself was compared. The next fix is to point admin auth at the isolated store, or to seed the JSON store inside the temp environment, and to capture the HTTP status. Tests were not weakened to match the failure.

## 11. HTTP Commerce Chain

Target: `http://127.0.0.1:3011` only. Synthetic session ids. No customer record from the protected database.

| Step | Request | Status | Evidence |
| --- | --- | ---: | --- |
| A Catalog | `GET /api/catalog/products?limit=1` | 200 | `total: 1`, id `pim_prod_e2e_visible`, sku `BZ-E2E-VISIBLE-001`, price `29.99`, stock `20`, currency `EUR` |
| B Detail | `GET /api/catalog/products/pim_prod_e2e_visible` | 200 | same id and sku, price and stock present. `ean`, `gtin`, `brand`, and `status` are **null**. `category` on the probed field is null. The fixture insert in `server/lib/db.js` does not set EAN, brand, or `taxonomy_category_id`. |
| C Cart | `POST /api/commerce/cart` `{sessionId, country: DE}` | 200 | cart id returned, currency `EUR` |
| C Add | `POST /api/commerce/cart/:id/items` quantity 2, no client price | 200 | `priceSnapshot: 29.99`, quantity 2 |
| C Oversell | quantity 9999 | 400 | `quantity_too_high` |
| D Tamper | `clientPrice: 0.01` | 400 | `errorKey: price_tampering` |
| E Bad coupon | `NOT-A-COUPON` | 400 | `checkout.couponInvalid` |
| E Tampered discount | `WELCOME10` plus `clientDiscount: 999` | 400 | `coupon_tampering` |
| E Server coupon | `WELCOME10` alone, quantity 2 | 200 | `discount: 6`, `couponCode: WELCOME10` |
| F Attempt | `POST /api/commerce/checkout/attempt` `orderType: COMMERCIAL` | 200 | `commercialOrders: 0`, `realPayment: false`, `supplierOrders: 0`, `salesEnabled: false` |
| F Readiness | start, validate, complete with `READINESS_TEST` | 200, 200, 200 | `order.orderType: READINESS_TEST`, `payment.realMoneyMovement: false` |
| Health | `GET /api/health/commerce` | 200 | `salesEnabled: false` |
| IDOR | cart created with `customerId: cust_a`, then `GET` as `cust_b` | 403 | owned cart is refused. A cart created with no customer id returned 200 to a foreign query; the Playwright IDOR test, which sets an owner, passed. |

`paymentCaptured` is not a field of `POST /api/commerce/checkout/attempt`. The response fields above are the ones the handler returns. The in-process draft helper does set `paymentCaptured: false`.

The synthetic product was not published to the protected catalog. `commerce_orders` in the temp database was 0 before the readiness call. This audit did not re-count that table after the readiness complete. The HTTP body says the order type is `READINESS_TEST` and real money movement is false. It does not say a commercial order was created (`commercialOrders: 0` on the attempt).

## 12. Pricing and Profitability

Source: `server/lib/commerce/pricingPolicy.js` and `runCommercialDryRun()` on one synthetic brake-pad record. No price was written live.

Constants in code:

| Rule | Value |
| --- | --- |
| Minimum net profit | 0.50 EUR |
| Market undercut | 0.10 EUR |
| Automotive target margin | 11% (`0.11`) |
| Drinks | 15% |
| Other | 7% |

Synthetic input: supplier 40, shipping 6, marketplace fee 4, payment fee 1.2, return reserve 1, other 0, comparable market 90, stock 12, reserved 2.

Engine output:

| Field | Value |
| --- | --- |
| VAT | 11.15 (rate 19) |
| Cost basis | 52.20 |
| Recommended price | 69.81 |
| Undercut gross | 89.90 (90.00 − 0.10) |
| Net / estimated profit | 6.46 |
| Margin | 11.01% |
| Decision | `READY_FOR_REVIEW` |
| Stock | available 10, `IN_STOCK`, `liveSync: false`, `purchase: false` |
| `salesEnabled` / `livePriceWrite` / `published` | false |

`evaluateOffer()` on that recommended price with the automotive margin returns ok. A separate tamper probe `detectPriceTampering(1, 19)` returns `price_tampering`.

Return reserve is an input cost in this calculation. Estimated and the field named realized profit are both 6.46 on this unsold dry-run row. A completed return was not posted into this profit function, so this audit does not claim the realized-profit ledger was proven against a refund. The refund gate itself is in section 16.

No stock was invented: available stock is supplier stock minus reserved. The dry-run sync object sets `purchase: false`.

## 13. EU-27 VAT

Two local calculators exist. Neither was pointed at a live tax bureau.

`server/lib/commerce/taxProvider.js` `calculateTax()`:

| Country | Result |
| --- | --- |
| DE | ok, rate 19, dry-run |
| FR | ok, rate 20, dry-run |
| XX | `tax_rate_unknown`, blocked |

Configured countries in that map: DE 19, AT 20, FR 20, IT 22, ES 21, BE 21, NL 21, PL 23. That is not all 27 countries. Unknown countries block. This function was called in-process, not through HTTP.

`POST /api/tax/quote` uses `server/lib/commercialIntegrations.js`. If `TAX_PROVIDER_API_KEY` and `TAX_PROVIDER_URL` are both set it returns `provider_required` and does not call out. Otherwise it uses a shorter indicative table and **falls back to 0.19 for unknown countries**. That HTTP route was not called in this sprint. The fallback is a real gap relative to `tax_rate_unknown`.

## 14. Germany Tax Route

In-process, temp sqlite under `/tmp`, not the protected database.

| Action | Result |
| --- | --- |
| Post FR net 100 into the 26-country pool | ok, reserve 25, spendable 75, VAT 20, `paymentAuthority: false` |
| Post DE net 100 into that pool | refused, `DE_USES_PRIOR_APPROVAL_RULE` |
| Germany path `postGermanyNet` | `UNVERIFIED` |
| `submitElster()` | `ELSTER_BLOCKED` |

Germany is not in the 26-country pool. The pool has no payment authority.

## 15. Shipping and Tracking

In-process carrier contract, not a carrier API.

`getAdapter("DHL").createShipment(...)`:

- `code: HUMAN_GATE_REQUIRED`
- `liveShipment: false`
- `label: false`
- protocol `dhl-bcs-mock`

`trackShipment({ status: "transit" })`:

- `live: false`
- `status: IN_TRANSIT`
- protocol `dhl-bcs-mock`

`/api/shipping/label` and `/api/admin/logistics-fulfillment/shipments` were not called. No label was requested from DHL.

## 16. Returns and Refund Protection

`requestReturn({ orderId: "DRY-1" })` and `refundMoney()` were called in-process.

`refundMoney()` returns `REAL_REFUND_BLOCKED`. The dry return path does not issue money. No Stripe or bank request was sent. `capture("pay")` returns `SALES_LOCKED`.

## 17. 30 Locale Verification

`lib/i18n/languages.ts` builds `LANGUAGE_CODES` from `supported-locales.json`. Unit tests that assert 30 codes passed in the clean unit run (`lib/i18n/languages.test.ts`, `lib/i18n/routing.test.ts`).

Playwright `e2e/master-command-locales.spec.ts` on the isolated storefront: every catalog locale prefix returned a status below 500. That test passed. It does not prove each string is professionally translated.

Playwright Arabic landing on the phone viewport passed, including the RTL dir check in `e2e/master-command-chromium.spec.ts` and `e2e/master-command-mobile-rtl.spec.ts`.

Language and country stay independent in the existing market tests (`lib/market/languageIndependence.test.ts`), which passed in the unit run. This sprint did not add a new selector test.

Missing evidence: a key-by-key diff of all 30 catalogs against German, and a mobile language-menu click-through beyond the landing pages the Playwright files already open. The main-branch conflict means the 30 locale files are not one canonical copy (section 8.2).

## 18. Category Verification

`listActiveCatalogCategories()` returned **50** active level-1 categories.

| Input | Code |
| --- | --- |
| `cat-25` | `CATEGORY_RETIRED` |
| `cat-43` | `CATEGORY_RETIRED` |
| `cat-46` | `CATEGORY_RETIRED` |
| `automotive/brakes` | `CATEGORY_UNMAPPED` |
| `automotive/bremssystem` | `CATEGORY_MATCHED` → `cat-05` / `cat-05-03` |

Food & Drink and Jewelry & Accessories were not given a new mapping. Playwright home and category tests that assert retired slugs stay absent passed on the isolated storefront.

## 19. Security and Egress

| Control | Evidence |
| --- | --- |
| Sales lock | health and checkout attempt, section 11 |
| Egress DENY | policy default, section 3 |
| Payment egress | `PAYMENT_EGRESS_LOCKED` |
| External AI egress | `EXTERNAL_AI_EGRESS_DENIED` |
| Live supplier | scorecard `LIVE_SUPPLIER_BLOCKED`; unlisted host `HOST_NOT_ALLOWLISTED` |
| Price and coupon authority | HTTP 400, section 11 |
| IDOR on an owned cart | HTTP 403, and the Playwright IDOR test passed |
| Admin login | UI rejected the attempt, section 10.2. Not a passed auth test. |
| Sanctions / human approval | shipment `HUMAN_GATE_REQUIRED`; sales gate lists `PUSAT_RUNTIME_HEALTHY` as failed, so the runtime is not treated as healthy |

No live supplier, payment, AI, or carrier socket was opened by the probes. Admin session and security logs were written locally, as section 9 records. Tokens from any response were not printed.

## 20. Unit and Integration Tests

### 20.1 Clean run (the numbers to keep)

The shell had inherited `BUZZARD_DB_PATH=/tmp/buzzard-score-isolated.sqlite` from the score probe. The first unit run and the first part28/part29 runs are **invalid** for that reason. They are not the result.

Invalid first run, for the record only:

- Unit: 858 passed, 1 failed. Failure: `server/__tests__/part12Foundation.test.mjs` “dbPaths centralizes database path” expected the path to match `/\.db$/` and received the audit sqlite path.
- part28 and part29 “Publishing remains disabled”: `publicProducts` was 1 instead of 0, because those tests shared the audit database path.

Clean rerun with `BUZZARD_DB_PATH`, `BUZZARD_E2E_DB`, `BUZZARD_TEST_MODE`, and `BUZZARD_BACKUP_DIR` unset:

| Suite | Result | When (Europe/Berlin) |
| --- | --- | --- |
| `npm run test:unit` | **119 files, 859 passed, 0 failed** | 18:28 |
| `python3 -m unittest intelligence.security.test_egress` | **9 passed** | first quality pass, exit 0; not re-run because it does not read `BUZZARD_DB_PATH` |
| part24 | 10 passed | first pass, exit 0 |
| part27 | 18 passed | first pass, exit 0 |
| part28 | **24 passed** | clean rerun |
| part29 | **36 passed** | clean rerun |
| part30 | 22 passed | first pass, exit 0 |
| part31 | 24 passed | first pass, exit 0 |
| part32 | 15 passed | first pass, exit 0 |
| part33 | 21 passed | first pass, exit 0 |
| part34 | 26 passed | first pass, exit 0 |
| part35 | 25 passed | first pass, exit 0 |

part24 + part27–part35 on these valid runs: **221 passed, 0 failed**. That matches the earlier 221 count, and it is a new run, not a copy of the old report.

The previous audit's 859 unit passes (17 Nov, about 17:51 Europe/Berlin) are a separate run. This section is the 18:28 run.

### 20.2 What was not run

part2–part23 smoke scripts and part25/part26 were not started as their own npm scripts. part25 and part26 files did pass inside the unit vitest run. No claim is made for the smoke scripts.

## 21. Lint and Typecheck

| Command | Result |
| --- | --- |
| `npm run lint` | exit 0, “No ESLint warnings or errors” |
| `npm run typecheck` | exit 0 |

These ran in the same quality shell as the contaminated unit run. They do not read the database path. They are valid.

## 22. Production Readiness

`productionReady` was not modified. It remains `false`.

| # | Question | Answer | Evidence |
| ---: | --- | --- | --- |
| 1 | 45 completed items still hold | Yes | section 3 |
| 2 | HTTP commerce chain works | Partial | catalog, cart, tamper, coupon, readiness order yes; EAN, brand, category on the fixture are null |
| 3 | Cart price check | Yes | HTTP 400 `price_tampering` |
| 4 | Unpaid draft | Yes | attempt `commercialOrders: 0`, readiness `realMoneyMovement: false` |
| 5 | EU-27 tax flow | Partial | foundation calculator blocks unknown countries and does not cover all 27; the other calculator falls back to 19% |
| 6 | Germany tax route | Yes, in-process | `UNVERIFIED`, pool refuses DE, ELSTER blocked |
| 7 | Carrier human gate | Yes, in-process | `HUMAN_GATE_REQUIRED`, `liveShipment: false` |
| 8 | Refund gate | Yes, in-process | `REAL_REFUND_BLOCKED` |
| 9 | 30 locales | Partial | HTTP status below 500 and unit count 30; translation completeness and the main conflict are open |
| 10 | Mobile and tablet UI | Yes for the suites that ran | customer journey and overflow passed; 3 desktop-labeled overflow cases are skipped on those projects by the test |
| 11 | PR merge plan safe | The stack order is known | #500 is blocked on one file; #504 and #506 are clean only against their parents |
| 12 | Main conflicts solvable | Not solved | 43 conflicts, manual key merge, no auto-resolution |
| 13 | Egress DENY | Yes | section 3 |
| 14 | Sales lock | Yes | section 11 |
| 15 | Live integrations documented | Yes | six blocked codes, section 3 |

## 23. Remaining Blockers

1. PR #500 cannot merge into `cursor/pim-catalog-foundation-c293` until `supplierMappingService.js` is merged by hand.
2. HEAD cannot merge into `origin/main` until the 43 conflicts in section 8 are merged by hand. Locale add/add files can drop strings if one side is taken whole.
3. Admin UI login is not proven. Nine Playwright tests fail on `/admin/login/`. Admin auth still uses `server/data/admin-users.json`, so the sqlite isolation flag does not isolate it.
4. The synthetic shelf product has no EAN, brand, category, or status in the public DTO.
5. `taxProvider.js` does not list every EU-27 rate. `commercialIntegrations.calculateTaxSync` uses 19% when the country is missing.
6. Items 19, 20, 28, 30, 37, and 41 stay blocked. That is correct, and it blocks any production claim.
7. Sales gate conditions `CRITICAL_E2E_PASS`, `SECURITY_GATE_PASS`, and `PUSAT_RUNTIME_HEALTHY` are still false.
8. GitHub reports no check runs on the three PR heads.
9. Estimated profit and the realized-profit field were equal on a dry-run row that has no completed return. The return ledger was not given a posted refund to compare.

## 24. Recommended Next Actions

These are recommendations. None of them was done in this sprint.

1. Leave PR #500, #504, #506, and #502 open.
2. Resolve `supplierMappingService.js` by keeping the 50-active loader and the `CATEGORY_UNMAPPED` / `CATEGORY_RETIRED` refusals, then re-check `automotive/brakes` still returns `CATEGORY_UNMAPPED`.
3. Merge `main` only after a key-level locale merge and a category-page merge that keeps both the retirement rules and main's later homepage and hub work. Do not use a recursive auto-merge strategy.
4. Give the admin auth store the same temp-directory switch the sqlite catalog already has, then rerun the nine admin Playwright tests without changing their expected URL.
5. Fill EAN, brand, and category on the e2e fixture only if the product is allowed to be visible with those fields, and rerun `GET /api/catalog/products/:id`. Do not publish it.
6. Make the unknown-country path of `calculateTaxSync` return `tax_rate_unknown` instead of 19%, or stop using that function for EU quotes. That is a behavior fix, so it needs its own review. It was not changed here.
7. Keep sales locked, egress deny, and the six live items blocked until a human opens them.

## Sprint-end safety

| Control | End state |
| --- | --- |
| SALES | LOCKED (`salesEnabled: false` on the isolated health check) |
| EGRESS | DENY |
| `productionReady` | false |
| `live` | false |
| PR #500, #504, #506 | left open; not merged |
| PR #502 / FIN-M25 | not touched |
| `/workspace/server/data/buzzard.db` | size 1761280, mtime 17:52:20 Europe/Berlin, unchanged this sprint |
| `memory/pusat/` | still absent |
| Branch | still `cursor/dev-list-51-remainder-c293` at `fdc3132c` |
| Commit / push / deploy | none |

Side effect that is not the protected sqlite file: admin session, audit, security, and automation logs under `server/data/` gained entries at 18:28–18:29 Europe/Berlin because admin login does not honor `BUZZARD_DB_PATH`. See section 9.
