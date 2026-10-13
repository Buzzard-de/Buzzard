# Buzzard Phase 6 — Master Gap Classification and Final Readiness Report

Version: 6.0  
Date: 2026-10-13  
Branch: `cursor/final-completion-execution-c293`  
Expected prior Phase 5 HEAD: `6e37938f0fe2df49b78bcbf75d8661c2d261f29f`  
Observed starting HEAD: `6e37938f0fe2df49b78bcbf75d8661c2d261f29f` (matched)  
Code HEAD after local software commits (before this report commit): `20c3e9a5f310bbafe9de9c8af898500dba314e9f`  
Final HEAD: recorded at the bottom after the local report commit.

Git push / PR / merge / deploy: **not performed**.  
`git reset --hard` / `git clean -fd`: **not used**.  
Port 3000: this task did **not** send a kill or restart to `next dev --port 3000` (parent pid `380551`, current `next-server` pid `1961396`, HTTP 200 after this phase). Isolated E2E used `:3010` + API `:3002` in tmux `e2e-stack-3010` and was stopped afterwards.

This is a consolidation phase. Engines from Phases 2–5 were **not** rebuilt. No overall completion percentage is claimed. Code presence is not operational readiness. Local Vitest/Playwright is not Stripe/PayPal/Render sandbox or live proof. No capability below is `LIVE_VERIFIED`.

Status labels: `NOT_IMPLEMENTED` | `STUB` | `PARTIAL` | `CODE_READY` | `CONFIGURED` | `SANDBOX_VERIFIED` | `LIVE_VERIFIED`  
Security labels: `FIXED_AND_VERIFIED` | `MITIGATED_WITH_EVIDENCE` | `OPEN` | `BLOCKED_EXTERNAL`

---

## A. Repository baseline and final HEAD

| Field | Value |
| --- | --- |
| Branch | `cursor/final-completion-execution-c293` (not `cursor/software-completion-c293`) |
| Starting HEAD | `6e37938` — Phase 5 pin; tree clean; 13 commits ahead of the recorded remote tracking name at session start |
| Uncommitted user changes at start | none |
| Rollback | restore listed files from `6e37938` / `b6cc5c5` / `20c3e9a`; no destructive Git |
| Pusat | sole orchestrator (`CANONICAL_ENGINES.orchestrator === "pusat"`) |

### Prior-phase issue inventory (Phases 2–5)

| Issue | Prior status | Phase 6 determination |
| --- | --- | --- |
| braces@3.0.3 GHSA-vfj7-8cjw-p6xm / CVE-2026-93687 | OPEN / BLOCKED_EXTERNAL | **Still OPEN / BLOCKED_EXTERNAL** — re-investigated; no compatible patch |
| Canonical order identity (`bzord_*` aliases) | SANDBOX_VERIFIED locally | **Still SANDBOX_VERIFIED** locally; no `canonical_order_id` column added |
| Admin E2E CORS / auth | Fixed Phase 2 | **Still passing** on 3010/3002 |
| QR loyalty | SANDBOX_VERIFIED locally | **Unchanged**; not rebuilt |
| Playwright disconnected `storefront-bridge` | Fixed Phase 5 | **Still attached** |
| Skip-link / static PDP E2E | Added Phase 5 | **Passing**; unknown-slug fail-closed added this phase |
| Static PDP vs PIM `/api/catalog` slugs | Open architecture gap | **Confirmed**; fail-closed 404 in `next dev`; **not** unified (SoT locked) |
| Product SoT inactive / five stores | Documented | **Unchanged**; writer/read map still accurate |
| Render persistence | UNKNOWN | **UNKNOWN** — `verify:db-persistence` defaults to production; **not run** |
| Marketplace publish / live payments / sales | Locked | **Locked** |
| OTTO/bol/Cdiscount/eMAG/Skroutz adapters | STUB | **STUB** |
| DATEV / SEPA / IBAN-name | STUB / NOT_IMPLEMENTED | **Unchanged** |
| GPS tracking | NOT_IMPLEMENTED (`gpsInvented: false`) | **Unchanged** |

