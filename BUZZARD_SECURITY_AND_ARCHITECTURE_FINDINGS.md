# BUZZARD — Security & Architecture Findings

## Architecture

### Parallel stacks (conflicting SoT risk)

| Domain | Implementations | Risk |
|--------|-------------------|------|
| Product | `productCore`, `productStore`, `productCatalogPim`, `catalogSeo` | Inconsistent catalog truth |
| Order | `ordersPlugin` (JSON), `orderService`, `orderManagement`, `orderManagementV32`, `orderManagementOrchestrator` | Status drift |
| Payment | `paymentService`, `paymentsFinance`, `paymentConnectorRegistry`, legacy checkout | Divergent capture paths |
| Tax | `commerce/taxConnect.js`, `compliance/taxConnect.js`, `taxProvider` | Duplicate entry points |
| Marketplace | `marketplaceHub`, `marketplaceV35`, connector registry | Duplicate listing flows |
| Shipping | `shippingEngine`, `shippingProvider`, `logisticsFulfillment`, v5 adapters | Quote vs fulfillment mismatch |

**Engine registry:** `server/lib/commerce/engineRegistry.js` — 11 logical engines; Tax, Security, Reporting, AI not first-class rows.

**Plugin surface:** `server/server.js` auto-loads `server/plugins/*.js` — **70+ plugin files**, many versioned (`*V32*`, `*V35*`, `partNN*`), increasing overlap risk.

### Disconnected module (verified)

- `orderManagementOrchestrator.js` — **no** consumer in `ordersPlugin.js`, `commerceCorePlugin`, or `orderService` (grep: only `phase6OrderManagement.js`).

### Supplier rule: no stock purchase before customer order

- Dry path sets `warehousePurchase: false`, `speculativeBuy: false` in journey/orchestrator samples.
- **Live enforcement** across all supplier adapters **not verified** in this audit.

---

## Security

### Committed code (PR #508 head) — **FAIL / HIGH**

| Finding | Severity | Evidence |
|---------|----------|----------|
| JWT fallback secret | HIGH | `git show HEAD:server/lib/dbAuth.js` — `process.env.JWT_SECRET \|\| ... \|\| "DEV_ONLY_CHANGE_ME"` |
| Hardening not on #508 | HIGH | PR #507 security work on **different branch**; 181 uncommitted local changes include improved `dbAuth.js` but **not deployed, not in #508 commit** |
| Phase 17 gate overstates | MED | `phase17Security.js` checks `evaluateSecurityReadiness()` PASS — does **not** prove runtime JWT on production |

### Worktree (uncommitted) — **NOT VERIFIED live**

Uncommitted `server/lib/dbAuth.js` adds:

- `require("./jwtSecret")`
- `revoked-admin-tokens.json`
- `credentialVersion` / admin `jti`

**Cannot classify as VERIFIED_COMPLETE** until merged, tested on running API, and restart window executed (explicitly out of scope).

### Test / policy evidence (passing in isolation)

| Area | Evidence |
|------|----------|
| Sales/payment/supplier blocks | `part21SecurityObservabilityReadiness.test.mjs` (18 tests pass) |
| Webhook weak secrets rejected | `webhookSecurity.test.mjs`, `jwtSecretHardening.test.mjs` |
| Production startup guards | `productionStartup.test.mjs` references weak placeholder detection |

### Failing security-related tests (worktree)

| Test file | Failure |
|-----------|---------|
| `server/__tests__/adminRouteMatrix.test.mjs` | Write route classification incomplete |
| `server/__tests__/jsonStoreIntegrity.test.mjs` | Migration tool / disk path (6 cases) |
| `server/__tests__/special16Phase4.test.mjs` | Textile/holiday `completeClaim` expectations |

### PR #508 vs #507 integration

| Check | Result |
|-------|--------|
| Same base | Both target `cursor/pim-catalog-foundation-c293` |
| Mergeable together | **dirty** / not cleanly mergeable per GitHub API |
| Security patch on #508 HEAD | **No** — JWT weak at `HEAD` |
| Claim “security integrated via #508” | **False** for committed tree |

### Live vs isolated

| State | JWT hardening | Route matrix | JSON migration |
|-------|---------------|--------------|----------------|
| **Isolated worktree (uncommitted)** | Partial code present | Test fails | Tests fail |
| **PR #508 committed** | Weak fallback | Unknown vs tests | Not evidenced |
| **Live :3001** | **NOT_VERIFIED** (no restart/probe) | **NOT_VERIFIED** | **NOT_VERIFIED** |

---

## Data integrity

- Phase 1 gate: JSON files vs `artifacts/.../baseline-hashes.json`; `buzzard.db` drift allowed separately (`phase1CoreIntegrity.js`).
- Full suite: **1937 pass / 9 fail / 1 skip** — failures concentrated in migration/matrix/textile tests (run 2026-11-19 UTC).

---

## Recommendations (audit-only; no implementation)

1. Merge or reconcile PR #507 and #508 before claiming security phase complete.
2. Wire `orderManagementOrchestrator` **or** remove as false SoT; document canonical order path.
3. Collapse duplicate marketplace/payment/order plugins behind feature flags with one documented path.
4. Replace phase-gate 100% reporting with capability matrix tied to HTTP integration tests.