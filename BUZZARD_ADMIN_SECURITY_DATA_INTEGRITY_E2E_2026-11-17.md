# BUZZARD ADMIN SECURITY, DATA INTEGRITY & E2E RECOVERY

Date: 17 November 2026, Europe/Berlin  
Branch: `cursor/dev-list-51-remainder-c293`  
Commit: `fdc3132c308cb3ae36a07b21d5e66b6544fb2515`  
Sprint result: **NOT SUCCESSFUL**

Acceptance items that hold: the four JSON files are explained and were not rewritten; admin authentication and session behavior were verified on an isolated server; Playwright API is 20/20; mobile, tablet, and desktop storefront tests ran; EAN, brand, and status are explained; the 45 completed items still score complete; SALES stays LOCKED and egress stays DENY; PR order and the 43 main conflicts are documented.

Acceptance item that does not hold: the admin UI suite is not fully green. With the browser pointed at `http://127.0.0.1:3011`, nine admin UI tests fail before the request is sent. With the browser pointed at `http://localhost:3011` on the same isolated API, 14 of those tests pass and `e2e/admin-pim-core.spec.ts` “Import dry-run” still fails. The sprint is not declared successful.

No commit, push, merge, deploy, or release was made. PR #500, #504, and #506 stay open. PR #502 was not modified. Ports 3000 and 3001 were left running.

---

## 1. Executive Summary

The previous E2E run did write the real admin JSON files. One new administrator session for the demo `buzzard.de` account was created at 18:28 Europe/Berlin and is still unexpired. It was not revoked. Older audit, security, and automation rows are still in those files. This sprint did not write, delete, or restore them. Their SHA-256 values at the end of the sprint match the values taken at the start.

Admin identity is not in SQLite. `server/lib/auth.js` hardcodes `server/data`. Sessions are bearer tokens stored in `admin-sessions.json` and in `sessionStorage`. Logout deletes the token from that file. Unauthenticated `/api/admin/me` returns 401. A freshly scrypt-hashed synthetic administrator, present only under `/tmp/buzzard-admin-e2e/data`, logged in, called `/api/admin/me`, opened the commerce overview with sales disabled, and then logged out so the same token returned 401.

The storefront product `BZ-E2E-VISIBLE-001` is inserted without EAN, GTIN, brand, or category. The public mapper copies those nulls and omits `status` even though the SQLite column is `READY`.

`evaluateDevList51()` still returns 45 complete, 0 partial, 6 blocked, 0 not started. `productionReady` is false and `live` is false. `automotive/brakes` is still `CATEGORY_UNMAPPED`. Active L1 category count is 50.

## 2. Initial Git State

Verified read-only before any test process started. It matches the expected branch and commit. Nothing was “corrected”.

| Check | Value |
| --- | --- |
| Branch | `cursor/dev-list-51-remainder-c293` |
| HEAD | `fdc3132c308cb3ae36a07b21d5e66b6544fb2515` |
| Subject | feat: close the 51-item remainder without live connections |
| Commit time | 17 Nov 2026, 16:57 Europe/Berlin (`2026-11-17 15:57:04 +0000`) |
| Working tree | one untracked file: `BUZZARD_FINAL_INTEGRATION_E2E_AUDIT_2026-11-17.md` |
| Uncommitted tracked changes | none |
| `origin/main` | `bd3dc910451c41911716855b565b67e9e5c9bc78` (confirmed with `git fetch origin main`) |

End of sprint: same branch, same HEAD, same untracked prior report, plus this report. No tracked file was modified.

## 3. Protected Resource Verification

Checked at start, after the isolated HTTP chain, after unit tests, after Playwright, and after the isolated processes were stopped.

| Resource | Result |
| --- | --- |
| `/workspace/server/data/buzzard.db` | size 1761280, mtime 17 Nov 2026 17:52:20 Europe/Berlin, SHA-256 `42224f804208319768768672e43b90b3d240284d26e91c713beea554bafa497e`. Unchanged. Not opened by the isolated API. |
| `/tmp/buzzard-eu27/server/data/buzzard.db` | absent |
| `memory/pusat/` | absent |
| Guardian SQLite | not opened. `assertNotGuardianDb` remains in `server/lib/dbPaths.js`. |
| FIN-M25 / PR #502 | still open on `cursor/buzzard-fin-m25-consent-schema-4be7` at `01a00d1e011af5201469c1018dddd9ac9692c7d4`. No fetch, checkout, or edit. |
| Port 3000 | left running. pid 2092, `next-server (v15.5.23)`. |
| Port 3001 | left running. pid 10152, `node server.js`. |
| SALES | `evaluateSalesGate().status` is `LOCKED`, `allowed` false. |
| EGRESS | OpenAI destination `EXTERNAL_AI_EGRESS_DENIED`. Stripe destination `PAYMENT_EGRESS_LOCKED`. |
| `productionReady` / `live` | both false on `evaluateDevList51()`. |

Isolated API health on `127.0.0.1:3011` reported `version.salesEnabled=false`, `commercial.payments.stripe=false`, `production.commerce.goLiveLock=true`, `production.commerce.mockPaymentOnly=true`, and database path `/tmp/buzzard-admin-e2e/catalog.sqlite`.

## 4. Four JSON Files Integrity Report

These files are gitignored (`server/data/` in `.gitignore`). There is no git blob to diff, and none was restored.

The write window used for “new” rows is 18:20–18:40 Europe/Berlin on 17 Nov 2026, which covers the previously reported 18:28–18:29 writes. Counts below are rows whose own timestamps fall in that window. They are not a diff against a pre-image, because no pre-image exists. This sprint’s isolated processes did not change these four hashes.

### admin-sessions.json

