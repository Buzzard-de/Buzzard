# Buzzard Phase 7 — Security Triage, Product Architecture, and Final Operator Report

Version: 7.0  
Date: 2026-10-13  
Branch: `cursor/final-completion-execution-c293`  
Expected prior Phase 6 HEAD: `aad0461e88199ad7607faae6b873e13c97007328`  
Observed starting HEAD: `aad0461e88199ad7607faae6b873e13c97007328` (matched; tree clean)  
Code HEAD after local software commit (before this report): `5840f07ce1136c43e5cff50d85f1e1ef512c19c8`  
Final HEAD: recorded at the bottom after the local report commit.

Git push / PR / merge / deploy: **not performed**.  
`git reset --hard` / `git clean -fd`: **not used**.  
This task did **not** send SIGTERM to `next dev --port 3000` (parent pid `380551`, `next-server` pid `1961396`). Isolated E2E used `:3010` + `:3002` and was stopped afterwards.

**Required `npm run build` overwrote the shared `.next` directory.** After that, `http://127.0.0.1:3000/` returned HTTP 500. The process was not killed. This is a local workspace collision, not a production change.

No overall completion percentage. Local tests are not live readiness. No capability is `LIVE_VERIFIED`.

Status labels: `NOT_IMPLEMENTED` | `STUB` | `PARTIAL` | `CODE_READY` | `CONFIGURED` | `SANDBOX_VERIFIED` | `LIVE_VERIFIED`  
Issue labels: `FIXED_AND_VERIFIED` | `IMPLEMENTED_NOT_VERIFIED` | `PARTIALLY_IMPLEMENTED` | `OPEN_SOFTWARE` | `BLOCKED_EXTERNAL` | `BLOCKED_HUMAN` | `BLOCKED_PRODUCTION` | `OBSOLETE_WITH_EVIDENCE`  
Security labels: `FIXED_AND_VERIFIED` | `MITIGATED_WITH_EVIDENCE` | `OPEN` | `BLOCKED_EXTERNAL`

---

## 1. Baseline

| Field | Value |
| --- | --- |
| Branch | `cursor/final-completion-execution-c293` |
| Start HEAD | `aad0461` Phase 6 pin |
| User-owned uncommitted changes | none |
| Rollback | restore files from `aad0461` / `5840f07`; no destructive Git |
| Pusat | sole orchestrator |

### Prior-phase items vs current code

| Issue | Prior | Phase 7 |
| --- | --- | --- |
| Five HIGH npm audit findings | OPEN / treated as braces chain | **OPEN / BLOCKED_EXTERNAL** — all five are **one** advisory plus dependents (see §3) |
| Dual catalog JSON vs PIM | documented; fail-closed unknown PDP | **PARTIALLY_IMPLEMENTED**: PDP fail-closed remains; listing merge now `static_slug_wins`; SoT still off |
| `canonical_order_id` column | not added | **OBSOLETE_WITH_EVIDENCE** — `bzord_*` aliases sufficient |
| Order/payment/inventory contract | SANDBOX_VERIFIED fixtures | **FIXED_AND_VERIFIED** locally (same contract; 143 software tests) |
| QR loyalty | SANDBOX_VERIFIED | **FIXED_AND_VERIFIED** locally; inserts **BLOCKED_HUMAN** |
| Pusat/workers | SANDBOX_VERIFIED | **FIXED_AND_VERIFIED** locally (`test:ai` 58) |
| Admin E2E / CORS | passing | **FIXED_AND_VERIFIED** locally |
| Render persistence | UNKNOWN | **BLOCKED_PRODUCTION** / UNKNOWN |
| Sales / SoT / live payments | locked | **FIXED_AND_VERIFIED** as locked |
| OTTO/bol/Cdiscount/eMAG/Skroutz | STUB | **BLOCKED_EXTERNAL** / **BLOCKED_HUMAN** |
| DATEV/SEPA/IBAN-name | STUB / NOT_IMPLEMENTED | **BLOCKED_HUMAN** |
| GPS tracking | NOT_IMPLEMENTED | **OBSOLETE_WITH_EVIDENCE** as a live GPS claim (`gpsInvented: false`) |
| SessionStorage admin token | PARTIAL | **OPEN_SOFTWARE** (P2; not changed) |
| Playwright skip filters | intentional | **OBSOLETE_WITH_EVIDENCE** as a product defect |