Do not treat Phase 5 Playwright (107 passed at HEAD `6d178a9`) as evidence for this HEAD.

---

## B. Files changed and reasons

| File | Reason |
| --- | --- |
| `next.config.ts` | `output: "export"` only when `NODE_ENV === "production"`. `next dev` no longer overlays `generateStaticParams` errors on unknown `/produkt/[slug]` paths. Production export unchanged. |
| `app/produkt/[slug]/page.tsx` | `export const dynamicParams = false` — unknown slugs are not guessed. |
| `app/produkt/[slug]/not-found.tsx` | Fail-closed 404 copy (“Produkt nicht gefunden”); no invented product. |
| `server/lib/pim/productArchitecture.js` | `CATALOG_ROUTING` map: JSON PDP vs PIM API; `unified: false`, `dualPublish: false`, SoT inactive. |
| `server/__tests__/productArchitecture.test.mjs` | Regression: JSON slugs include `premium-bremsscheibe-testprodukt`, exclude PIM-only `isolated-cart-fixture`. |
| `e2e/customer-journey.spec.ts` | Unknown slug `/produkt/zz-kein-produkt-xyz/` must 404 / fail closed (desktop, mobile, tablet projects). |
| `e2e/admin-pim-core.spec.ts` | Heading assertion uses `getByRole("heading")` instead of compound `h1, h2, body` (Playwright strict mode). |
| `e2e/homepage-viewports.spec.ts` | After desktop language `tr`, wait for `data-buzzard-locale` and `.home-hero-title` (assertion not weakened). |
| This report | Master A/B/C classification and evidence. |

`npm run build` rewrote `data/taxonomy/buzzard_production_preflight.json` and `public/taxonomy/buzzard_production_preflight.json` (timestamp / local probe). Those files were **restored** to HEAD; they are unrelated to this phase.

Commits on this branch after Phase 5:

- `b6cc5c5` Fail closed on unknown product slugs without merging PIM into static export.
- `20c3e9a` Fix Phase 6 Playwright locator and wait for desktop language switch.
- This report commit (and optional SHA pin).

---

## C. Security findings and dependency resolution

### braces / GHSA-vfj7-8cjw-p6xm / CVE-2026-93687

**Status: OPEN / BLOCKED_EXTERNAL**

Re-investigated at HEAD `20c3e9a`. Not assumed from Phase 5.

Exact path (devDependency only):

```
eslint-config-next@15.5.27
  → @next/eslint-plugin-next@15.5.27
    → fast-glob@3.3.1
      → micromatch@4.0.8
        → braces@3.0.3
```

| Check | Result |
| --- | --- |
| Installed braces | 3.0.3 |
| npm published braces | latest **3.0.3** (no 3.0.4+) |
| micromatch 4.0.8 | `braces: ^3.0.3` |
| `@next/eslint-plugin-next@15.5.27` | still pins `fast-glob: 3.3.1` |
| `npm audit --audit-level=high` | exit **1**, 5 HIGH, 0 CRITICAL |
| Suggested fix | `npm audit fix --force` → `eslint-config-next@14.2.35` (major downgrade; **not applied**) |
| Next 16 eslint plugin | would be a framework jump; **not applied** (preserve Next 15.5.27) |
| Runtime production path | braces is **dev** (`node_modules/braces` from eslint-config-next). Not a storefront runtime dependency. Still **OPEN**, not suppressed. |

Classification: **OPEN** (no compatible resolution) and **BLOCKED_EXTERNAL** (needs braces patch and/or Next 15-compatible eslint plugin bump of `fast-glob`).

No other `npm audit` findings at high/critical. `npm run lint` reported no ESLint warnings or errors (exit 0). Lint passing does **not** close the advisory.

### Other local security controls (not a penetration test)