1. Path: `/workspace/server/data/admin-sessions.json`
2. Size: 1078 bytes
3. Mtime: 17 Nov 2026 18:28:21.697 Europe/Berlin
4. SHA-256: `15f9855f0046dda6b73d08a7cc348faf1451023dd617b16492fc2becae355e17`
5. Valid JSON array, length 2. Each element has `token` and `session`.
6. One row was created inside the window.
7. Both rows are `role=administrator`, email domain `buzzard.de`, token length 64. Row 0 created `2026-11-17T16:52:15.525Z`, expires 18 Nov 2026 01:52:15 Europe/Berlin. Row 1 created `2026-11-17T17:28:21.700Z` (18:28 Europe/Berlin), expires 18 Nov 2026 02:28:21 Europe/Berlin.
8. The email domain is the demo admin domain already used by the committed seed and the Playwright specs. No other domain is present. Token values are not copied here.
9. The file stores the full bearer token, expiry, role, email, IP, and user agent. That is credential material. It was not printed or revoked.
10. The older 16:52 UTC session is still present.

### audit-log.json

1. Path: `/workspace/server/data/audit-log.json`
2. Size: 2552 bytes
3. Mtime: 17 Nov 2026 18:29:07.213 Europe/Berlin
4. SHA-256: `e1b4b60d1ff8ac964006b14a95846348ef90e2639139a7e35c6f473365680a4b`
5. Valid JSON array, length 6
6. Two rows fall in the window (timestamps 17:27:18Z and 17:29:07Z).
7. All six actions are `commerce.go_live_approved`. `userEmail` is empty on every row.
8. No real user email is stored.
9. No password, token, or hash field.
10. Four older rows remain. The file was not wiped.

### security-log.json

1. Path: `/workspace/server/data/security-log.json`
2. Size: 398824 bytes
3. Mtime: 17 Nov 2026 18:29:21.646 Europe/Berlin
4. SHA-256: `12d8bd3d18772380acf151241a82c0536adf03a130b9e57c608e73dfc7e37ff4`
5. Valid JSON array, length 931
6. 409 rows fall in the window: 18:27 ×164, 18:28 ×90, 18:29 ×155 Europe/Berlin.
7. Window types include `commerce_permission_denied` 243, `payment_attempt_blocked` 45, `supplier_order_blocked` 45, `commercial_order_blocked` 42, `idor_attempt` 6, `price_tampering` 4, `privilege_escalation_attempt` 4, `coupon_tampering` 4, `checkout_blocked` 4, `idempotency_conflict` 3, `order_creation_blocked` 2, `go_live_requested` 2, `go_live_approved` 2, `csrf_failure` 2, `admin_login` 1.
8. 923 of 931 rows have a null email. The other domains are `test.de` (6) and `buzzard.de` (2). No customer domain outside those two appeared.
9. No row has a `password`, `token`, `password_hash`, or `secret` key. Emails are still stored on the few rows that have one.
10. 522 rows are older than the window, so the rewrite did not replace the file with only the new events. The cap in `securityLog.js` is 5000, so this file is not at the truncation limit. Without a pre-image it is not possible to prove that some earlier row was dropped.

### automation-events.json

1. Path: `/workspace/server/data/automation-events.json`
2. Size: 7274 bytes
3. Mtime: 17 Nov 2026 18:29:21.646 Europe/Berlin
4. SHA-256: `c1c32687822049446d54f4ae209a899a7606efbdc69a718e8060b2341c1abc21`
5. Valid JSON array, length 18
6. 10 rows have `createdAt` inside the window. 8 are older.
7. All 18 are `type=new_order`. `dryRun` is true on all 18. `sent` is 0. `providerCalled` is 0.
8. No email field was present in the aggregate.
9. No password or token field.
10. The eight older rows are still present.

`admin-users.json` was not one of the four reported files. It is included because the question is whether admin identity moved. Size 1299, mtime 17 Nov 2026 17:52:15 Europe/Berlin, SHA-256 `945fd0a13fc31b0a044ed1ca3a2115d737c67d9de2ccb36258155850dd1c0e63`. It did not change in the 18:28 window and it did not change in this sprint. Password hashes were not printed.

### Did the previous Playwright run touch real admin data?

Yes, for sessions, audit, security, and automation. The evidence is the mtimes plus in-window rows, including one new unexpired administrator session at 18:28 Europe/Berlin and one `admin_login` security event in that window. The same run’s unit tests around 18:27 also account for a large share of the 409 security rows. `admin-users.json` and `buzzard.db` were not part of that write. There is no pre-image, so it is not proven that a specific older row was deleted. It is proven that the files were rewritten and that new test-window rows were added while older rows remained.

This sprint’s Playwright and HTTP clients did not change those hashes. Their writes landed in `/tmp/buzzard-admin-e2e/data` because the API ran in a private mount namespace with that directory bind-mounted over `/workspace/server/data`.

## 5. Admin Authentication Architecture

No authentication code was changed.

