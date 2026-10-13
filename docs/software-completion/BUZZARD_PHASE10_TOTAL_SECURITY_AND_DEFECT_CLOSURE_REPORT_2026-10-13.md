# Buzzard Phase 10 — Total Security and Defect Closure Report

Version: 10.0  
Date: 2026-10-13  
Branch: `cursor/final-completion-execution-c293`  
Phase 9 reference HEAD (historical only): `8e3ce04ecd7aaf3ae1f93605f83f25514988ee5e`  
Observed starting HEAD: `8e3ce04ecd7aaf3ae1f93605f83f25514988ee5e` (matched; working tree then dirty with Phase 10 edits)  
Final evidence commit: `16e6ba4797778fa730888cc833b88afb15a87eb4`.

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
| Start HEAD | `8e3ce04ecd7aaf3ae1f93605f83f25514988ee5e` |
| Evidence HEAD | `16e6ba4797778fa730888cc833b88afb15a87eb4` |
| Start status | dirty after Phase 10 investigation (cart/language helpers) |
| Port 3000 | `next-server` PID `1997897`, parent `next dev --port 3000`, cwd `/workspace`. **Not terminated.** HTTP **200** before and after `npm run build`. |
| Port 3001 | Identified `node --watch server.js`, cwd `/workspace/server`. Restarted only by terminating the identified child and letting `--watch` respawn (in-memory limiters). |
| Isolation dirs | `.next-dev` (dev, no export-marker); `.next` (production export, export-marker present) |
| Env | `BUZZARD_SALES_ENABLED=0`, `NEXT_PUBLIC_SALES_ENABLED=0`, `BUZZARD_PRODUCT_SOT_ACTIVE` unset, `BUZZARD_LIVE_PAYMENTS` unset |
| Package manager | npm (root lockfile + `server/` lockfile) |

Composer/workspace env still advertises `BUZZARD_API_URL=http://localhost:3002` and `PLAYWRIGHT` ports 3010/3002. No process was listening on 3002/3010. Tests that must hit the live stack were run with explicit `BUZZARD_API_URL=http://127.0.0.1:3001` and `PLAYWRIGHT_SKIP_WEBSERVER=1` / `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000`.

---

## B. Defect inventory

Classification is against **current** source, configuration, tests, and command output. Phase 9 statements were re-checked, not assumed.

| ID | Finding | Severity | Initial class | Final status |
| --- | --- | --- | --- | --- |
| P10-01 | Cart POST 429 in later Playwright mobile/tablet volume | P2 | CONFIRMED_DEFECT (test isolation vs IP limiter) | **FIXED_AND_VERIFIED** |
| P10-02 | Desktop 1440 `selectOption("tr")` stayed `de` | P2 | CONFIRMED_DEFECT (hydration race) | **FIXED_AND_VERIFIED** |
| P10-03 | Admin E2E helper preferred `NEXT_PUBLIC_BUZZARD_API_URL` (stale `:3002`) over live `:3001` | P2 | CONFIRMED_DEFECT (test env isolation) | **FIXED_AND_VERIFIED** |
| P10-04 | Phase 9 admin login empty API base fallback | P1 | VERIFIED_WORKING | **VERIFIED_NO_DEFECT_FOUND** (fix still present) |
| P10-05 | Admin token in `sessionStorage`; no HttpOnly cookie | P1 | CONFIRMED_DEFECT (architecture) | **OPEN_SOFTWARE** |
| P10-06 | GHSA-vfj7-8cjw-p6xm braces@3.0.3 via eslint-config-next | HIGH paper / P2 runtime | CONFIRMED (dev-only) | **OPEN_SECURITY** / **BLOCKED_EXTERNAL** |
| P10-07 | Phase 8 `.next` collision / missing `3897.js` | P1 | VERIFIED_WORKING | **FIXED_AND_VERIFIED** (regression) |
| P10-08 | Render SQLite `/var/data` persistence | P1 prod | NOT_VERIFIABLE_LOCALLY | **NOT_VERIFIABLE_LOCALLY** |
| P10-09 | Dual product stores (JSON PDP vs `pim_core_products`) | P2 architecture | CONFIRMED (by design, SoT off) | **OPEN_SOFTWARE** (not merged) |
| P10-10 | `test:production-safety` “BZ-CORE demo product missing” | P3 local | CONFIRMED_DEFECT (local catalog fixture) | **OPEN_SOFTWARE** |
| P10-11 | `part8Foundation` seeds `UNIT-CART-*` via live `productCore` | P3 | CONFIRMED_DEFECT (test writes) | **OPEN_SOFTWARE** |
| P10-12 | Admin login 8/15min limiter under stacked E2E | P3 | VERIFIED_WORKING (fail-closed) | **VERIFIED_NO_DEFECT_FOUND** |
| P10-13 | Unsigned payment webhooks ignored | P1 | VERIFIED_WORKING (fail-closed) | **VERIFIED_NO_DEFECT_FOUND** (local) |
| P10-14 | Sales / live payments / Product SoT locks | P0 safety | VERIFIED_WORKING | **VERIFIED_NO_DEFECT_FOUND** |

