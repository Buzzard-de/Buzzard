# Buzzard — Master Audit Summary

**Date:** 2026-10-11  
**Audited:** `main` @ `84166bb` (live site + API **SYNCED**)  
**Type:** Read-only inventory, competitor gap, production readiness, roadmap  
**No code, flag, deploy, or sales-lock change was made.**

Full reports:

| File | Content |
|------|---------|
| [BUZZARD_CURRENT_STATE.md](./BUZZARD_CURRENT_STATE.md) | What exists |
| [BUZZARD_NOT_STARTED.md](./BUZZARD_NOT_STARTED.md) | Not started |
| [BUZZARD_PARTIAL_AND_BLOCKED.md](./BUZZARD_PARTIAL_AND_BLOCKED.md) | Partial + blocked (disk persistence **cleared**) |
| [BUZZARD_COMPETITOR_MATRIX.md](./BUZZARD_COMPETITOR_MATRIX.md) | Allegro…OnBuy evidence |
| [BUZZARD_GAP_ANALYSIS.md](./BUZZARD_GAP_ANALYSIS.md) | GAP-01–14 |
| [BUZZARD_AUTOMATION_GAPS.md](./BUZZARD_AUTOMATION_GAPS.md) | Manual vs automatic |
| [BUZZARD_PRODUCTION_READINESS.md](./BUZZARD_PRODUCTION_READINESS.md) | Sales stay off |
| [BUZZARD_MASTER_ROADMAP.md](./BUZZARD_MASTER_ROADMAP.md) | T-P0…T-P9 |

---

## En kritik 10 bulgu

1. **Storefront is live** (50 customer L1 categories, phone/desktop UX, 30 locales, 35 markets). Customers can browse, not buy.  
2. **Persistent production SQLite is live** (`/var/data/buzzard.db`). August “ephemeral DB” reports are outdated.  
3. **Sellable catalog is empty** — storefront `productCount=0`. 15 JSON + 26 legacy rows are not a PIM SoT.  
4. **Sales are correctly locked** (`salesEnabled: false`, `goLiveLock: true`, `PRODUCTION_SAFETY_LOCK`).  
5. **No real supplier** — dry-run/mock only; TecDoc/Inter Cars not connected.  
6. **Pricing policy is split:** Node 38%/12% markup vs Python **€0.50** profit. Checkout does not use the profit floor.  
7. **€0.10 under lowest comparable price is not implemented** (not even documented in the pricing modules).  
8. **Payments/carriers/marketplaces are not live.** Stripe/PayPal may appear as adapters; commerce flags force mock. EU channel APIs (Kaufland, Allegro, bol, OTTO, Octopia, eMAG, Skroutz) are **not started**.  
9. **AI/Pusat is architecture + simulation.** `Pusat` is not a module on `main`. Orchestrator/Guardian use **ephemeral `/tmp` DBs**. Open PRs #368–#392 are not production.  
10. **CI does not run unit or e2e.** Those suites exist; this audit marks them **NOT RUN**. Lint/typecheck/build on HEAD succeeded.

---

## En önemli 10 eksik

1. Product SoT with ACTIVE quality SKUs (GAP-01)  
2. One real supplier API/XML/CSV (GAP-02)  
3. Unified pricing + €0.50 enforcement (GAP-03)  
4. Lawful comparable-price source — or drop the €0.10 claim (GAP-04)  
5. Paid checkout + webhooks (GAP-05)  
6. Supplier order forward + idempotent cancel (GAP-06)  
7. Returns with supplier recovery **Confirmed ≠ assumed** (GAP-07)  
8. First EU marketplace connector after own path (GAP-08)  
9. Real carrier tracking, no fake GPS (GAP-09)  
10. CI tests + durable AI memory + VAT invoice path (GAP-10/13/14)

---

## Önerilen ilk 10 iş

1. Keep sales/import locks (T-P0-1)  
2. Declare PIM Core the only SoT (T-P0-4)  
3. Quality-gated catalog (T-P1-1)  
4. Add `test:unit` to CI (T-P8-1)  
5. One supplier dry-run (T-P2-1)  
6. Enforce €0.50 on publish/cart (T-P3-1)  
7. Fail-closed stock (T-P3-3)  
8. Payment sandbox + signed webhooks (T-P4-1)  
9. Return recovery API/UI (T-P4-4)  
10. Persist orchestrator/guardian + backup cron (T-P0-2, T-P0-3)

---

## Closing questions

### 1. Buzzard'da bugün gerçekten çalışan neler var?