---

## 2. Files changed

| File | Why |
| --- | --- |
| `server/lib/pim/productArchitecture.js` | `CANONICAL_RECOMMENDATION` (12-point future architecture, **not activated**); `listingMerge: static_slug_wins` |
| `server/__tests__/productArchitecture.test.mjs` | Recommendation stays inactive |
| `lib/storefront/runtime.ts` | Merge: live-only slugs kept; overlapping slugs keep JSON PDP |
| `lib/catalogSeo/runtime.ts` | same merge policy |
| `lib/localizationFeeds/runtime.ts` | same merge policy |
| `lib/storefront/mergePolicy.test.ts` | Overlap must not take PIM overlay name |
| `vitest.config.ts` | Include mergePolicy test |
| This report | Evidence |

`npm run build` rewrote taxonomy preflight JSON; **restored** to HEAD.

---

## 3. All five HIGH security findings (individually)

`npm audit --json` at HEAD `5840f07`: `high: 5`, `critical: 0`. **Server package audit: 0 vulnerabilities.**

Root advisory (the only `via` object with a GHSA):

**GHSA-vfj7-8cjw-p6xm** / npm advisory **1240992**  
Title: braces stack-exhaustion DoS via deeply nested patterns  
CWE-674 · CVSS 7.5 (AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H)  
Vulnerable range: `<=3.0.3` · Installed: **3.0.3** · npm latest: **3.0.3** (modified 2024-09-18) · **No patched release published.**

### Finding 1 — `braces@3.0.3`

| Field | Value |
| --- | --- |
| Advisory | GHSA-vfj7-8cjw-p6xm |
| Direct? | No (dev transitive) |
| Path | `eslint-config-next@15.5.27` → `@next/eslint-plugin-next@15.5.27` → `fast-glob@3.3.1` → `micromatch@4.0.8` → `braces@3.0.3` |
| Vulnerable range | `*` / `<=3.0.3` |
| Compatible fix | **None.** Latest braces is 3.0.3. `overrides` cannot pin a non-existent patch. |
| Runtime | **devDependency** (eslint globbing). Not listed in production `dependencies`. Not the API runtime (`server` audit clean). |
| Impact evidenced | Lint-time glob ReDoS/stack exhaustion if an attacker controls glob patterns fed to this eslint/fast-glob chain. **Not** demonstrated as a storefront RCE. |
| Suggested npm fix | `npm audit fix --force` → `eslint-config-next@14.2.35` (**major downgrade; not applied**) |
| Next 16 plugin | `@next/eslint-plugin-next@16.4.0` still depends on `fast-glob@3.3.1` |
| Status | **OPEN** / **BLOCKED_EXTERNAL** |

### Finding 2 — `micromatch` (`>=0.2.0`)

| Field | Value |
| --- | --- |
| Advisory | **Inherited** — `via: braces` only. No separate GHSA in this audit. |
| Installed | micromatch@4.0.8 |
| Path | same chain |
| Latest | 4.0.8 still depends on `braces: ^3.0.3` |
| Compatible fix | none until braces is patched |
| Status | **OPEN** / **BLOCKED_EXTERNAL** (same root) |

### Finding 3 — `fast-glob` (`*`)

| Field | Value |
| --- | --- |
| Advisory | **Inherited** — `via: micromatch` |
| Installed | 3.3.1 (pinned by `@next/eslint-plugin-next`) |
| Latest | 3.3.3 still `micromatch: ^4.0.8` → braces 3.0.3 |
| Override to 3.3.3 | **does not** remove the GHSA |
| Status | **OPEN** / **BLOCKED_EXTERNAL** (same root) |

### Finding 4 — `@next/eslint-plugin-next` (`>=14.3.0-canary.0`)

| Field | Value |
| --- | --- |
| Advisory | **Inherited** — `via: fast-glob` |
| Installed | 15.5.27 (matches Next 15.5.27) |
| Compatible fix | none without leaving Next 15 or waiting for plugin to drop/pin patched braces |
| Status | **OPEN** / **BLOCKED_EXTERNAL** (same root) |