| Question | Answer | Evidence |
| --- | --- | --- |
| Where is the admin account read? | `server/data/admin-users.json`. If that file is missing, `seedUsers()` hashes `data/buzzard_admin_users.seed.json` and writes the users file. | `server/lib/auth.js` lines 10–45 and 77–79. `dataDir` is `path.join(__dirname, "..", "data")`. No environment variable redirects it. |
| How is the password checked? | scrypt via `verifyPassword` in `server/lib/password.js`. Legacy SHA-256 is still accepted and then rehashed. | `login()` lines 135–159. |
| How is a session created? | `crypto.randomBytes(32).toString("hex")`, session id `sess-` plus 8 random bytes, TTL 8 hours. | `createSession()` lines 82–98. `SESSION_TTL_MS`. |
| Where is it stored? | In-memory map plus the full token written to `admin-sessions.json`. The admin UI stores the same token in `sessionStorage` key `buzzard_admin_token`. | `persistSessions()`, `lib/admin/client.ts`. |
| How is expiry enforced? | `getSession` drops a token when `expiresAt <= Date.now()` and rewrites the file. | `auth.js` lines 270–279. Not waited out for 8 hours. |
| Does logout invalidate it? | Yes. `logout` deletes the map entry and rewrites the file. Isolated proof: login 200, `/api/admin/me` 200, logout 200, same token `/api/admin/me` 401 `admin.auth.required`. | `auth.js` lines 257–268. HTTP chain in section 20. |
| Can an anonymous caller hit admin APIs? | `/api/admin/me` without a bearer token returns 401 `admin.auth.required`. | Isolated HTTP. |
| Are admin and storefront APIs separate? | They are separate route groups. Storefront catalog does not require the admin session. Admin routes go through `requireAuth`. `requireAuth` also accepts a SQLite JWT whose role is `admin` or `administrator`. | `auth.js` lines 288–315. |
| Does the test process use the real users file? | The isolated API did not. A private mount hid `server/data`. The overlay contained one synthetic user, id `usr-e2e-synthetic`, role `administrator`, email equal to the address the committed specs send, password freshly scrypt-hashed from the committed seed. The real users file was not read for the hash and was not written. | Mount check and login response id `usr-e2e-synthetic`. |
| What is written on a failed login? | `account-lockouts.json` via `recordFailure`, and `security-log.json` via `logSecurityEvent` type `admin_login_failed`. A locked account writes `admin_login_locked` and does not check the password again. A successful login writes `admin-sessions.json` and `admin_login`. Logout writes the session file and `admin_logout`. | `auth.js` login and logout. Isolated lockout probe below. |

Rate limit: `createRateLimiter` lives in `server/lib/rateLimitStore.js` and is re-exported by `server/lib/security.js`. The admin limiter is 8 attempts per 15 minutes, key `admin-login:` plus `ip:email`. The ninth call returns limited. `BUZZARD_TEST_MODE=1` or `BUZZARD_RATE_LIMIT_DISABLED=1` makes the limiter return false immediately. The project’s own `scripts/e2e-webserver.mjs` sets `BUZZARD_TEST_MODE=1`, and the isolated API did too. On that API, seven bad logins for `lock-probe@example.test` returned 401 `admin.auth.invalid` four times and then 401 `admin.auth.locked`. They did not return 429, because the test-mode switch disables the limiter before the lockout check can be overtaken by it. A separate in-memory process with test mode unset limited the 9th call and did not touch `server/data`. HTTP status for a real rate limit, from `adminAuthPlugin.js`, would be 429 `admin.auth.rateLimited`. That HTTP status was not observed on the test-mode server.

2FA runs only when `admin-2fa.json` has `enabled` and `secret` for that email. The overlay had no such file. The synthetic login did not require 2FA.

CSRF: bearer requests skip CSRF. Cookie CSRF is enforced only when `BUZZARD_CSRF_ENFORCE=1`. `/api/admin/login` is on the public path list. Default for this process is not enforced (`server/lib/csrf.js`).

Cookie: the admin UI does not set an httpOnly session cookie. The session is a bearer token in `sessionStorage`.

## 6. Admin Session Security

Isolated server `127.0.0.1:3011`, synthetic user only.

| Step | HTTP | Result |
| --- | --- | --- |
| `GET /api/admin/me` with no token | 401 | `admin.auth.required` |
| `POST /api/admin/login` synthetic administrator | 200 | `success=true`, role `administrator`, id `usr-e2e-synthetic`, 2FA not required. Token not recorded in this report. |
| `GET /api/admin/me` with that bearer token | 200 | same id and role |
| `GET /api/admin/commerce/overview` | 200 | `flags.salesEnabled=false` |
| `POST /api/admin/logout` | 200 | `success=true` |
| `GET /api/admin/me` with the same token | 401 | `admin.auth.required` |
| `POST /api/admin/login` unknown email | 401 | `admin.auth.invalid` |

After logout the overlay session list was empty, which matches `persistSessions()` rewriting the file. A later PIM import call used a new login session that existed only in the overlay. That overlay file was cleared when the temporary tree was closed. The real `admin-sessions.json` hash never changed, and the 18:28 session was not revoked.

`requireAuth` will also accept a SQLite JWT for roles `admin` and `administrator` without a row in `admin-sessions.json`. That second path was read in code and was not given a forged token in this sprint.

## 7. Admin Authorization

Role `administrator` maps to super-admin permissions, including `*`, in `server/lib/rbac.js`. The synthetic user was created with that role because the committed admin specs log in as the seed administrator and then open Control Center, sessions, PIM, and storefront health.

Anonymous admin calls return 401, as shown above. The commerce overview required the bearer token and still reported sales disabled. Storefront `GET /api/catalog/products` returned 200 without an admin token.

IDOR: a cart created with `customerId=cust_a` returned 403 for `GET /api/commerce/cart/{id}?customerId=cust_b`.

This sprint did not exercise a second, lower-privilege synthetic role against every admin route. The code path for a forbidden administrator-only action is present (`admin.auth.forbidden` on 2FA setup when `role !== "administrator"`). That branch was not called, so it is not marked verified.

## 8. E2E Isolation Architecture

`server/lib/auth.js` cannot be pointed at another directory without a code change, and this sprint did not change it. Isolation was a private user and mount namespace:

`unshare --user --map-root-user --mount` then `mount --bind /tmp/buzzard-admin-e2e/data /workspace/server/data`.

Inside that namespace, `buzzard.db` was absent and `admin-users.json` was the one synthetic user. The API process mountinfo showed `/tmp/buzzard-admin-e2e/data` on `/workspace/server/data`. Its open database file was `/tmp/buzzard-admin-e2e/catalog.sqlite`. Health confirmed that path. The host mount still showed the real files, and their hashes stayed constant while the API wrote sessions and security events into the overlay.

