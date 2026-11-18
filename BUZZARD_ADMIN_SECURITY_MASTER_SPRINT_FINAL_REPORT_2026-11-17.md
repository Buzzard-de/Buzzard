# BUZZARD ADMIN SECURITY, DATA INTEGRITY & E2E — MASTER SPRINT FINAL REPORT

Date: 17 November 2026, Europe/Berlin
Branch: `cursor/dev-list-51-remainder-c293` (not switched)
Commit: `fdc3132c308cb3ae36a07b21d5e66b6544fb2515` (unchanged; nothing committed, pushed, merged or deployed)
Earlier reports `BUZZARD_ADMIN_SECURITY_DATA_INTEGRITY_E2E_2026-11-17.md` and `BUZZARD_FINAL_INTEGRATION_E2E_AUDIT_2026-11-17.md` were left as they are.

## Result

The sprint is **partly delivered**. The admin UI, the 127.0.0.1 login problem, the PIM dry-run contract, the session handling in the browser, the test isolation and the two ENOENT tests are fixed in the working tree and pass. The server-side security fixes are written and tested, but they are **not applied to the working tree**. They are in one patch file:

`BUZZARD_ADMIN_SECURITY_MASTER_SPRINT_SERVER_PATCH_2026-11-17.patch` (43 files, applies cleanly to the current working tree, `git apply --check` passes)

The reason: the API on port 3001 runs under `node --watch` on the real `server/data/buzzard.db`. Any edit to a file it loads (`server/lib`, `server/plugins`, `server/server.js`, root `package.json`) restarts it, and the restart rewrites the protected database. That would break two of the sprint's restrictions at once. A controlled experiment in an isolated copy confirmed which paths trigger a restart; only files outside that set were landed.

Until the patch is applied, the server weaknesses listed in section C exist in the working tree, including on the running development API.

### One incident during verification, repaired

My isolated Playwright run in `/workspace` started a second Next.js dev server in the same checkout. Next.js clears `.next` on start, so the build directory of the storefront on port 3000 was wiped twice (20:37 and 20:39 Europe/Berlin). The 3000 process itself was never stopped or restarted (same PIDs, same start times), but `/admin/login/` returned 404, then 500, and nine client files for six routes returned 404.

- Cause: the script checked for another Next.js server from inside the test namespace, where the working directory of outside processes cannot be read. The check silently found nothing.
- Fix: `scripts/isolated/e2e.sh` now decides this before entering the namespace and treats an unreadable process as "in use". The storefront is then served from a private copy under `/tmp`.
- Repair of port 3000: its dev server only rewrites a client file when the content changes, so nine source files were given a trailing comment and restored byte for byte (SHA-256 checked, `git status` unchanged): `components/admin/AdminLoginForm.tsx`, `components/admin/AdminShell.tsx`, `styles/admin.css`, `styles/account.css`, `components/account/AccountShell.tsx`, `components/account/AccountLoginForm.tsx`, `components/LocaleLanding.tsx`, `components/CartView.tsx`, `components/ProductList.tsx`.
- Verified after repair (about 20:52): 25 routes on port 3000 requested; 24 answer 200, every asset they reference returns 200, and no file listed in the build manifests is missing. `/kategorie/` answers 404 because that route has no index page.
- Verified after the fix: the full Playwright run was repeated from `/workspace`; the fingerprint of port 3000's `.next` directory was identical before, during and after.

The protected databases and the JSON files were not affected at any point.

## How completion is measured

Each work area has a list of criteria taken from the sprint text. A criterion counts only if it was verified. Two figures are given: the working tree as it is now, and the working tree with the patch applied (measured on a patched copy under `/tmp`).

| # | Work area | Previous status | Working tree now | With patch applied |
|---|---|---|---|---|
| 1 | Administrator login | 9 admin UI tests failing on 127.0.0.1 | 8/8 = 100 % | 8/8 = 100 % |
| 2 | Session security | Verified by hand on an isolated server, no automated tests | 10/12 = 83 % | 10/12 = 83 % |
| 3 | Authorization | Only spot checks | 4/7 = 57 % | 6/7 = 86 % |
| 4 | Security logs | Explained, not hardened | 3/8 = 38 % | 6/8 = 75 % |
| 5 | Audit logs | Explained, not hardened | 2/8 = 25 % | 5/8 = 63 % |
| 6 | Session and automation records | 18:28 session unexplained in origin | 4/10 = 40 % | 7/10 = 70 % |
| 7 | Test isolation and final verification | Isolated API proven once, 2 ENOENT failures, PIM dry-run failing | 7/8 = 88 % | 8/8 = 100 % |