| Control | Evidence | Status |
| --- | --- | --- |
| AuthN/AuthZ admin | Playwright admin + 401 on unauthenticated software APIs | SANDBOX_VERIFIED (local) |
| Session | Bearer in sessionStorage (existing); not HttpOnly cookie | PARTIAL |
| Webhook signatures | dual-payment + identity tests: unsigned ≠ paid | SANDBOX_VERIFIED (fixtures) |
| Replay / idempotency | duplicate capture / duplicate checkout tests | SANDBOX_VERIFIED (fixtures) |
| Input validation / IDOR cart | commerce-security E2E | SANDBOX_VERIFIED (local) |
| Redirect allowlist | QR `OPEN_REDIRECT_BLOCKED` in identity tests | SANDBOX_VERIFIED (fixtures) |
| Rate limiting | admin login 429 path exists; E2E uses seed session | CODE_READY |
| PII in QR | customer QR tests; account page does not leak QR PII | SANDBOX_VERIFIED (local) |
| Secrets | this task did not print secrets | — |
| Sales / SoT / live payments | health `salesEnabled: false`, `productSourceOfTruthActive: false`; env unset/0 | MITIGATED_WITH_EVIDENCE |
| Backup/restore | local dry-run only | not production |

No professional penetration test, load, chaos, or soak test was run.

---

## D. Canonical order / payment / inventory verification

Design remains internal `bzord_*` plus aliases. **No** `canonical_order_id` column was added (no demonstrated correctness bug required it).

`npm run test:software` includes `orderIdentityLoyalty` (among 143 software tests). Covered locally:

| Scenario | Result (fixtures) |
| --- | --- |
| Every alias → one canonical order | pass |
| Duplicate alias / collision | fail closed |
| Unknown identifier | not guessed |
| Wrong-order / unsigned webhook | cannot mark paid; cannot consume stock |
| Amount / currency mismatch | fail closed (dual-payment adapters) |
| Duplicate capture | idempotent |
| Timeout / unverified callback | not payment success (existing official ingress) |
| Cancel before consume | reservation release |
| Cancel after consume | `released: 0` / consumed not restored |
| Concurrent payment vs cancel | stock consistent |
| Duplicate inventory consume | once |
| Return after loyalty redemption | review-only; no automatic clawback |
| Supplier credit vs customer refund | separate (code); no live money |
| Read-only reconciliation | existing reporting distinguishes estimated vs actual where implemented |
| Legacy aliases | mapped, not rewritten |

Inventory consumption remains gated on the **verified payment-capture** transition only.

Statuses: order identity **SANDBOX_VERIFIED** (local fixtures). Live payments **NOT_IMPLEMENTED** / blocked. Stripe/PayPal adapters **CODE_READY**, live **BLOCKED_EXTERNAL**, sandbox **not run** (no authorized sandbox keys).

---

## E. Product catalog and Product Source of Truth

SoT remains **inactive**. `BUZZARD_PRODUCT_SOT_ACTIVE` unset. Dual-write forbidden. No production migration. No legacy store deleted.

Authoritative map (`server/lib/pim/productArchitecture.js`):

| Store | Role |
| --- | --- |
| `pim_core_products` | Candidate master (`productCore`); **not activated** |
| `pim30_products` | Parallel PIM catalog writer |
| `pim_products` | Parallel PIM catalog writer |
| `products` | catalogSeo + projection from JSON (`catalogProductSync`, class D_PROJECTION) |
| `data/buzzard_products.json` | Storefront static PDP / `lib/products` / `generateStaticParams` |

**Catalog routing (intentional, not silently unified):**

- Storefront PDP `/produkt/[slug]`: JSON catalog; production `output: "export"`; `includesPimApiSlugs: false`.
- API `/api/catalog/products`: `catalogReadService` ← `pim_core_products` (visible PIM); JSON slugs not merged.
- `unified: false`, `dualPublish: false`.

Phase 6 software correction: unknown JSON slugs fail closed in **dev** (`dynamicParams = false` + `not-found`) without adding PIM slugs to `generateStaticParams`. Production static export still only emits JSON catalog params. A PIM-only slug has **no** static HTML in `out/` — that remains an architecture/SoT decision (Group B), not a silent merge.

Imports remain dry-run by default (admin PIM Core E2E dry-run still passing).

---

## F. QR loyalty verification