Ports: API `PORT=3011` (the server hardcodes listen address `0.0.0.0` in `server/server.js`; clients used `127.0.0.1`). Next.js `next dev -p 3010 -H 127.0.0.1`. Playwright `PLAYWRIGHT_SKIP_WEBSERVER=1`, so `reuseExistingServer` was not used and 3000/3001 were not adopted. Env: `BUZZARD_SALES_ENABLED=0`, `BUZZARD_E2E_DB=1`, `BUZZARD_TEST_MODE=1`, `BUZZARD_COMMERCE_CORE=1`, `BUZZARD_BACKUP_DIR=/tmp/buzzard-admin-e2e/backups`, `BUZZARD_DB_PATH` outside `server/data`.

Unit tests and part tests each had their own bind mounts (`/tmp/buzzard-admin-e2e/unit-data` and `part-data`) so they could not append to the real security log. The scorecard and in-process gates used `/tmp/buzzard-admin-e2e/score-data` and their own sqlite files.

No email, SMS, WhatsApp, live AI, payment, or carrier call was made. Egress checks were in-process decisions, not network calls.

After the runs, the API and the isolated Next process were killed. 3010 and 3011 were down. 3000 and 3001 were still listening. The synthetic bearer file under `/tmp` was removed.

## 9. Filesystem Write Boundary Verification

Host hashes were compared before traffic, after the HTTP chain, after unit tests, after both Playwright runs, and after shutdown. All six of `admin-sessions.json`, `audit-log.json`, `security-log.json`, `automation-events.json`, `admin-users.json`, and `buzzard.db` kept the digests in sections 3 and 4.

The isolated API did write. Overlay evidence: `security-log.json` grew under `/tmp/buzzard-admin-e2e/data` (admin_login, admin_logout, admin_login_failed, price_tampering, coupon_tampering, idor_attempt, commerce_permission_denied). Those events are not in the host file.

The unit-test overlay received `security-log.json`, `audit-log.json`, `automation-events.json`, and `customers.json`. The part-test overlay stayed empty. The host copies did not change.

A marker bind earlier in the sprint showed `INSIDE:synthetic` while `/workspace/server/data/MARKER` did not exist on the host.

Two unit tests stat `/workspace/server/data/buzzard.db` directly. Inside the hiding mount they fail with `ENOENT` before they can assert anything. That is an isolation artifact, not a database write. Re-run on the host, with `BUZZARD_DB_PATH` unset, they passed and the six protected hashes stayed the same. See section 21.

## 10. Admin Playwright Tests

Specs: `e2e/admin.spec.ts`, `e2e/admin-pim-core.spec.ts`, and the admin case in `e2e/storefront-bridge.spec.ts`. They skip unless `NEXT_PUBLIC_BUZZARD_API_URL` is set. They were not skipped. They use the real login form and `POST /api/admin/login`. They were not given a mocked session. Credentials are the spec defaults, which match the committed seed. The isolated users file was a new scrypt hash of that seed password, not a copy of the real hash.

### Run A — browser base `http://127.0.0.1:3011`

`lib/security/browserConnect.ts` treats `127.0.0.1` as a rebind lookalike and returns `BROWSER_REBIND_DENIED` before the later `host === "127.0.0.1"` allow. `browserFetch` then throws. `AdminLoginForm` shows “Anmeldung fehlgeschlagen. E-Mail oder Passwort ungültig.” for every error except API-unavailable, lockout, rate limit, and bad 2FA. The screenshot at `test-results/admin-pim-core-Admin-PIM-Core-E2E-Part-6-PIM-Core-page-loads-chromium-desktop/test-failed-1.png` shows that message. The isolated API log has no browser login from this run, and the host security log did not change. The request never reached either API.

Result: **FAIL** for these nine tests, all `page.waitForURL(/\/admin\/?$/)` timeout 15000 ms:

- Admin login → dashboard
- Control Center loads
- Sessions page loads
- PIM Core page loads
- Product list shows demo SKU
- Validation tab workflow
- Import dry-run
- Brands section
- Admin storefront health

“Admin login page loads” passed in this run because it only checks the page text.

Classification: **FAIL**. This is existing client policy, not a wrong synthetic password. The direct Node API login to `127.0.0.1:3011` succeeded in the same window.

### Run B — same API, browser base `http://localhost:3011`

`localhost` is allowed as `LOCAL_DEV`. Next on port 3010 was restarted inside the same mount namespace with `NEXT_PUBLIC_BUZZARD_API_URL=http://localhost:3011`. Playwright project `chromium-desktop`, 15 tests, 45.2 seconds.

| Test | Result |
| --- | --- |
| Admin login page loads | PASS |
| Admin login → dashboard | PASS |
| Control Center loads | PASS |
| Sessions page loads | PASS |
| PIM Core page loads | PASS |
| Product list shows demo SKU | PASS |
| Validation tab workflow | PASS |
| Brands section | PASS |
| Admin storefront health | PASS |
| Homepage, 320px category grid, mega menu, category listing, search | PASS |
| Import dry-run | **FAIL** |

Import dry-run clicks “Import” and “dry-run”, then expects body text `/Dry run/i`. The panel only sets that text from `result.importJobId` and `result.validation.overall` (`components/admin/AdminPimCorePanel.tsx`). `POST /api/admin/pim-core/import` on the isolated API returned **202** with keys `success`, `pendingApproval`, `executed`, `dryRun`, `approval`, `job`. `pendingApproval=true`, `executed=false`, `dryRun=true`. `importJobId` and `validation` are absent, so the UI throws before it can render “Dry run …”. The assertion was not weakened and the UI was not changed.

Host hashes were unchanged after both runs.

## 11. API Playwright Tests

