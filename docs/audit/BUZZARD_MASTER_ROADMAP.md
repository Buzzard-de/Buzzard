# Buzzard — Master Roadmap

**Audit date:** 2026-10-11  
**Base:** `main` @ `84166bb`  
**Rule:** No invented durations or completion percentages. Complexity = S / M / L / XL.

## Priority order used

The brief suggested P0–P9. This audit **keeps that sequence** with two adjustments:

1. **P8 test/observability starts in parallel with P1** — CI unit/e2e do not depend on supplier credentials. Reason: silent regressions already risk the only live surface (storefront).  
2. **P5 marketplaces stay after P4** — a channel order you cannot pay, route, or refund is worse than no channel.  
3. **P7 AI bind stays after P3–P4** — agents without SoT and orders only simulate.  
4. **P9 extras** (voice, Zalando, native apps, brand facets) stay last.

P0 is reserved for **safety locks that must remain** plus the few production durability fixes that do not open sales.

---

## P0 — Safety and production durability (do not open sales)

| ID | Öncelik | Görev | Durum | Ön koşullar | Dosyalar | Yapılacak iş | Başarı ölçütü | Test | Risk | Karmaşıklık | Blokaj | Tamamlanma |
|----|---------|-------|-------|-------------|----------|--------------|---------------|------|------|-------------|--------|------------|
| T-P0-1 | P0 | Keep sales / import / payment locks | A (intentional) | None | `salesMode.js`, `render.yaml`, `goLiveApproval.js` | Do **not** set sales=1; do not remove `PRODUCTION_SAFETY_LOCK` | Live `salesEnabled: false` | Health probe | Accidental go-live | S | None | Locks still on after every deploy |
| T-P0-2 | P0 | Persist orchestrator + guardian DBs | F | Render disk or paid plan | `render.yaml` orchestrator/guardian | Stop using `/tmp/*.db` | Restart preserves tasks/approvals | Health path ≠ `/tmp` | Lost AI audit trail | M | Render access | Durable path in health JSON |
| T-P0-3 | P0 | Schedule DB backups | C | Disk already OK | `scripts/db-backup.mjs` | Set cron / `BUZZARD_BACKUP_CRON` | Backup newer than 24h without manual run | `backup.latestValid` | Data loss | S | Render cron | Scheduler env set |
| T-P0-4 | P0 | Document dual product tables | C | None | `productStore.js`, PIM, `buzzard_products.json` | Declare PIM Core as SoT; freeze JSON as fixture | One write path | Review | Drift | S | None | Docs + code comment boundary |

---

## P1 — Product Source of Truth

| ID | Görev | Durum | Ön koşullar | Dosyalar | Yapılacak iş | Başarı | Test | Risk | Karmaşıklık | Blokaj |
|----|-------|-------|-------------|----------|--------------|--------|------|------|-------------|--------|
| T-P1-1 | Single SoT + quality gate | C | T-P0-4 | `server/lib/pim/*`, `catalogReadService.js` | All storefront reads from PIM; reject incomplete rows | productCount reflects PIM only | part15/part22 **NOT RUN** today | Demo publish | L | B-07 |
| T-P1-2 | Identifiers + media + variants | C | T-P1-1 | `productIdentifiers.js`, media tables | GTIN/EAN/MPN/brand/category required by grade | No ACTIVE without identifiers | Validation fixtures | Wrong GTIN | M | Images rights |
| T-P1-3 | Publish stays fail-closed | F by design | Sales lock | `productCore.js` ACTIVE guard | Keep ACTIVE blocked until P4 human go-live | Cannot ACTIVE while sales=0 | Existing guard | Bypass | S | B-01 |

**Done when:** GAP-01 criteria (quality SKUs exist; still not necessarily public-sold).

---

## P2 — Supplier normalize

| ID | Görev | Durum | Ön koşullar | Dosyalar | Yapılacak iş | Başarı | Test | Risk | Karmaşıklık | Blokaj |
|----|-------|-------|-------------|----------|--------------|--------|------|------|-------------|--------|
| T-P2-1 | Credentialed dry-run of one real supplier | C / F | Human contract | `realSupplierConnector.js`, adapters | Configure `REAL_SUPPLIER_*` still `DRY_RUN=1` | Mapping report without live import | part15/part23 **NOT RUN** | Secret leak | L | B-04 |
| T-P2-2 | GTIN match into PIM staging | C | T-P1-1, T-P2-1 | `supplierImportPipeline.js`, `supplierMappingService.js` | Stage only; no auto ACTIVE | Staging rows + duplicate flags | Import dry-run | Bad merge | L | B-03 |
| T-P2-3 | Live import flag review | F | T-P2-2 + human | `supplierSafetyGate.js` | Only then consider `LIVE_IMPORT` | Written approval | Safety tests | Accidental live | S | Human |

