# Buzzard Current State — Software Inventory

**Audit date:** 2026-10-11  
**Scope:** Read-only inspection of `main` at HEAD `84166bb363f3ecd9fb71b1a08f065ed7c26d0576` plus live HTTP probes.  
**Method:** Repository inventory + public production health endpoints. No tests executed. No code, flag, or production changes.  
**Supersedes:** August 2026 persistence findings in `docs/PRODUCTION_REMAINING_STATUS.md` and `docs/WAS_NOCH_ZU_TUN.md` where they conflict with live evidence below.

Status classes used throughout this audit:

| Code | Meaning |
|------|---------|
| A | IMPLEMENTED_AND_TESTED — code exists and appropriate tests exist; this audit did **not** re-run those tests |
| B | IMPLEMENTED_NOT_PRODUCTION_VERIFIED — code exists; production use not proven |
| C | PARTIALLY_IMPLEMENTED — pieces exist; end-to-end flow incomplete |
| D | PLANNED_NOT_IMPLEMENTED — docs/config/skeleton only |
| E | NOT_STARTED — no meaningful implementation found |
| F | BLOCKED — cannot proceed without a technical or operational gate |
| G | NOT_APPLICABLE — outside the dropship / no-own-warehouse model |
| H | NEEDS_VERIFICATION — evidence insufficient |

Tests that were not executed in this audit are marked **NOT RUN**. CI on `main` for HEAD ran lint, typecheck, build, render preflight, and `security:check` successfully; unit, integration, and Playwright suites are **not** in CI.

---

## 1. Repository and Git