---

## 1. Administrator login

**Previous status:** nine admin UI tests failed before the request was sent when the browser used `http://127.0.0.1:<port>`; login worked on `localhost`.

**Final status:** fixed and landed. 100 % of the eight criteria.

| Criterion | Result |
|---|---|
| Admin login works | PASS (UI and API) |
| Password verification stays secure | PASS — scrypt verification unchanged |
| Invalid credentials rejected | PASS — wrong password and unknown account give the same generic message, no token stored |
| Anonymous admin access returns 401 | PASS — `admin.auth.required` |
| Authenticated access works | PASS |
| Error messages expose nothing sensitive | PASS — three fixed messages (invalid login, service unreachable, blocked by browser policy) |
| `BROWSER_REBIND_DENIED` on 127.0.0.1 | FIXED |
| Synthetic administrator accounts only | PASS — created per run under `/tmp`, one per role |

**Problem fixed:** `isRebindLookalike` in `lib/security/browserConnect` matched the literal `127.0.0.1` itself, so the exact loopback address was refused as a rebinding lookalike before the existing local-development rule could allow it. The literal is now excluded; hosts that merely contain it (for example `127.0.0.1.attacker.example`) are still refused. Authentication was not weakened.

**Files changed:** `lib/security/browserConnect.ts`, `lib/security/browserConnect.js`, `components/admin/AdminLoginForm.tsx`, `server/__tests__/browserConnectLoopback.test.mjs` (new).

**Tests:** `browserConnectLoopback` 18 passed. Playwright `admin.spec.ts` 4 passed, `admin-session.spec.ts` login cases passed. 0 failed, 0 skipped.

**Remaining blocker:** in production the current code creates the demo administrator accounts from the committed seed file when `admin-users.json` does not exist. Fixed only in the patch (first administrator from `ADMIN_EMAIL` / `ADMIN_PASSWORD`, otherwise no account).

## 2. Session security

**Previous status:** behaviour checked by hand on an isolated server; no automated coverage.

**Final status:** all five acceptance results hold. Two of the twelve items inspected are weaknesses of the existing design and were left unchanged, as instructed. 83 %.

| Acceptance | Result | Evidence |
|---|---|---|
| Valid session | PASS | UI and API tests |
| Invalid session → 401 | PASS | unknown and tampered token |
| Expired session → 401 | PASS | unit test with a simulated clock, 8 h TTL; the expiry code is identical in both trees, the test file is in the patch |
| Logged-out token → 401 | PASS | UI test: token cleared, old token refused |
| Anonymous admin request → 401 | PASS | |

| Item inspected | Finding |
|---|---|
| Session creation, bearer validation, expiry, 8 h TTL, logout, revocation | Hold |
| Session fixation | Holds — the server issues a new random token on every login and never accepts one from the client |
| Secure cookie configuration | Not applicable — admin sessions do not use cookies |
| Session storage on the server | **Weakness, unchanged:** tokens are stored in plain text in `admin-sessions.json` |
| Exposure through `sessionStorage` | **Weakness, unchanged:** any script running in the admin page can read the token. Moving to an HttpOnly cookie is an architecture change and needs a decision |

**Problems fixed (landed):**
- An open admin page kept showing the dashboard after its session had expired or been revoked on the server. `lib/admin/context.tsx` now re-checks the session on window focus, on tab visibility and every five minutes, and returns to the login form on 401. A network error does not log the user out.
- Logout now always clears the local state and returns to the login form, even if the logout request fails.

**Files changed:** `lib/admin/context.tsx`, `components/admin/AdminShell.tsx`, `e2e/admin-session.spec.ts` (new), `e2e/support/admin.ts` (new).

**Tests:** `admin-session.spec.ts` 11 passed (persistence across reload, logout, server-side revocation, invalid stored token, and the login cases). Patch: `adminSessionSecurity` 14 passed.