Do not buy warehouse stock. Dropship / supplier-held stock only.

---

## P3 — Price, stock, profit

| ID | Görev | Durum | Ön koşullar | Dosyalar | Yapılacak iş | Başarı | Test | Risk | Karmaşıklık | Blokaj |
|----|-------|-------|-------------|----------|--------------|--------|------|------|-------------|--------|
| T-P3-1 | Unify pricing service | C | T-P1-1 | `pricing.js`, `profit.py`, `priceEngine.js` | One module: cost stack + **€0.50** floor | Publish/cart refuse below floor | New unit tests | Dual rules remain | M | None |
| T-P3-2 | €0.10 undercut | E | Lawful comparable source | *none today* | Implement **only** after GAP-04 source; else drop the marketing claim | Guard + audit field **or** documented withdrawal | Fixtures | Legal scrape | L | Legal |
| T-P3-3 | Stock sync + fail-closed oversell | C | T-P2-2 | `stockSync.js`, `cartService.js` | Freshness timestamp; no reservation ⇒ reject | Checkout cannot exceed last-good stock | part8 **NOT RUN** | Oversell | M | B-03 |

---

## P4 — Order, payment, cancel, return

| ID | Görev | Durum | Ön koşullar | Dosyalar | Yapılacak iş | Başarı | Test | Risk | Karmaşıklık | Blokaj |
|----|-------|-------|-------------|----------|--------------|--------|------|------|-------------|--------|
| T-P4-1 | PSP sandbox + webhooks | C / F | Secrets in Render | `paymentService.js`, `webhookFoundation.js` | Signed webhook, idempotency, still sales=0 | Sandbox intent + webhook row | e2e commerce **NOT RUN** | Double charge | L | B-05 |
| T-P4-2 | Commercial checkout path | C / F | T-P3-1, T-P4-1, human | `checkoutService.js`, `orderService.js` | Enable only after checklist in PRODUCTION_READINESS | 1 paid test order | customer-journey.spec | Fraud | L | B-01 |
| T-P4-3 | Supplier forward + cancel | C / F | T-P2-3, T-P4-2 | `orderService.submitSupplierOrder` | Idempotent submit; cancel on fail | No silent 403 | Replay test | Duplicate PO | L | B-08 |
| T-P4-4 | Returns + recovery | C / E | T-P4-1 | `returnsRma.js`, `lib/returnRecovery/` | Add missing `/api/admin/returns` **or** retarget UI; storefront form; **never auto-confirm** supplier credit | Expected vs Confirmed | Fixture GAP-07 | Refund fraud | L | B-14 |
| T-P4-5 | DE VAT invoice | C | Legal | `market-engine/vat.ts`, tax provider | DE B2C invoice; other markets stay gated | Accountant OK | Manual | Tax | L | GAP-14 |

---

## P5 — Marketplace connectors

| ID | Görev | Durum | Ön koşullar | Dosyalar | Yapılacak iş | Başarı | Test | Risk | Karmaşıklık | Blokaj |
|----|-------|-------|-------------|----------|--------------|--------|------|------|-------------|--------|
| T-P5-1 | Connector pattern | D | T-P4-3 | `marketplaceHub.js` | Shared auth/job/error; do not treat hub as API | One sandbox channel | Channel playground | Ban | L | Credentials |
| T-P5-2 | First EU channel | E | T-P5-1 | *new* | Prefer **Kaufland** (playground) or **OTTO** (DE) — not Amazon/eBay first | List + stock + price + order ingest | Official sandbox | Mapping rejects | XL | Partner account |
| T-P5-3 | Later channels | E | T-P5-2 | — | Allegro, bol, Octopia, eMAG, Skroutz in market order | Same completion as T-P5-2 | Per docs | XL each | Partner |

Zalando / Fruugo / OnBuy / Fnac: P9 unless a signed channel deal exists.

---

## P6 — Logistics