Project `api`, run A, 20 tests started. None of the 9 failures and none of the 6 skips are in this project.

**PASS 20/20.** Specs matched by `playwright.config.ts`: `commerce-storefront`, `commerce-security`, `commerce-readiness`, `egress-security`, `master-command-acceptance`, `master-command-locales`, `master-command-mobile-rtl`.

`commerce-readiness` logged in through `POST /api/admin/login` and received the synthetic user. That is real authentication against the overlay file, not a mock.

## 12. Admin PIM Core Tests

Run A: all five PIM tests **FAIL** (login never reached the API).  
Run B: four **PASS**, “Import dry-run” **FAIL** with the 202 payload described in section 10.

The passing PIM tests covered page load, demo SKU list, validation tab, and brands, after a real form login as `usr-e2e-synthetic`.

## 13. Customer Journey Tests

`e2e/customer-journey.spec.ts` ran on desktop, mobile, and tablet in run A.

Homepage, warenkorb, and product → cart → checkout → READINESS_TEST ran on all three projects. No customer-journey failure is in the fail list.

**PASS** for the executed journey tests. Checkout in this spec uses `READINESS_TEST`.

## 14. Storefront Bridge Tests

`e2e/storefront-bridge.spec.ts` on `chromium-desktop`.

Run A: homepage overflow, 320px category grid, mega menu, category listing, and search **PASS**. Admin storefront health **FAIL** because login did not leave the login page.

Run B: those five storefront checks **PASS** again, and Admin storefront health **PASS** after the localhost API URL.

## 15. Desktop Tests

Project `chromium-desktop` started 32 tests in run A. Nine failed, all of them the admin UI tests in section 10. The other 23 passed, including customer journey, desktop overflow viewports, master-command Chromium, and the non-admin storefront bridge cases.

Viewport for the project is 1280×720. The journey file also walks 1440 and 1920 inside the desktop project.

## 16. Mobile Tests

Project `chromium-mobile` (Pixel 5 profile, viewport 375×812) started 13 tests. Three are the desktop overflow labels, which the spec skips when the project is not `chromium-desktop`.

**10 PASS, 3 SKIP, 0 FAIL.** Skipped names: `no horizontal overflow — desktop1280`, `desktop1440`, `desktop1920`.

Covered when not skipped: homepage, warenkorb, READINESS_TEST journey, mobile overflow labels from 320 through 414 and tablet768, and the mobile/Arabic landing spec included by the project match.

## 17. Tablet Tests

Project `chromium-tablet` started 12 tests at 768×1024. The same three desktop overflow labels are skipped.

**9 PASS, 3 SKIP, 0 FAIL.** No tablet failure was recorded.

## 18. Product Detail NULL Investigation

Temp database only: `/tmp/buzzard-admin-e2e/catalog.sqlite` (read-only query). The protected `buzzard.db` was not opened.

`server/lib/db.js` inserts `pim_prod_e2e_visible` / `BZ-E2E-VISIBLE-001` when `BUZZARD_E2E_DB=1` and does not set `ean`, `gtin`, `brand_id`, or `taxonomy_category_id`. The row in the temp database is:

| id | sku | ean | gtin | brand_id | status | visibility | taxonomy_category_id |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pim_prod_e2e_visible | BZ-E2E-VISIBLE-001 | NULL | NULL | NULL | READY | PUBLIC | NULL |

The hidden demo row `BZ-CORE-DEMO-001` does have EAN `5901234123457`, a brand id, and category `cat-05`, and its visibility is `HIDDEN`, so the public list does not return it.

`mapProduct` in `server/lib/pim/productCore.js` copies `ean: row.ean` and `status: row.status`. `attachRelations` loads a brand only when `brandId` is set. `mapPimToStorefront` in `server/lib/storefront/publicProductMapper.js` then sets `ean: product.ean || null` and `brand: null` when `product.brand` is missing. The returned object has no `status` property. `stockStatus` is computed from stock and was `in_stock`.

HTTP `GET /api/catalog/products?limit=5` returned 200, total 1, the synthetic SKU, `ean: null`, `brand: null`, `categoryId: null`, price 29.99 EUR. `hasStatus` is false.  
HTTP `GET /api/catalog/products/pim_prod_e2e_visible` returned 200 with the same nulls and no `status` key. The key list includes `ean`, `gtin`, `mpn`, `brand`, `stockStatus`, and does not include `status`.

So EAN and brand are null in the database row, and the mapper preserves that. Status is `READY` in SQLite and is dropped by the public serializer. The earlier “status: null” observation is a missing key, not a stored null. No EAN, brand, or category was invented.

The order snapshot inside the temp `commerce_orders.items_json` does include `status: "READY"` and `ean: null`. That is the commerce snapshot, not the public product DTO.

## 19. 45-Item Regression

`evaluateDevList51()` ran inside the private mount with `BUZZARD_DB_PATH=/tmp/buzzard-admin-e2e/gates.sqlite`.

| Mark | Count | Meaning in `devList51.js` |
| --- | --- | --- |
| ✅ | 45 | `CODE_COMPLETE` or `ALREADY_COMPLETE` |
| 🟡 | 0 | `PARTIAL` |
| 🔴 | 6 | `LIVE_BLOCKED` |
| ⬜ | 0 | not started |

`listed=51`, `salesGate=LOCKED`, `live=false`, `productionReady=false`.

Blocked items:

| n | Code |
| --- | --- |
| 19 | `TECDOC_LIVE_BLOCKED` |
| 20 | `LIVE_SUPPLIER_BLOCKED` |
| 28 | `SALES_LOCKED` |
| 30 | `REAL_REFUND_BLOCKED` |
| 37 | `TAX_CONNECT_BLOCKED` |
| 41 | `LIVE_CARRIER_RATE_BLOCKED` |

