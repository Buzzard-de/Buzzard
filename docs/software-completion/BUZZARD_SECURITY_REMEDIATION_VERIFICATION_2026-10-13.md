# Buzzard — Security Remediation Verification

Date: 2026-10-13  
Mode: verification-first, local-only  
Branch: `cursor/final-completion-execution-c293`  
HEAD: `7561ad3d8c4179c714ab35b6c86cfc1c07abbd9b`  
origin (cached, **no fetch**): `947d83b8f07d39e4a2566278ac525fd22a30b033`  
Ahead/behind: **29 / 0**

This file does **not** overwrite Phase 8–13, the master command audit, or `BUZZARD_SECURITY_RESEARCH_AND_REMEDIATION_2026-10-13.md`.

No result is `LIVE_VERIFIED`. Production was not contacted. Sales / SoT / live payments remain unset/`0`.

---

## 1. Baseline Git state

Recorded at start of this verification (HEAD unchanged after):

| Field | Value |
| --- | --- |
| Branch | `cursor/final-completion-execution-c293` |
| HEAD | `7561ad3` *Pin the Phase 10 report evidence commit SHA.* |
| Staged | empty |
| Unstaged | 16 files (Phase 11 leftovers + Phase 13/remediation security) |
| Untracked | Phase 11/13/master/remediation reports; `backupRestoreIntegrity.test.mjs`; `fortressAuthz.test.mjs` |
| Remote tracking | origin same branch, **ahead 29** |

`git reset` / `git clean` / fetch-into-tree / merge / rebase: **not used**.

Prior remediation report was treated as a claim list, then re-read against source.

---

## 2. Security fixes independently verified

A 401/409 is **not** treated as sufficient; handlers and mutation functions were read.

### 2.1 Financial intent creation

| | |
| --- | --- |
| Source | `server/plugins/paymentsFinancePlugin.js` `POST /api/payments-finance/intents` → `paymentsFinance.createPaymentIntent` |
| Expected | Admin + `orders.write` wrapper; insert `requires_payment` only |
| Actual WT | `requireAnyAdmin` + PREFIX write; library inserts `requires_payment` (ledger row, not captured) |
| Actual HEAD | **No** handler admin; wrap skip; same insert |
| Test | fortressAuthz wrap 401 on sibling finance writes; create used only inside isolated confirm test |
| WT | **Fixed** (auth). Intent **create** still writes DB if admin — expected. |
| HEAD | **Absent** |
| Limit | Admin can still create demo intents; not a live charge |

### 2.2 Payment confirmation

| | |
| --- | --- |
| Source | `confirmPaymentIntent` in `server/lib/paymentsFinance.js`; plugin `.../intents/:id/confirm` |
| Expected | Must not mark succeeded from a caller confirm |
| Actual WT | 409 `PROVIDER_CONFIRMATION_REQUIRED`, `applied: false`; **no UPDATE succeeded** |
| Actual HEAD | **UPDATE status succeeded** + capture row |
| Test | fortressAuthz: status unchanged, not `succeeded` — **pass** |
| WT | **Fixed** |
| HEAD | **Vulnerable** |

### 2.3 Refund create/execute

| | |
| --- | --- |
| Source | `createRefund`; plugin `.../refunds` |
| Expected | No real refund; no silent succeeded refund row |
| Actual WT | 409 `PROVIDER_REFUND_REQUIRED`, `financialEffect: false`; no INSERT refund |
| Actual HEAD | INSERT refund `succeeded` + intent `refunded` |
| Test | same fortressAuthz case — **pass** |
| WT | **Fixed** |
| HEAD | **Vulnerable** |

### 2.4 Invoice mutations

| | |
| --- | --- |
| Source | plugin `POST /api/payments-finance/invoices` + `createInvoice` |
| Expected | Not anonymous |
| Actual WT | `requireAnyAdmin` + PREFIX |
| Actual HEAD | unauthenticated create |
| Test | wrap 401 on invoices — **pass** |
| Limit | Authenticated admin can still insert invoice rows (local ledger). No live billing. |

### 2.5 Payment fail / reconcile

