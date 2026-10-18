# Buzzard Phase 11 — Remaining Security and Data-Integrity Defect Closure

Version: 11.0  
Date: 2026-10-13  
Branch: `cursor/final-completion-execution-c293`  
Start HEAD: `7561ad3d8c4179c714ab35b6c86cfc1c07abbd9b` (Phase 10 pin; working tree clean)  
Final HEAD: `7561ad3d8c4179c714ab35b6c86cfc1c07abbd9b` (no commit this phase, per change-control)  
Working tree: dirty (see section A)

Git push / PR / merge / deploy / commit: **not performed**.  
`git reset --hard` / `git clean -fd`: **not used**.  
`npm audit fix --force`: **not used**.  
`verify:db-persistence`: **not run** (defaults to production Render).  
Sales / Product SoT / live payments: **unchanged and locked**.

No overall completion percentage. No capability is `LIVE_VERIFIED`.

---

## A. Baseline

| Field | Value |
| --- | --- |
| Branch | `cursor/final-completion-execution-c293` |
| HEAD | `7561ad3d8c4179c714ab35b6c86cfc1c07abbd9b` |
| Start status | clean |
| End status | uncommitted local edits only |
| Env | `BUZZARD_SALES_ENABLED=0`, `NEXT_PUBLIC_SALES_ENABLED=0`, SoT unset, live payments unset |
| Live local stack | `:3000` next-dev HTTP 200; `:3001` API health 200 (not killed) |

Uncommitted paths:

- `lib/market/languageIndependence.test.ts`
- `scripts/production-safety.mjs`
- `server/__tests__/part8Foundation.test.mjs`
- `server/__tests__/softwareMasterCompletion.test.mjs`
- `server/__tests__/backupRestoreIntegrity.test.mjs` (new)

---

## B. Findings

| ID | Severity | Final status |
| --- | --- | --- |
| P11-01 Admin sessionStorage / no HttpOnly cookie | P1 | **OPEN_SOFTWARE** (blocked as complete cutover) |
| P11-02 GHSA-vfj7-8cjw-p6xm braces@3.0.3 | HIGH paper / P2 runtime | **OPEN_SECURITY** / **BLOCKED_EXTERNAL** |
| P11-03 Render `/var/data` persistence | P1 prod | **NOT_VERIFIABLE_LOCALLY** |
| P11-04 Dual catalog stores (JSON PDP vs PIM) | P2 architecture | **OPEN_SOFTWARE** (SoT remains off) |
| P11-05 UNIT-CART writes into default PIM / BZ-CORE public query | P3 | **FIXED_AND_VERIFIED** (test isolation + safety script) |
| P11-06 Backup/restore only dry-run printed | P2 local | **FIXED_AND_VERIFIED** (isolated integrity test) |
| P11-07 Worker “claim once” vs leftover AI_TASK queue | P3 test | **FIXED_AND_VERIFIED** |
| P11-08 Phase 10 cart limiter isolation | P2 | **VERIFIED_NO_DEFECT_FOUND** |
| P11-09 Phase 10 locale hydration `ready` | P2 | **VERIFIED_NO_DEFECT_FOUND** |
| P11-10 Admin login fallback / production fail-closed | P1 | **VERIFIED_NO_DEFECT_FOUND** |
| P11-11 DistDir `.next` vs `.next-dev` | P1 | **VERIFIED_NO_DEFECT_FOUND** |
| P11-12 Sales / SoT / live payment locks | P0 | **VERIFIED_NO_DEFECT_FOUND** |

---

## C. Admin session security (P11-01)

### Architecture (verified in source)

- Login: `POST /api/admin/login` in `server/plugins/adminAuthPlugin.js` via `server/lib/auth.js`.
- Token: 32-byte hex, TTL **8 hours**, persisted in `server/data/admin-sessions.json`.
- Client: JSON `{ token }` stored in `sessionStorage` key `buzzard_admin_token`.
- Requests: `Authorization: Bearer …`. Server `requireAuth` ignores frontend-only state.
- CSRF: `server/lib/csrf.js` — Bearer is **exempt**. Cookie CSRF exists only when `BUZZARD_CSRF_ENFORCE=1` (`X-Buzzard-CSRF-Token` must match `buzzard_csrf` cookie). Default: **not enforced**.
- Logout: `clearAdminToken()` + `/api/admin/logout`.
- Rate limit: 8 / 15 minutes per IP+email.

