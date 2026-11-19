# BUZZARD — Independent forensic reconciliation

**Date:** 2026-11-19, ~17:40 Europe/Berlin  
**Mode:** Read-only. No source, test, config, database, port, commit, push, merge, or deploy changes.  
**HEAD inspected:** `3df03351626a9147374b0dd3b1fe622d875a1094` on `cursor/master-phases-6-21-c293`  
**Working tree:** 90 modified paths, 116 untracked paths (including this report’s predecessors).  
**Protected DB SHA-256 (unchanged this pass):** `f5617f673535c496f6bf39ad2b44e534f8f3d32f60139c58b6c012c92beef9b0`  
**Invariants observed in ledger JSON, not re-tested live:** `SALES=LOCKED`, `EGRESS=DENY`, `productionReady=false`, `live=false`.

This audit does **not** adopt phase-gate percentages as completion. A gate that returns `softwareCompleteClaim: true` only proves its own predicates.

---

## 1. PR #501, #507, #508

Evidence: GitHub pull API (2026-11-19) and local `git rev-list` / `git diff --name-only`.

| | PR #501 | PR #507 | PR #508 |
|--|---------|---------|---------|
| State | open, `merged: false`, `mergeable: true`, `mergeable_state: clean` | open, `merged: false`, `mergeable_state: dirty` | open, `merged: false`, `mergeable_state: dirty` |
| Base | `cursor/buzzard-release-candidate-4be7` @ `abb3eb70` | `cursor/pim-catalog-foundation-c293` | same as #507 |
| Head | `cursor/buzzard-eu27-fiat-engine-4be7` @ `fde52582` | `cursor/security-admin-final-checkpoint-c293` @ `b2479b6b` | `cursor/master-phases-6-21-c293` @ `3df03351` (this HEAD) |
| Commits on PR | 14 | 120 | 121 |
| GitHub changed files / +lines | 567 / +85,460 | 1,280 / +967,378 | 1,303 / +968,627 |
| Agent footer | `bc-5a736bb9…` (API model `grok-4.7`) | `bc-a02d07fa…` (API model `composer-2.5-fast`) | same Composer id |

**Lineage (local git):**

- Every commit reachable from #507 is reachable from #508. Unique commits on #508 not in #507: **1** (`3df03351`, phase gates 6–21).
- #507 is the parent of HEAD. The two PRs are **not** independent stacks. They are the same history plus one commit, both still open against a base that GitHub reports as **dirty** (earlier compare: each is **behind the base by 1**).
- #501 is **not** an ancestor of HEAD and HEAD is **not** an ancestor of #501 (`git merge-base --is-ancestor` exit 1 both ways).
- Filename overlap between the #501 diff (vs its RC base) and the #508 diff (vs `pim-catalog-foundation`): **162 paths**. Merging both lines without a rebase will collide on those names.
- Filename overlap of #507 and #508 diffs vs the same PIM base: **1,280**. That number is the #507 diff itself, because #508 contains it.

**What is only local (this worktree, not in HEAD `3df03351`):**

- `server/lib/jwtSecret.js` is **untracked**.
- `server/lib/dbAuth.js`, `server/lib/identitySecurity.js`, `server/lib/auth.js`, `server/lib/routePermissions.js`, `server/plugins/ordersPlugin.js`, `server/lib/platform/phase6OrderManagement.js` are **modified and uncommitted**.
- A large set of `server/__tests__/*Security*` and `*Session*` files is **untracked**. Those tests do not exist on HEAD.

**What is on a branch but not merged:** all three PRs. None is merged to `main` or to its base.

---

## 2. Consolidated findings

Severity: **P0** blocks a truthful production or single-SoT claim. **P1** breaks a real flow or hides a false completion. **P2** duplication or weak evidence. **P3** documentation drift.

### F-01 — Static JWT secret is what Git records