Not rebuilt. Existing `server/lib/software/qrLoyalty.js` + identity tests:

| Rule | Local evidence |
| --- | --- |
| Customer QR has no PII (`bzqr_`) | pass |
| Scan ≠ discount | pass |
| Customer vs package QR (`bzpk_`) distinct | pass |
| Redirect allowlist | pass |
| Server-side eligibility; cancelled/returned/pending-return | pass |
| Single-use + concurrent redemption | pass |
| No stacking; 15% cap; €0.50 min net profit; missing cost/tax fail-closed | pass |
| Late return ≠ automatic charge | pass |
| Marketplace inserts | **REVIEW_REQUIRED** (Group B) |

Implementation: **SANDBOX_VERIFIED** (fixtures). Campaigns / package inserts: **not sent**. Legal/marketplace approval: **not** implied by code.

---

## G. Pusat, queue, scheduler, worker

`npm run test:ai` — **58 passed**. No second orchestrator. No paid AI calls (`live.llm/openai/anthropic/google: false` on local `/api/health/software`).

| Capability | Status |
| --- | --- |
| Pusat request handling | SANDBOX_VERIFIED (local) |
| Task orchestrator / job queue / scheduler | SANDBOX_VERIFIED (local); scheduler `AI_TASK` bound to Pusat task id |
| Retry/backoff / timeout / DLQ | SANDBOX_VERIFIED (local) |
| Human approval not bypassed on retry | SANDBOX_VERIFIED (local) |
| Idempotency / crashed-worker claim | SANDBOX_VERIFIED (local) |
| Circuit / fail-closed providers | CODE_READY / fail-closed |
| Live LLM | NOT_IMPLEMENTED / not configured |
| Desktop bridge | SANDBOX_VERIFIED (`test:bridge` 18 passed) — not a second orchestrator |

---

## H. Supplier, marketplace, and carrier inventory

From `server/lib/software/connectorInventory.js` + `/api/health` commercial flags (local). **No live PO, publish, label, or GPS.**

### Suppliers

| id | Code | Local mock | Credentials | Sandbox | Live |
| --- | --- | --- | --- | --- | --- |
| csv/xml/json/mock | IMPLEMENTED | yes | n/a | n/a | BLOCKED |
| api / real_supplier / tecdoc | PARTIAL | dry-run default | absent | not run | BLOCKED |

Reservation ≠ supplier stock. Dry-run ≠ confirmation. Supplier credit ≠ guaranteed.

### Marketplaces

| id | Code | Publish | Live |
| --- | --- | --- | --- |
| amazon, ebay, kaufland, allegro, google_shopping, tiktok_shop | PARTIAL adapters | blocked | no |
| otto, bol, cdiscount, emag, skroutz | STUB | blocked | no |

### Carriers / tracking

| id | Code | Labels | GPS |
| --- | --- | --- | --- |
| dhl, dpd, gls, hermes, ups | lookup CODE_READY | `shipmentCreated: false` | `gpsInvented: false`; **NOT_IMPLEMENTED** as live GPS |

Chain in code: order → (gated) supplier fulfillment → carrier **event** tracking → customer view → communication **gates**. Carrier **event** tracking is not continuous GPS. Local `/api/health` `carriers.dhl/dpd/gls/ups: false`.

---

## I. Payments, returns, banking, accounting

| Item | Status |
| --- | --- |
| Stripe adapter | CODE_READY; live HTTP requires sales **and** `BUZZARD_LIVE_PAYMENTS`; both off |
| PayPal adapter | same |
| Dual-payment engine | SANDBOX_VERIFIED (fixtures); not provider sandbox |
| Unsigned webhook | cannot mutate paid |
| Duplicate events | idempotent |
| Timeout ≠ success | enforced in official ingress tests |
| Customer refund vs supplier credit vs chargeback vs stock restore | separate; chargeback does not silently rewrite stock |
| SEPA | STUB |
| Commercial bank / Bundesbank query | NOT_IMPLEMENTED |
| IBAN-name check | NOT_IMPLEMENTED / RESEARCH_REQUIRED |
| DATEV | not configured; external authorization required |
| Live money movement | false |