Do not treat skipped Playwright tests as passes. Do not treat `npm audit` exit 1 as a pass.

---

## C. Root cause and correction (fixed items)

### P10-01 — Cart 429

**Root cause:** `POST /api/commerce/cart` and item mutations use `commerce-cart` (`createRateLimiter`, 120 / 60s, IP-keyed) in `server/plugins/commerceCorePlugin.js`. GET cart is not limited. A 200-POST probe reproduced HTTP 429 with `errorKey: "security.rateLimited"` at request 121. Playwright `chromium-desktop` + `chromium-mobile` + `chromium-tablet` each posted new carts against the **same** live `:3001` (TEST_MODE off). Isolated e2e-webserver would set `BUZZARD_TEST_MODE=1` and disable limiters; SKIP_WEBSERVER does not.

This is **not** a cart authorization bypass and **not** a reason to raise the production max.

**Correction (smallest):**

- Run cart API invariants only on `chromium-desktop`.
- Retry genuine 429s in `e2e/helpers/commerceRequest.ts` (`postCommerce`), honoring `Retry-After` when present (capped).
- Unit: IP-scoped limiter; second IP not blocked; `BUZZARD_TEST_MODE=1` disables limiter (E2E isolation only).

Limiter **not** disabled in application code. Max **not** increased.

### P10-02 — Language `tr` stayed `de`

**Root cause:** `LanguageSelector` is a React-controlled `<select value={locale}>`. Playwright can `selectOption("tr")` on the SSR DOM **before** `LocaleProvider` hydrates (`useState("de")` then `detectLocale()` in `useLayoutEffect`). React then attaches `value="de"` and the change event never updates context. Isolated runs hydrated in time; the full suite after ~100 tests reproduced 15s of `Received: "de"`.

Not a missing `tr` locale (portrait `tr` tests passed). Not `LocaleMarketBridge` resetting language on country (bridge already ignores first hydration; locale was removed from effect deps so language changes cannot look like market changes).

**Correction:**

- Expose `ready` from `LocaleProvider`.
- Disable the language `<select>` until `ready` so user and Playwright wait for hydration.
- Assert on `.header-inner > .language-selector select` (header control, not mega-menu).
- Bridge uses a locale ref; still applies `resolveLocaleAfterMarketChange` only after a real country change.

RTL (`dir="rtl"`, `lang=ar`) and 30 locales remain.

### P10-03 — Admin helper `:3002`

**Root cause:** `e2e/helpers/adminAuth.ts` preferred `NEXT_PUBLIC_BUZZARD_API_URL` (workspace `:3002`, nothing listening) over `BUZZARD_API_URL`. Login **form** still used the Phase 9 loopback fallback to `:3001` and passed; seeded admin tests `ECONNREFUSED ::1:3002`.

**Correction:** prefer `BUZZARD_API_URL`, then public URL, then `http://127.0.0.1:3001`.

### P10-04 — Admin API base fallback

`lib/admin/apiBase.ts`: production without `NEXT_PUBLIC_BUZZARD_API_URL` still returns `""` (fail-closed). Development falls back to `http://{hostname}:3001`. `lib/admin/apiBase.test.ts` 4/4 passed.