### Finding 5 — `eslint-config-next` (`>=14.3.0-canary.0`)

| Field | Value |
| --- | --- |
| Advisory | **Inherited** — `via: @next/eslint-plugin-next` |
| Direct | yes (`devDependencies`) |
| Installed | 15.5.27 |
| Force “fix” | install 14.2.35 — **breaking; forbidden by policy** |
| Status | **OPEN** / **BLOCKED_EXTERNAL** (same root) |

**The security audit is not resolved.** Five HIGH rows remain. They are **not** five distinct vulnerabilities.

Temporary risk reduction that is real: do not run eslint on untrusted glob input in CI agents; braces is not shipped as an API production dependency. This does **not** close the finding.

---

## 4. Security regression review

Not a penetration test.

| Area | Evidence | Status |
| --- | --- | --- |
| Admin authz | Playwright login + 401 on software APIs | SANDBOX_VERIFIED local |
| Session | sessionStorage bearer | PARTIAL / OPEN_SOFTWARE |
| Rate limit | admin login 429 path | CODE_READY |
| Webhooks / replay / idempotency | dual-payment + identity tests | SANDBOX_VERIFIED fixtures |
| Alias conflict | fail closed | SANDBOX_VERIFIED fixtures |
| Redirects | QR allowlist | SANDBOX_VERIFIED fixtures |
| IDOR cart | commerce-security E2E | SANDBOX_VERIFIED local |
| PII in QR | customer QR + `/konto/` | SANDBOX_VERIFIED local |
| Feature flags | sales/SoT/live payments off | MITIGATED_WITH_EVIDENCE |
| Restore | `assertRestoreAllowed`; dry-run only | CODE_READY local |
| Secrets | none printed | — |

No new reproducible auth bypass was found. No tests were weakened.

---

## 5. Product store / read / write map

Unchanged stores (all still exist):

| Store | Purpose | Writers | Readers | Authoritative now? |
| --- | --- | --- | --- | --- |
| `pim_core_products` | Candidate master | `productCore` via `productWriteBoundary` | `catalogReadService`, productCore | **No** (SoT off) |
| `pim30_products` | Catalog PIM v3 | `productCatalogPim` (`requireExplicitAuth`) | productCatalogPim | No |
| `pim_products` | PIM v1.9 | `pimCatalog` | pimCatalog | No |
| `products` | SEO table / projection | `catalogSeo`; `catalogProductSync` (D_PROJECTION) | catalogSeo | No |
| `data/buzzard_products.json` | Static PDP source | `productStore` (auth) | `lib/products`, `generateStaticParams` | **Yes for `/produkt/[slug]` today** |
| `srch_products` | Search document | advancedSearch (B_READ_MODEL) | search | Projection |

Imports: dry-run default (admin PIM E2E). ACTIVE create blocked while sales locked. Dual-write forbidden. Read-only `scanProductIdentity` exists; no auto-merge.

`ProductList` when PIM flag is on still **renders API items** (`pimResult.items`). That is a **separate listing surface**, not a dual-published PDP. Overlap merge used by other listing paths now keeps JSON identity.

---

## 6. Recommended canonical architecture (inactive)

Encoded in `CANONICAL_RECOMMENDATION` (`activated: false`):

1. **Record:** `pim_core_products` / `productCore` (candidate).  
2. **Identity:** SKU required; EAN/GTIN/MPN unique on that store after cutover.  
3. **Slug:** one slug per canonical product; PDP/`generateStaticParams` follow that store **after** SoT. Until then JSON owns `/produkt/[slug]`.  
4. **Variants:** child SKUs under canonical parent.  
5. **Price:** pricing engine + supplier cost + tax; fail closed if missing.  
6. **Inventory:** `stockEngine`; feed stock is not a guarantee.  
7. **Localization:** translation rows; English technical fallback.  
8. **Import:** staging → `productWriteBoundary`; dry-run default.  
9. **Export/read:** search and `products` stay projections.  
10. **Legacy:** keep other stores readable; no deletes here.  
11. **Migration order:** identity scan → human select store → map → backup → cut readers (no dual-write) → PDP params from canonical → SoT flag later → sales later.  
12. **Rollback:** restore SQLite + JSON copies. **Human approval** required for store selection, window, SoT, and sales.