Local health: `payments.stripe/paypal/klarna: false`, `webhooks.configured: false`.

---

## J. Localization, customer service, privacy

| Item | Status |
| --- | --- |
| 30 locales / 35 markets | CONFIGURED in UI selectors (Playwright counts); **not** 35-market legal readiness |
| RTL Arabic | SANDBOX_VERIFIED (Playwright landscape/portrait + overlay) |
| Language independent of market | desktop TR switch + DE market (Playwright) |
| Translation fallback | English technical fallback; German not silent UI fallback (`lib/i18n/translations.ts`) |
| Customer AI financial actions | existing fail-closed; sales locked |
| Email/SMS/voice/PSTN | gated / not sent; Twilio false |
| Account PII | `/konto/` behind sign-in (Playwright) |
| GDPR | code has privacy/deletion surfaces; **not** asserted as legal compliance |

Privacy/legal review remains Group B.

---

## K. E2E and regression (this HEAD)

Stack: `PLAYWRIGHT_WEB_PORT=3010`, `PLAYWRIGHT_API_PORT=3002`, `PLAYWRIGHT_SKIP_WEBSERVER=1`, `PLAYWRIGHT_BASE_URL=http://localhost:3010`, `NEXT_PUBLIC_BUZZARD_API_URL=http://localhost:3002`. Port 3000 not targeted as a test base URL.

Command: `npx playwright test --reporter=line`  
**110 passed, 8 skipped, 0 failed** (118 tests). Exit **0**. HEAD of this run: `20c3e9a`.

Projects: `api`, `chromium-desktop`, `chromium-mobile`, `chromium-tablet`, `homepage-viewports`. All connected.

### Skips (not passes)

| Skip | Count | Why | Material? |
| --- | --- | --- | --- |
| Mobile category drill on desktop + tablet | 2 | `width >= 768` | No — runs on `chromium-mobile` |
| Desktop overflow cases on mobile + tablet | 6 | project filter (`label.startsWith("desktop")`) | No — run on `chromium-desktop` |

`customer-journey` also has `test.skip(!product, ...)` inside the checkout test; it **ran** (product resolved). Not counted in the 8 skipped.

### Journey map

| Flow | How | Result |
| --- | --- | --- |
| Homepage | Playwright | passed |
| Skip-to-main | Tab → `.skip-link` → `#maincontent` | passed |
| Category / catalog | mobile drill + storefront-bridge | passed |
| Product detail (JSON slug) | `/produkt/premium-bremsscheibe-testprodukt/` | passed |
| Invalid / unknown product | `/produkt/zz-kein-produkt-xyz/` fail-closed | passed (new) |
| PIM API slug as static PDP | still not in `generateStaticParams` | architecture; SoT locked |
| Cart / checkout | UI + commercial attempt blocked | passed (sales locked) |
| Missing cost/tax / €0.50 | Vitest pricing/QR | not Playwright |
| Payment / identity / inventory / cancel / return | Vitest fixtures | not browser paid checkout |
| QR landing DE/AR | Playwright | passed |
| Duplicate redemption | Vitest | not Playwright |
| Account PII | `/konto/` | passed |
| Admin auth + PIM Core | admin + pim-core | passed (locator fix) |
| Viewports + RTL | homepage-viewports + overlay | passed (locale wait) |
| Storefront bridge | attached to chromium-desktop | passed |

Paid browser checkout remains **NOT_IMPLEMENTED** while sales are locked (correct).

---

## L. Lint, typecheck, build, audit, backup