### Token producers / consumers

Producer: login JSON (`auth.createSession`).  
Consumers: `lib/admin/client.ts` plus **40+** `lib/*/client.ts` modules and admin panels, plus Playwright helpers. A workspace scan found **117** paths mentioning both `sessionStorage` and `buzzard_admin_token`, including generated `out/_next` chunks. Source-of-truth clients remain dozens of first-party TypeScript modules, not one helper.

### HttpOnly migration decision

**Not implemented.** A complete compatible migration is **not** safe in this architecture as a small patch.

Required for a complete cutover (do not do a subset):

1. `Set-Cookie` on login: `HttpOnly`, `Secure` (HTTPS), `SameSite=Strict` or `Lax`, `Path=/`, expiry = session TTL.
2. Stop returning the raw token to JavaScript **or** treat JSON token as deprecated and remove it in the same change.
3. All admin `fetch` calls: `credentials: 'include'`; remove `sessionStorage` reads/writes.
4. Enable CSRF for cookie-authenticated state changes (`BUZZARD_CSRF_ENFORCE=1` or equivalent always-on for cookie sessions); issue CSRF cookie on login; send header on POST/PUT/PATCH/DELETE.
5. Logout must clear the session cookie server-side and CSRF cookie.
6. Rewrite Playwright: stop polling `sessionStorage`; assert HttpOnly cookie presence via CDP/context cookies, not `page.evaluate`.
7. Static export / cross-origin admin (`NEXT_PUBLIC_BUZZARD_API_URL` on another host) needs an explicit CORS+cookie plan (`Access-Control-Allow-Credentials`, fixed origin). Loopback `:3000`→`:3001` is cross-origin today.

**Exact blocker:** ~40+ independent Bearer clients + static-export cross-origin admin + CSRF currently Bearer-exempt. A cookie alongside sessionStorage would be **two competing mechanisms**.

Residual: XSS can read the bearer token. APIs still 401 without a valid server session (Playwright: unauthenticated software APIs **401**).

Tests this phase: valid login stores token; invalid unknown identity stores none; unauthenticated Control Center stays on login; software APIs 401. CSRF unit tests still pass (`server/__tests__/csrf.test.mjs`).

---

## D. braces / npm audit (P11-02)

Re-run:

- `npm audit --json` exit **1** — high **5**, critical **0**
- `npm audit --omit=dev` exit **0** — **0** findings
- `cd server && npm audit` exit **0** — **0** findings
- `npm view braces version` → **3.0.3** (no `3.0.4+` on npm)
- Installed: `braces@3.0.3`

Same advisory **GHSA-vfj7-8cjw-p6xm**. Five rows = one chain:

`eslint-config-next@15.5.27` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces@3.0.3`

`fixAvailable`: eslint-config-next **14.2.35** (`isSemVerMajor: true`) vs Next **15.5.27**. Existing `overrides` do not include braces. No compatible override to a patched braces version exists.

**Not applied:** force fix, Next 14 downgrade, audit suppression.

Production exposure: **development lint toolchain**. Not in omit-dev. Server package clean.

Next action: wait for braces `>3.0.3` or a Next 15 eslint-config-next that does not pull the vulnerable range. Evidence to close: audit exit 0 without a major Next downgrade.

---

## E. Database persistence and recovery (P11-03, P11-06)

Inspected: `server/lib/dbPaths.js`, `dbStartup.js`, `scripts/db-backup.mjs` (PRAGMA `integrity_check` + sidecar), `scripts/restore-db.mjs` + `restoreGuard.js` (blocks `/var/data` and `NODE_ENV=production` without `BUZZARD_ALLOW_PRODUCTION_RESTORE=1`).

`verify:db-persistence` still defaults to `https://buzzard-api.onrender.com` — **not run**.

