# Buzzard Phase 9 — Total Defect Remediation and Security Verification

Version: 9.0  
Date: 2026-10-13  
Branch: `cursor/final-completion-execution-c293`  
Expected prior Phase 8 HEAD: `99290b16ae8c3b7cf21cac8dc2f57d10e3c4a20b`  
Observed starting HEAD: `99290b16ae8c3b7cf21cac8dc2f57d10e3c4a20b` (matched; working tree clean)  
Final HEAD: recorded after the local pin commit.

Git push / PR / merge / deploy: **not performed**.  
`git reset --hard` / `git clean -fd`: **not used**.  
`npm audit fix --force`: **not used**.  
`verify:db-persistence`: **not run** (defaults to production `https://buzzard-api.onrender.com`).  
Sales / Product SoT / live payments: **unchanged and locked**.

No overall completion percentage. Local HTTP 200 is not production readiness. No capability is `LIVE_VERIFIED`.

---

## A. Branch, HEAD, working tree

| Field | Value |
| --- | --- |
| Branch | `cursor/final-completion-execution-c293` |
| Start HEAD | `99290b16ae8c3b7cf21cac8dc2f57d10e3c4a20b` |
| Start status | clean |
| Port 3000 at start | `next-server` PID `1997897`, parent `1997882` `next dev --port 3000`, cwd `/workspace`, HTTP **200** Buzzard24 |
| Isolation dirs | `.next-dev` (dev, no export-marker); `.next` (production export cache) |
| Env | `BUZZARD_SALES_ENABLED=0`, `NEXT_PUBLIC_SALES_ENABLED=0`, SoT unset, live payments unset |

Port 3000 was **not** terminated in this phase. The local API on `:3001` (`node --watch server.js`, cwd `/workspace/server`) was restarted twice after positive identification, only to clear an exhausted in-memory admin login limiter (8 / 15 minutes) created by investigation curls plus repeated Playwright runs.

---

## B. Findings

### P9-01 — Admin login form never stored `buzzard_admin_token` (P1)

| Field | Value |
| --- | --- |
| Component | `lib/admin/apiBase.ts`, `components/admin/AdminLoginForm.tsx`, `e2e/admin.spec.ts` |
| Reproduction | `PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000` plus the Phase 8 test. Screenshot: red `Admin-Service derzeit nicht erreichbar.` Token in sessionStorage stayed `null` for 20s. |
| Observed | Frontend threw `admin.apiUnavailable`. Backend `POST /api/admin/login` on `:3001` returned **200** with `success` + `token` for valid credentials and **401** `admin.auth.invalid` for a bad password. CORS preflight from `http://127.0.0.1:3000` was **204** with `Access-Control-Allow-Origin: http://127.0.0.1:3000`. |
| Expected | Successful form login stores `buzzard_admin_token` and does not show the unavailable-service error. |
| Root cause | Classification **A + C**. `adminApiBase()` was only `window.__BUZZARD_API_URL__` or baked `NEXT_PUBLIC_BUZZARD_API_URL`. The recovered `next-dev` on :3000 had **no** `NEXT_PUBLIC_*` in its process environment, so the compiled base was `""`. Helper-seeded tests inject `__BUZZARD_API_URL__`, so they passed while the real form failed. Not an obsolete sessionStorage contract. |
| Fix | Development-only loopback fallback `http://{hostname}:3001` when env is empty; production still fail-closed (`""`). Hostname follows `localhost` vs `127.0.0.1` for CORS. |
| Regression | `lib/admin/apiBase.test.ts` (4 tests). Playwright: form stores token; invalid unknown identity stores none. |
| Verification | Admin E2E in the final full Playwright run: login form token test **passed**. Targeted `e2e/admin.spec.ts` + `storefront-bridge` **15 passed**. |
| Status | **DEFECT_FIXED_AND_TESTED** locally |
| Residual | Operators should still set `NEXT_PUBLIC_BUZZARD_API_URL` for non-loopback or non-3001 APIs. Production export without that env still cannot log in (intentional). |