| Command | Exit | Counts | Notes |
| --- | --- | --- | --- |
| `npm run test:software` | 0 | 143 passed / 0 failed / 0 skipped | identity, dual-payment, lifecycle, secure commerce |
| `npm run test:ai` | 0 | 58 passed | Pusat / workers |
| `npm run test:bridge` | 0 | 18 passed | desktop bridge |
| `npm run test:unit` | 0 | 882 passed (70 files) | includes the above |
| `npx playwright test --reporter=line` | 0 | 110 passed / 8 skipped / 0 failed | 3010/3002 |
| `npm run lint` | 0 | no ESLint warnings/errors | does not close braces advisory |
| `npm run typecheck` | 0 | — | `tsc --noEmit` |
| `npm run build` | 0 | Next export + post-export | taxonomy preflight restored after |
| `npm run security:audit` | **1** | 5 HIGH braces chain | OPEN |
| `npm run test:backup-restore` | 0 | dry-run local SQLite | **not** production restore |
| `npm run verify:db-persistence` | **not run** | defaults to `https://buzzard-api.onrender.com` | production GET without authorization |

---

## M. Render persistence and production evidence

Evidence levels:

| # | Claim | This phase |
| --- | --- | --- |
| 1 | Persistent disk declared in `render.yaml` | configuration-as-code only |
| 2 | Runtime uses intended path | **UNKNOWN** in production |
| 3 | Runtime observed on intended path | **UNKNOWN** |
| 4 | Data survives authorized restart | **UNKNOWN** |
| 5 | Production backup exists | **UNKNOWN** |
| 6 | Restore tested successfully in production | **not claimed**; local dry-run only |
| 7 | Recovery procedure documented | `docs/software-completion/RENDER_STORAGE_OPERATOR.md` |

Local `/api/health/db` on isolated `:3002` (before stack stop):

- path: `/workspace/server/data/buzzard.db`
- `persistence.mode=development_default`
- `persistent: false`
- `/var/data` exists=false writable=false
- `envBuzzardDbPath: null`

This is **not** production persistence. Status remains **UNKNOWN**.

`npm run build` in this workspace shares `.next` with `next dev`. After the production build, `:3010` returned HTTP 500 until the isolated stack was stopped. `:3000` remained HTTP 200. Future operator builds should not share `.next` with a live `next dev` process.

---

## N. Master backlog grouped A / B / C

### GROUP A — Software-only (safe local)

| Task ID | Description | Evidence | Status | P | Blocks safe catalog launch? | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| A-01 | Keep unknown PDP slugs fail-closed in dev | Playwright 404 + `dynamicParams` | done this phase | P0 | No (catalog JSON still serves) | Do not merge PIM slugs |
| A-02 | Admin PIM heading locator | 5/5 pim-core passed | done | P0 | No | none |
| A-03 | Desktop language switch wait | homepage-viewports passed | done | P1 | No | none |
| A-04 | Regression tests for catalog routing | productArchitecture + E2E | done | P0 | No | keep SoT off |
| A-05 | Remaining local defects without credentials | none newly reproduced after suites | — | — | — | fix only with a failing local test |

Acceptance for A-01: unknown slug never invents a product; production export still JSON-only.

### GROUP B — Human / business / legal / accounts

| Task ID | Description | Evidence | Status | P | Blocks paid launch? | Next responsible action |
| --- | --- | --- | --- | --- | --- | --- |
| B-01 | braces / eslint-config-next 15-compatible bump | audit exit 1 | OPEN / BLOCKED_EXTERNAL | P0 | No (devDep) | Maintainers; do not `--force` |
| B-02 | Product SoT activation + identity map + migration | five stores; candidate named | inactive by policy | P1 | Catalog unification | Written approval; do not enable flag here |
| B-03 | Stripe/PayPal sandbox keys | adapters CODE_READY | BLOCKED | P1 | Yes | Finance; sales stay 0 |
| B-04 | Marketplace account + insert legal review | QR REVIEW_REQUIRED | BLOCKED | P1 | Those channels | Legal + marketplace ops |
| B-05 | OTTO/bol/Cdiscount/eMAG/Skroutz contracts | STUB | BLOCKED | P2 | Those channels | Business then implement |
| B-06 | Supplier / TecDoc credentials | PARTIAL dry-run | BLOCKED | P1 | Live cost/stock | Purchasing; non-prod read first |
| B-07 | Carrier API keys | CODE_READY lookup | BLOCKED | P1 | Fulfilment | Logistics; tracking read; no create |
| B-08 | SMTP / Twilio | live false | BLOCKED | P1 | Notices | Ops; send stays blocked |
| B-09 | DATEV / SEPA / IBAN-name | STUB / NOT_IMPLEMENTED | BLOCKED | P1 | Payouts/accounting | Finance |
| B-10 | LLM provider keys | fail-closed | BLOCKED | P2 | No | AI ops; no live probe from this task |
| B-11 | Sales / SoT / live payments unlock | flags off | LOCKED | P0 | Yes | Owner written go-live |
| B-12 | QR campaign vs statutory returns | `legalComplianceProven` not claimed | BLOCKED | P1 | Campaign | Legal |
| B-13 | Tax/VAT/accounting professional review | 35 markets are configuration | BLOCKED | P1 | Multi-market paid | Tax advisor |
| B-14 | GDPR / privacy legal review | deletion code ≠ compliance | BLOCKED | P1 | Claims | DPO/legal |