Local health (API): path `/workspace/server/data/buzzard.db`, `persistence.mode=development_default`, `persistent=false`, `/var/data` exists=false.

**Correction:** `server/__tests__/backupRestoreIntegrity.test.mjs`

- Isolated fixtures under `server/data/test-scratch/phase11-backup/` (not `/tmp`, not `/var/data`, not default `buzzard.db`).
- `scripts/db-backup.mjs` with `BUZZARD_DB_PATH` + `BUZZARD_BACKUP_DIR`.
- Asserts `integrityCheck === "ok"`.
- Restores to a **second** isolated file via `restore-db.mjs`.
- Marker row `phase11-integrity-token` survives two separate Node processes (different PIDs).
- Production restore remains blocked.

`npm run test:backup-restore` remains a **dry-run print** of the default local db; it does not prove integrity. The new vitest does.

Render: **UNKNOWN**.

---

## F. Catalog consistency (P11-04, P11-05)

Stores remain separate. `BUZZARD_PRODUCT_SOT_ACTIVE` unset. Dual-write still forbidden. SoT **not** activated. Existing `UNIT-CART-*` rows already in the live local PIM were **not deleted**.

**Why UNIT-CART vs BZ-CORE:**

- `part8Foundation.test.mjs` called `productCore.createProduct` with `UNIT-CART-*` against whatever `db` was already open (default `server/data/buzzard.db` when unit tests shared the live file).
- `BZ-CORE-DEMO-001` / `pim_prod_demo001` is a **demo** SKU (`demoProductGuard`). Public catalog listing excludes demos. `test:production-safety` queried `q=BZ-CORE` on the **public** catalog, so it could miss even if the demo row existed, and UNIT-CART occupied the first page.

Classification: **test-fixture isolation defect**, not a SoT merge gap and not a reason to invent BZ-CORE on the live PIM.

**Correction:**

- `part8Foundation` sets `BUZZARD_DB_PATH` to `server/data/test-scratch/part8-foundation.db` **before** loading `db`.
- Hidden-price case seeds `UNIT-HIDDEN-*` with `visibility: HIDDEN` in that isolated DB (no dependency on demo SKU).
- Asserts resolved path is not `server/data/buzzard.db`.
- `production-safety.mjs` uses the first public priced catalog product (same invariant as commerce E2E: clientPrice tamper → `price_tampering`).

Result: `npm run test:production-safety` → **7 passed / 0 failed**. Dual-store architecture remains **OPEN_SOFTWARE** (not merged).

---

## G. Phase 10 regression

| Item | Evidence |
| --- | --- |
| Cart isolation | Desktop cart E2E passed; mobile/tablet **skipped** (4 skips, not passes). Limiter still 120/min in `commerceCorePlugin.js`. `rateLimitStore` IP-scope + TEST_MODE tests passed. |
| Legitimate throttle | Unit: third request with max=2 returns limited; production limiter not disabled. |
| tr/de hydration | `disabled={!ready}` still in `LanguageSelector`; 1440 hero/locale E2E **passed**. `languageIndependence` now asserts `disabled={!ready}`. |
| Admin fallback | `apiBase.test.ts` production `""`, dev `:3001`. Form login E2E passed. |
| DistDir | `nextDistIsolation.test.ts` passed. Full `next build` **not repeated** this phase (Phase 10 already proved `:3000` survived export on this isolation). |
| Order/payment/QR | `test:software` **143 passed** after worker assertion fix. Commerce-security E2E: sales lock, tamper, IDOR, idempotency — **6 passed**. Unsigned webhook tests remain in master completion. |

---

## H. Worker claim-once (P11-07)

`softwareMasterCompletion` “P3 worker claimAndExecute runs a Pusat task once” failed when the suite shared `core_background_jobs` with leftover `AI_TASK` rows: after completing the target job, the next `claimAndExecute` claimed a **different** queued job.

**Correction:** assert the **same** `job.id` is not claimed again. File also pins `BUZZARD_DB_PATH` to `software-master-completion.db` when it is the first opener of `lib/db`.

`npm run test:software` **143 passed** after the change.

---