**Remaining blockers:** plain-text tokens at rest; a session keeps its role until it expires, even after a role or password change; the login limiter key uses `X-Forwarded-For` as sent by the client, so the limiter can be sidestepped (the per-account lockout still applies).

## 3. Authorization

**Previous status:** spot checks only.

**Final status:** existing roles kept, none invented. The gaps are closed in the patch, not in the working tree.

| Criterion | Now | With patch |
|---|---|---|
| Role definitions | Hold | Hold |
| Permission definitions | Hold | Hold |
| API route protection | **Gap** | Closed |
| Admin page protection | Holds | Holds |
| Critical operation protection | **Gap** | Admin operations closed; webhooks still unsigned |
| Unauthorized requests rejected | Holds (371 `/api/admin/*` routes: anonymous → 401) | Holds |
| Privilege escalation | **Gap** | Closed |

**What the sweep found.** All 756 registered routes were called on an isolated API, anonymously and as each synthetic role, on both trees.

- Working tree: 79 routes of the admin modules (payments, order management, logistics, fulfilment, marketplace, security, analytics, PIM catalog, supplier hub, master admin, and operations such as refunds, invoices, shipping labels, supplier import) answer without a login. A read-only account reaches 6 write routes.
- With the patch: all 79 return 401 anonymously; read-only gets 403 on all 40 module write routes; no route became more permissive.

**Problem fixed (patch):** `server/lib/routePermissions.js` gains a policy for the admin module prefixes and the individual admin operations, using the existing permissions and matching the admin navigation.

**Files changed:** landed — `e2e/admin-session.spec.ts` (read-only cases). Patch — `server/lib/routePermissions.js`, `server/__tests__/adminRoutePermissions.test.mjs`.

**Tests:** landed — read-only account gets 403 on session revocation and on PIM import, and the UI shows the error: passed. Patch — `adminRoutePermissions` 39 passed.

**Remaining blockers:** 67 write routes still accept anonymous requests after the patch. Most are customer-facing by design (cart, checkout, account, reviews). Not by design: 5 webhook routes without signature verification and 8 `/api/ai-center/*` routes. A read-only admin can still call a few endpoints that accept any logged-in user (`/api/payments/session`, `/api/tax/quote`, `/api/logistics-fulfillment/returns`, `/api/wms-inventory/scan`).

## 4. Security logs (`security-log.json`)

**Previous status:** content explained; no hardening.

**Final status:** 3 of 8 now, 6 of 8 with the patch.

| Criterion | Now | With patch |
|---|---|---|
| Schema | Verified | Verified |
| Read/write boundary (single writer module) | Holds | Holds |
| Atomic write | **No** — file rewritten in place | Yes — temp file, then rename |
| Concurrent writers | Safe within one process only | Same |
| Malformed JSON | **History lost** — read as empty, next event overwrites the file | Original kept as `<file>.corrupt-<hash>`, logged |
| Redaction | No password or token is written; **e-mail addresses are** | Same |
| Unauthorized access | **Downloadable without login** (see C1) | Closed |
| Completeness for authentication events | Login success, failure, lockout, logout, revocation are logged | Same |

**Files changed:** patch only — `server/lib/securityLog.js`, `server/lib/jsonFileStore.js` (new), `server/lib/dataDir.js` (new).

**Tests:** patch — `adminJsonStoreIntegrity` 16 passed (shared with areas 5 and 6).

**Remaining blockers:** e-mail addresses in the log; two API processes writing the same file can overwrite each other's entries.

## 5. Audit logs (`audit-log.json`)

**Previous status:** content explained; no hardening.

**Final status:** 2 of 8 now, 5 of 8 with the patch.

| Criterion | Now | With patch |
|---|---|---|
| Schema | Verified | Verified |
| Read/write boundary | Two modules (`audit.js`, `coreAudit.js`) write the same file, both synchronously in one process | Same, through one store |
| Atomic write | **No** | Yes |
| Concurrent writers | Safe within one process only | Same |
| Malformed JSON | **History lost** | Original preserved |
| Redaction | **`oldValue` / `newValue` are stored unredacted** | Same |
| Unauthorized access | **Downloadable without login** when the file exists | Closed |
| Audit trail completeness | **Not measured** per admin write route | Not measured |