### GROUP C — Production verification (authorized access required)

| Task ID | Description | Evidence | Status | P | Blocks “production ready” claim? | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| C-01 | Render disk attached + `/var/data` | local persistent=false | UNKNOWN | P0 | Yes | `RENDER_STORAGE_OPERATOR.md` read-only |
| C-02 | Runtime `BUZZARD_DB_PATH` | unset locally | UNKNOWN | P0 | Yes | Confirm path string only; no secrets |
| C-03 | Observed production path | not accessed | UNKNOWN | P0 | Yes | Read-only `/api/health/db` if authorized |
| C-04 | Restart survival | not done | UNKNOWN | P1 | Yes | Authorized restart only |
| C-05 | Production backup file | unknown | UNKNOWN | P1 | Yes | Operator confirms file on disk |
| C-06 | Production restore drill | local dry-run only | UNKNOWN | P1 | Yes | Explicit restore approval |
| C-07 | `verify:db-persistence` | **not run** (prod default) | UNKNOWN | P0 | Yes | Human-authorized read-only GET |
| C-08 | Provider sandbox webhooks | not run | not SANDBOX_VERIFIED vs Stripe | P1 | Paid | Authorized sandbox, sales still 0 |

---

## O. Remaining defects with acceptance criteria

1. **OPEN HIGH braces@3.0.3** — Accept: `npm audit --audit-level=high` exit 0 **without** `audit fix --force` and without Next 14 downgrade.  
2. **Dual product catalogs** — Accept: either (a) human-approved SoT migration with identity map and single PDP source, or (b) documented permanent split with customer-facing routing that never 404s a product the API lists as buyable. Current fail-closed unknown JSON slug is correct for static export; it does **not** publish PIM slugs.  
3. **Session tokens in sessionStorage** — Accept: HttpOnly cookie or equivalent documented threat-model exception.  
4. **Playwright skip filters** — Not a product defect; desktop overflow covered on desktop project.

No other reproducible local application defect was left failing after the suites above.

---

## P. Human approvals and external dependencies

Required before any paid or production-readiness claim:

- Owner: sales unlock, SoT activation, live payments (all currently forbidden).
- Finance: Stripe/PayPal sandbox then live; DATEV/SEPA; no invented revenue.
- Legal: marketplace inserts, QR campaign vs consumer rights, GDPR claims, tax in 35 markets.
- Logistics: carrier keys; no real labels from this repo task.
- Purchasing: supplier/TecDoc non-prod credentials.
- Ops: Render disk evidence; SMTP/Twilio still send-blocked until approval.
- Maintainers: braces / Next eslint `fast-glob` bump.

---

## Q. Exact operator checklist (safe)