## I. Test table

Skipped ≠ passed. Audit exit 1 ≠ pass.

| Command | Exit | Passed | Failed | Skipped | Notes |
| --- | --- | --- | --- | --- | --- |
| `npx vitest run … part8Foundation backupRestoreIntegrity rateLimitStore apiBase nextDistIsolation languageIndependence` | 0 | 34 | 0 | 0 | first batch |
| `npx vitest run csrf orderIdentityLoyalty productArchitecture` | 0 | 25 | 0 | 0 | |
| `npm run test:software` (final) | **0** | **143** | 0 | 0 | after worker assertion |
| `npx vitest run softwareMasterCompletion part8Foundation backupRestoreIntegrity` | 0 | 37 | 0 | 0 | |
| `npm run test:ai` | 0 | 58 | 0 | 0 | |
| `npm run test:bridge` | 0 | 18 | 0 | 0 | |
| `npm run test:unit` (pre-assertion-fix, isolated `BUZZARD_DB_PATH`) | **1** | 892 | **1** | 0 | same worker claim-once; **superseded** by software 143 |
| Playwright admin login + 1440 locale | 0 | 5 | 0 | 0 | SKIP_WEBSERVER `:3000`/`:3001` |
| Playwright cart journey grep | 0 | 2 | 0 | **4** | extra projects skip API cart |
| Playwright `commerce-security.spec.ts` | 0 | 6 | 0 | 0 | |
| `npm run test:production-safety` | **0** | **7** | 0 | 0 | live `:3001` |
| `npm run lint` | 0 | | | | |
| `npm run typecheck` | 0 | | | | |
| `npm audit --json` | **1** | 5 high | | | braces chain |
| `npm audit --omit=dev` | 0 | 0 | | | |
| `npm --prefix server audit` | 0 | 0 | | | |
| `verify:db-persistence` | | | | **not run** | |
| `npm run build` | | | | **not re-run** | Phase 10 evidence on same isolation config |

Full Playwright (119 tests) was **not** re-run this phase; targeted regressions covering login, locale, cart, and commerce security were.

---

## J. Unresolved — next action

| ID | Why open | Next action | External auth? |
| --- | --- | --- | --- |
| P11-01 HttpOnly | Cross-origin static admin + 40+ Bearer clients | Dedicated cookie+CSRF cutover listed in section C | No (engineering) |
| P11-02 braces | No patched braces; Next 15 eslint-config-next pulls 3.0.3 | Upstream release | Yes |
| P11-03 Render disk | Script defaults to production; local `/var/data` absent | Authorized Render health only | **Yes** |
| P11-04 Dual catalog | SoT must stay off | Do not merge | Human/SoT flag |
| Pre-existing UNIT-CART rows in live local PIM | Not deleted (preserve data) | Optional later cleanup of test SKUs on a **non-production** DB only | No |

---

## K. Safety confirmation

- Sales remain disabled.
- Product SoT remains inactive.
- Live payments remain disabled.
- No production mutation, deployment, push, PR, merge, or commit.
- No real financial operations or paid providers.
- Isolated persistence used `server/data/test-scratch/` only.
- Port 3000 was not terminated.

---

## L. Assessment

1. **Fixed and verified:** UNIT-CART isolation + production-safety catalog resolution; isolated backup/restore integrity; worker claim-once assertion; Phase 10 cart/locale/login/distDir still hold in targeted tests.
2. **Fixed not fully verified:** none of the local fixture fixes were claimed as Render or live-provider proof.
3. **Remaining software:** HttpOnly/sessionStorage; dual catalog while SoT is off; leftover UNIT-CART rows in the developer PIM file.
4. **Remaining security:** braces GHSA (dev); sessionStorage XSS surface.
5. **External blockers:** braces/Next eslint; Render persistence probe.
6. **Not verifiable locally:** production SQLite durability; live webhook HMAC against vendors.

Do not start a feature phase while HttpOnly, braces, and Render persistence remain open. Locally fixable catalog-fixture and backup-integrity gaps from Phase 10 are closed with tests. Uncommitted changes remain in the working tree by instruction.