**Files changed:** patch only — `server/lib/audit.js`, `server/lib/coreAudit.js`.

**Remaining blockers:** no redaction of changed values; completeness unverified; both writers keep only the newest 5,000 entries, so older history is dropped without notice.

## 6. Session and automation records (`admin-sessions.json`, `automation-events.json`)

**Previous status:** a demo administrator session created at 18:28 by the earlier test run, origin and impact not established.

**Final status:** identity established, nothing revoked or deleted. 4 of 10 now, 7 of 10 with the patch.

**The 18:28 session.** The file holds two sessions. Both belong to the seeded demo administrator account, were opened from 127.0.0.1 by the Playwright desktop browser inside an automated test sequence, at 17:52 and 18:28 Europe/Berlin.

| Question | Answer |
|---|---|
| Synthetic test data? | Yes in origin — created by the test run, not by a person |
| A real administrator session? | No person logged in. Technically both are valid bearer sessions for the demo administrator on the development API |
| Expired or active? | Active until 01:52 and 02:28 Europe/Berlin on 18 November, then they expire on their own |

They were left in place. Cause: Playwright reused the already running developer stack and the specs defaulted to `localhost:3001`. `e2e/global-setup.ts` now refuses to run against a stack that is not isolated.

| Criterion | Now | With patch |
|---|---|---|
| Identity of the 18:28 session established | Done | Done |
| Nothing revoked, deleted or reset | Holds | Holds |
| Schema | Verified | Entries without a token are ignored on load |
| Read/write boundary | Holds | Holds |
| Atomic write | **No** | Yes, with fsync for sessions and users |
| Concurrent writers | Safe within one process only | Same |
| Malformed JSON | **All admins logged out, file overwritten** | Logged out, original preserved |
| Duplicate automation events | **Recorded again** under the same key (never sent twice) | Same |
| Redaction | **Tokens in plain text; e-mail can appear in automation `idempotencyKey`** | Same |
| Unauthorized access | **Downloadable without login** | Closed |

**Files changed:** patch only — `server/lib/auth.js`, `server/lib/automationEngine.js`.

## 7. Test isolation and final verification

**Previous status:** an isolated API under a private mount was proven once; two unit tests failed with ENOENT; the PIM import dry-run test failed; the earlier E2E run had written to the real JSON files.

**Final status:** 7 of 8 now, 8 of 8 with the patch.

| Criterion | Now |
|---|---|
| All tests use synthetic data | Holds |
| Test JSON files under `/tmp` in isolated runs | Holds |
| Plain `vitest` / `node --test` cannot write to the real `server/data` | **Only with the patch** — unpatched unit tests write four JSON files there unless run through the wrapper |
| Isolated test databases | Holds |
| Login limiter tested in both modes | Holds — unit and HTTP |
| Test processes separate from 3000 / 3001 | Holds after the fix described under "One incident" |
| Real file hashes compared before and after | Holds — the wrapper does it on every run and fails with exit code 90 on any change |
| Two ENOENT failures fixed without disabling tests | Holds |

**What was built (landed):**
- `scripts/isolated/run.sh` — runs any command in a private mount namespace where `server/data` is a throwaway directory, optionally without network.
- `scripts/isolated/e2e.sh` — private API (3011) and storefront (3010), synthetic administrators per role, `--limiter on|off`. Ports 3000 and 3001 are refused.
- `e2e/global-setup.ts` — Playwright stops unless the API it would use is an isolated one.

**ENOENT failures:** both tests read the protected database with a path that did not exist in an isolated run. They now compare the database state through `server/__tests__/support/protectedDb.mjs`, which treats "not present" as a valid state that must also be unchanged afterwards. Assertions were not removed.

**PIM import dry-run:** the endpoint answers 202 with `pendingApproval: true`; the UI expected a finished job. The UI now shows "Dry run pending approval — not executed", the approval id, status and risk, and a link to the Control Center. Nothing is reported as imported or validated. The approval requirement is untouched. The test now asserts the 202 contract, the pending note, the approval in the Control Center and that the product was not created.