### P9-02 — Admin token in sessionStorage / no HttpOnly cookie (P1)

| Field | Value |
| --- | --- |
| Component | `lib/admin/client.ts` and ~20 other `sessionStorage.getItem("buzzard_admin_token")` clients |
| Evidence | Token is written by `saveAdminToken` after JSON login. CSRF module documents Bearer admin API does **not** require CSRF; cookie CSRF exists only when `BUZZARD_CSRF_ENFORCE=1`. |
| Root cause | Architecture is Bearer + sessionStorage, not cookie sessions. |
| Fix | **Not migrated.** A compatible HttpOnly cookie change requires Set-Cookie on login, `credentials: 'include'` on every admin client, CSRF for cookie-authenticated state changes, logout cookie clear, and removal of sessionStorage. A partial dual-path would leave two mechanisms active. |
| Status | **OPEN** / **OPEN_SOFTWARE** |
| Residual | XSS can read the token. Admin APIs still require `Authorization: Bearer` independently of UI. Logout clears sessionStorage. TTL 8h in `server/lib/auth.js`. |

### P9-03 — npm audit HIGH braces chain (P2 for runtime, HIGH on paper)

| Field | Value |
| --- | --- |
| Advisory | GHSA-vfj7-8cjw-p6xm / npm 1240992 / CVE-2026-93687 |
| Installed | `braces@3.0.3` (latest published; no `3.0.4+`) |
| Path | `eslint-config-next@15.5.27` → `@next/eslint-plugin-next@15.5.27` → `fast-glob@3.3.1` → `micromatch@4.0.8` → `braces@3.0.3` |
| Rows | 5 HIGH, 0 CRITICAL — **one** advisory plus dependents |
| Production reachability | Development lint toolchain. Not in root `dependencies`. Server audit **0**. |
| Patch | `fixAvailable` = `eslint-config-next@14.2.35` (`isSemVerMajor: true`) vs Next **15.5.27**. No compatible override. |
| Status | **OPEN** / **BLOCKED_EXTERNAL** |

### P9-04 — Port 3000 HTTP 500 from shared `.next` (P1, Phase 8)

| Field | Value |
| --- | --- |
| Current config | `distDir: NODE_ENV === "production" ? ".next" : ".next-dev"` |
| This phase | Did **not** kill :3000. `npm run build` exit 0; `.next/export-marker` present; `.next-dev/export-marker` absent; `GET :3000/` **200** Buzzard24, no missing-chunk error. |
| Status | **FIXED_AND_VERIFIED** locally (regression) |

### P9-05 — Playwright helper treated 429 as dead session (P2)

| Field | Value |
| --- | --- |
| Evidence | After many logins, `/api/admin/me` returned 429; helper cleared a still-valid token and attempted another login, also 429. |
| Fix | Reuse cached token when `/me` is 429. Invalid-login E2E uses a unique unknown email so it does not consume `admin@buzzard.de`’s 8/15min bucket. Unauthenticated software API assertions accept 401 **or** 429 (both fail closed; neither is 200). |
| Status | **DEFECT_FIXED_AND_TESTED** (test helper) |

### P9-06 — Cart creates 429 under dense multi-project E2E (P3)

| Field | Value |
| --- | --- |
| Evidence | Desktop customer-journey cart tests passed; later chromium-mobile/tablet cart POSTs failed `cartRes.ok()` after the same API limiter window. |
| Status | **OPEN** (environment / rate-limit density). Not a cart-authorization bypass. Limiter not disabled. |

### P9-07 — Desktop 1440 language select `tr` stayed `de` (P3)

| Field | Value |
| --- | --- |
| Evidence | One timeout in `homepage-viewports` after `selectOption("tr")`. Adjacent locale tests passed. Phase 8 had this suite green; no storefront locale code was changed in Phase 9. |
| Status | **OPEN** (unreproduced as a stable product defect; possible flake) |