1. Keep `BUZZARD_SALES_ENABLED=0`, `BUZZARD_PRODUCT_SOT_ACTIVE` unset, `BUZZARD_LIVE_PAYMENTS` unset.  
2. Do not merge/deploy this branch as a production go-live.  
3. Do not run `npm audit fix --force`.  
4. Do not run `verify:db-persistence` against production unless a human authorizes a **read-only** health GET.  
5. Follow `docs/software-completion/RENDER_STORAGE_OPERATOR.md` without pasting secrets.  
6. Treat **110 Playwright passes** as catalog-mode evidence on loopback only.  
7. Do not place supplier POs, create labels, publish listings, or send customer messages.  
8. If building Next while `next dev` is running, use an isolated directory; shared `.next` can 500 a sibling dev server.  
9. Do not enable Product SoT to “fix” PDP 404s for PIM-only slugs.

---

## R. Prioritized next steps

### P0

1. Upstream braces / Next 15-compatible eslint plugin `fast-glob` bump; re-audit.  
2. Authorized Render persistence evidence (C-01–C-03).  
3. Keep sales / SoT / live payments locked.

### P1

4. Product catalog unification policy (B-02) — software after written SoT plan only.  
5. Stripe/PayPal **sandbox** signed webhooks with sales still off (B-03 / C-08).  
6. Marketplace insert legal review (B-04).  
7. Supplier cost feed in non-prod (B-06).

### P2

8. Vendor adapters after contracts (B-05).  
9. DATEV/SEPA after finance (B-09).  
10. Session cookie hardening (O-3) if productized auth is in scope.  
11. Dedicated a11y audit if commissioned.

---

## S. Safety-lock confirmation

| Lock | Evidence |
| --- | --- |
| Sales disabled | `.env.example` `BUZZARD_SALES_ENABLED=0`; E2E stack env `0`; `/api/health` `salesEnabled: false`; `/api/health/software` `salesEnabled: false` |
| Product SoT inactive | health `productSourceOfTruthActive: false`; env not `1` |
| Live payments disabled | env unset; health payments all false |
| Marketplace publishing blocked | health `blocked` includes `marketplace_publish`; inventory `published: false` |
| Real money movement | false |
| Real supplier purchases | false; `supplier_purchase_order_send` blocked |
| Real customer communications | false; `customer_message_send` blocked |
| Production data/config | not modified; `verify:db-persistence` not run |
| Port 3000 | not killed; HTTP 200 at end (`next-server` pid `1961396`) |
| Isolated 3010/3002 | stopped after E2E; this task’s tmux stack only |
| €0.50 min profit | still enforced; €0.10 undercut **not** implemented (`marketUndercutImplemented: false`) |
| Missing cost/tax | fail closed (pricing/QR tests) |

---

## T. Git / deploy confirmation

- **No** `git push`.  
- **No** pull request created or updated.  
- **No** merge.  
- **No** deployment or production restart.  
- **No** `git reset --hard` or `git clean -fd`.  
- Local commits only on `cursor/final-completion-execution-c293`.

The system is **not** launch-ready for paid production. Local catalog-mode software on this HEAD is regression-tested. Critical production evidence (Render persistence) remains **UNKNOWN**. The braces advisory remains **OPEN**.

---

## Appendix — capability snapshot (strongest evidence-backed status)

| Area | Status |
| --- | --- |
| Static JSON PDP + fail-closed unknown slug | SANDBOX_VERIFIED (local E2E) |
| PIM API catalog | CODE_READY (separate store) |
| Product SoT | NOT_IMPLEMENTED as activation (flag off) |
| Order identity / inventory consume-on-capture | SANDBOX_VERIFIED (fixtures) |
| Dual payment adapters | CODE_READY; SANDBOX_VERIFIED vs **fixtures only** |
| Stripe/PayPal provider sandbox | not run → not SANDBOX_VERIFIED vs provider |
| QR loyalty engine | SANDBOX_VERIFIED (fixtures) |
| Pusat / workers | SANDBOX_VERIFIED (local) |
| Marketplace publish | blocked; adapters PARTIAL or STUB |
| Carriers | CODE_READY lookup; live NOT_IMPLEMENTED |
| GPS | NOT_IMPLEMENTED |
| SEPA/DATEV/IBAN-name | STUB / NOT_IMPLEMENTED |
| Render persistence | UNKNOWN |
| Live anything | not LIVE_VERIFIED |

---

Final HEAD (after report commit): see the following pin commit on this branch.