**Files changed:** `scripts/isolated/run.sh`, `scripts/isolated/e2e.sh`, `scripts/isolated/seed-synthetic-admins.cjs`, `e2e/global-setup.ts`, `e2e/admin-login-limiter.spec.ts`, `e2e/admin-pim-core.spec.ts`, `e2e/commerce-readiness.spec.ts`, `playwright.config.ts`, `lib/admin/pimCore.ts`, `lib/admin/pimCoreTypes.ts`, `components/admin/AdminPimCorePanel.tsx`, `server/__tests__/support/protectedDb.mjs`, `server/__tests__/devList51Remainder.test.mjs`, `server/__tests__/dryOrderDraft.test.mjs`.

**Product `BZ-E2E-VISIBLE-001`:** expected test data, no defect. `server/lib/db.js` inserts it only when `BUZZARD_E2E_DB=1`, as a synthetic storefront fixture with no EAN, GTIN, brand or category. The public mapper passes those fields through when they exist and deliberately leaves out admin fields such as `status`. Nothing was changed and no product data was invented. Observation, not changed: a product without a category skips the storefront category gate.

---

## Test matrix

All runs were isolated: private data directory, private database, no network, ports 3010/3011. Nothing ran against ports 3000/3001.

| Suite | Working tree | With patch |
|---|---|---|
| Typecheck (`tsc --noEmit`) | PASS | PASS |
| Lint (`next lint`) | PASS, no warnings | PASS |
| Unit and integration (vitest) | 877 passed, 0 failed, 0 skipped (120 files) | 993 passed, 0 failed, 0 skipped (125 files) |
| Part 24 and Parts 27–35 (`node --test`) | 221 passed, 0 failed, 0 skipped (10 files) | 221 passed, 0 failed, 0 skipped |
| Python egress | 9 passed | 9 passed |
| Playwright, limiter off, all four projects | 84 passed, 0 failed, 7 skipped | 84 passed, 0 failed, 7 skipped |
| Playwright, limiter on | 2 passed, 0 failed, 1 skipped | 2 passed, 0 failed, 1 skipped |

BLOCKED: none of the suites. Not run at all: anything against production, and the patched server in `/workspace` itself.

The skipped tests are not counted as passed. They are skipped by design: 6 are desktop-width layout checks (1280, 1440, 1920 px) that do not apply to the mobile and tablet projects; in each limiter run, the case for the other limiter mode is skipped, and it passes in the other run.

Patch-only test files: `adminSessionSecurity` 14, `adminJsonStoreIntegrity` 16, `staticFilePolicy` 35, `adminRoutePermissions` 39, `jwtSecretHardening` 12.

## A. Total completion for the seven items

- Working tree as it is: **62 %** (average of 100, 83, 57, 38, 25, 40, 88).
- With the patch applied: **82 %** (average of 100, 83, 86, 75, 63, 70, 100).

## B. Remaining engineering effort

No hour figure is given; the remaining work is described by scope instead.

| Work | Scope |
|---|---|
| Apply the patch | One `git apply`. Restarts the API on 3001, so it needs a moment when that restart is acceptable. Then `npm run test:unit:isolated` and `npm run test:e2e:isolated` |
| Webhook signature verification | 5 routes, one verifier per provider; needs the provider secrets |
| `/api/ai-center/*` and the "any logged-in user" endpoints | Policy entries in `routePermissions.js` plus ownership checks in the handlers named in area 3 |
| Session tokens hashed at rest, revocation on role or password change | `server/lib/auth.js` only; existing sessions are invalidated once |
| HttpOnly cookie instead of `sessionStorage` | Architecture change: login, logout, API client, CSRF enforcement; needs a decision first |
| Trusted-proxy handling for the client address | `server/lib/security.js`, one setting |
| Log redaction and audit completeness | `securityLog.js`, `audit.js`, `coreAudit.js`, plus a per-route audit check |
| Multi-process safety of the JSON stores | File locking, or move these records into SQLite — the larger of the two |
| Smoke scripts that hardcode the demo login and default to port 3001 | `scripts/part*-smoke.mjs`, mechanical |

## C. Security issues still blocking production

Fixed in the patch, open in the working tree:

1. **Files served without login.** The API's static fallback serves any file under the repository root. Shown on an isolated API: `server/data/admin-users.json`, `server/data/security-log.json`, `server/data/buzzard.db`, the admin seed file, server source, `package.json` and `render.yaml` all return 200 anonymously. `admin-sessions.json` is served the same way when it exists. The development API on 3001 listens on all interfaces and runs this code. The patch allows only `public/`, `logo/`, `styles/` and root-level `.html` files.
2. **Demo administrator accounts in production** when `admin-users.json` is missing.
3. **Built-in JWT signing secret** when `JWT_SECRET` is not set. Anyone who knows it can mint accepted tokens.
4. **79 admin-module routes reachable without login, 6 write routes reachable by a read-only account.**
5. **Non-atomic JSON writes and silent loss of a damaged file's history.**

Open in both:

6. Webhooks accept unsigned requests (5 routes).
7. `/api/ai-center/*` accepts anonymous writes (8 routes).
8. Session tokens in plain text at rest; no revocation on role or password change.
9. Token readable by scripts in the admin page (`sessionStorage`).
10. Client-supplied `X-Forwarded-For` is trusted for the limiter key.
11. E-mail addresses in the security log; unredacted values in the audit log.
12. Concurrent API processes can lose JSON updates; the audit log keeps only the newest 5,000 entries.
13. Customer endpoints that return a record by id without an ownership check were seen in the sweep and not examined further.
14. `/api/health` shows the database path.

Production itself was not probed.

## D. Admin UI test results

| Acceptance | Result | Test |
|---|---|---|
| Admin login UI | PASS | `admin.spec.ts`, `admin-session.spec.ts` |
| Admin logout UI | PASS | token cleared, old token refused |
| Admin session persistence | PASS | survives reload |
| Admin session expiration | PASS for server-side revocation and an invalid stored token (browser returns to login). The 8 h timeout itself is covered by the unit test, not by a browser test |
| Admin authorization | PASS | read-only account refused in API and UI |
| PIM import dry-run | PASS | 202 pending-approval contract |
| Pending approval visibility | PASS | pending note, approval id, entry in Control Center |
| Error handling | PASS | invalid login, unreachable service, refused import |

Admin UI total: 20 passed, 0 failed, 0 skipped (`admin.spec.ts` 4, `admin-pim-core.spec.ts` 5, `admin-session.spec.ts` 11). The nine former failures on 127.0.0.1 are gone; all runs used 127.0.0.1.

## E. Desktop, mobile and tablet results

| Project | Passed | Failed | Skipped |
|---|---|---|---|
| API | 22 | 0 | 1 |
| Desktop | 43 | 0 | 0 |
| Mobile | 10 | 0 | 3 |
| Tablet | 9 | 0 | 3 |

Covered: customer journey (home, product, cart, checkout readiness), storefront bridge, product listing, cart API round trip, price tampering, coupon tampering and server-side coupon validation, foreign-cart access, duplicate checkout, commercial checkout blocked with sales off, RTL landing. Identical on the working tree and the patched tree.

## F. SHA-256 of the protected files, before and after

Start of sprint versus end of sprint, `/workspace/server/data/`:

| File | SHA-256 before | SHA-256 after | |
|---|---|---|---|
| `admin-sessions.json` | `15f9855f0046dda6b73d08a7cc348faf1451023dd617b16492fc2becae355e17` | same | identical |
| `audit-log.json` | `e1b4b60d1ff8ac964006b14a95846348ef90e2639139a7e35c6f473365680a4b` | same | identical |
| `security-log.json` | `12d8bd3d18772380acf151241a82c0536adf03a130b9e57c608e73dfc7e37ff4` | same | identical |
| `automation-events.json` | `c1c32687822049446d54f4ae209a899a7606efbdc69a718e8060b2341c1abc21` | same | identical |
| `admin-users.json` | `945fd0a13fc31b0a044ed1ca3a2115d737c67d9de2ccb36258155850dd1c0e63` | same | identical |
| `customers.json` | `ef23706b719739fe3820eb00864b30aa18b3c849d1be12328d1680b6aba71b57` | same | identical |
| `buzzard.db` | `42224f804208319768768672e43b90b3d240284d26e91c713beea554bafa497e` | same | identical |