The host re-run of `server/__tests__/devList51Remainder.test.mjs` asserts the same 45/0/6 split and passed without changing `buzzard.db`.

`mapSupplierCategory("automotive/brakes")` returned `ok=false`, `code=CATEGORY_UNMAPPED`, `categoryId=null`.  
`mapSupplierCategory("automotive/bremssystem")` returned `CATEGORY_MATCHED`, category `cat-05`, subcategory `cat-05-03` (Bremssystem).  
`listActiveCatalogCategories().length` is 50.

Arabic RTL: the same host test file asserts `htmlDirForLanguage("ar")==="rtl"` and German `ltr`, and that test passed. Item 50 is inside the 45 complete marks. Thirty locales are item 46, also inside those 45. FIN-M25 was not added to the 51.

No completed item regressed in this score.

## 20. HTTP Commerce Regression

All of this used `127.0.0.1:3011` and the temp sqlite. No charge was captured.

| Step | HTTP | Observed |
| --- | --- | --- |
| Catalog | 200 | 1 public product, EUR 29.99 |
| Product detail | 200 | EAN null, brand null, status omitted |
| Cart create | 200 | currency EUR |
| Price tamper `clientPrice: 0.01` | 400 | `price_tampering` |
| Add quantity 2 | 200 | |
| Coupon tamper `clientDiscount: 999` | 400 | `coupon_tampering` |
| Coupon `WELCOME10` | 200 | discount 6, code WELCOME10 |
| Invalid coupon | 400 | `checkout.couponInvalid` |
| `COMMERCIAL` checkout attempt | 200 | `commercialOrders=0`, `realPayment=false`, `supplierOrders=0`, `salesEnabled=false` |
| Checkout start `READINESS_TEST` | 200 | |
| Validate DE address | 200 | |
| Complete `READINESS_TEST` | 200 | `success=true`, `state=COMPLETED`, `commercial=false`, `salesEnabled=false`. Body has no top-level `realMoneyMovement` field. |
| Oversell quantity 99999 | 400 | `quantity_too_high` |
| Foreign cart | 403 | |
| `GET /api/health/commerce` | 200 | `salesEnabled=false` |

Temp sqlite `commerce_orders`: 2 rows, both `order_type=READINESS_TEST`, `payment_status=AUTHORIZED`, metadata `captured=false`, `realMoneyMovement=false`, `supplierOrderSubmitted=false`, `dryRun=true`. `supplier_orders`: 0. `orders`: 0. `oms_orders` contains one migration fixture `BZ-2026-DEMO01` / `demo@example.com` created when the temp database initialized. That row is not a live customer order and is not in the protected database.

In-process, separate temp sqlite, sales env off:

| Check | Result |
| --- | --- |
| FR pool net 100 | ok, reserve 25 |
| DE pool | `DE_USES_PRIOR_APPROVAL_RULE` |
| Germany `postGermanyNet` | ok. Implementation sets `status: "UNVERIFIED"`, `elsterLive: false`, `filing: "WAITING_HUMAN"`, `paymentAuthority: false` (`germanyTaxPath.js`). |
| `submitElster()` | `ELSTER_BLOCKED`, `live=false` |
| `taxProvider.calculateTax` DE | ok, rate 19, dryRun true |
| `taxProvider.calculateTax` ZZ | `tax_rate_unknown`, blocked |
| HTTP `POST /api/tax/quote` DE | 200, rate 0.19, tax 19, source `placeholder` |
| HTTP `POST /api/tax/quote` ZZ | 200, rate 0.19, source `placeholder` |
| DHL `createShipment` | `HUMAN_GATE_REQUIRED`, `liveShipment=false` |
| DHL `trackShipment` transit | `IN_TRANSIT`, `live=false`, `liveShipment=false` |
| HTTP shipping label route | 200, placeholder keys, `trackingNumber=null`. This route does not return `HUMAN_GATE_REQUIRED`. |
| Dry return request | `live=false`. `refundMoney()` is `REAL_REFUND_BLOCKED`, `refundIssued=false`. |
| `paymentSandbox.capture` | `SALES_LOCKED`, `captured=false`, `live=false` |
| `sandboxAuthorize` | `SANDBOX_HOLD`, `captured=false`, `salesLocked=true` |

The HTTP tax quote uses `calculateTaxSync` in `commercialIntegrations.js`, which falls back to 0.19 for an unknown country. That is a different function from `taxProvider.calculateTax`, which refuses unknown countries. Both results are reported. Neither moved money.

## 21. Unit and Integration Tests

New results, this sprint. The previous 859/9/221 figures are not reused as this sprint’s result.

### Unit (`npm run test:unit` inside the private mount)

`BUZZARD_DB_PATH` was unset. Vitest 3.2.7.

- Test files: 2 failed, 117 passed (119)
- Tests: 2 failed, 857 passed (859)
- Duration: 22.05s
- Classification: **FAIL** for the suite, because two tests threw

Failures, both `ENOENT` on `stat /workspace/server/data/buzzard.db`:

- `devList51Remainder.test.mjs` — “closes the 51-item remainder without enabling sales or touching the protected db”
- `dryOrderDraft.test.mjs` — “does not touch the protected commerce sqlite”

The mount hid that file on purpose. The tests never reached the mtime assertion.

Host re-run of only those two files, `BUZZARD_DB_PATH` unset, protected hashes snapshotted before and after:

- **PASS** 2 files, 14 tests
- Protected hashes: unchanged

So the 45-item assertion and the dry-draft “do not touch buzzard.db” assertion pass when the real file is visible, and they do not write it. The namespaced full run must not be described as 859 passed.

### Part 24 and parts 27–35

Private mount, `node --test`, all **PASS**, 0 skipped:

