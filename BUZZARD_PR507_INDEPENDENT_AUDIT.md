# BUZZARD PR #507 — Independent Audit (uncommitted workspace review)

**Generated:** 2026-11-18, 19:08 Europe/Berlin (18:08 UTC machine)  
**PR:** https://github.com/Buzzard-de/Buzzard/pull/507  
**Head (committed):** `b2479b6b` · `cursor/security-admin-final-checkpoint-c293`  
**Scope of this audit:** Uncommitted local doc edits + on-disk artifacts; **live** API on **127.0.0.1:3001** (unpatched); **staging** tree `/tmp/buzzard-final-sprint/work` (patch target).  
**Agent actions:** Read-only verification and isolated vitest re-run. **No** commit, push, merge, deploy, patch apply, or port restart.

**Invariants (kept):** SALES=LOCKED · EGRESS=DENY · productionReady=false · live=false

**Claims explicitly not made:** CI did not run on this PR; live security fixes from the sprint patch are **not** applied on the running API.

---

## Uncommitted local changes (reviewed)

| Path | Nature | Security impact |
|---|---|---|
| `BUZZARD_SECURITY_ADMIN_FINAL_MASTER_SPRINT_CHECKPOINT_2026-11-18.md` | Doc sync | **PASS** — prose only |
| `BUZZARD_SECURITY_ADMIN_FINAL_MASTER_SPRINT_REPORT.md` | Minor § edit | **PASS** — prose only |
| `artifacts/.../NOTES.md`, `README.md` | Recovery / evidence notes | **PASS** — prose only |
| `BUZZARD_PR507_FINAL_REVIEW.md` | New review doc | **PASS** — prose only |
| `artifacts/.../logs/p8–p10/*.log` (26 files) | Copied from `/tmp/buzzard-final-sprint/logs/` | **PASS** — evidence copy (gitignored) |

No uncommitted changes touch `server/`, `lib/admin` route policy, or live `server/data`.

---

## Audit checklist

### 1. Verify all 166 patch file pairs

| Check | Result |
|---|---|
| `BUZZARD_SECURITY_ADMIN_FINAL_MASTER_SPRINT_WORKTREE_2026-11-18.patch` contains **166** `--- ws-snapshot/` hunks | **PASS** |
| Each `+++ work/<path>` has a file under `/tmp/buzzard-final-sprint/work/` | **PASS** (0 missing) |
| **54** snapshot paths are absent under `ws-snapshot/` (new files in the sprint: e.g. `AdminPageAccess.tsx`, new e2e specs, new `server/lib/*`) | **PASS** — expected for additive files; pair still valid as snapshot→work diff |
| Redaction / secrets in patch | **NOT VERIFIED** in this pass (spot-checked via prior Phase 1 report only) |

**Classification:** **PASS** (structural pair integrity on staging tree).

---

### 2. Security regression or conflicting permission rule

| Layer | Finding | Classification |
|---|---|---|
| Uncommitted docs | No permission or auth code | **PASS** |
| Staging: `lib/admin/navPermissions.mjs` vs `server/lib/routePermissions.js` + `AdminPageAccess` | Covered by `adminRouteMatrix` / role matrix (471 focused tests passed 2026-11-18 re-run) | **PASS** (staging) |
| Live workspace `server/` (unpatched) vs staging policy | Central admin auth middleware / webhook gate / JSON lock **absent** on live process | **FAIL** (live regression vs sprint intent) — not a regression *in the patch*, but live still vulnerable |
| `read_only` vs diagnostics (`DIAGNOSTIC_POSTS` + `POST /api/wms-inventory/scan` with `logistics.read`) | Intentional; no broader write access in matrix test | **PASS** (staging) |

**Classification:** **PASS** (patch/staging coherence) · **FAIL** (live still pre-patch).

---

### 3. Verify all 79 admin routes and 6 write routes

**Definitions (from `adminRouteTable.mjs`):**

- **79** module routes tagged `since: closed-2026-11-17` (anonymous callers before first security patch).
- **16** additional routes closed in this sprint (`closed-2026-11-18`).
- **6 write routes** in the sprint brief = historical **read-only admin account could invoke six module write endpoints** before patch (documented in sprint report §5).

| Check | Staging `/tmp/.../work` | Live `127.0.0.1:3001` |
|---|---|---|
| All **79** `closed-2026-11-17` rows refuse anonymous callers | `adminRouteMatrix.test.mjs` (124 tests) | **FAIL** — e.g. `GET /api/analytics-v39/jobs` → **200**, `GET /api/order-management-v32/records` → **200** without session |
| Read-only role blocked from module **writes** (the former **6** + others) | Test: “reaches no write route except the listed dry-run diagnostics” | **NOT VERIFIED** on live (no authenticated read-only probe in this audit) |
| **102** table rows overall | Exercised in matrix | **NOT VERIFIED** exhaustively on live |