| | |
|--|--|
| Path | `server/lib/identitySecurity.js`, `server/lib/dbAuth.js` at **HEAD** |
| Module | JWT sign/verify |
| Evidence | `git show HEAD:server/lib/identitySecurity.js` line 6 and `dbAuth.js` line 5: `process.env.JWT_SECRET \|\| process.env.AUTH_SECRET \|\| "DEV_ONLY_CHANGE_ME"`. `git grep jwtSecret HEAD` returns **no** hits. |
| Status | **PRESENT ON HEAD.** Worktree replaces this via untracked `server/lib/jwtSecret.js` (`crypto.randomBytes(48)` when unset) required by the **modified** `dbAuth.js` and `identitySecurity.js`. |
| Severity | **P0** if a deploy uses the git commit. **Not committed**, so a clean checkout of #508 still ships the static fallback. |
| Correction | Commit the random-secret module and the callers together, delete the string fallback, and prove production startup refuses an unset secret. |
| Depends on | Process restart of whatever loads these modules. Do not restart :3000/:3001 as part of this audit. |

### F-02 — Admin session, RBAC, and route matrix exist only as uncommitted work

| | |
|--|--|
| Path | Modified: `server/lib/auth.js` (+736/− in diff stat), `server/lib/routePermissions.js`, `server/plugins/adminAuthPlugin.js`, `server/plugins/securityPlugin.js`, `server/lib/security.js`, `server/lib/securityLog.js`, `server/lib/globalAuthMiddleware.js`. Untracked tests: `server/__tests__/adminRouteMatrix.test.mjs`, `adminSessionSecurity.test.mjs`, `adminAuthorizationHardening.test.mjs`, `jwtSecretHardening.test.mjs`, and the other untracked `*Session*` / `*Security*` tests. |
| Module | Admin login, session store, route allow-list |
| Evidence | `git diff --stat HEAD` on the auth files; `git status` shows those tests as `??`. |
| Status | **NOT ON HEAD.** Any “188 EXACT routes / 124 tests” claim describes the **worktree**, not commit `3df03351`. |
| Severity | **P0** for “security sprint landed”. |
| Correction | Review the diff, commit tests with the implementation, re-run vitest on a **copy** of the database. |
| Depends on | F-01 (same auth commit). Isolated DB path so `server/data/buzzard.db` is not the test target. |

### F-03 — Order HTTP dry-rehearsal is uncommitted; the committed phase-6 gate does not require it

| | |
|--|--|
| Path | Worktree `server/plugins/ordersPlugin.js` `register` → `POST /api/orders/dry-rehearsal`. Worktree `server/lib/platform/phase6OrderManagement.js` `ordersPluginHasDryRehearsalRoute`. Orchestrator `server/lib/commerce/orderManagementOrchestrator.js` (`rehearseOrderFromCheckout`). |
| Evidence | `git grep dry-rehearsal HEAD -- server/plugins/ordersPlugin.js` is empty. Worktree line 247 defines the route. HEAD `phase6OrderManagement.js` has **no** `ORD_HTTP_DRY_REHEARSAL` check (`git show HEAD` + search). The worktree file adds a source-text scan for the string `"/api/orders/dry-rehearsal"`. |
| Status | Route and the gate check that looks for it are **working-tree only**. Committed phase 6 can still report software-complete **without** an HTTP rehearsal route. |
| Severity | **P1** |
| Correction | Commit route, orchestrator, and a test that calls the route. Do not treat a `src.includes` check as integration proof. |
| Depends on | Sales gate staying locked (`evaluateSalesGate` in the new handler returns 403 if `sales.allowed`). |

### F-04 — Three order implementations, one checkout