---

## D. Phase 9 Playwright failures

| Item | Detail |
| --- | --- |
| Original | 107 passed / **3 failed** / 9 skipped |
| Failed | mobile + tablet cart POST not ok; 1440 language `tr` timeout |
| Reproduction | Live `:3001` cart limiter 120/min; 1440 test failed in the **full** suite (16.1s, value `de`) and passed isolated (1.2–1.6s) until the hydration disable fix |
| Correction | P10-01, P10-02 |
| Final evidence | Full Playwright **107 passed / 0 failed / 12 skipped**, exit **0**. Skips: 4 cart API duplicates on mobile/tablet + existing phone/desktop overflow filters. Cart tests **ran** on desktop. 1440 `tr` **passed** as test 107 in that run. |

A mid-phase full run with leftover `:3002` env (11 failed) was **not** a product regression. A mid-phase run with exhausted admin login limiter (6 failed) was **fail-closed 429**, not a login bypass.

---

## E. Admin login and authentication

**Verified real form flow** (`e2e/admin.spec.ts`, no fabricated token for the form test):

| Case | Result |
| --- | --- |
| Valid login | `sessionStorage.buzzard_admin_token` set; dashboard / Control Center / Sessions load |
| Invalid unknown identity | error visible; token null; does not consume `admin@buzzard.de` bucket |
| Unauthenticated Control Center | stays on `/admin/login/` |
| Unauthenticated software APIs | HTTP **401** (or **429** fail-closed) |
| Empty API base (production) | `adminApiBase() === ""` |
| Dev fallback | loopback `:3001` |
| PIM Core / import dry-run | passed when API URL is `:3001` |

**Authorization:** server `requireAuth` / Bearer. Hiding UI is not treated as authorization.

**Session security:** token remains in `sessionStorage`. ~40 admin clients read `buzzard_admin_token`. TTL 8h (`server/lib/auth.js`). Logout clears sessionStorage and calls `/api/admin/logout`.

**HttpOnly / CSRF decision:** **not migrated**. A safe cutover requires Set-Cookie on login, `credentials: 'include'` on every admin client, CSRF for cookie-authenticated mutations, logout cookie clear, Secure / SameSite, and **removal** of sessionStorage. A partial dual-path would leave two mechanisms. Blocker: cross-cutting client surface, not a one-file patch.

**Residual risk:** XSS can read the bearer token. Server still rejects unsigned callers (401). This is **not** closed because tests pass.

---

## F. Current security audit

Commands (this phase):

- `npm audit --json` — exit **1** — high **5**, critical **0**, total **5**
- `npm audit --omit=dev` — exit **0** — **0** findings
- `cd server && npm audit --json` — exit **0** — **0** findings
- Installed: `braces@3.0.3`

| Package | Severity | Range | Path |
| --- | --- | --- | --- |
| braces | high | `<=3.0.3` (`*` installed) | `node_modules/braces` |
| micromatch | high | `>=0.2.0` | via braces |
| fast-glob | high | `*` | via micromatch |
| @next/eslint-plugin-next | high | `>=14.3.0-canary.0` | via fast-glob |
| eslint-config-next | high | `>=14.3.0-canary.0` | via plugin |

Advisory: **GHSA-vfj7-8cjw-p6xm** (npm 1240992) — braces stack-exhaustion DoS via nested patterns. Five rows are **one** advisory across the eslint-config-next chain.

`fixAvailable`: `eslint-config-next@14.2.35` with `isSemVerMajor: true`. Next in this repo is **15.5.27**. Compatible patch: **none**. Override/force/downgrade: **not applied**.

**Production exposure:** development lint toolchain. Not in root `dependencies`. Not in `npm audit --omit=dev`. Server package: clean. Reachability of braces glob parsing in the **production static export** was not demonstrated.

**Unresolved upstream:** a braces release `>3.0.3` or a Next 15 eslint-config-next that does not pull vulnerable braces. Evidence to close: audit exit 0 without major Next downgrade, lockfile showing patched braces, production omit-dev still 0.

---

## G. Cart rate limiting

