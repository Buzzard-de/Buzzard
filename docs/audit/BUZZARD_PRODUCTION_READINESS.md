# Buzzard — Production Readiness

**Audit date:** 2026-10-11  
**Live commit:** `84166bb` (site + API **SYNCED**)  
**Sales:** **LOCKED** (`salesEnabled: false`, `goLiveLock: true`)  
**This audit did not open sales, change flags, or deploy.**

---

## Verdict

| Question | Answer |
|----------|--------|
| Is the **website** in production? | **Yes** — https://buzzard24.de HTTP 200 |
| Is the **API** in production and synced? | **Yes** — `buzzard-api.onrender.com` commit match |
| Is the **database persistent**? | **Yes** — `/var/data/buzzard.db`, `persistent: true` (August ephemeral finding is **obsolete**) |
| Can customers **buy**? | **No** — sales lock + empty ACTIVE catalog + mock payments |
| Is go-live allowed by gates? | **No** — human approval required, `autoActivate: false` |
| Should sales be opened now? | **No** |

---

## Gate checklist (re-verified)

| Konu | Durum | Kanıt | Not |
|------|-------|-------|-----|
| Production HTTP access (read) | OK | Health endpoints 200 | Write/dashboard access for this agent: **BLOCKED** (B-12) — do not bypass |
| Product SoT | FAIL for sales | `catalog.productCount=0` | Schema exists; no sellable PIM |
| Real database | OK | persistent disk + integrity OK | 26 legacy products ≠ PIM catalog |
| Supplier API/XML/CSV | FAIL | `connected: false`, dry-run | Scaffold only |
| Pricing linked to inventory | FAIL | Cart uses stored price; sync simulated | €0.50 not on checkout; €0.10 absent |
| Order engine E2E commercial | FAIL | 0 orders; supplier blocked | Dry-run code exists; **e2e NOT RUN** |
| Payment provider | FAIL for live money | `mockPaymentOnly: true` | Health may show stripe/paypal adapter bits — **not** live charges |
| Marketplace connections | FAIL | ebay/amazon NOT_CONFIGURED; EU connectors absent | |
| Cargo integrations | FAIL | All carrier flags false | Simulation only |
| AI orchestrator real data | DEGRADED | Reachable; `/tmp` DB; LLM unset; 0 products | |
| Security baseline | PARTIAL | Auth/RBAC/CSRF/lock; redis memory; no APM | `security:check` in CI **success** |
| E2E tests | NOT RUN | Playwright files present; not in CI | Do not mark PASS |
| Production deploy | OK for catalog site + API | Pages + Render on HEAD | |
| Sales remain locked | OK / intentional | Flags + `PRODUCTION_SAFETY_LOCK` | Keep |

---

## Live numbers that matter

| Metric | Value | SoT |
|--------|-------|-----|
| Customer-visible L1 categories | 50 | `getVisibleMainCategories()` |
| Internal L1 JSON | 53 | `data/buzzard_categories.json` |
| Storefront-ready products | **0** | production catalog health |
| Legacy `products` rows | 26 | `/api/health` database |
| Static JSON products | 15 | `data/buzzard_products.json` |
| Commerce orders | **0** | production health |
| Supplier connected | false | supplierIntegration |
| Worker | RUNNING, 0 jobs, supplier orders blocked | `/api/health/worker` |
| Backup latest | OK on disk | cron **not** scheduled |
| Redis | NOT_CONFIGURED | memory limiter |
| Intelligence | LIVE, catalog/payment/shipping BLOCKED | `/api/intelligence/status` |
| Orchestrator / Guardian | UP, ephemeral `/tmp` | health JSON |

---

## Conditions that must hold **before** sales are opened

Do not implement these in this audit. Do not flip `BUZZARD_SALES_ENABLED`.

1. **Human named approval** recorded (gates already require it).  
2. **Single Product SoT** with quality-gated ACTIVE SKUs (not demo, not JSON-only).  
3. **At least one real supplier** path proven: dry-run then controlled live import (`REAL_SUPPLIER_LIVE_IMPORT` still default 0 until review).  
4. **Pricing service** used by publish+checkout: minimum **€0.50 net profit** enforced; **€0.10 undercut only if** a lawful comparable price exists — otherwise do not advertise it.  
5. **Payment** sandbox then live: Stripe and/or PayPal webhook signature verified; `mockPaymentOnly` false only after that.  
6. **Stock check + no oversell policy** (reservation or fail-closed).  
7. **Supplier order forward** with idempotency; cancel path.  
8. **Refund path** that does **not** assume supplier money received.  
9. **DE VAT invoice** reviewed; other 34 markets remain `testing`/`planned` until tax ops ready.  
10. **Carrier** for first-ship country (likely DHL) with real tracking URL.  
11. **E2E** customer-journey + commerce-security **RUN** against a staging API (CI today does not).  
12. **Sales flags** changed only by a human in Render + rebuild of `NEXT_PUBLIC_SALES_ENABLED` for the static site.  
13. Keep `PRODUCTION_SAFETY_LOCK` behavior until the same human accepts residual risk.  
14. Intelligence/orchestrator **must not** auto-enable sales.

Opening sales with 0 ACTIVE products and mock payments would be a **customer-trust failure**, not a launch.

---

## Access this audit could not obtain

| Access | Status | Effect |
|--------|--------|--------|
| Render Dashboard write / `RENDER_API_KEY` | Not used / not assumed | Cannot re-read raw env secret presence; infer from health only |
| PSP dashboard | Not accessed | Cannot confirm live Stripe/PayPal **account** beyond health flags |
| Supplier portals (Inter Cars, TecDoc, …) | Not accessed | Live supplier remains **BLOCKED**, not “secretly connected” |
| Production admin login | Not attempted | Admin UX **H** for “works with current password” |
| Unit/e2e execution | Not run (per brief) | Test results = **NOT RUN** |

Do not bypass security to obtain these.

---

## Deploy topology (current)

```
GitHub main 84166bb
   ├─ GitHub Pages → buzzard24.de (static export, sales UI off)
   └─ Render
        ├─ buzzard-api     /var/data/buzzard.db   persistent  OK
        ├─ buzzard-intelligence   docker          OK, no catalog
        ├─ buzzard-orchestrator   /tmp DB         ephemeral
        └─ buzzard-guardian       /tmp DB         ephemeral
```

---

## Test evidence policy

| Suite | This audit |
|-------|------------|
| CI lint/typecheck/build/preflight/security:check | Observed **success** on HEAD |
| Uptime + Verify Go-Live workflows | Observed **success** on HEAD |
| `vitest`, Playwright, part6–35, production-smoke | **NOT RUN** |
| Historical August smoke reports | **Stale** for disk; not reused as PASS |

---

## Sales-lock reminder

`render.yaml` sets `BUZZARD_SALES_ENABLED=0`.  
`.env.example` sets `NEXT_PUBLIC_SALES_ENABLED=0`.  
Live commerce object: `salesEnabled: false`, `checkoutDryRunOnly: true`, `goLiveLock: true`.

**Leave them off.**