| ID | Görev | Durum | Ön koşullar | Dosyalar | Yapılacak iş | Başarı | Test | Risk | Karmaşıklık | Blokaj |
|----|-------|-------|-------------|----------|--------------|--------|------|------|-------------|--------|
| T-P6-1 | One carrier label + tracking | C | T-P4-3 | `commercialIntegrations.js` | Real tracking URL; **no GPS invention** | Customer sees carrier page | Sandbox shipment | PII | M | B-06 |
| T-P6-2 | Events + delay/lost playbook | E | T-P6-1 | logistics plugins | Status sync + human exception | Event log ≠ DEMO- | Manual | Fake status | M | Carrier webhooks |

---

## P7 — AI bind to real data

| ID | Görev | Durum | Ön koşullar | Dosyalar | Yapılacak iş | Başarı | Test | Risk | Karmaşıklık | Blokaj |
|----|-------|-------|-------------|----------|--------------|--------|------|------|-------------|--------|
| T-P7-1 | Tool-bind 3 roles | C | T-P0-2, T-P1-1 | `aiOrchestrator.js`, `buzzard_orchestrator.py` | Price/stock/catalog **read**; write needs approval | Audit log; simulation flag off for those reads | Unit + approval deny | Unapproved mutate | L | B-10, B-13 |
| T-P7-2 | Pusat naming on main | E | Product decision | unmerged #368/#378 | Only merge if it does not weaken locks | Name + idempotent dispatch on durable DB | Existing idempotency tests | Scope creep | M | Unmerged stack |

---

## P8 — Security, observability, tests (parallel from P1)

| ID | Görev | Durum | Ön koşullar | Dosyalar | Yapılacak iş | Başarı | Test | Risk | Karmaşıklık | Blokaj |
|----|-------|-------|-------------|----------|--------------|--------|------|------|-------------|--------|
| T-P8-1 | Put unit tests in CI | E | None | `.github/workflows/ci.yml` | Add `npm run test:unit` | CI job exists and runs | The job itself | Flakes | S | None |
| T-P8-2 | Smoke e2e in CI | E | Staging URL | `e2e/*.spec.ts` | One catalog + one locked-checkout spec | Job green | Playwright | Cost | M | None |
| T-P8-3 | Error tracking | E | DSN | `ERROR_TRACKING_DSN` | Wire without PII | Event received | Manual | PII | S | Vendor |
| T-P8-4 | GDPR export/delete drill | C | Legal | `identitySecurity.js` | One dry-run export/delete | Checklist signed | Manual | Incomplete delete | M | H today |

---

## P9 — Competitor extras / later

| ID | Görev | Durum | Neden sonra |
|----|-------|-------|-------------|
| T-P9-1 | Brand + price facets | C / E | Needs catalog volume (GAP-12) |
| T-P9-2 | Voice / digital human | E on main | Not required to compete with Allegro/OTTO/bol on assortment |
| T-P9-3 | Native apps | E | Responsive web first |
| T-P9-4 | Zalando / fashion APIs | E | Category mismatch |
| T-P9-5 | WMS / FBB / ZFS | G | Own-warehouse model change only |

---

## First 10 tasks (execution order)

1. T-P0-1 — keep locks  
2. T-P0-4 — declare PIM SoT  
3. T-P1-1 — quality catalog  
4. T-P8-1 — unit tests in CI (parallel)  
5. T-P2-1 — one supplier dry-run  
6. T-P3-1 — €0.50 on publish/cart  
7. T-P3-3 — stock fail-closed  
8. T-P4-1 — payment sandbox  
9. T-P4-4 — returns recovery (do not assume supplier refund)  
10. T-P0-2 + T-P0-3 — persist AI DBs + backup cron  

Do **not** start T-P4-2 (open sales) until PRODUCTION_READINESS conditions 1–14 are met.

---

## Map to gaps (no duplicate work)

| Gap | Tasks |
|-----|-------|
| GAP-01 | T-P1-* |
| GAP-02 | T-P2-* |
| GAP-03 | T-P3-1 |
| GAP-04 | T-P3-2 |
| GAP-05 | T-P4-1, T-P4-2 |
| GAP-06 | T-P4-3 |
| GAP-07 | T-P4-4 |
| GAP-08 | T-P5-* |
| GAP-09 | T-P6-* |
| GAP-10 | T-P7-* |
| GAP-11 | T-P9-2 |
| GAP-12 | T-P9-1 |
| GAP-13 | T-P8-* |
| GAP-14 | T-P4-5 |