| Field | Value |
| --- | --- |
| Endpoint | `POST /api/commerce/cart`, `/items`, coupon and other cart mutations |
| Limiter | `cartRateLimit` `commerce-cart:` 120 / 60s IP (`getClientIp`) |
| Global | `server.js` `api:` 180 / min (separate) |
| Shared workers | Yes, when tests share one API and one client IP |
| Legitimate customer | 120 cart mutations / minute / IP is high; burst from multi-project E2E is not a typical shopper |
| Correction | Test isolation + 429 retry; limiter unchanged |
| Regression | `rateLimitStore` IP scope + TEST_MODE disable; desktop cart E2E; commerce-security IDOR / tamper / idempotency |

Legitimate throttling **is** HTTP 429 `security.rateLimited`. Tests must not treat that as success.

---

## H. Localization

| Field | Value |
| --- | --- |
| tr/de root cause | Controlled select mutated before `LocaleProvider.ready` |
| Verified | 1440: `tr` value, `data-buzzard-locale=tr`, Turkish hero, market country unchanged |
| RTL | QR `/kampanya/qr/?lang=ar` `dir=rtl`; arabic landscape homepage; overlay RTL — passed in final Playwright |
| Locales | 30 language options, 35 markets — not removed |

---

## I. Order, payment, inventory, returns, QR, discount

`npm run test:software` — **143 passed** (`softwareCompletion`, `softwareLifecycle`, `secureCommerce`, `dualPaymentAdapters`, `softwareMasterCompletion`, `orderIdentityLoyalty`).

Local invariants covered by those fixtures (not live money):

- Canonical order identity / alias collision fail-closed
- Unsigned webhook ignored; duplicate capture; amount/currency mismatch
- Consume-once; cancel before/after consume; payment/cancel race
- Return / supplier credit vs refund accounting in fixtures
- QR scan does not grant discount alone; PII not on `/konto/`
- EUR 0.50 net profit / missing cost-VAT fail-closed in pricing tests
- Commercial checkout blocked with `SALES=0` (Playwright commerce-security + readiness)

**Not verified:** real parallel inventory writers in production; live Stripe/PayPal; real refunds.

Health snapshot during this phase: `orderAutomation.events` included `payment_webhook_unsigned` / `unsigned_ignored` (fail-closed). Sales flags false. Stripe/PayPal/Klarna flags false.

---

## J. Authorization, webhooks, isolation, validation, secrets

| Area | Evidence | Residual |
| --- | --- | --- |
| Admin APIs | 401 without Bearer | sessionStorage XSS |
| Customer cart IDOR | commerce-security E2E passed | — |
| Webhooks | adapter HMAC / verifyFn in unit tests; unsigned ignored | live provider **NOT_VERIFIABLE** |
| Rate limits | cart, checkout, admin login, global API | in-memory store (restarts clear) |
| Feature flags | child flags cannot enable sales | — |
| PII | `/konto/` E2E no `bzqr_` / IBAN / gmail | QR campaign catalog-only |
| Secrets | report redacts tokens; login password is the documented local admin fixture | do not log tokens |

No generic security middleware was added.

---

## K. Database, persistence, backup, restore

| Check | Result |
| --- | --- |
| Local health path | `/workspace/server/data/buzzard.db` |
| persistence.mode | `development_default`, `persistent: false` |
| `/var/data` locally | `exists: false`, `writable: false` |
| `BUZZARD_DB_PATH` in health | null |
| `test:backup-restore` | `node scripts/restore-db.mjs --dry-run --from server/data/buzzard.db` exit **0**. Prints intended copy **only**. Does **not** open SQLite, checksum pages, or prove restore. |
| `verify:db-persistence` | **not run** (default target production Render API) |
| Unit tests this phase | `BUZZARD_DB_PATH=/workspace/server/data/test-scratch/phase10-unit.db` (gitignored `server/data/`) |

Render persistence remains **UNKNOWN** until an authorized production probe.

---

## L. Product catalog and SoT