The directory holds the same seven files as at the start; no file was added.

## G. Changed files

Modified (13): `components/admin/AdminLoginForm.tsx`, `components/admin/AdminPimCorePanel.tsx`, `components/admin/AdminShell.tsx`, `e2e/admin-pim-core.spec.ts`, `e2e/commerce-readiness.spec.ts`, `lib/admin/context.tsx`, `lib/admin/pimCore.ts`, `lib/admin/pimCoreTypes.ts`, `lib/security/browserConnect.js`, `lib/security/browserConnect.ts`, `playwright.config.ts`, `server/__tests__/devList51Remainder.test.mjs`, `server/__tests__/dryOrderDraft.test.mjs`.

New (11): `e2e/admin-login-limiter.spec.ts`, `e2e/admin-session.spec.ts`, `e2e/global-setup.ts`, `e2e/support/admin.ts`, `scripts/isolated/run.sh`, `scripts/isolated/e2e.sh`, `scripts/isolated/seed-synthetic-admins.cjs`, `server/__tests__/browserConnectLoopback.test.mjs`, `server/__tests__/support/protectedDb.mjs`, the patch file, this report.

Contained in the patch, not applied (43 files): new `server/lib/dataDir.js`, `jsonFileStore.js`, `staticFilePolicy.js`, `jwtSecret.js`, `scripts/vitest-global-setup.mjs`, five test files and one test helper; changed `server/server.js`, `server/lib/auth.js`, `routePermissions.js`, `environmentValidation.js`, `dbAuth.js`, `identitySecurity.js`, `securityLog.js`, `audit.js`, `coreAudit.js`, `automationEngine.js`, 14 further store modules and 4 plugins (data directory only), `scripts/e2e-webserver.mjs`, `vitest.config.ts`, `package.json` (two scripts), `render.yaml`.

What the patch changes in behaviour, to review before applying:

| Change | Effect |
|---|---|
| JWT secret | Without `JWT_SECRET`, a random secret is generated per start: customer JWT logins end at every restart, and tokens forged with the old built-in secret stop working. Production validation reports a missing or short secret as an error |
| Admin seeding | Production no longer creates demo accounts. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` before the first start, otherwise no administrator exists |
| Static files | Only `public/`, `logo/`, `styles/` and root-level `.html` are served. Anything else under the repository root returns 404 |
| `BUZZARD_DATA_DIR` | New setting for the JSON stores. Unset, the API keeps using `server/data`. `render.yaml` sets it to `/var/data/state` on the persistent disk: the first deploy starts with empty stores there, and sessions and logs then survive redeploys. This is a deploy configuration change |
| Route permissions | The 79 routes above require a login and the matching existing permission. Integrations that called them without a token will get 401 |

## H. Protected resources not touched

- `/workspace/server/data/buzzard.db` and the six JSON files: byte-identical (section F).
- `/tmp/buzzard-eu27/server/data/buzzard.db`: does not exist on this machine; not created.
- Pusat central memory: `memory/pusat/` does not exist in this checkout; no Pusat file was edited.
- FIN-M25 / PR #502: not modified. PRs #500, #504, #506: not modified.
- Processes on 3000 and 3001: same PIDs and start times as at the start of the sprint; never stopped or restarted. The build directory of 3000 was affected and repaired as described at the top.
- Git: no commit, push, merge, reset, clean, stash or branch switch. Stash list is empty.
- The two demo sessions were not revoked. No log entry was deleted.
- No real customer, payment, refund, supplier, carrier or automation request was made; every run had no network access.

## I. Buzzard development status

- Sales gate: **LOCKED** (`allowed: false`).
- Egress: default **DENY**; an OpenAI destination is refused as `EXTERNAL_AI_EGRESS_DENIED`, a Stripe destination as `PAYMENT_EGRESS_LOCKED`.
- `productionReady`: **false**. `live`: **false**.
- Development list: 51 items — 45 complete (13 already complete, 32 code complete), 6 live-blocked (19 TecDoc, 20 supplier connection, 28 payment collection, 30 real refunds, 37 official tax connection, 41 live carrier rates). Unchanged by this sprint, identical on both trees.
- Production readiness is not claimed. Section C lists what stands in the way on the security side.