SoT remains **disabled**.

---

## 7. Static product routing

Production: `output: "export"` when `NODE_ENV === "production"`.  
Dev: export unset so unknown slugs 404 (`dynamicParams = false`, `not-found.tsx`).  
`generateStaticParams` = JSON catalog only. PIM slugs not added.

Verified this HEAD: static slug PDP passed; `/produkt/zz-kein-produkt-xyz/` fail-closed on desktop/mobile/tablet.

PIM-only slug (e.g. `isolated-cart-fixture`) has **no** static HTML. That is the SoT decision, not a silent merge.

---

## 8. Canonical order / payment / inventory

`bzord_*` aliases. No new column.

`npm run test:software` **143 passed** including identity/loyalty/dual-payment: alias uniqueness/conflict/unknown, unsigned webhook, duplicate capture, amount/currency mismatch, consume-once, cancel before/after consume, payment/cancel race, return after redemption, supplier credit vs refund.

Only verified capture consumes stock. Consumed stock is not silently restored.

Status: **SANDBOX_VERIFIED** (fixtures). Live money: false.

---

## 9. QR loyalty

Not rebuilt. Existing tests in `orderIdentityLoyalty`: no PII in `bzqr_`, scan ≠ discount, distinct `bzpk_`, allowlisted redirects, server eligibility, cancelled/returned/pending-return, 15% cap, no stacking, single-use + concurrency, €0.50, missing cost fail-closed, no automatic late-return charge.

Marketplace inserts: **REVIEW_REQUIRED** / **BLOCKED_HUMAN**. No campaigns sent.

---

## 10. Pusat / queue / workers

`test:ai` **58 passed**. No second orchestrator. No paid AI. Scheduler bound to Pusat task id. Retry does not skip human approval. Financial tasks fail closed.

---

## 11. Supplier and pricing

CSV/XML/JSON/mock: IMPLEMENTED local. API/TecDoc/real_supplier: PARTIAL, credentials absent. No real PO.

Pricing: EUR, min net **€0.50**, undercut **not** implemented, missing cost/tax fail closed. 35 markets = configuration, not legal readiness. Tax/accounting review: **BLOCKED_HUMAN**.

---

## 12. Marketplace and carrier inventory

| Name | Status | Test | Config | Sandbox | Live | Blocker |
| --- | --- | --- | --- | --- | --- | --- |
| Amazon, eBay, Kaufland, Allegro, Google Shopping, TikTok Shop | PARTIAL adapter | local mocks in software tests | keys absent | not run | no | **BLOCKED_EXTERNAL** + legal insert review |
| OTTO, bol, Cdiscount, eMAG, Skroutz | STUB | none live | contract missing | no | no | **BLOCKED_HUMAN** |
| Publish | blocked | health `marketplace_publish` | — | — | no | policy |
| DHL, DPD, GLS, Hermes, UPS | CODE_READY lookup | `gpsInvented: false`, `shipmentCreated: false` | keys absent | no | no | **BLOCKED_EXTERNAL** |
| GPS | NOT_IMPLEMENTED | — | — | — | no | providers do not claim continuous GPS here |

Chain in code: order → gated fulfillment → **carrier events** → tracking view → communication **gates**. Event tracking ≠ GPS.

---

## 13. Payments / banking / returns / accounting

| Name | Status | Evidence |
| --- | --- | --- |
| Stripe / PayPal adapters | CODE_READY | live HTTP requires sales **and** `BUZZARD_LIVE_PAYMENTS` |
| Dual-payment engine | SANDBOX_VERIFIED fixtures | not provider sandbox |
| SEPA | STUB | **BLOCKED_HUMAN** |
| Bank / Bundesbank query | NOT_IMPLEMENTED | — |
| IBAN-name | NOT_IMPLEMENTED / RESEARCH_REQUIRED | **BLOCKED_HUMAN** |
| DATEV | not configured | **BLOCKED_HUMAN** |
| Refund vs supplier credit vs chargeback vs stock | separate in code | fixtures |

---

## 14. Privacy / localization / support

30 locales / 35 markets CONFIGURED in UI. RTL Playwright passed. AI must not invent shipment/refund (sales locked; fail-closed providers). Email/SMS/voice gated. GDPR: deletion code exists; **not** legal compliance (**BLOCKED_HUMAN**).