| Script | Tests | Fail |
| --- | --- | --- |
| part24 | 10 | 0 |
| part27 | 18 | 0 |
| part28 | 24 | 0 |
| part29 | 36 | 0 |
| part30 | 22 | 0 |
| part31 | 24 | 0 |
| part32 | 15 | 0 |
| part33 | 21 | 0 |
| part34 | 26 | 0 |
| part35 | 25 | 0 |
| Total | 221 | 0 |

No separate integration suite beyond these part tests and the vitest unit run was executed. They are the integration checks named in the sprint.

### Python egress

`python3 -m unittest intelligence.security.test_egress`  
**PASS** 9 tests, 0.003s.

## 22. Lint and Typecheck

| Check | Result |
| --- | --- |
| `npm run lint` (`next lint`) | **PASS**. “No ESLint warnings or errors.” Deprecation notice for `next lint` only. |
| `npm run typecheck` (`tsc --noEmit`) | **PASS**. Exit 0. |

These two commands do not write `server/data`.

## 23. PR Analysis

Read-only GitHub state on 17 Nov 2026.

| PR | Head | Base | mergeable | mergeStateStatus |
| --- | --- | --- | --- | --- |
| #500 | `8817422b` `cursor/buzzard-autonomous-continuation-c293` | `d413d13a` `cursor/pim-catalog-foundation-c293` | CONFLICTING | DIRTY |
| #504 | `df9c12ec` `cursor/dry-order-draft-remainder-c293` | #500’s branch | MERGEABLE | CLEAN |
| #506 | `fdc3132c` `cursor/dev-list-51-remainder-c293` | #504’s branch | MERGEABLE | CLEAN |
| #502 | `01a00d1e` `cursor/buzzard-fin-m25-consent-schema-4be7` | untouched | not modified | OPEN |

`git merge-tree d413d13a 8817422b` exits 1 with one content conflict: `server/lib/supplier/supplierMappingService.js`. `git merge-file --diff3` of the three blobs produces **5** conflict regions, not a clean auto-merge. The regions are the import block, the start of `mapSupplierCategory`, the active-category loader versus the older resolver continuation, the `refuse()` object shape, and the supplier-category lookup inside product mapping.

Foundation side still calls `resolveProductCategory`. The continuation side (this stack) loads the 50 active shop categories from JSON and refuses `CATEGORY_UNMAPPED`, `CATEGORY_RETIRED`, `CATEGORY_AMBIGUOUS`, and `CATEGORY_UNKNOWN`. Those refusals are what keep `automotive/brakes` unmapped. No side was chosen. The file on this branch was not edited.

#504 applies cleanly onto #500. #506 applies cleanly onto #504. Neither is a reason to merge them into main.

Safe order, still manual:

1. Hand-merge #500. Keep the 50-active loader and the unmapped/retired refusals. Do not replace them with `resolveProductCategory` alone. Re-check `automotive/brakes` → `CATEGORY_UNMAPPED` and `automotive/bremssystem` → `cat-05` / `cat-05-03`.
2. Merge #504 onto that result.
3. Merge #506 onto that result.
4. Only then consider main, using the key-level plan in section 24.

Do not merge #502 into this stack as part of the 51-item count.

## 24. Main Conflict Analysis

`git merge-tree origin/main HEAD` exits 1 with **43** conflict lines. `origin/main` is `bd3dc910`. Nothing was resolved.

| Kind | Count |
| --- | --- |
| add/add | 26 |
| content | 17 |

Files:

- `app/kategorie/[...slug]/page.tsx`
- `components/CategorySidebar.tsx`
- `lib/categories.ts`
- `lib/categories/i18n.test.ts`
- `lib/categories/i18n.ts`
- `lib/categories/service.ts`
- `lib/i18n/catalog.test.ts`
- `lib/i18n/context.tsx`
- `lib/i18n/format.ts`
- `lib/i18n/locales/` bg, ca, cs, da, el, en, es, et, eu, fi, fr, ga, gl, hr, hu, it, lb, lt, lv, mt, nl, pl, pt, ro, sk, sl, sv
- `lib/i18n/routing.ts`
- `lib/i18n/translations.ts`
- `lib/i18n/types.ts`
- `lib/navigation/home-config.ts`
- `lib/site/catalog-stats.ts`
- `server/lib/productAi.js`
- `vitest.config.ts`

`supplierMappingService.js` is not in this 43. It conflicts against the foundation base of #500, which is a different merge.

Safe plan: do not take either side of an add/add locale or category file as a whole. Merge locale keys by key so one side does not drop the other side’s strings. Do not auto-pick `lib/i18n/routing.ts`, `lib/categories.ts`, or `app/kategorie/[...slug]/page.tsx`. Review `productAi.js` and `vitest.config.ts` as content conflicts. Re-run `evaluateDevList51()` and the `automotive/brakes` mapping check after any manual merge. This sprint did none of that.

## 25. Security Findings

No fix was applied. Findings are diagnostic.