- `BUZZARD_PRODUCT_SOT_ACTIVE` unset. Dual-write remains forbidden in `productArchitecture.js`.
- Static PDP `/produkt/premium-bremsscheibe-testprodukt/` **200**. Unknown `/produkt/zz-kein-produkt-xyz/` **404**. Fail-closed copy, no invented price.
- PIM list is a separate store (`pim_core_products` / catalog API). Local `/api/catalog/products?q=BZ-CORE` returned **0** items; first page showed `UNIT-CART-*` SKUs from `part8Foundation` `seedVisibleCatalogProduct()` against default `productCore`.
- SoT **not** activated. No production product mutation. No fake sale prices.

Impact: `scripts/production-safety.mjs` “Price tampering still blocked” failed locally with “demo product missing” (fixture), **not** because tampering was allowed. Commerce Playwright price-tamper test **passed** using whatever catalog product it resolved.

---

## M. Next.js build isolation and port 3000

| Field | Value |
| --- | --- |
| Config | `distDir: NODE_ENV === "production" ? ".next" : ".next-dev"`; `output: "export"` only in production |
| Regression test | `lib/nextDistIsolation.test.ts` passed |
| This phase | `npm run build` exit **0**. `.next/export-marker.json` present. `.next-dev/export-marker.json` absent. |
| HTTP | pre-build `/` **200**; post-build `/` **200**, unknown product **404**, PDP **200**. No `3897.js` missing-chunk. |
| Port 3000 | **not killed**. PIDs recorded. Ports 3010/3002 unused. |

Homepage 200 is **not** a claim that every route is healthy; Playwright exercised cart, checkout, admin, QR, overlay, and viewports.

---

## N. Test table

Skipped ≠ passed. Audit exit 1 ≠ pass. Production-safety 1 failed ≠ pass.

| Command | Exit | Passed | Failed | Skipped | Environment | Final code? |
| --- | --- | --- | --- | --- | --- | --- |
| `npx vitest run server/__tests__/rateLimitStore.test.mjs lib/admin/apiBase.test.ts lib/nextDistIsolation.test.ts` | 0 | 9 then 11 after TEST_MODE case | 0 | 0 | node | yes |
| `npx vitest run lib/market/languageIndependence.test.ts lib/i18n/localeMarketRtl.test.ts` (+ related) | 0 | 28 | 0 | 0 | node | yes (locale patch) |
| `npm run test:software` | 0 | 143 | 0 | 0 | node, sales locked | yes |
| `npm run test:ai` | 0 | 58 | 0 | 0 | node | yes |
| `npm run test:bridge` | 0 | 18 | 0 | 0 | node | yes |
| `npm run test:unit` | 0 | **891** | 0 | 0 | isolated `BUZZARD_DB_PATH` under `server/data/test-scratch/` | yes |
| Playwright targeted cart + 1440 | 0 | 3 (+ 4 skip) | 0 | 4 | `:3000`/`:3001` SKIP_WEBSERVER | pre-ready-disable for language; cart yes |
| Playwright admin+pim+bridge | 0 | 20 | 0 | 0 | `:3001` explicit | helper precedence |
| Playwright **full** (final) | **0** | **107** | **0** | **12** | SKIP_WEBSERVER, `BUZZARD_API_URL=http://127.0.0.1:3001`, fresh API limiter | **yes** |
| `npm run lint` | 0 | no warnings | | | next lint | yes |
| `npm run typecheck` | 0 | | | | tsc | yes |
| `npm run build` | 0 | | | | production export into `.next` | yes |
| `npm audit --json` | **1** | 5 high | | | root | yes |
| `npm audit --omit=dev` | 0 | 0 | | | production deps | yes |
| `npm --prefix server audit` | 0 | 0 | | | server | yes |
| `npm run test:backup-restore` | 0 | dry-run print | | | local db path | yes |
| `npm run test:production-safety` | **1** | 6 | **1** (BZ-CORE missing) | 0 | `:3001` | yes |
| `verify:db-persistence` | | | | **not run** | would default to Render | |

Software/AI/bridge/lint/typecheck ran before the final language `ready` patch; they do not execute `LanguageSelector`. Playwright full + locale unit + typecheck/lint/build/unit ran **after** that patch.

---

## O. Unresolved issues