Live website and synced API; 50 L1 categories; independent language/country; RTL Arabic; cart/account shells; legal pages; persistent SQLite; backups on disk (not cron); worker process; intelligence/orchestrator/guardian **reachability**; admin/plugin surfaces; sales lock; readiness gates that correctly stay BLOCKED.

### 2. En kritik 10 eksik nedir?

See list above (SoT, supplier, pricing, comparable feed, payments, supplier PO, returns recovery, EU connectors, carriers, tests/VAT/AI memory).

### 3. Henüz başlanmamış en önemli işler nelerdir?

€0.10 undercut; EU marketplace **clients**; storefront return form; carrier APIs; GPS/map (and should stay unbuilt without carrier geo); voice/WebRTC/digital human on `main`; CI unit/e2e; APM; Redis; 26-locale email/URL completeness. Details: `BUZZARD_NOT_STARTED.md`.

### 4. Rakiplerde olup Buzzard'da bulunmayan en önemli özellikler hangileridir?

Official **seller APIs** for offers, stock/price commands, order ingest, shipments, and returns — proven at Allegro, OTTO, Kaufland, bol.com, Octopia/Cdiscount, eMAG, Skroutz, AlzaTrade, Galaxus (CSV/XML). Buzzard has a local hub queue and market metadata only.

### 5. Hangileri Buzzard için gerçekten gerekli, hangileri erken?

**Gerekli (own shop first):** SoT, supplier feed, profit floor, payments, dropship PO, returns recovery, DE VAT, one carrier.  
**Gerekli sonra (P5):** one DE/NL/PL/FR connector (Kaufland/OTTO first).  
**Erken / gereksiz şimdi:** Zalando fashion, native apps, FBB/ZFS/FBS warehouses, digital human, fake GPS, claiming €0.10 without a lawful feed, enabling WMS stock.

### 6. İlk tamamlanması gereken 10 görev nedir?

T-P0-1, T-P0-4, T-P1-1, T-P8-1, T-P2-1, T-P3-1, T-P3-3, T-P4-1, T-P4-4, T-P0-2/3 — see roadmap.

### 7. Hangi teknik engeller ilerlemeyi durduruyor?

Human supplier credentials; PSP keys proven via webhook (not just health bits); carrier contracts; empty ACTIVE catalog; sales/safety locks (intentional); Render write access for this agent; orchestrator `/tmp`; unmerged Pusat stack must not be counted as done. **Disk persistence is no longer a blocker.**

### 8. Hangi testler eksik?

CI omits Vitest and Playwright. This audit **did not run** them (NOT RUN, not PASS). Missing/never-written: €0.10 guard tests, return-recovery API tests, marketplace sandbox tests, load tests. Lint/typecheck/build/security:check on HEAD: **success**.

### 9. Hangi koşullar sağlanmadan satış açılmamalıdır?

The 14 conditions in `BUZZARD_PRODUCTION_READINESS.md`: human approval, SoT, supplier, pricing floors, PSP, stock policy, supplier PO, honest returns, DE VAT, carrier tracking, E2E run, dual flag change, keep safety lock, AI cannot self-enable sales.

### 10. Denetim sırasında doğrulanamayan konular nelerdir?

- Whether Stripe/PayPal **accounts** are fully provisioned (health shows adapter/webhook bits; commerce flags still mock).  
- Admin login with current production password (not attempted).  
- GDPR delete completeness.  
- Competitor internals (AI, fraud, personalization) — **DOĞRULANAMADI**.  
- Galaxus REST `api.galaxus.ch` (third-party only).  
- OnBuy current official OpenAPI.  
- Fnac Darty first-party field contract (integrator page only).  
- Historical part6–35 test results as of today (NOT RUN).  
- Unmerged PR behavior (#353–#392) — out of production scope.

---

## Category count (canonical, not UI cards)

| Source | Count |
|--------|-------|
| Shop JSON L1 | 53 |
| Master taxonomy | 48 |
| Customer-visible L1 (`getVisibleMainCategories`) | **50** (hide cat-30, cat-37, cat-39) |

Do not reduce category count to homepage box cards.

---

## Pricing rules — documentation vs enforcement

| Rule | Docs | Node checkout | Python intelligence |
|------|------|---------------|---------------------|
| €0.50 min net profit | Yes | **No** | Yes (`MIN_NET_PROFIT`) |
| €0.10 under comparable | **Not found** | **No** | **No** |
| 38% markup / 12% min margin | Yes | Helpers yes | No |

---

## Sales lock

**Remains off.** This audit did not and must not open it.