| Item | Evidence |
|------|----------|
| Repository | `Buzzard-de/Buzzard` |
| Audited branch | `main` (workspace was on `main`; this report branch is `cursor/master-audit-c293`) |
| HEAD | `84166bb` — *Keep the phone category drawer attached while scrolling (#422)* |
| Working tree at audit start | Clean |
| Recent merged work | Phone homepage / category drawer PRs #408–#422 (2026-10-10) |
| Live site | https://buzzard24.de — HTTP 200, Fastly-cached static export |
| Live API | https://buzzard-api.onrender.com — commit `84166bb`, `deployment.status=SYNCED`, `drift=false` |

**Open PR stack (not on `main`, not production):** #353–#365 (persistence / external-access / go-live chain), #368 (orchestrator facade), #377 (master integration Phase 3), #378 (Pusat idempotency), #379–#384 (SoT / go-live gates), #385–#392 (mobile / orchestrator / digital-human / OpenAI Realtime). Those branches are **in-flight architecture**, not current production capability.

`Pusat` does **not** appear as a module name on `main`. On `main` the closest systems are Node `aiOrchestrator.js`, Python `buzzard_orchestrator.py` (agent `nesrin`), and commerce idempotency (`server/lib/commerce/idempotency.js`).

---

## 2. Technology stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Storefront | Next.js 15.1, React 19, TypeScript, static export | `package.json`, `next.config.ts` |
| Hosting (web) | GitHub Pages + custom domain `buzzard24.de` | `.github/workflows/deploy-pages.yml` |
| API | Node (`server/server.js`), SQLite | Render `buzzard-api`, Frankfurt, starter + disk |
| Intelligence | Python FastAPI Docker | `buzzard-intelligence` (free plan) |
| Orchestrator | Python FastAPI | `buzzard-orchestrator` — DB `/tmp/buzzard_orchestrator.db` (**ephemeral**) |
| Guardian | Python FastAPI | `buzzard-guardian` — DB `/tmp/buzzard_guardian.sqlite3` (**ephemeral**) |
| Catalog files | JSON in `data/` | Categories, 15 static products, 35 markets, i18n |
| Auth | Admin scrypt sessions + customer account tokens + identity-security JWT | `server/lib/auth.js`, `customerAuth.js`, `identitySecurity.js` |
| Feature flags | `BUZZARD_*` / `NEXT_PUBLIC_*` | Module flags mostly `1`; **sales = 0** |
| Tests | Vitest, Playwright, `server/__tests__`, smoke scripts | **NOT RUN** this audit; CI does not execute them |
| CI | `.github/workflows/ci.yml` | lint, typecheck, build, render:preflight, security:check — **success** on HEAD |

---

## 3. Live production snapshot (2026-10-11)

Probed without credentials or mutation:

| Check | Result |
|-------|--------|
| `GET https://buzzard24.de` | HTTP 200 |
| `GET /api/health` | HTTP 200, `salesEnabled: false` |
| `GET /api/health/version` | commit `84166bb`, branch `main`, `salesEnabled: false` |
| `GET /api/health/db` | path `/var/data/buzzard.db`, **`persistent: true`**, mode `render_persistent_disk` |
| `GET /api/health/production` | `overall: OK`, `goLiveLock: true`, `deployment: SYNCED` |
| Commerce flags | `checkoutDryRunOnly: true`, `mockPaymentOnly: true`, `stripeEnabled: false`, `paypalEnabled: false`, `supplierOrdersEnabled: false` |
| Catalog | taxonomy count **53**, storefront-ready productCount **0** |
| Legacy `products` table | **26** rows |
| Static JSON catalog | **15** products in `data/buzzard_products.json` |
| Orders | **0** |
| Supplier | `connected: false`, `liveImportEnabled: false`, `dryRun: true`, `adapterMode: MOCK` |
| Worker | `RUNNING`, `supplierOrdersBlocked: true`, jobs processed **0** |
| Backup | `/var/data/backups` exists, `latestValid: true`, `latestStatus: OK`; cron scheduler env **null** |
| Redis | `NOT_CONFIGURED` (in-memory rate limit) |
| Intelligence bridge | `LIVE` → `https://buzzard-intelligence.onrender.com` |
| Intelligence readiness | catalog **BLOCKED** (0 active products), payment **BLOCKED**, shipping **BLOCKED**, ebay/amazon/tecdoc/llm **NOT_CONFIGURED** |
| Orchestrator | HTTP 200, 7 agents, **ephemeral `/tmp` DB** |
| Guardian | HTTP 200, sales/payment/supplier-order/images **false**, **ephemeral `/tmp` DB** |
| Go-live gates | `/api/health/final-go-live-readiness` **BLOCKED** — human approval required; `autoActivate: false` |

**August 2026 audits that claimed ephemeral production SQLite are outdated.** Persistent disk is live. Sales remain locked.

`/api/health` also reports `commercial.payments.stripe=true` and `paypal=true` with webhook `configured: true`. That is **not** live money movement: production commerce flags still force `stripeEnabled: false`, `paypalEnabled: false`, `mockPaymentOnly: true`. Treat as “adapter/keys may exist” vs “payments take real money” — the latter is **false**.

---

## 4. Feature flags and sales lock

| Flag | Repo default | Live | Effect |
|------|--------------|------|--------|
| `BUZZARD_SALES_ENABLED` | `0` | `false` | Blocks commercial checkout, ACTIVE publish, supplier orders |
| `NEXT_PUBLIC_SALES_ENABLED` | `0` | catalog mode | Hides prices / commercial CTA on static site |
| `REAL_SUPPLIER_DRY_RUN` | `1` | dry-run | No live supplier HTTP |
| `REAL_SUPPLIER_LIVE_IMPORT` | `0` | `false` | Import blocked |
| `PRODUCTION_SAFETY_LOCK` | hardcoded `true` in `server/lib/commerce/goLiveApproval.js` | lock on | Approve-go-live does **not** enable sales |
| Module `BUZZARD_*` / `NEXT_PUBLIC_*` v0.5–v4.0 | mostly `1` | plugins enabled | Admin/API surfaces exist; not proof of live integrations |

---

## 5. Authentication and authorization

| Realm | Implementation | Status |
|-------|----------------|--------|
| Admin | Email/password, scrypt, session token, lockout, optional 2FA | B — code present; live login not exercised this audit |
| Customer | `/api/account/*` via `customerAuth.js` | B |
| Identity-security | JWT + privacy request tables | C — parallel stack |
| RBAC | `server/lib/rbac.js`, `routePermissions.js`, global middleware, CSRF | B |
| AI execute | `ai.execute` / `aiCanExecute` | B — stub provider |
| GDPR export/delete | `POST /api/identity-security/privacy/request` | C — workflow tables; fulfillment depth not verified |

---

## 6. Module inventory

### A) Storefront and UX — C / B

Canonical category source is **not** the homepage cards.

| Source | Count | File |
|--------|-------|------|
| Shop JSON L1 | **53** | `data/buzzard_categories.json` |
| Master taxonomy L1 | **48** (`bz.01`–`bz.48`) | `lib/categories/customerFacing.ts` |
| Customer-visible L1 | **50** | `getVisibleMainCategories()` — hides `cat-30`, `cat-37`, `cat-39` |

Homepage, mega menu, and phone drawer all call `getVisibleMainCategories()`. Phone Germany background is DE-country-only.

| Feature | Status | Evidence |
|---------|--------|----------|
| Homepage | B | `app/page.tsx`, `components/HomePageContent.tsx`; live HTTP 200 |
| Mobile / desktop split | B | `components/mobile/*`, `styles/buzzard-mobile.css`; e2e files **NOT RUN** |
| Category menu + L2 | B | `MegaMenuOverlay.tsx`, `CategorySidebar.tsx` |
| Listing / PDP | B | `app/products/`, `app/produkt/[slug]/` — catalog-mode, Kfz-oriented metadata still present |
| Search | C | Query + optional `/api/advanced-search`; no dedicated search engine page |
| Brand / price range filters | C / E | Brand via `?q=`; sort by price; **no** brand checkbox or min/max price UI |
| Cart | B | Always enabled |
| Checkout | C / F | UI exists; dry-run only while sales locked |
| Account / order history | B | `app/konto/*` — 0 live orders |
| Storefront returns form | E | RMA API exists; no `konto` return UI |
| RTL / LTR | B | Arabic + GCC/EG `textDirection`; `styles/rtl.css` |
| Language ≠ country | B | Separate i18n and market contexts; unit tests exist (**NOT RUN**) |
| Accessibility | C | Skip link + some `aria-*`; no a11y audit evidence |

### B) Language and country — B / C

| Claim | Evidence | Status |
|-------|----------|--------|
| 30 UI locales | `lib/i18n/supported-locales.json`: de en tr ar fr nl bg hr el cs da et fi hu it lv lt lb mt pl pt ro sk sl es ca eu gl sv ga | B |
| 35 markets | `data/global/global_countries_35.json` — 27 EU + TR + SA AE QA KW BH OM + EG | B |
| Currency / VAT display | `lib/market-engine/vat.ts`, `price.ts` | B |
| Country delivery rules | shipping JSON + extensions | C — data present; live rates not carrier-backed |
| Localized categories | `lib/categories/i18n.ts` | B |
| Localized products / emails | product i18n + `lib/email/templates.ts` (de/en/tr/ar samples) | C — not all 30 locales |
| URL prefixes | only `de\|en\|tr\|ar`; others via in-app locale / `?lang=` | C |
| Fallback | `translate()` → fallback chain → German | B |

### C) Product engine / SoT — C / F

| Piece | Status | Files |
|-------|--------|-------|
| PIM Core SQLite model (SKU, EAN/GTIN, brand, category, attributes, variants, media, audit) | C | `server/lib/pim/productCore.js`, `docs/PIM.md` |
| Validation / duplicates / publish rules | C | `productValidation*.js`, `productDuplicateDetector.js`, `productCatalogPublish.js` |
| Storefront read path | C | `catalogReadService.js` reads PIM; live productCount **0** |
| Legacy JSON + `products` table | C | Dual SoT risk: 15 JSON / 26 SQLite / 0 PIM-active |
| ACTIVE publish | F | Rejected unless `BUZZARD_SALES_ENABLED=1` |
| Live supplier-fed catalog | F | Import dry-run only |

### D) Supplier engine — C / F

Adapters (`api`, `xml`, `csv`, `dryRun`, `mock`) and registry exist under `server/lib/supplier/`. Live:

- `connected: false`
- `canConnectLive: false`
- `blockedReason: dry_run_mode`
- TecDoc not configured
- 3 supplier rows / 2 supplier products in hub totals (not a live feed)

No dedicated trust-score engine. Dropship flags exist on rows. Order submit to supplier returns blocked (`orderService.submitSupplierOrder`).

### E) Pricing engine — C

**Two different rule sets exist. They are not the same, and checkout does not use the intelligence rules.**

| Rule | Documented | Enforced in Node checkout / `server/lib/pricing.js` | Enforced in Python intelligence |
|------|------------|-----------------------------------------------------|--------------------------------|
| Markup ~38%, min margin 12%, default margin 30% | Yes (`pricing.js`, catalogSeo health) | Yes (markup/min-margin helpers) | No |
| Minimum **€0.50 net profit** | Yes (`intelligence/buzzard_intelligence/profit.py` `MIN_NET_PROFIT = 0.50`; commerce README) | **No** — cart uses PIM `product.price` | Yes inside ProfitEngine / selection CLI |
| At least **€0.10 below lowest comparable price** | **Not found** in server docs or Node/Python pricing calculators | **No** | **No** |

`lib/market-engine/price.ts` is VAT/display only. Competitor observation exists as intelligence CLI, not a wired price-update loop.

### F) Inventory — C / G

PIM `stock` is the cart authority. `stockSync.js` simulates updates in dry-run. Checkout validation sets `reservation: false`. No concurrent reservation.

`wmsInventory.js` models owned warehouse stock. **G — not required** for the no-own-warehouse / dropship model; do not treat enabling WMS as a go-live prerequisite.

### G) Order engine — C / F

Checkout state machine, idempotency table, OMS tables, and dry-run E2E specs exist. Live: **0 orders**, supplier forward **403 / blocked**, commercial path **F**. Dual stacks (`commerce_orders` vs `oms_orders`) remain.

### H) Returns — C / E

`returnsRma.js` has a DB workflow; refunds are marked in-DB with a note to execute via a later refund API. Return Recovery types (`lib/returnRecovery/`) model `supplierRecoveryConfirmed` vs expected, but **no matching `/api/admin/returns` implementation**. Admin UI `AdminReturnsPanel.tsx` calls the missing route. Abuse detection: **E**. Supplier refund is **not** auto-assumed in code — correct, but also not implemented.

### I) Marketplace — D

`marketplaceHub.js` seeds **Amazon, eBay, Google Shopping, TikTok Shop** as DB channels and queues local sync jobs. No worker talks to those APIs. Live intelligence: ebay/amazon **NOT_CONFIGURED**.

| Channel | On `main` | Live |
|---------|-----------|------|
| Amazon / eBay | Hub rows + feed adapter stubs | NOT_CONFIGURED |
| Kaufland, Allegro, bol.com, Cdiscount, OTTO | Market-engine **metadata** only | No connector |
| eMAG, Skroutz | Not in market-engine extensions | No connector |
| marketplaceV35 | Generic CRUD skeleton | No channel API |

Connector files are **not** production integrations.

### J) Payments / finance — C / F

Mock provider is the effective path. Stripe/PayPal classes return disabled. Klarna stub. Webhook foundation exists. Live commerce: `mockPaymentOnly: true`. VAT/invoice/reconciliation tables exist without live PSP settlement.

### K) Logistics — C

DB-seeded carriers: DHL, DPD, GLS, UPS, Evri/Hermes — **static rates**. Live health: all carrier flags **false**. Labels/tracking in fulfillment/RMA use **DEMO-** prefixes when secrets are absent. No GPS / map / carrier-event sync. **Simulation, not carrier telemetry.**

### L) AI / orchestrator — C

| Role | Real data? | Real action? |
|------|------------|--------------|
| Node task orchestrator | DB tasks/approvals | Stub LLM (`AI_PROVIDER=rules`) |
| Storefront chat | Order lookup + product search | Rule/intent templates, not LLM |
| Python agents (nesrin, supplier, product, pricing, order, customs, security) | Local orchestrator DB | **simulation** mode |
| Intelligence Bey agents (dogu_bey, aslan_bey, esat_bey) | Intelligence service up | Not wired to sales/catalog |
| Price / stock / SEO / sales / category / supplier-intel / customs assistants | Admin/control-center seeds + intelligence packages | Prompts/UI/simulation unless external URL+keys |
| Decision logging | `core_system_events`, security/audit logs | B for logging; actions remain stub |

Human Approval Center exists as DB + admin surfaces. Orchestrator/Guardian **memory is ephemeral** (`/tmp`).

### M) Voice / digital human — D / E on `main`

No Twilio, WebRTC, ICE, TURN/STUN, or OpenAI Realtime in `app/`, `components/`, or `server/` on `main`. Python phone-assistant package exists under `intelligence/` with `phone_production.json` **`enabled: false`** and realtime adapter `NotImplementedError`. Open PRs #386–#392 are **not merged**.

### N) Security / GDPR — B / C

Auth, RBAC, CSRF, rate limits, audit logs, AI permission bits, hardcoded production safety lock. Redis rate-limit store not configured (memory fallback). Dependency `npm audit` is **not** in default CI. GDPR request API present; deletion completeness **H**.

### O) Test / deploy / production — mixed

| Item | Status |
|------|--------|
| Unit / part / e2e files | Present — **NOT RUN** |
| CI quality | A for lint/typecheck/build on HEAD |
| GitHub Pages deploy | A — live 200, commit-aligned frontend |
| Render API + persistent disk | B — live proven 2026-10-11 |
| Orchestrator/Guardian persistence | F — `/tmp` |
| Redis | Not configured |
| Backup files on disk | B — latest valid; **scheduled cron not set** |
| Monitoring | C — uptime workflow + readiness endpoints; no APM |
| Sales lock | A / intentional F for sales |
| Load / perf tests | E |

---

## 7. What actually works today (customer-visible)

1. Multi-category storefront on https://buzzard24.de (50 customer L1 categories).
2. Phone and desktop navigation, DE-only phone Germany background, gold category drawer.
3. 30-language UI catalogs and 35-market selector (language independent of country).
4. Catalog browsing / search / cart **without** live prices or commercial checkout.
5. Legal pages (Impressum, Datenschutz, AGB).
6. Production API health, persistent SQLite, backup directory, worker process, intelligence/orchestrator/guardian reachability.
7. Admin page set (~50 routes) and plugin surface — **not** customer commerce.
8. Sales, supplier import, supplier orders, and real payments **intentionally off**.

---

## 8. Consistency notes

- Do **not** count unmerged PRs #368–#392 as shipped software.
- Do **not** count marketplace hub rows as live Allegro/OTTO/Kaufland/etc.
- Do **not** count `/tmp` orchestrator health as durable AI memory.
- Do **not** treat 26 SQLite `products` or 15 JSON products as a production PIM catalog (live storefront productCount = **0**).
- August “ephemeral DB” reports are **obsolete**; disk is persistent.
