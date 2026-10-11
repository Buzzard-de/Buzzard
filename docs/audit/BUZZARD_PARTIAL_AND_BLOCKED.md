# Buzzard — Partial and Blocked

**Audit date:** 2026-10-11  
**HEAD:** `84166bb` on `main` / live API synced.  
**Companion:** `BUZZARD_NOT_STARTED.md`, `BUZZARD_PRODUCTION_READINESS.md`.

---

## How to read this

- **PARTIAL** = code or data exists; the customer/ops path is incomplete.
- **BLOCKED** = a flag, missing credential, missing access, or safety lock stops the next real step.
- A feature can be both (implementation partial **and** live path blocked).

Previous reports that listed production SQLite as ephemeral are **no longer a blocker**. Disk is `/var/data/buzzard.db`, `persistent: true` (live `GET /api/health/db` on 2026-10-11).

---

## Partial implementations

| ID | Feature | What exists | What is missing | Depends on |
|----|---------|-------------|-----------------|------------|
| P-01 | Product SoT / PIM | SQLite PIM Core, validation, duplicates, audit, publish rules | 0 active storefront products; dual JSON/SQLite SoT | Supplier import, sales flag for ACTIVE |
| P-02 | Multilingual catalog | 30 locale modules; category i18n; product translation helpers | Full PIM field coverage; email 26 locales; URL prefixes only 4 | Translation ops |
| P-03 | Market VAT / currency display | `lib/market-engine` + 35-country JSON | Live FX provider; tax provider | `FX_PROVIDER_URL`, `TAX_PROVIDER_*` empty |
| P-04 | Supplier adapters | API/XML/CSV/mock/dry-run + registry + safety gate | Live credentials, live HTTP, matching at scale, trust score | Human supplier access |
| P-05 | Price / stock sync jobs | `priceSync.js`, `stockSync.js`, job queue on SQLite | Dry-run returns `simulated`; no live feed | P-04 |
| P-06 | Pricing policy | Node markup 38%/12%; Python €0.50 profit | Policies not unified; €0.10 undercut absent | Product SoT + competitor feed |
| P-07 | Inventory on PIM | Stock field + checkout qty check | No reservation; no freshness SLA | Supplier sync |
| P-08 | Checkout / cart | Full UI + dry-run API + idempotency | Commercial order, payment, supplier forward | Sales lock, payments |
| P-09 | Order engine | Two stacks (commerce + OMS), status model, audit | 0 live orders; supplier submit 403 | P-08, P-04 |
| P-10 | RMA | DB workflow, admin pages `/admin/returns-rma` | No storefront form; refund is bookkeeping only | Payments, supplier recovery |
| P-11 | Marketplace hub | Channel rows + local job enqueue | No channel HTTP client | Credentials + connectors |
| P-12 | Payments adapters | Stripe/PayPal/Klarna classes, webhook table | Effective path is mock; live flags false | Secrets + sales lock |
| P-13 | Logistics | Seeded carriers, quote tables, demo tracking | No live labels/events | Carrier keys |
| P-14 | Storefront search/filter | `q`, category, sort | Brand/price facets, relevance engine | Catalog volume |
| P-15 | AI orchestrator | Node tasks/approvals; Python 7 agents; Bey 3; chat rules | Simulation / stub provider; ephemeral `/tmp` DBs | Durable disk + real tools |
| P-16 | Human approval | `commerce_go_live`, guardian pending_approvals, AI task approvals | Approval does not enable sales (`PRODUCTION_SAFETY_LOCK`) | Human + env change |
| P-17 | GDPR privacy requests | Identity-security API + tables | Proven export/delete completeness | Legal review |
| P-18 | Admin surface | ~50 admin routes, 80+ plugins | Many screens wrap empty/dry-run data | All engines |
| P-19 | Intelligence bridge | Live HTTP bridge, catalog/payment/shipping gates | 0 active products; LLM not configured | P-01, payments, shipping |
| P-20 | Backup | Files on `/var/data/backups`, latest OK | Cron/`BUZZARD_BACKUP_CRON` unset | Render cron |
| P-21 | Phone assistant (Python) | `ai_phone_assistant` package + tests on disk | `enabled: false`; realtime NotImplemented | Unmerged PRs, keys |
| P-22 | i18n routing | 4 prefixed locales + cookie/`?lang=` | 26 locales lack URL prefix / hreflang completeness | SEO |