| ID | Risk | Finding | Evidence |
| --- | --- | --- | --- |
| S1 | High for test isolation, medium for production | Admin JSON paths are hardcoded to `server/data`. Any process that loads `auth.js` writes the real session, lockout, and security files unless the directory is hidden with a mount. | `auth.js` `dataDir`. Previous 18:28 session. This sprint’s mount was required because the code cannot be redirected. |
| S2 | High | Full bearer tokens are persisted in `admin-sessions.json`. Logout and expiry rewrite that file, but a copy of the file is the session. | `persistSessions()`. Real file still has two tokens. Values not printed. |
| S3 | Medium | The admin UI keeps the token in `sessionStorage`, not an httpOnly cookie. Any script that can read `sessionStorage` can replay it until logout or the 8-hour expiry. | `lib/admin/client.ts` `TOKEN_KEY`. |
| S4 | Medium | CSRF is off unless `BUZZARD_CSRF_ENFORCE=1`. Bearer requests skip CSRF even when enforcement is on. | `server/lib/csrf.js`. |
| S5 | Medium | `requireAuth` accepts a SQLite JWT with role `admin` or `administrator` and does not consult `admin-sessions.json` for that path. Logout of the JSON session does not revoke such a JWT. | `auth.js` lines 297–315. Not exploited. |
| S6 | Medium | `BUZZARD_TEST_MODE=1` disables the login rate limiter. The official E2E launcher sets that flag. Account lockout still trips on the 5th failure (401 `admin.auth.locked`). | `rateLimitStore.js` lines 19–20. Isolated probe. In-memory 9th call limited when the flag is unset. |
| S7 | Low / test-breaking | `evaluateBrowserConnect` denies `127.0.0.1` as `BROWSER_REBIND_DENIED` before the explicit `127.0.0.1` allow. The admin form then shows the generic invalid-credentials string. `localhost` is allowed. | `lib/security/browserConnect.ts` lines 34–42 and 62–78. Run A vs run B. |
| S8 | Low | Failed and successful admin logins record the email address in the security log. Passwords are not stored there. | Key set of the real security log. |
| S9 | Informational | HTTP `POST /api/tax/quote` uses a 19% placeholder for unknown countries. `taxProvider.calculateTax` returns `tax_rate_unknown` for the same input. | Section 20. |
| S10 | Informational | HTTP shipping-label route returns a placeholder with a null tracking number. The carrier adapter used by the scorecard returns `HUMAN_GATE_REQUIRED` and does not create a live shipment. | Section 20. |

The 18:28 administrator session on the real file remains valid until 18 Nov 2026 02:28 Europe/Berlin. It was not revoked, because this sprint was forbidden to invalidate real admin sessions.

## 26. Remaining Blockers

| Blocker | State |
| --- | --- |
| `TECDOC_LIVE_BLOCKED` | closed, as required |
| `LIVE_SUPPLIER_BLOCKED` | closed |
| `SALES_LOCKED` | closed |
| `REAL_REFUND_BLOCKED` | closed |
| `TAX_CONNECT_BLOCKED` | closed |
| `LIVE_CARRIER_RATE_BLOCKED` | closed |
| PR #500 content conflict in `supplierMappingService.js` | open, 5 diff3 regions, not resolved |
| Main, 43 conflicts | open, not resolved |
| Admin PIM “Import dry-run” UI versus 202 payload | open, test FAIL |
| Admin UI cannot call an API addressed as `127.0.0.1` | open, `BROWSER_REBIND_DENIED` |
| Real 18:28 admin session still valid | left in place on purpose |
| No GitHub check runs were treated as a pass | checks were not used as evidence of green CI |

## 27. Production Readiness

**Not ready.**

`productionReady=false`, `live=false`, sales gate `LOCKED`, Stripe and PayPal egress locked, OpenAI egress denied, ELSTER blocked, DHL shipment human-gated, refunds blocked, commercial checkout attempt `commercialOrders=0`. The isolated readiness orders are `READINESS_TEST` with `realMoneyMovement=false` and `captured=false`.

The admin import UI and the `127.0.0.1` browser policy are unresolved. Main cannot be merged cleanly. Those are additional reasons this is not a production candidate. No deploy was performed.

## 28. Recommended Next Actions

1. Leave the real `admin-sessions.json`, `audit-log.json`, `security-log.json`, and `automation-events.json` as they are. Do not revoke the 18:28 session from an automated run. If an operator wants it gone, revoke that one session id on purpose and keep the audit trail.
2. Repair the PIM import contract before changing the test. Either return `importJobId` and `validation` from `POST /api/admin/pim-core/import` when `dryRun` is true, or change the panel to render the 202 `pendingApproval` payload and then update the assertion to the new contract. Do not relax `/Dry run/i` just to go green.
3. Decide the `127.0.0.1` browser rule explicitly. Today the rebind check makes the later allow unreachable, so admin UI tests cannot target a `127.0.0.1` API. `localhost` works and was used for run B.
4. Give `auth.js` a data-directory override only in a later, reviewed change, so tests do not need a mount namespace to avoid the real JSON files. Until then, keep E2E servers in a private mount and do not set `reuseExistingServer` against 3000/3001.
5. Hand-merge #500’s `supplierMappingService.js` by keeping the 50-active loader and the `CATEGORY_UNMAPPED` / `CATEGORY_RETIRED` refusals. Then merge #504, then #506. Merge main by locale key, not by taking a whole locale file. Do not touch PR #502 while doing that.
6. Keep `BUZZARD_TEST_MODE` off for any run that is supposed to prove the 8-per-15-minute login limit. The limiter itself works in memory when the flag is unset.

---

Final protected hashes, after isolated processes were stopped, Europe/Berlin:

| File | SHA-256 |
| --- | --- |
| admin-sessions.json | `15f9855f0046dda6b73d08a7cc348faf1451023dd617b16492fc2becae355e17` |
| audit-log.json | `e1b4b60d1ff8ac964006b14a95846348ef90e2639139a7e35c6f473365680a4b` |
| security-log.json | `12d8bd3d18772380acf151241a82c0536adf03a130b9e57c608e73dfc7e37ff4` |
| automation-events.json | `c1c32687822049446d54f4ae209a899a7606efbdc69a718e8060b2341c1abc21` |
| admin-users.json | `945fd0a13fc31b0a044ed1ca3a2115d737c67d9de2ccb36258155850dd1c0e63` |
| buzzard.db | `42224f804208319768768672e43b90b3d240284d26e91c713beea554bafa497e` |

SALES = LOCKED. EGRESS = DENY. productionReady = false. live = false.  
PR #500 OPEN. PR #504 OPEN. PR #506 OPEN. PR #502 untouched.  
No commit. No push. No merge. No deploy.