---

## 15. Render / database / backup

| Level | This phase |
| --- | --- |
| 1 Disk in `render.yaml` | declared only |
| 2 Runtime path | **UNKNOWN** production |
| 3 Observed path | **UNKNOWN** |
| 4 Restart survival | **UNKNOWN** |
| 5 Production backup file | **UNKNOWN** |
| 6 Restore tested | **local dry-run only** (`test:backup-restore` exit 0) |
| 7 Procedure documented | `RENDER_STORAGE_OPERATOR.md` |

`verify:db-persistence` **not run** (defaults to production API). Isolated `:3002` earlier: `development_default`, `persistent: false`.

---

## 16. Regression results (this HEAD `5840f07`, not reused)

| Command | Exit | Passed | Failed | Skipped | Notes |
| --- | --- | --- | --- | --- | --- |
| `npx playwright test --reporter=line` on 3010/3002 | 0 | **110** | 0 | **8** | 118 tests |
| `npm run test:software` | 0 | 143 | 0 | 0 | |
| `npm run test:ai` | 0 | 58 | 0 | 0 | |
| `npm run test:bridge` | 0 | 18 | 0 | 0 | |
| `npm run test:unit` | 0 | **884** | 0 | 0 | 71 files; +2 vs Phase 6 |
| `npm run lint` | 0 | — | — | — | no ESLint issues; **does not close braces** |
| `npm run typecheck` | 0 | — | — | — | |
| `npm run build` | 0 | — | — | — | taxonomy restored |
| `npm run security:audit` | **1** | — | — | — | 5 HIGH |
| `npm run test:backup-restore` | 0 | dry-run | — | — | local only |
| `verify:db-persistence` | **not run** | — | — | — | prod default |

Playwright skips (not passes): 2 mobile category drills on desktop/tablet; 6 desktop overflow cases on mobile/tablet projects (covered on desktop).

---

## 17. Master backlog A / B / C

### GROUP A — Software-only

| ID | Description | Status | P | Launch-blocking catalog? | Next | Role |
| --- | --- | --- | --- | --- | --- | --- |
| A-01 | Static-wins listing merge + recommendation tests | done this phase | P0 | No | keep SoT off | Engineering |
| A-02 | HttpOnly admin session cookie | OPEN_SOFTWARE | P2 | No | optional hardening | Engineering |
| A-03 | Further local defects with a failing test | none remaining after suites | — | — | fix only with evidence | Engineering |

No other justified local software work remains without inventing features.

### GROUP B — Human / business

| ID | Description | Status | P | Blocks paid launch? | Next | Role |
| --- | --- | --- | --- | --- | --- | --- |
| B-01 | Patched braces or Next 15 eslint `fast-glob` bump | BLOCKED_EXTERNAL | P0 | No (devDep) | Maintainers; no `--force` | Upstream |
| B-02 | Approve SoT + migration window | BLOCKED_HUMAN | P1 | Catalog unification | Owner | Owner |
| B-03 | Stripe/PayPal sandbox keys | BLOCKED_EXTERNAL | P1 | Yes | Finance; sales stay 0 | Finance |
| B-04 | Marketplace insert legal review | BLOCKED_HUMAN | P1 | Those channels | Legal | Legal |
| B-05 | OTTO/bol/Cdiscount/eMAG/Skroutz contracts | BLOCKED_HUMAN | P2 | Those channels | Business | Business |
| B-06 | Supplier/TecDoc non-prod credentials | BLOCKED_EXTERNAL | P1 | Live cost | Purchasing | Purchasing |
| B-07 | Carrier keys | BLOCKED_EXTERNAL | P1 | Fulfilment | Logistics | Logistics |
| B-08 | SMTP/Twilio | BLOCKED_HUMAN | P1 | Notices | Ops; send blocked | Ops |
| B-09 | DATEV/SEPA/IBAN | BLOCKED_HUMAN | P1 | Payouts | Finance | Finance |
| B-10 | Sales / SoT / live-payments unlock | BLOCKED_HUMAN | P0 | Yes | Written go-live | Owner |
| B-11 | Tax/VAT 35-market review | BLOCKED_HUMAN | P1 | Multi-market paid | Tax advisor | Tax |
| B-12 | GDPR claims | BLOCKED_HUMAN | P1 | Compliance statements | DPO | Legal |
| B-13 | QR campaign vs statutory returns | BLOCKED_HUMAN | P1 | Campaign | Legal | Legal |

