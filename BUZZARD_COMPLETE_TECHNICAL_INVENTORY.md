# BUZZARD — Complete Technical Inventory

**Version:** 1.0  
**Mode:** Full repository inventory + independent verification  
**Date:** 2026-11-19, 15:52 Europe/Berlin  
**Branch / HEAD:** `cursor/master-phases-6-21-c293` @ `3df03351`  
**Invariants:** SALES=LOCKED · EGRESS=DENY · productionReady=false · live=false  

**No source, test, or config files were modified for this inventory.** Only these report files were created.

---

## 1. Historical baseline

| # | Item | Evidence |
|---|------|----------|
| 1 | Earliest available commit | `d4f8ddc2661b3d6f51173825df25f9ab9ffa77eb` — 2026-07-25 17:11 +0200 — *Initial commit: Buzzard static site and GitHub Pages workflow* |
| 2 | Current HEAD (committed) | `3df03351626a9147374b0dd3b1fe622d875a1094` — 2026-11-19 06:47 UTC |
| 3 | Active branch | `cursor/master-phases-6-21-c293` |
| 4 | Total commits reachable from HEAD | **745** |
| 5 | Branch refs (local + remote) | **402** |
| 6 | Open PRs (sample) | [#507](https://github.com/Buzzard-de/Buzzard/pull/507) security sprint · [#508](https://github.com/Buzzard-de/Buzzard/pull/508) phases 6–21 |
| 7 | PR #507 | **Open**, head `cursor/security-admin-final-checkpoint-c293` @ `b2479b6b`, base `cursor/pim-catalog-foundation-c293`, mergeable_state **dirty**, 120 commits |
| 8 | PR #508 | **Open**, head `cursor/master-phases-6-21-c293` @ `3df03351`, base `cursor/pim-catalog-foundation-c293`, mergeable_state **dirty**, 121 commits |
| 9 | Uncommitted changes | **196** tracked paths modified |
| 10 | Untracked files | **110** |
| 11 | Development plans | `BUZZARD_MASTER_DEVELOPMENT_PLAN.md`, `data/master/buzzard_ordered_phases.v1.json`, `data/master/buzzard_incomplete_checklist.v1.json` |
| 12 | Completion reports | `BUZZARD_MASTER_SOFTWARE_COMPLETION_FINAL_REPORT.md`, `BUZZARD_COMPLETE_AUTOMATION_FINAL_REPORT.md`, sprint/security reports |
| 13 | Independent audits | `BUZZARD_21_PHASE_INDEPENDENT_DEEP_AUDIT.md`, `BUZZARD_FINAL_COMPLETION_SCORECARD.md`, PR507 audits, false-completion report |

**Limitation:** Git history before July 2026 is not present in this repository; pre-GitHub-Pages work is unverifiable.

---

## 2. File inventory summary

See **BUZZARD_SOURCE_CODE_STATISTICS.md** for line-level detail.

| Bucket | Files |
|--------|------:|
| Total (excl. node_modules, .git, build caches) | 4,480 |
| Backend | 779 |
| Frontend | 499 |
| Tests | 201 |
| Scripts | 83 |
| Data on disk | 140 |
| Documentation | 846 |

**Excluded separately:** `node_modules` (2 tree roots skipped), `.next`, `artifacts`, `coverage`.

**Duplicates / legacy patterns observed (evidence-based):**

- **Dual order stacks:** `server/plugins/ordersPlugin.js`, `orderManagementPlugin.js`, `orderManagementV32Plugin.js`, `lib/commerce/orderService.js`, `orderManagementOrchestrator.js`
- **Dual product stacks:** `productStore.js`, `pimCorePlugin.js`, `productCatalogPimPlugin.js`, `pimCatalogPlugin.js`
- **Carrier master proliferation:** `carrierMaster.js` … `carrierMasterV11.js`, `eu27Seed.js` … `eu27SeedV11.js`
- **Production-health plugin series:** `part28ProductionHealth.js` … `part35ProductionHealth.js`, `final*ReadinessPlugin.js`
- **Taxonomy mirrors:** same JSON/HTML under `data/taxonomy/` and `public/taxonomy/`
- **Parallel AI monorepo:** `intelligence/buzzard_ai_complete/`, `buzzard_ai_gesamt/` (hundreds of `.gitkeep` placeholders)

---

## 3. Architecture inventory (verified wiring)

### Entry points

| Layer | Entry | Registered in |
|-------|--------|---------------|
| Node API | `server/server.js` | Loads **92** `server/plugins/*` `register(app)` |
| Next storefront | `app/` App Router | Consumes `/api/*` bridge + static catalog |
| Phase measurement | `server/plugins/ecosystemPlugin.js` | `/api/health/ecosystem` → `phaseGates`, `engineRegistry` |
| Jobs | `server/lib/jobScheduler.js`, `jobWorker.js`, `jobQueue.js` | `automationPlugin.js` |
| Completion bus | `server/lib/platform/completionBus.js` | Synthetic journey + health snapshots |

### Commerce engines (explicit registry)

`server/lib/commerce/engineRegistry.js` — **11 engines**, all `live: false`, `salesEnabled: false` in snapshot.

### Major subsystems — runtime status

| Subsystem | Implementation | Integrated | Test evidence |
|-----------|----------------|------------|---------------|
| Catalog read | `catalogReadService.js`, `storefrontBridgePlugin.js` | Storefront + API | phase2, activeCatalog tests |
| Checkout / orders | `ordersPlugin.js`, `cartCheckoutPlugin.js` | Partial — dry-rehearsal wired in **worktree** | `orderDryRehearsalIntegration.test.mjs` |
| Supplier dry | `dryRunSupplierAdapter.js`, `supplierOrderOrchestrator.js` | Dry forward only | phase4, supplier tests |
| Pricing | `pricingAutomationService.js`, `pricingPolicy.js` | PIM + quote path | phase5 |
| JSON SoT | `jsonFileStore.js` | Admin + many plugins | `jsonStoreIntegrity.test.mjs` |
| SQLite catalog | `server/lib/db.js`, `buzzard.db` | Optional via `BUZZARD_DB_PATH` | db health tests |
| Marketplace | `marketplaceConnectorRegistry.js` | Sandbox adapters | `marketplaceConnectorRegistry.test.mjs` |
| Pusat / native AI | `buzzardNative/*`, `identityRegistry.js` | HTTP status + council metadata | `aiOrchestrator.test.mjs`, native phase tests |

---

## 4. State separation (security audit scope)

| State | JWT / auth | Route matrix | Order orchestrator HTTP |
|-------|------------|--------------|-------------------------|
| **Committed HEAD** | `jwtSecret.js` has **no static fallback** (random if unset) | Present in tree | **No** `dry-rehearsal` on HEAD-only checkout (added in worktree) |
| **Current worktree** | Same `jwtSecret.js` + session/revocation patches in `dbAuth.js` | `routePermissions.js` 379 lines | `POST /api/orders/dry-rehearsal` present |
| **Live API :3000/3001** | **NOT_VERIFIED** (no restart / inspection authorized) | **NOT_VERIFIED** on live process | **NOT_VERIFIED** |
| **Isolated vitest API** | Verified via `adminRouteMatrix.test.mjs` | 124 tests in matrix file | Verified in worktree |

---

## 5. Protected data integrity

| File | SHA-256 (audit start = end) |
|------|-----------------------------|
| `/workspace/server/data/buzzard.db` | `f5617f673535c496f6bf39ad2b44e534f8f3d32f60139c58b6c012c92beef9b0` |
| `server/data/*.json` (6 files) | Unchanged vs session baseline artifact |

`/tmp/buzzard-eu27/server/data/buzzard.db` — **not present** on this VM.

**Note:** Earlier session baseline used hash `2362543e…` for `buzzard.db` (drift before this inventory). Current audit did not further modify the protected DB (vitest used `BUZZARD_DB_PATH=/tmp/buzzard-inventory-audit.db` copy).

---

## 6. Cross-references

| Report | Purpose |
|--------|---------|
| `BUZZARD_SOURCE_CODE_STATISTICS.md` | Lines, files, languages |
| `BUZZARD_21_PHASE_REAL_COMPLETION_AUDIT.md` | Phase truth table |
| `BUZZARD_AI_AUTOMATION_INVENTORY.md` | Agents & automation |
| `BUZZARD_SECURITY_AND_DATA_INTEGRITY_AUDIT.md` | Auth, routes, data |
| `BUZZARD_INTEGRATION_READINESS_MATRIX.md` | External systems |
| `BUZZARD_TECHNICAL_DEBT_MASTER_LIST.md` | P0–P3 debt |
| `BUZZARD_FINAL_BASELINE_SCORECARD.md` | Completion % |

---

## 7. What works (evidence, isolated)

- Full `server/__tests__` suite: **1949 PASS / 0 FAIL / 1 SKIP** (2026-11-19 run, tmp DB path, SALES=0).
- Admin route permission matrix tests **PASS**.
- JSON store atomic write tests **PASS**.
- Phase gate self-tests **PASS** (internal rubric — not proof of production completeness).
- Dry commerce pipelines (order, supplier, payment, tax) **PASS** in sandbox.

## 8. What does not / not verified

- **Live** supplier, payment capture, marketplace publish, carrier rates, TecDoc live.
- **Unified** product and order source of truth across all code paths.
- **Live** API security parity with worktree (ports not restarted).
- **Textile** live vision / try-on.
- **Production readiness** (explicitly false).

**Baseline establishment complete.** Awaiting operator approval before implementation resumes.