**Classification:** **PASS** (staging, isolated HTTP + vitest) · **FAIL** (live anonymous admin-module reads) · **NOT VERIFIED** (live read-only write sweep).

---

### 4. Verify all 5 webhook routes

Sprint NOTES distinguish:

- **5** routes that **changed production state without authentication** before Phase 6.
- **8** inbound webhook routes in policy (`WEBHOOK_ROUTES` in `routePermissions.js`).

| Check | Staging | Live |
|---|---|---|
| **8** routes behind `webhookGate` (signature, replay, scope secrets) | `webhookSecurity.test.mjs` **178** tests | **NOT VERIFIED** (no unsigned synthetic POST battery on live in this audit) |
| Gate wired in `globalAuthMiddleware` | Tests + code review in NOTES | Live tree: **no** `webhookGate` match under `/workspace/server` |

**Classification:** **PASS** (8 routes, staging) · **NOT VERIFIED** (live) · Checklist label “5” = **PASS** as historical subset of the 8.

---

### 5. Verify all 8 AI Center write routes

`AI_CENTER_ROUTES`: **9** entries — **8× POST** (writes: `ai.execute` / `ai.assign`) + **1× GET** session read (`ai.read`).

| Check | Staging | Live |
|---|---|---|
| POST writes require session + permission | `aiCenterSecurity.test.mjs` **109** tests | `POST /api/ai-center/chat` anonymous → **400** (not **401**); full auth denial **NOT VERIFIED** on live |
| No session treated as credential on webhooks (parity rule) | Covered in matrix webhook describe | N/A |

**Classification:** **PASS** (staging) · **NOT VERIFIED** (live write denial).

---

### 6. JWT, session revocation, and token storage

| Control | Staging evidence | Live |
|---|---|---|
| Token hash at rest, `tokenPreview`, sessionId revocation | `adminSessionSecurity.test.mjs`, `adminSessionLifecycle` (in suite) | **NOT VERIFIED** — live codebase lacks sprint `jwtSecret.js` / session hardening files on workspace branch |
| JWT `jti` + credential stamp revalidation | `jwtSecretHardening.test.mjs` **22** tests | **NOT VERIFIED** |
| `revokeUserSessions` / password & role change | `auth.js` in staging + tests | **NOT VERIFIED** |
| Production refusals for seed passwords / weak secrets | `productionStartup` child-process tests (NOTES) | **NOT VERIFIED** on running process |

**Classification:** **PASS** (staging isolated tests) · **NOT VERIFIED** (live).

---

### 7. Atomic JSON writes and recovery

| Control | Staging |
|---|---|
| `withFileLock`, `.bak` recovery, refuse unsafe overwrite | `adminJsonStoreIntegrity.test.mjs` **17** tests — **PASS** |
| Live `server/lib/jsonFileStore.js` | **NOT VERIFIED** (pre-patch behaviour on running API) |

**Classification:** **PASS** (staging) · **NOT VERIFIED** (live).

---

### 8. Catalog preview access restriction

| Route | Staging | Live (this audit) |
|---|---|---|
| Public `?preview=1` on `/api/catalog/*` | Forced `preview: false`; `catalogFixtureSecurity.test.mjs` | `GET /api/catalog/products?preview=1` → **200** with demo catalog items (e.g. `pim_prod_demo001`) |
| Admin preview under `/api/admin/storefront/preview/*` | Requires admin session + `products.read` | Unchanged pattern on live (admin-only paths) |

**Classification:** **PASS** (staging) · **FAIL** (live anonymous preview query still honored on public catalog list).

---

### 9. Confirm 26 recovered logs are historical, not new test results

| Evidence | Result |
|---|---|
| 26 files under `artifacts/.../logs/` | **PASS** |
| Byte identity vs `/tmp/buzzard-final-sprint/logs/` | **26/26** `cmp` identical |
| Filenames | `p8-*`, `p9-*`, `p10-*` sprint phase logs only |
| Content | Phase 8 JSON integrity, Phase 9 audit logging, Phase 10 isolation/selftest — timestamps and commands match prior sprint run |

**Classification:** **PASS** (historical recovery, not fresh CI).

---

### 10. Confirm all seven protected SHA-256 hashes unchanged

Computed SHA-256 of `/workspace/server/data/*` vs `artifacts/.../baseline-hashes.json` (2026-11-18T05:43Z):

| File | Classification |
|---|---|
| `admin-sessions.json` | **PASS** |
| `admin-users.json` | **PASS** |
| `audit-log.json` | **PASS** |
| `automation-events.json` | **PASS** |
| `buzzard.db` | **PASS** |
| `customers.json` | **PASS** |
| `security-log.json` | **PASS** |

**Classification:** **PASS**

---

### 11. Confirm ports 3000 and 3001 remain untouched