| | |
| --- | --- |
| Source | `commerceCorePlugin.js` `POST /api/commerce/payments/:id/fail|reconcile` |
| Expected | Not public |
| Actual WT | EXACT `orders.write`; wrap 401 |
| Actual HEAD | unlisted write → raw handler |
| Test | fortressAuthz — **pass** |
| Limit | `recordFailure` still mutates if authorized |

### 2.6 wrapRouteHandler missing policy

| | |
| --- | --- |
| Source | `server/lib/globalAuthMiddleware.js` |
| Expected | Protected writes must not skip auth |
| Actual WT | Write + `!policy` → 401; GET + `!policy` → raw handler |
| Actual HEAD | all methods skip |
| Test | `POST /api/vehicles/seed` 401 — **pass** |
| Limit | Unlisted **GET** still open (except those given policies this turn) |

### 2.7 PUBLIC_ROUTES

| | |
| --- | --- |
| Source | `server/lib/routePermissions.js` |
| Actual WT | Explicit cart/checkout/contact/auth/reviews/webhooks + finance methods/unsigned sinks |
| Test | cart public handler runs; methods GET public — **pass** |
| HEAD | Smaller public set; no storefront write list |

### 2.8 CORS

| | |
| --- | --- |
| Source | `server/lib/corsOrigins.js` + `server.js` ACAO only if allowed |
| Actual WT | no default `null`; `*` false |
| HEAD | `"null"` in DEFAULT_ORIGINS |
| Test | corsOrigins — **pass** |
| Limit | `BUZZARD_CORS_ORIGINS` can still add `null` |

### 2.9 Health disclosure

| | |
| --- | --- |
| Source | `toPublicDatabaseHealth`; health/db, health collect, pusat, production |
| Actual WT | no `path` / user counts / backupDir on public helpers |
| HEAD | full `getDatabaseHealth()` including path |
| Test | fortressAuthz public health — **pass** |
| Limit | Other readiness JSON still verbose |

### 2.10 CSRF / admin session

| | |
| --- | --- |
| Source | `csrf.js`, `lib/admin/client.ts`, `auth.js` |
| Actual | Bearer exempt; CSRF only if `BUZZARD_CSRF_ENFORCE=1`; sessionStorage 8h |
| Test | csrf.test.mjs — **pass** |
| Fix | **Not migrated** (correct given 40+ clients) |
| HEAD / WT | same architecture |

---

## 3. GET route inventory and classifications

Plugin `app.get("/api/...")` inventory: **412 matching lines** (truncated listing in search). Classification of **families**, not every path line-by-line:

| Class | Families |
| --- | --- |
| A Public read | `/api/health*`, catalog, taxonomy, commerce status/shipping/providers, pim-catalog public, software search, QR campaign landing |
| B Authenticated customer | `/api/account/*`, `/api/customer/*`, `/api/me`, **GET `/api/orders/:orderNumber`** (this turn) |
| C Admin-only | `/api/admin/*` (wrapper PREFIX/EXACT) |
| D Finance-restricted | `/api/payments-finance` (except methods), `/api/payments-v36/*`, **GET `/api/commerce/payments/:id`** (this turn) |
| E Internal/worker | v3x jobs GETs now PREFIX-protected |
| F Sensitive / previously unknown | GET `/api/orders/:orderNumber` (JSON file, full customer) — **confirmed, fixed WT**; GET commerce payment by id — **confirmed, wrap now orders.read**; guest commerce order/checkout if `customer_id` empty still handler-dependent |

**GET that write:** none confirmed among inspected health/catalog/finance GETs. Commerce GET order/checkout are reads.

**This-turn GET fixes (confirmed vulns):**

1. `GET /api/orders/:orderNumber` — handler had **no auth** and returned `orders.json` including customer email. Now: wrap customer realm + handler session ownership (404 if other customer).
2. `GET /api/commerce/payments/:id` — wrap skipped (GET fail-open); `retrievePayment` returns payment state. Now: `orders.read`.

**Not treated as vulns:** catalog GETs; cart/checkout GET with UUID + `assertCustomerResourceAccess` when `customer_id` set.

**Residual GET:** unlisted diagnostics (guardian/orchestrator status); guest checkout rows without `customer_id`; `/api/p1/i18n/gaps` if it leaks internal counts (not re-tested HTTP).

---

## 4. Regressions found