---

## Blocked items (re-verified 2026-10-11)

| ID | Blocker | Still present? | Required access / action | Must not do |
|----|---------|----------------|--------------------------|-------------|
| B-01 | Sales lock `BUZZARD_SALES_ENABLED=0` + `NEXT_PUBLIC_SALES_ENABLED=0` | **Yes** (live `salesEnabled: false`) | Human decision after catalog + payments + supplier | Do not flip flags in this audit |
| B-02 | `PRODUCTION_SAFETY_LOCK = true` | **Yes** | Code + human go-live; even “approve” leaves sales off | Do not remove lock |
| B-03 | `REAL_SUPPLIER_LIVE_IMPORT=0` / dry-run | **Yes** (`canConnectLive: false`) | Real supplier contract + URL/key + safety review | Do not call supplier APIs |
| B-04 | No supplier credentials | **Yes** (`credentialsConfigured: false`) | Operator-held API/XML/CSV access | Do not invent Inter Cars/TecDoc live proof |
| B-05 | Commercial payments | **Yes** (`mockPaymentOnly: true`, stripe/paypal **false** in commerce flags) | Configured PSP + webhook + test charge evidence | Do not enable live charges |
| B-06 | Carrier APIs | **Yes** (dhl/dpd/gls/ups all false) | Carrier contracts + keys | Do not fake GPS |
| B-07 | Empty sellable catalog | **Yes** (storefront productCount **0**) | PIM ACTIVE products after quality gate | Do not publish demo as live |
| B-08 | Supplier order forward | **Yes** (`supplierOrdersBlocked: true`) | Sales + supplier + worker path | |
| B-09 | Human go-live approval | **Yes** (`/api/health/final-go-live-readiness` BLOCKED) | Named human approval | No autoActivate |
| B-10 | Orchestrator/Guardian ephemeral disk | **Yes** (`/tmp/*.db`) | Persist those services or accept memory loss on restart | Do not treat `/tmp` as SoT |
| B-11 | Redis unset | **Yes** | Optional Upstash; SQLite job queue is already persistent | Not a sales blocker |
| B-12 | Render Dashboard / secret write | **Yes** for this agent | Operator Render access | Do not bypass |
| B-13 | LLM / OpenAI | **Yes** (`LLM_*` NOT_CONFIGURED, provider `rules`) | Optional; not required to open catalog browsing | |
| B-14 | Return Recovery API mismatch | **Yes** | Implement `/api/admin/returns` or retarget UI | Do not pretend refunds settle |
| B-15 | Unmerged Pusat/Realtime stack | **Yes** | Merge + live test after security review | Do not count PR titles as shipped |
| B-16 | CI does not run unit/e2e | **Yes** | Workflow change (later P8) | This audit did not run them |

### Previously reported, now **cleared**

| Old blocker | Current evidence |
|-------------|------------------|
| Production SQLite ephemeral / no `/var/data` | `persistent: true`, path `/var/data/buzzard.db`, disk writable |
| API commit drift vs main | `deployment.status=SYNCED`, running `84166bb` |
| Intelligence / orchestrator / guardian down | All HTTP 200 |
| Website not deployed | `buzzard24.de` HTTP 200; Pages deploy success on HEAD |

---

## Partial × blocked intersections (do not double-count as separate roadmap items)

| Intersection | Partial ID | Blocker ID | Single roadmap task |
|--------------|------------|------------|---------------------|
| Cannot publish ACTIVE products | P-01 | B-01, B-07 | SoT + quality + human publish (P1) |
| Cannot sync supplier stock/price | P-04, P-05 | B-03, B-04 | Supplier connect (P2) |
| Cannot take money | P-08, P-12 | B-01, B-05 | Payments after catalog (P4) |
| Cannot ship with tracking | P-13 | B-06 | Logistics after first order path (P6) |
| AI cannot act on real catalog | P-15 | B-07, B-10, B-13 | Bind orchestrator after SoT (P7) |

---

## Test status for these items

All referenced unit/e2e/part tests: **NOT RUN** in this audit.  
CI on HEAD: lint / typecheck / build / render:preflight / security:check **success**.  
Live HTTP probes above: **RUN** (read-only).