### GROUP C — Production verification

| ID | Description | Status | P | Blocks “production ready”? | Next | Role |
| --- | --- | --- | --- | --- | --- | --- |
| C-01 | Render disk + `/var/data` | UNKNOWN | P0 | Yes | `RENDER_STORAGE_OPERATOR.md` | Ops |
| C-02 | Runtime `BUZZARD_DB_PATH` | UNKNOWN | P0 | Yes | Path string only | Ops |
| C-03 | Observed production path | UNKNOWN | P0 | Yes | Authorized read-only health | Ops |
| C-04–C-06 | Restart / backup file / restore drill | UNKNOWN | P1 | Yes | Explicit approvals | Ops |
| C-07 | `verify:db-persistence` | not run | P0 | Yes | Human-authorized GET | Ops |
| C-08 | Provider sandbox webhooks | not SANDBOX_VERIFIED vs Stripe | P1 | Paid | Authorized sandbox | Finance+Eng |

---

## 18. Human and external dependencies

Same as B/C: upstream braces, owner flags, finance keys, legal, purchasing, logistics, DPO, Render access. No secrets requested.

---

## 19. Operator checklist

1. Keep `BUZZARD_SALES_ENABLED=0`, SoT unset, live payments unset.  
2. Do not merge/deploy this branch as go-live.  
3. Do not `npm audit fix --force`.  
4. Do not run `verify:db-persistence` without authorized read-only intent.  
5. Follow `RENDER_STORAGE_OPERATOR.md` without pasting secrets.  
6. Treat 110 Playwright passes as catalog-mode loopback only.  
7. Do not PO / label / publish / message customers.  
8. Do not enable SoT to “fix” PIM-only PDP 404s.  
9. Run `next build` in a directory that is **not** a live `next dev` `.next` (this workspace’s `:3000` returned 500 after the required build; process not killed).

---

## 20. Remaining defects — acceptance criteria

1. **braces GHSA (5 HIGH rows)** — Accept: `npm audit --audit-level=high` exit 0 **without** force or Next 14 downgrade.  
2. **Dual catalogs until SoT** — Accept: human-approved cutover **or** permanent documented split (current: JSON PDP + separate API list).  
3. **sessionStorage tokens** — Accept: HttpOnly cookie or recorded exception.  
4. **Render persistence UNKNOWN** — Accept: health `persistent: true` and path under `/var/data` from authorized read.

---

## 21. Prioritized next actions

P0: upstream braces; Render evidence; keep locks.  
P1: SoT decision (do not flip the flag here); Stripe/PayPal **sandbox** with sales off; legal inserts; supplier non-prod feed.  
P2: STUB marketplaces after contracts; DATEV/SEPA; session cookie; extra a11y audit if commissioned.

**Do not start another software phase unless a new failing local test appears.** Remaining launch work is B/C.

---

## 22. Safety-lock confirmation

| Lock | Evidence |
| --- | --- |
| Sales | `.env.example` 0; E2E env 0; `/api/health/software` `salesEnabled: false` |
| SoT | `productSourceOfTruthActive: false`; recommendation `activated: false` |
| Live payments | unset; payments flags false |
| Marketplace publish | blocked list |
| Money / PO / labels / comms | false / blocked |
| Production | not mutated; persistence script not run |
| Git | no push/PR/merge/deploy |
| Port 3000 | process not killed; HTTP 500 **after** local `next build` `.next` overwrite |
| 3010/3002 | stopped after E2E |
| €0.50 / no €0.10 undercut | still enforced |

---

## 23. Git / deploy confirmation

- **No** push, PR, merge, or deployment.  
- **No** production data/configuration change.  
- Local commits only on `cursor/final-completion-execution-c293`.

The system is **not** paid-launch ready. Local catalog-mode software on this HEAD is regression-tested. HIGH braces findings remain **OPEN**. Render persistence remains **UNKNOWN**.

---

Final HEAD (after report commit): see the following pin commit on this branch.