| ID | Impact | Severity | Why open | Next action | External auth? |
| --- | --- | --- | --- | --- | --- |
| P10-05 HttpOnly | XSS can steal admin bearer | P1 | Cross-cutting cookie+CSRF cutover not safe as a partial change | Dedicated auth migration of all sessionStorage clients | No (engineering) |
| P10-06 braces | Dev lint DoS advisory | HIGH paper | No compatible patch on Next 15.5.27 | Wait for braces >3.0.3 or Next eslint bump | Yes (upstream) |
| P10-08 Render DB | Data loss if production is ephemeral | P1 | Default verify script hits production; local `/var/data` absent | Authorized `BUZZARD_API_URL` health on Render only | **Yes** |
| P10-09 Dual catalog | JSON PDP vs PIM list mismatch | P2 | SoT must stay off | Do not merge; authorized SoT plan later | Human/SoT flag |
| P10-10 / P10-11 UNIT-CART vs BZ-CORE | Local production-safety fixture miss; test seeding into default PIM | P3 | `productCore.createProduct` in unit tests uses live default DB unless `BUZZARD_DB_PATH` set | Isolate `part8Foundation` writes; do not invent BZ-CORE in the shared DB | No |
| Live payments / marketplace publish | Real money / listings | P0 if enabled | Intentionally locked | Keep locked until separate authorization | **Yes** |
| Inventory race under parallel capture | Oversell risk | P1 | Suite is sequential fixtures | Dedicated concurrent fixture later | No |
| Webhook live HMAC | Forged events | P1 | No live provider in this environment | Provider contract test with authorized keys | **Yes** |

---

## P. Safety confirmation

- Sales remain disabled (`BUZZARD_SALES_ENABLED=0`, health `salesEnabled: false`, checkout attempt `commercialOrders: 0`).
- Product SoT remains inactive.
- Live payments remain disabled.
- No production database mutation.
- No deployment, Render change, or production credential use.
- No git push, PR, or merge.
- No real customer/supplier orders, payments, refunds, or paid provider calls.
- `npm audit fix --force` not used.
- Port 3000 not killed. `/tmp` not used for persistent application data (unit DB under `server/data/test-scratch/`).
- Identified `:3001` child only was recycled to clear **in-memory** rate-limit buckets.

---

## Q. Final assessment

### 1. Confirmed fixed and verified

- Cart E2E 429 under multi-project volume (isolation + retry; limiter intact).
- Desktop 1440 `tr` language selection (disable select until locale `ready`).
- Admin E2E API URL precedence (`BUZZARD_API_URL` first).
- Phase 9 login fallback still present; real form login still stores a token.
- DistDir isolation still holds (`npm run build` did not break `:3000`).
- Software / AI / bridge / unit / lint / typecheck / Playwright 107/0/12.

### 2. Fixed but not fully verified

- None of the code fixes above lack a passing regression **except** HttpOnly (not implemented). Locale fix is verified in the final full Playwright run. Cart limiter behavior under a **real** multi-customer NAT is not production-measured.

### 3. Remaining software defects

- Admin sessionStorage XSS surface (P10-05).
- Dual catalog stores while SoT is off (P10-09).
- Local PIM pollution / missing BZ-CORE for `test:production-safety` (P10-10, P10-11).

### 4. Remaining security findings

- GHSA-vfj7-8cjw-p6xm on braces@3.0.3 (dev eslint chain). Production omit-dev audit clean. Server audit clean.
- SessionStorage bearer tokens.

### 5. External blockers

- Upstream braces / eslint-config-next 15 compatible release.
- Render persistent disk (authorized probe only).
- Live payment and marketplace providers (locked; not exercised).

### 6. Areas not verifiable locally

- Production SQLite durability on Render.
- Live webhook signatures against vendor endpoints.
- Parallel inventory capture at production QPS.
- Cookie security attributes in a real HTTPS admin deployment (cookies not used for admin today).

Do not start a new feature phase while P10-05, P10-06, and P10-08 remain open. Locally fixable Playwright failures from Phase 9 are closed with evidence. A green local Playwright suite is **necessary and not sufficient** for production readiness.