- **No unit regression:** `vitest run` **906/906**.
- GET order lookup is now **auth-required** — anonymous storefront “lookup by order number” would 401. Sales are off; accepted as security over anonymous PII.
- GET commerce payment by id now admin `orders.read` — anonymous poll 401.

No security control was weakened.

---

## 5. Exact tests and exit codes

| Command | Exit | Result |
| --- | --- | --- |
| focused: routePermissions, corsOrigins, fortressAuthz, csrf | **0** | 4 files, **28 passed** |
| `vitest run softwareCompletion softwareMasterCompletion` | **0** | 2 files, **90 passed** |
| `npx vitest run` (full unit) | **0** | **75 files, 906 passed** |
| Playwright | **not run** | Isolated 3010 would share `.next-dev`; port 3000 not touched |
| `test:production-safety` | **not run this turn** | Phase 11 script still dirty locally |

---

## 6. Lint / typecheck / build

| Command | Exit | Result |
| --- | --- | --- |
| `npx next lint --max-warnings 0` | **0** | No ESLint warnings or errors |
| `npx tsc --noEmit` | **0** | Clean |
| `npm run build` | **not run** | Avoid production export into `.next` while next-dev may be live (Phase 8 collision class) |

---

## 7. Working tree vs HEAD vs remote

No fetch. origin ref is the last known remote tip.

| Item | Working tree | HEAD `7561ad3` | origin `947d83b` |
| --- | --- | --- | --- |
| Finance confirm fail-closed | **Yes** | No (marks succeeded) | No (older than HEAD) |
| Finance refund fail-closed | **Yes** | No | No |
| Finance handler `requireAnyAdmin` | **Yes** | No | No |
| wrap write fail-closed | **Yes** | No | No |
| PUBLIC storefront writes | **Yes** | Partial/public health only | Older |
| CORS no default `null` | **Yes** | No (`null` in list) | No |
| Public health no path | **Yes** | No | No |
| GET orders + commerce payment auth | **Yes** (this turn) | No | No |
| HttpOnly / CSRF enforce | No | No | No |
| Phase 8–10 DistDir / adminApiBase / cart E2E | N/A (already HEAD) | **Yes** | **No** (29 commits behind) |

Local branch is a **fast-forward** of origin (29 commits). No merge/rebase performed. Potential conflict: only if origin moved since this cached SHA — **not checked by fetch**.

File-by-file WT-only security: `globalAuthMiddleware.js`, `routePermissions.js`, `paymentsFinance.js`, `paymentsFinancePlugin.js`, `corsOrigins.js`, `db.js`, health plugins, `ordersPlugin.js` (GET), fortress/cors/routePermission tests.

HEAD-already: DistDir isolation, unsigned webhook isolation (HEAD library still has fake confirm — webhook isolation is separate).

---

## 8. Remaining security risks

| Risk | Severity | Notes |
| --- | --- | --- |
| HEAD/origin still serve fake confirm + unauth finance | P0/P1 | WT-only |
| sessionStorage admin Bearer | P1 | No cookie cutover |
| Seed/default admin material in repo | P1 if ever used live | Not printed |
| braces@3.0.3 eslint chain | P2 paper | omit-dev clean |
| Unlisted GET diagnostics | P3 | wrap still skips GET |
| Guest commerce checkout/order without customer_id | P2 | Handler guard skips if no customer_id |
| CSRF default off | P2 | Bearer design |
| Production exposure | unknown | Not probed |
| Esat Bey live defense | not LIVE_VERIFIED | Guardian unit-only |

---

## 9. Prioritized next actions

1. Do **not** run HEAD in any reachable API; WT is the only patched tree.  
2. Authorized later: commit WT (user currently forbids commit).  
3. Do not push the 29 local commits or this WT until asked.  
4. HttpOnly complete-or-never.  
5. Authorized production flag/secret/CORS check.

---

## Safety confirmation

- No production access.  
- No live payments/orders.  
- Sales/SoT/live payments not enabled.  
- No commit, push, PR, merge, deploy.  
- Port 3000 not terminated.  
- `next build` not run.  
- Existing user files preserved.  
- Secrets not printed.  
- Not production-ready.  
- Esat Bey not claimed live.