### P9-08 — Render SQLite persistence (P1 production)

| Field | Value |
| --- | --- |
| Local health | `database.path` = `/workspace/server/data/buzzard.db`, `persistence.mode` = `development_default`, `persistent` = false, `/var/data` exists=false |
| Production | **NOT_VERIFIABLE_LOCALLY**. `verify:db-persistence` not run. |
| Backup dry-run | Script prints intended copy; does **not** validate schema or restore data. |
| Status | **UNKNOWN** / **BLOCKED_PRODUCTION** |

### P9-09 — Dual product stores (catalog consistency, not a merge)

| Field | Value |
| --- | --- |
| Evidence | Static PDP `/produkt/premium-bremsscheibe-testprodukt/` **200**; unknown slug **404**. Product SoT env unset. `listingMerge` remains `static_slug_wins`. |
| Status | Stores remain separate. SoT **inactive**. Dual-write **not** introduced. Residual architectural inconsistency documented, not merged. |

---

## C. Phase 8 admin login failure — root cause and tests

Root cause: empty `adminApiBase()` on a `next-dev` process started without `NEXT_PUBLIC_BUZZARD_API_URL`. The API was healthy. Helper injection hid the bug.

Final evidence (full Playwright after helper + unique invalid identity, fresh API limiter window):

- `Admin login form stores a session token` — **passed**
- `invalid admin password does not store a session token` — **passed**
- Authenticated dashboard / Control Center / Sessions / tabs / 401-or-429 software APIs — **passed**
- `Admin storefront health` — **passed**

Helper-seeded pages are no longer the only proof.

---

## D. Admin session security

Current design: JSON login returns a bearer token; the browser stores it in `sessionStorage`; clients send `Authorization: Bearer`. Server `requireAuth` enforces independently of the UI.

HttpOnly cookies: **not implemented**. CSRF is not required for Bearer; cookie CSRF is optional via `BUZZARD_CSRF_ENFORCE`. Logout clears sessionStorage and calls `/api/admin/logout`.

Residual: XSS token theft. Smallest safe migration is a dedicated cookie+CSRF cutover of every admin client, not a dual stack.

Status: **OPEN** / **OPEN_SOFTWARE**. Authorization of unsigned callers remains **VERIFIED** as 401 (or 429 fail-closed) in E2E.

---

## E. Current npm audit

`npm audit --audit-level=high` **exit 1**. `high: 5`, `critical: 0`.

| Package | Direct? | Role |
| --- | --- | --- |
| braces@3.0.3 | no | GHSA-vfj7-8cjw-p6xm |
| micromatch | no | depends on braces |
| fast-glob | no | depends on micromatch |
| @next/eslint-plugin-next | no | depends on fast-glob |
| eslint-config-next@15.5.27 | yes (dev) | depends on the plugin |

Server: **0** findings. No other HIGH/CRITICAL. Compatible patch: **none**. Force-fix would downgrade eslint-config-next to 14.2.35 against Next 15.5.27 — not applied.

---

## F. Port 3000

Phase 8 isolation remains in `next.config.ts` and `package.json` `next build`. This phase: no :3000 kill; production build exit 0; :3000 stayed 200 with Buzzard24 title.

---

## G. Order / payment / inventory / customer data

`npm run test:software` — 143 passed (secureCommerce, dualPaymentAdapters, orderIdentityLoyalty, softwareCompletion, softwareLifecycle, softwareMasterCompletion).

Commerce E2E: sales disabled, commercial checkout blocked, price/coupon tampering rejected, IDOR cart blocked, duplicate checkout idempotent.

Concurrency of inventory under real parallel writers: **NOT_VERIFIABLE** as a dedicated race test in this phase (existing suite is sequential fixtures).

Live money: not run.

---

## H. Database / persistence / backup