| | |
|--|--|
| Path | `server/plugins/ordersPlugin.js` `POST /api/orders` (calls `createOrderFromCartWithPayment` in `server/lib/dbOrders.js` when DB is on and the body is not a guest line array). `server/lib/commerce/orderService.js` `createOrderFromCheckout`. `server/lib/commerce/orderManagementOrchestrator.js` dry pipeline. Also `server/lib/commerce/dryOrderDraft.js`, `server/lib/commerce/isolatedOrder.js`. |
| Evidence | Direct reads and exports. `POST /api/orders` is still the sales-gated HTTP entry (`requireSalesEnabled`). The orchestrator is not that handler on HEAD. |
| Status | **Duplicated.** Dry modules are not the storefront order path. |
| Severity | **P0** architecture (split source of truth). |
| Correction | One order writer. Dry/isolated modules stay behind an explicit rehearsal flag and must not be described as the order system. |
| Depends on | Sales lock, supplier submit lock, payment capture lock. |

### F-05 — Phase gates score their own predicates, then set a software-complete flag

| | |
|--|--|
| Path | `server/lib/platform/phaseGateFinalize.js` `finalizePhase`. Callers `phase7PaymentFinance.js` through `phase21E2eAutomation.js`. `phase4SupplierAutomation.js` and `phase6OrderManagement.js` duplicate the pattern without `finalizePhase`. |
| Evidence | `softwareCompleteClaim: passed === total` after **removing** ids listed as blocked. `completeClaim` in `finalizePhase` is true only when blocked list is empty; phase 4 and phase 6 set `completeClaim: passed === total` on the **filtered** software list, so `completeClaim` is true while `ORD_LIVE_SUBMIT` / `SUP_LIVE_API` are hard-coded `ok: false`. |
| Status | **By design of the gate, not evidence of a finished phase.** Ledger `data/master/buzzard_ordered_phases.v1.json` version **1.4.0** (worktree) marks all 21 phases `SOFTWARE_PARTIAL` and sets `honestLedger.completeClaim: false`. That ledger is **modified**, not what an older “v1.3.0 COMPLETE 100%” PR body (#508) described. |
| Severity | **P1** (false completion if a reader trusts PR #508 text or `percentComplete`). |
| Correction | Stop publishing `percentComplete` from these functions as a project KPI. Keep `ok: false` external checks visible in the headline status. |
| Depends on | Human definition of “done” that includes live providers, not file-local predicates. |

### F-06 — Predicates that cannot fail, or pass on a non-null object

| | |
|--|--|
| Path / function | `evaluatePhase21E2eAutomation` in `server/lib/platform/phase21E2eAutomation.js` |
| Evidence | `E2E_ORDER_AUTO` is `ok: auto === true \|\| typeof auto === "boolean"`. `isEnabled()` in `server/lib/orderAutomation.js` returns a boolean, so this check is **always true**. |
| Status | **Tautology.** |
| Severity | **P1** |
| Path | `evaluatePhase10Marketplace` |
| Evidence | `MKT_REGISTRY`: `Array.isArray(snap.connectors) \|\| …` — an empty array is an array. `MKT_VALIDATION`: `pre.validation != null` — presence, not success. |
| Path | `evaluatePhase11PimSot` |
| Evidence | `PIM_SOT_PUBLISH_GATE`: `pub.validation != null \|\| pub.ok === true`. `PIM_SOT_PHASE3`: `p3.percentComplete === 100`, which chains to phase 3’s own self-score. |
| Path | `evaluatePhase4SupplierAutomation` check `SUP_SELECTION` |
| Evidence | `picked.ok && picked.fallback?.supplierId === "xml-supplier-dry" \|\| picked.lines[0]?.fallback`. Operator precedence: if `lines[0].fallback` is truthy, `picked.ok` is not required. |
| Path | `evaluatePhase20Performance` |
| Evidence | Sorts **2,000 in-memory objects** and requires `ms < 500`. No HTTP, no database, no index. `PERF_NO_LIVE_INDEX` expects `sorted.liveIndex === false`. |
| Severity | **P1** for any document that cites these gates as functional proof. |
| Correction | Assert outcomes (denied publish, selected supplier id, failed automation when the flag is off). Delete boolean-typeof ORs. |
| Depends on | Real catalog and order fixtures, not `DRY-SKU-001` only. |

### F-07 — Payment, tax, marketplace, and supplier “engines” are sandboxes

| | |
|--|--|
| Path | `server/lib/platform/phase7PaymentFinance.js` uses `paymentSandbox.capture`, `dryReturnRequest.refundMoney`, `taxConnect.assess`. Phase 4 uses `ApiSupplierAdapter` with `networkBlocked === true` and `submit.code === "ORDERS_DISABLED"`. Phase 10 requires `pre.publishAllowed === false`. |
| Evidence | Checks **require** capture/refund/live import to fail. That is a lock test, not a completed payment or supplier integration. |
| Status | **Sandbox / dry-run. Not live.** PR #501 text says the same for fiat shells and `LIVE_ACTION_CLOSED`. |
| Severity | **P1** if called “integrated”; **expected** under current locks. |
| Correction | Name them sandbox in APIs and admin UI. Do not map a passing gate to “phase complete”. |
| Depends on | External accounts (payment, TecDoc, carrier, tax filing). Not started in #501 (body: payment-provider account “was not started”). |

### F-08 — PR #501 is a preserved side branch, not the line this HEAD is on

| | |
|--|--|
| Path | Branch `cursor/buzzard-eu27-fiat-engine-4be7` @ `fde52582` |
| Evidence | Not an ancestor of `3df03351`. 567 files vs RC base. 162 names also appear in the #508 diff. PR body lists `LEGACY_PUSAT_DURABLE_WRITE_BLOCKED`, `LEGACY_JOB_MUTATION_BLOCKED`, FIN-M25 **BLOCKED**, and a preservation commit that **did not rerun tests**. |
| Status | **Open, unmerged, divergent.** Grok 4.7 is the only model the cloud API attached to this branch’s agent id. |
| Severity | **P1** (lost or double-applied work if someone merges #508 and #501 independently). |
| Correction | Diff the 162 overlapping paths before any merge. Treat #501 as a quarantine branch until a human picks the SoT. |
| Depends on | Release-candidate `abb3eb70` staying unmodified, as the PR body claims. Not re-verified byte-for-byte in this pass beyond the recorded base SHA. |

### F-09 — Product data has more than one writer

| | |
|--|--|
| Path | `server/lib/p1CatalogPlatform.js`, `server/plugins/p1CatalogPlatformPlugin.js`, `server/plugins/adminCatalogPlugin.js`, PIM helpers under `server/lib/pim/` used by phase 3 / 11 gates. |
| Evidence | Multiple modules reference product store / catalog platform. Phase 11’s “SoT” check re-scores phase 3 and a synthetic publish gate (F-06). |
| Status | **No single product SoT demonstrated.** |
| Severity | **P0** |
| Correction | One catalog write API. Phase 11 must read that API, not another phase’s percent. |
| Depends on | Import pipeline and storefront read path using the same id space. |

### F-10 — Python `intelligence/` is not the Node request path

| | |
|--|--|
| Path | `server/plugins/intelligenceProductionBridgePlugin.js`, `server/lib/security/archiveIsolation.js` (only `server/**/*.js` hits for `intelligence/`). |
| Evidence | `rg -l intelligence/ server --glob '*.js'` returns those two files. |
| Status | Archive is **not** on the main Express plugin path except a bridge/isolation mention. |
| Severity | **P2** (dead weight and false “AI stack” scope). |
| Correction | Either wire a single bridge with tests or keep the tree out of production images. |
| Depends on | Egress deny. Do not enable network from that tree to “complete” it. |

### F-11 — Order automation check opens SQLite as a side effect of a boolean

| | |
|--|--|
| Path | `server/lib/orderAutomation.js` `isEnabled` is safe, but the module **top-level** `const { db } = require("./db")`. Phase 21 calls `isEnabled()` and therefore loads `db`. |
| Evidence | Lines 1–5 of `orderAutomation.js`. |
| Status | A phase-21 evaluation can **open the commerce database**. This audit did **not** invoke it. |
| Severity | **P2** (test/audit foot-gun; related to prior hash drift of `buzzard.db`). |
| Correction | Lazy-load `db` inside write functions. Point tests at `BUZZARD_DB_PATH` on a temp file. |
| Depends on | F-02 test suite. |

### F-12 — Dry-rehearsal catalog bypass (worktree only)

| | |
|--|--|
| Path | `ordersPlugin.js` `rehearsalCatalogBypass === true` builds a quote from client `unitPrice` (default 40) and does not call `validatePayload`. |
| Evidence | Lines 255–278 of the worktree file. |
| Status | **Uncommitted.** Sales must be locked or the handler returns 403 before this branch. Still a client-controlled price path inside a rehearsal. |
| Severity | **P2** while sales are locked; **P0** if `sales.allowed` is ever true (handler then rejects the whole route with `SALES_MUST_STAY_LOCKED`, so the bypass cannot run when sales open — the route is rehearsal-only). |
| Correction | Remove client prices. Fixture SKUs only, server-side. |
| Depends on | F-03. |

### F-13 — Contradictory documents in the same worktree

| | |
|--|--|
| Path | Untracked: `BUZZARD_FINAL_BASELINE_SCORECARD.md`, `BUZZARD_21_PHASE_REAL_COMPLETION_AUDIT.md`, `BUZZARD_EIGHT_REPORTS_INDEPENDENT_HANDOVER.md`, `BUZZARD_COMPLETE_AI_AGENT_HISTORY_REPORT.md`, and the other `BUZZARD_*.md` files listed by `git status`. Modified: `data/master/buzzard_ordered_phases.v1.json` (`honestLedger.softwareCompletionPercent: 59.8`, `vitestServer.passed: 1949`). PR #508 body (GitHub): ledger **v1.3.0** marks stages 6–21 **COMPLETE (100% software)**. |
| Evidence | PR body vs current JSON version 1.4.0 and status `SOFTWARE_PARTIAL` × 21. The 59.8 and 1949 figures are **written in an uncommitted JSON file**. This pass did **not** re-run vitest. |
| Status | **PR text is stale. Scorecard numbers are unverified in this pass.** |
| Severity | **P1** for decision-making. |
| Correction | One ledger. Quote only a command log attached to a commit. |
| Depends on | None. |

### F-14 — Plugin surface is larger than the exercised flows

| | |
|--|--|
| Path | `server/plugins/*.js` — **89** files (`ls`). |
| Evidence | Count only. No claim that each file is dead. Phase plugins that only answer `/api/health/ecosystem` (`ecosystemPlugin.js` wires `evaluatePhase6`…`evaluatePhase21`) do not execute checkout, payment, or shipment. |
| Status | Health aggregation **is connected**. Commerce side effects are **not** implied. |
| Severity | **P2** |
| Correction | Map each plugin to one route that a storefront or admin page calls. Quarantine unused registrars. |
| Depends on | Route table after F-02 is committed. |

### F-15 — Database file does not match the earlier session baseline

| | |
|--|--|
| Path | `server/data/buzzard.db` |
| Evidence | SHA-256 `f5617f67…f9b0` now. Prior inventory recorded a different baseline (`2362543e…`) and attributed drift to an earlier test run. This pass only hashed; it did not open the file. |
| Status | **Drifted vs the cited baseline. Cause not re-proven here.** |
| Severity | **P0** for data integrity until a human accepts or restores a backup. |
| Correction | Restore from a known backup or record a new signed baseline. Never point vitest at this path. |
| Depends on | F-11. |

---

## 3. Phase 1–21 versus working functionality

Method: read the evaluator each phase uses. No phase was marked complete.

| Phase | Evaluator | What a pass actually shows | Working storefront/admin flow? |
|------:|-----------|----------------------------|--------------------------------|
| 1–5 | `phase1`…`phase5` self-score `completeClaim` when their checks pass | Local integrity / category / PIM / supplier dry / pricing checks | **Not established** by the gate |
| 6 | `evaluatePhase6OrderManagement` | In-memory `runDryOrderPipeline` on `DRY-SKU-001`. HTTP route **absent on HEAD** | **No** — `POST /api/orders` is a different function and sales-locked |
| 7 | `evaluatePhase7PaymentFinance` | Sandbox auth; capture and money refund **must fail** | **No live payment** |
| 8–9 | logistics / textile gates | Same finalize pattern; textile assess expects `liveVerified === false` | **No live carrier / try-on** |
| 10 | marketplace | Publish **must** be false | **No listing** |
| 11 | PIM SoT | Phase 3 percent equals 100 plus synthetic origin/i18n | **Does not prove one product database** |
| 12–16 | support, Pusat, AI, storefront, tax | Predicate bundles; tax live filing is a blocked id | **Partial code, not operations** |
| 17 | `evaluatePhase17Security` | Readiness object `diagnosticOnly === true`, payment safety gate status, egress objects **exist**. `SEC_LIVE_RESTART` forced false | **Does not prove** F-01/F-02 are deployed |
| 18–19 | marketing, admin reporting | finalizePhase checks | **Not re-executed** |
| 20 | performance | 2,000-row in-memory sort under 500 ms | **Not a load test** |
| 21 | e2e | Synthetic journey, sales locked, payment not captured, **tautological** automation flag | **Not a production rehearsal** (`E2E_PRODUCTION_RUN` forced false) |

**None of the 21 phases is technically complete** under a definition that includes a real user order, a real charge, a real supplier submit, or a merged security fix.

---

## 4. What previous agents changed (only where git or GitHub shows it)

| Agent id (API) | Model | Proven effect |
|----------------|-------|----------------|
| `bc-a02d07fa-e72e-400c-892f-ce9921a3c293` | `composer-2.5-fast` | PR #507 and #508 footers. HEAD is that line. Uncommitted auth, JWT, order rehearsal, and the markdown pile are in **this** worktree. Model attribution for each uncommitted file is **not** in git. |
| `bc-5a736bb9-872f-4c79-8e70-884740494be7` | `grok-4.7` | PR #501 footer and branch `cursor/buzzard-eu27-fiat-engine-4be7`. **Not merged. Not in HEAD ancestry.** |
| 114 other Buzzard cloud runs | `originalModelName: null` | Titles only. **No file list.** Do not assign Claude or Grok 4.6. |

Claude and Grok 4.6: **no commit metadata and no API model field** in the accessible agent list. Status **UNKNOWN**.

---

## 5. Required order of correction (no work started)

1. Freeze a DB baseline (F-15) and point every test at a temp file (F-11).  
2. Land JWT + session + route matrix + their tests as **one** reviewable commit (F-01, F-02). Do not apply it by restarting the watched API in this audit.  
3. Choose the order writer (F-04) and commit or delete the dry-rehearsal route (F-03, F-12).  
4. Rebase or explicitly drop #501 after a file-level diff of the 162 overlapping paths (F-08).  
5. Replace phase-gate KPIs (F-05, F-06, F-07, F-13).  
6. Collapse product writes (F-09) before any further importer work.  
7. Decide the fate of `intelligence/` and unused plugins (F-10, F-14).

---

## 6. What this pass did not do

- Did not run vitest (would risk opening `buzzard.db`). The figure 1949 is **unverified** here.  
- Did not merge, commit, or edit application source.  
- Did not read all 89 plugins line by line. Findings name the files that were opened or searched.  
- Did not diff all 162 overlapping #501/#508 paths. The count is from `comm` on `git diff --name-only`.  
- Did not inspect a live process on ports 3000 or 3001 (no listeners reported in this environment).

---

## 7. Safety

SALES, EGRESS, `productionReady`, and `live` were not modified. Ports were not restarted. The database file was hashed only.