| Probe | Result |
|---|---|
| `http://127.0.0.1:3000/` | **200** (no restart performed in this audit) |
| `http://127.0.0.1:3001/api/health` | **200** |
| Sprint policy | No patch apply, no process kill in this audit |

**Classification:** **PASS** (ports responding; untouched by agent).

---

### 12. Remaining live security exposures

These affect the **running unpatched API** and/or **committed branch without server apply**. Fixes exist in **staging patch only** until authorized deploy.

| ID | Exposure | Severity | Live observed / basis |
|---|---|---|---|
| L-01 | **79** admin-module routes (+ operations) reachable **without login** | Critical | `GET /api/analytics-v39/jobs` **200**, `GET /api/order-management-v32/records` **200** |
| L-02 | **Read-only admin → 6 historical write routes** (pre-patch); live not re-probed with creds | High | **NOT VERIFIED** live; known from sprint baseline |
| L-03 | **8 webhook routes** without signature gate on live stack | Critical | Code: no `webhookGate` on `/workspace/server` |
| L-04 | **8 AI Center POST writes** without back-office auth on live | High | Anon `POST /api/ai-center/chat` → **400** (handler reachable) |
| L-05 | **Anonymous `?preview=1`** on public catalog APIs | High | **200** + demo product payload |
| L-06 | Session tokens / JWT hardening (hash at rest, revocation, HS256 policy) | High | Patch not on live process |
| L-07 | JSON store: no cross-process lock / `.bak` recovery on live | Medium | Pre-patch `jsonFileStore` on branch |
| L-08 | Seed / default admin credentials in `admin-users.json` (hash unchanged) | High | Sprint tests flag seed passwords in production mode |
| L-09 | **URIError / unhandled async route rejection** crash class (P1-01/P1-02) | High | Fixed in staging; **NOT VERIFIED** on live |
| L-10 | Customer/guest **anonymous write** surface (~67 routes by design + abuse budget) | Medium | By design; staging adds rate limits — **NOT VERIFIED** live |
| L-11 | Public health/status integration hints | Low | Documented in Phase 5; unchanged on live |
| L-12 | GitHub Pages admin UI: bearer in `sessionStorage` (XSS class) | Medium | Architectural; mitigated in staging, not eliminated |
| L-13 | PR **merge conflicts** + **no CI** on base `cursor/pim-catalog-foundation-c293` | Process | **BLOCKED** for safe merge |
| L-14 | **Patch not applied** to Render/production (`live=false`) | Blocker | Explicit policy this sprint |

**Classification:** **FAIL** (live posture) · **BLOCKED** (production remediation).

---

## Supplemental verification (this run)

Isolated vitest on staging only (loopback, `server/data` hash unchanged):

```
adminRouteMatrix, webhookSecurity, aiCenterSecurity,
adminSessionSecurity, jwtSecretHardening, adminJsonStoreIntegrity,
catalogFixtureSecurity — 471 tests passed
```

---

## Summary matrix

| # | Topic | Staging / patch | Live 3001 | Uncommitted docs |
|---|---|---|---|---|
| 1 | 166 patch pairs | **PASS** | N/A | N/A |
| 2 | Regressions / permission conflicts | **PASS** | **FAIL** | **PASS** |
| 3 | 79 admin + 6 write (read-only) | **PASS** | **FAIL** / **NOT VERIFIED** | N/A |
| 4 | Webhooks (5 ⊂ 8) | **PASS** | **NOT VERIFIED** | N/A |
| 5 | AI Center 8 POST writes | **PASS** | **NOT VERIFIED** | N/A |
| 6 | JWT / sessions | **PASS** | **NOT VERIFIED** | N/A |
| 7 | Atomic JSON | **PASS** | **NOT VERIFIED** | N/A |
| 8 | Catalog preview | **PASS** | **FAIL** | N/A |
| 9 | 26 logs historical | **PASS** | N/A | N/A |
| 10 | 7 SHA-256 hashes | **PASS** | **PASS** | N/A |
| 11 | Ports 3000/3001 | **PASS** | **PASS** | N/A |
| 12 | Live exposures | N/A | **FAIL** | N/A |

**Overall PR #507 security outcome:** Sprint controls are **verified in isolation** on the staging worktree; **live** API and merge path remain **BLOCKED**. Do **not** treat merged docs or recovered logs as proof of production hardening until an authorized server patch and deploy complete.

---

## References

- Patch: `BUZZARD_SECURITY_ADMIN_FINAL_MASTER_SPRINT_WORKTREE_2026-11-18.patch`
- Staging tree: `/tmp/buzzard-final-sprint/work`
- Checkpoint: `artifacts/buzzard-security-admin-final-sprint-checkpoint-2026-11-18/`
- Prior review (local): `BUZZARD_PR507_FINAL_REVIEW.md`