| Check | Result |
| --- | --- |
| Local path | `/workspace/server/data/buzzard.db` |
| `test:backup-restore` | exit 0 dry-run print only |
| `verify:db-persistence` | **not run** |
| Render `/var/data` | local health `exists: false` — **UNKNOWN** in production |

---

## I. Product catalog and SoT

`BUZZARD_PRODUCT_SOT_ACTIVE` unset. Static PDP 200 / unknown 404. PIM E2E import remains dry-run. No fake products, dual-write, or SoT activation.

---

## J. Test table

Skipped tests are not passes. Audit exit 1 is not a pass.

| Command | Exit | Passed | Failed | Skipped | Against final code? |
| --- | --- | --- | --- | --- | --- |
| `npx vitest run lib/admin/apiBase.test.ts` | 0 | 4 | 0 | 0 | yes |
| `npm run test:software` | 0 | 143 | 0 | 0 | yes (pre-helper-only e2e edits) |
| `npm run test:ai` | 0 | 58 | 0 | 0 | yes |
| `npm run test:bridge` | 0 | 18 | 0 | 0 | yes |
| `npm run test:unit` | 0 | 889 | 0 | 0 | yes (includes apiBase; before e2e helper tweak) |
| `npm run test:backup-restore` | 0 | dry-run | 0 | 0 | yes |
| `npm run lint` | 0 | | | | yes |
| `npm run typecheck` | 0 | | | | yes |
| `npm run build` | 0 | | | | yes; :3000 stayed 200 |
| `npm audit --audit-level=high` | **1** | | | | yes |
| `npm --prefix server audit` | 0 | 0 vulns | | | yes |
| Playwright full, skip webserver, :3000+:3001, fresh API limiter | **1** | **107** | **3** | **9** | yes |
| `verify:db-persistence` | | | | **not run** | |

Playwright failures on the final full run (not counted as passes):

1. chromium-mobile READINESS_TEST cart POST not ok (likely commerce rate limit after desktop+mobile volume).
2. chromium-tablet invalid-product cart POST not ok (same class).
3. homepage-viewports desktop 1440 language `tr` stayed `de` (timeout; other locale cases passed).

Admin login form token test **passed** in that same final run.

---

## K. Unresolved defects and blockers

| ID | Status |
| --- | --- |
| P9-02 sessionStorage / HttpOnly | OPEN_SOFTWARE |
| P9-03 braces GHSA | BLOCKED_EXTERNAL |
| P9-06 cart 429 under dense E2E | OPEN (limiter working) |
| P9-07 language select flake | OPEN |
| P9-08 Render persistence | BLOCKED_PRODUCTION / UNKNOWN |
| Marketplace live publish | BLOCKED_EXTERNAL / BLOCKED_HUMAN |
| Live payments / sales | locked |

---

## L. Safety locks

- Sales remain locked (`BUZZARD_SALES_ENABLED=0`, health `salesEnabled: false`).
- Product SoT remains inactive.
- Live payments remain disabled.
- No production mutation.
- No push / PR / merge / deploy.
- No `npm audit fix --force`.
- Port 3000 not terminated this phase.

---

## M. Final assessment

**Confirmed fixed:** P9-01 admin login empty API base; P9-05 helper 429-as-logout; Phase 8 distDir isolation still holds.

**Verified working (local):** static PDP fail-closed, software/payment/order fixtures, AI/bridge unit, lint/typecheck/isolated build, admin form login against :3001.

**Open software:** sessionStorage XSS surface; E2E cart 429 under load; one language-selector flake.

**External blockers:** braces/Next eslint; no patched braces release.

**Not verifiable locally:** Render disk persistence; live payments; concurrency of inventory under real parallel capture; production auth cookie policy.

Files changed: `lib/admin/apiBase.ts`, `lib/admin/apiBase.test.ts`, `vitest.config.ts`, `e2e/admin.spec.ts`, `e2e/helpers/adminAuth.ts`, this report.
