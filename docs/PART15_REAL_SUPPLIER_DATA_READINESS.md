# Part 15 — Real Supplier Product Data Gate

**Status:** BLOCKED — **MANUAL SUPPLIER DATA REQUIRED**  
**Date:** 2026-08-30  
**Prerequisite:** `docs/PART15_PRODUCT_DATA_AUDIT.md` (COMPLETE)

No live import, no publish, no EAN invention, no sales activation.

---

## Executive Summary

| Gate | Result |
|------|--------|
| **PART 15 SUPPLIER DATA PREPARATION** | **BLOCKED** |
| **REAL SUPPLIER FOUND** | **NO** |
| **VERIFIED PRODUCTS** | **0** |
| **BLOCKED PRODUCTS** | **14** |
| **VERIFIED GTINS** | **0** |
| **VERIFIED MPNS** | **0** |
| **PRODUCT IMAGES (verified)** | **0** |
| **FITMENT VERIFIED** | **0** |
| **VALIDATION FAILURES** | **13** |
| **LIVE IMPORT** | **NO** |
| **PUBLISH** | **NO** |
| **SALES** | **DISABLED** |
| **STRIPE** | **OFF** |
| **PAYPAL** | **OFF** |
| **SUPPLIER ORDERS** | **OFF** |
| **GO-LIVE LOCK** | **ACTIVE** |

**Verdict:** The repository contains a complete supplier **scaffold** (adapters, hub, import pipelines, TecDoc hooks) but **no connected real supplier feed** and **no available credentials**. Product data for `BUZ-AUTO-000002`–`000015` cannot be verified from any trustworthy source in the codebase. **Do not invent data.** Proceed only when real supplier/manufacturer feeds are configured externally.

---

## Phase 1 — Supplier Discovery

### Discovery matrix

| Check | Result | Evidence |
|-------|--------|----------|
| **REAL SUPPLIER FOUND** | **NO** | All adapters are mock; no outbound HTTP to supplier URLs |
| **SUPPLIER API** | **NO** (scaffold only) | `SUPPLIER_API_URL` / `SUPPLIER_API_KEY` documented but unused for fetch |
| **SUPPLIER XML** | **NO** (parser only) | XML parsed from **POSTed payloads**, not remote feeds |
| **SUPPLIER PRODUCT DATA** | **NO** | No GTIN/MPN/images for `BUZ-AUTO-*` in any feed |
| **SUPPLIER CREDENTIALS AVAILABLE** | **NO** | Empty in `.env.example`; absent from `render.yaml`; `server/data/supplier-secrets.json` missing |

### Adapter inventory

| Adapter ID | Module | Type | Remote calls? |
|------------|--------|------|---------------|
| `mock` | `server/lib/adapters/mockSupplierAdapter.js` | MOCK | No — 2 hardcoded SKUs (`MOCK-001`, `MOCK-002`) |
| `mock-xml` | Same as `mock` | MOCK alias | No |
| `tecdoc` | `server/lib/adapters/tecdocAdapter.js` | MOCK | No — header: *"No real TecDoc API calls"* |
| `mock` (Part 5) | `server/lib/supplier/mockAdapter.js` | MOCK | No — job note: *"Foundation only — no live supplier sync"* |

### Supplier entities in repository

| Supplier ID | Type | Usable for production? |
|-------------|------|------------------------|
| `SUP-DEMO-001` | Demo (`data/buzzard_suppliers.json`) | **NO** — endpoint `https://demo-automotive.example/...` |
| `SUP-INTERNAL-001` | Internal warehouse (JSON) | **NO** — manual/test only |
| `SUP-DE-01/02`, `SUP-NL-01` | SQLite seed (`server/lib/db.js`) | **NO** — demo suppliers |
| `DEMO-SUP` | Integration hub seed | **NO** — `supplier.example` URLs |

### Credentials / environment

Documented in `.env.example` (all **empty**):

```
SUPPLIER_API_URL=
SUPPLIER_API_KEY=
SUPPLIER_API_SECRET=
TECDOC_API_URL=
TECDOC_API_KEY=
SUPPLIER_SYNC_CRON=
```

`render.yaml` sets feature flags (`BUZZARD_SUPPLIER_HUB=1`, `DEFAULT_SUPPLIER_MODE=manual`) but **does not** inject supplier API keys.

`TECDOC_API_KEY` is read only for `configured: true/false` status flags — **never used to call TecDoc**.

### Integration architecture (existing, not connected)

```
┌─────────────────────────────────────────────────────────────┐
│  Adapters (ALL MOCK)                                        │
│  mock / mock-xml / tecdoc / Part5 mock                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  Pipelines                                                  │
│  importPipeline.js → productStore (P1 JSON)                │
│  pim/importPipeline.js → pim_core_products                  │
│  supplierHub.syncSupplierFeed → POST payload only           │
│  supplierIntegrationHub.queueSync → no worker connector     │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  Data stores                                                │
│  data/buzzard_products.json ← BUZ-AUTO-* (script-generated) │
│  supplier_products (SQLite) ← demo rows only (BZ-OIL-5W30)  │
└─────────────────────────────────────────────────────────────┘
```

**Key modules:**

| Purpose | Path |
|---------|------|
| P1 adapter registry | `server/lib/adapters/supplierAdapter.js` |
| TecDoc mock | `server/lib/adapters/tecdocAdapter.js` |
| Part 5 adapter registry | `server/lib/supplier/adapterRegistry.js` |
| Supplier Hub (SQLite) | `server/lib/supplierHub.js` |
| Supplier Integration Hub | `server/lib/supplierIntegrationHub.js` |
| P1 import | `server/lib/importPipeline.js` |
| PIM import | `server/lib/pim/importPipeline.js` |
| Catalog migration | `server/lib/pim/productCatalogMigration.js` |
| Supplier master JSON | `data/buzzard_suppliers.json` |
| Admin API | `server/plugins/supplierHubPlugin.js`, `p1CatalogPlatformPlugin.js` |

### What a real feed would need (not yet implemented)

1. Valid `SUPPLIER_API_URL` + `SUPPLIER_API_KEY` (or per-supplier `feed_url` / `api_key` in DB)
2. Optional `TECDOC_API_URL` + `TECDOC_API_KEY` for fitment
3. Connector that **fetches** remote catalog (currently zero `fetch()` to supplier URLs in `server/lib/`)
4. Mapping layer: supplier SKU/article → Buzzard SKU with traceable proof
5. Manual review before updating `data/buzzard_products.json`

---

## Phase 2 — Data Mapping (14 products)

**Rule applied:** A field is `VERIFIED = YES` only if it comes from a **real, traceable supplier/manufacturer source** — not from `generate-product-catalog.mjs`, not from `SUP-DEMO-001`, not from mock adapters.

### BUZ-AUTO-000002 — Bremsscheibe Vorderachse 280mm

| Field | Value |
|-------|-------|
| **SKU** | BUZ-AUTO-000002 |
| **Brand** | ATE |
| **Title** | Bremsscheibe Vorderachse 280mm |
| **Current EAN** | 4006633001234 |
| **EAN VERIFIED** | **NO** — script placeholder, invalid checksum |
| **MPN** | — |
| **MPN VERIFIED** | **NO** |
| **Images** | 0 URLs (`image_key: bremsen-disc` only) |
| **Fitment/TecDoc** | None |
| **Supplier** | SUP-DEMO-001 (mock) |
| **Source** | `scripts/generate-product-catalog.mjs` → `data/buzzard_products.json` |
| **Validation** | FAIL — `invalid_ean_checksum` |

### BUZ-AUTO-000003 — Bremsbeläge Satz Vorderachse

| Field | Value |
|-------|-------|
| **SKU** | BUZ-AUTO-000003 |
| **Brand** | Bosch |
| **Title** | Bremsbeläge Satz Vorderachse |
| **Current EAN** | 4006633001235 |
| **EAN VERIFIED** | **NO** |
| **MPN** | — |
| **MPN VERIFIED** | **NO** |
| **Images** | 0 |
| **Fitment/TecDoc** | None |
| **Supplier** | SUP-DEMO-001 (mock) |
| **Source** | Script-generated JSON |
| **Validation** | FAIL |

### BUZ-AUTO-000004 — Motoröl 5W-30 Fullsynthetic 5L

| Field | Value |
|-------|-------|
| **SKU** | BUZ-AUTO-000004 |
| **Brand** | Castrol |
| **Title** | Motoröl 5W-30 Fullsynthetic 5L |
| **Current EAN** | 4006633001236 |
| **EAN VERIFIED** | **NO** |
| **MPN** | — |
| **MPN VERIFIED** | **NO** |
| **Images** | 0 |
| **Fitment/TecDoc** | None |
| **Supplier** | SUP-DEMO-001 (mock) |
| **Source** | Script-generated JSON |
| **Validation** | FAIL |

### BUZ-AUTO-000005 — Ölfilter Universal OEM-kompatibel

| Field | Value |
|-------|-------|
| **SKU** | BUZ-AUTO-000005 |
| **Brand** | MANN-FILTER |
| **Title** | Ölfilter Universal OEM-kompatibel |
| **Current EAN** | 4006633001237 |
| **EAN VERIFIED** | **NO** |
| **MPN** | — |
| **MPN VERIFIED** | **NO** |
| **Images** | 0 |
| **Fitment/TecDoc** | None |
| **Supplier** | SUP-DEMO-001 (mock) |
| **Source** | Script-generated JSON |
| **Validation** | FAIL |

### BUZ-AUTO-000006 — Innenraumfilter Pollenfilter Premium

| Field | Value |
|-------|-------|
| **SKU** | BUZ-AUTO-000006 |
| **Brand** | MANN-FILTER |
| **Title** | Innenraumfilter Pollenfilter Premium |
| **Current EAN** | 4006633001238 |
| **EAN VERIFIED** | **NO** |
| **MPN** | — |
| **MPN VERIFIED** | **NO** |
| **Images** | 0 |
| **Fitment/TecDoc** | None |
| **Supplier** | SUP-DEMO-001 (mock) |
| **Source** | Script-generated JSON |
| **Validation** | FAIL |

### BUZ-AUTO-000007 — Zündkerze Iridium IX NGK

| Field | Value |
|-------|-------|
| **SKU** | BUZ-AUTO-000007 |
| **Brand** | NGK |
| **Title** | Zündkerze Iridium IX NGK |
| **Current EAN** | 4006633001239 |
| **EAN VERIFIED** | **NO** |
| **MPN** | — |
| **MPN VERIFIED** | **NO** |
| **Images** | 0 |
| **Fitment/TecDoc** | None |
| **Supplier** | SUP-DEMO-001 (mock) |
| **Source** | Script-generated JSON |
| **Validation** | FAIL |

### BUZ-AUTO-000008 — Starterbatterie 12V 72Ah 680A

| Field | Value |
|-------|-------|
| **SKU** | BUZ-AUTO-000008 |
| **Brand** | Varta |
| **Title** | Starterbatterie 12V 72Ah 680A |
| **Current EAN** | 4006633001240 |
| **EAN VERIFIED** | **NO** |
| **MPN** | — |
| **MPN VERIFIED** | **NO** |
| **Images** | 0 |
| **Fitment/TecDoc** | None |
| **Supplier** | SUP-DEMO-001 (mock) |
| **Source** | Script-generated JSON |
| **Validation** | FAIL |

### BUZ-AUTO-000009 — Stoßdämpfer Vorderachse Gas *(also reviewed)*

| Field | Value |
|-------|-------|
| **SKU** | BUZ-AUTO-000009 |
| **Brand** | BILSTEIN |
| **Title** | Stoßdämpfer Vorderachse Gas |
| **Current EAN** | 4006633001241 |
| **EAN VERIFIED** | **NO** — same generator script; checksum passes by coincidence, **not manufacturer-verified** |
| **MPN** | — |
| **MPN VERIFIED** | **NO** |
| **Images** | 0 |
| **Fitment/TecDoc** | None |
| **Supplier** | SUP-DEMO-001 (mock) |
| **Source** | `scripts/generate-product-catalog.mjs` line 16 |
| **Validation** | WARNING in dry-run (`READY_TO_IMPORT`) — **must remain blocked** until real supplier GTIN + images |

### BUZ-AUTO-000010 — Getriebeöl 75W-90 Vollsynthetisch 1L

| Field | Value |
|-------|-------|
| **SKU** | BUZ-AUTO-000010 |
| **Brand** | LIQUI MOLY |
| **Title** | Getriebeöl 75W-90 Vollsynthetisch 1L |
| **Current EAN** | 4006633001242 |
| **EAN VERIFIED** | **NO** |
| **MPN** | — |
| **MPN VERIFIED** | **NO** |
| **Images** | 0 |
| **Fitment/TecDoc** | None |
| **Supplier** | SUP-DEMO-001 (mock) |
| **Source** | Script-generated JSON |
| **Validation** | FAIL |

### BUZ-AUTO-000011 — Bremsflüssigkeit DOT 4 500ml

| Field | Value |
|-------|-------|
| **SKU** | BUZ-AUTO-000011 |
| **Brand** | ATE |
| **Title** | Bremsflüssigkeit DOT 4 500ml |
| **Current EAN** | 4006633001243 |
| **EAN VERIFIED** | **NO** |
| **MPN** | — |
| **MPN VERIFIED** | **NO** |
| **Images** | 0 |
| **Fitment/TecDoc** | None |
| **Supplier** | SUP-DEMO-001 (mock) |
| **Source** | Script-generated JSON |
| **Validation** | FAIL |

### BUZ-AUTO-000012 — Keilrippenriemen 6PK1548

| Field | Value |
|-------|-------|
| **SKU** | BUZ-AUTO-000012 |
| **Brand** | Continental |
| **Title** | Keilrippenriemen 6PK1548 |
| **Current EAN** | 4006633001244 |
| **EAN VERIFIED** | **NO** |
| **MPN** | — (title contains belt code `6PK1548`, not verified MPN) |
| **MPN VERIFIED** | **NO** |
| **Images** | 0 |
| **Fitment/TecDoc** | None |
| **Supplier** | SUP-DEMO-001 (mock) |
| **Source** | Script-generated JSON |
| **Validation** | FAIL |

### BUZ-AUTO-000013 — Kühlerfrostschutzmittel G12+ 5L

| Field | Value |
|-------|-------|
| **SKU** | BUZ-AUTO-000013 |
| **Brand** | LIQUI MOLY |
| **Title** | Kühlerfrostschutzmittel G12+ 5L |
| **Current EAN** | 4006633001245 |
| **EAN VERIFIED** | **NO** |
| **MPN** | — |
| **MPN VERIFIED** | **NO** |
| **Images** | 0 |
| **Fitment/TecDoc** | None |
| **Supplier** | SUP-DEMO-001 (mock) |
| **Source** | Script-generated JSON |
| **Validation** | FAIL |

### BUZ-AUTO-000014 — Bosch Aerotwin Scheibenwischer Set

| Field | Value |
|-------|-------|
| **SKU** | BUZ-AUTO-000014 |
| **Brand** | Bosch |
| **Title** | Bosch Aerotwin Scheibenwischer Set |
| **Current EAN** | 4006633001246 |
| **EAN VERIFIED** | **NO** |
| **MPN** | — |
| **MPN VERIFIED** | **NO** |
| **Images** | 0 |
| **Fitment/TecDoc** | None |
| **Supplier** | SUP-DEMO-001 (mock) |
| **Source** | Script-generated JSON |
| **Validation** | FAIL |

### BUZ-AUTO-000015 — Michelin Pilot Sport 4 Reifen 225/45 R17

| Field | Value |
|-------|-------|
| **SKU** | BUZ-AUTO-000015 |
| **Brand** | Michelin |
| **Title** | Michelin Pilot Sport 4 Reifen 225/45 R17 |
| **Current EAN** | 4006633001247 |
| **EAN VERIFIED** | **NO** |
| **MPN** | — |
| **MPN VERIFIED** | **NO** |
| **Images** | 0 |
| **Fitment/TecDoc** | None |
| **Supplier** | SUP-DEMO-001 (mock) |
| **Source** | Script-generated JSON |
| **Validation** | FAIL |

---

## Phase 3 — Dry Run (no verified supplier data applied)

Command: `npm run pim:import` (dry-run only)

```
PRODUCTS FOUND:          26
PRODUCTS ELIGIBLE:       6
PRODUCTS REJECTED:       20
VALIDATION FAILURES:     13
DEMO PRODUCTS BLOCKED:   7
DUPLICATES:              0
PUBLIC PRODUCTS CREATED: 0
```

The 13 audited SKUs remain `VALIDATION_FAILED`. `BUZ-AUTO-000009` shows `READY_TO_IMPORT` in the pipeline (checksum pass on generator EAN) but is **not supplier-verified** and must stay blocked per data-gate policy.

**Not executed:** `npm run pim:import:live`, `npm run pim:publish`

---

## What is required to unblock (manual / external)

### Option A — Configure real supplier credentials (recommended path)

1. Obtain real B2B supplier API/XML credentials (not demo URLs)
2. Set env vars or `server/data/supplier-secrets.json` (gitignored) via secure deployment
3. Implement or connect live fetch connector (scaffold exists; connector does not)
4. Import supplier catalog with traceable SKU → Buzzard SKU mapping
5. Verify GTIN checksum + cross-check brand/article against manufacturer
6. Add product images from supplier CDN or licensed assets
7. Add TecDoc fitment where applicable (requires real `TECDOC_API_KEY`)
8. Update `data/buzzard_products.json` **only after human verification**
9. Re-run `npm run pim:import` dry-run

### Option B — Manual supplier data entry

If no API is available yet:

1. For each SKU, obtain GTIN + MPN from manufacturer datasheet or authorized distributor
2. Document source (invoice, supplier PDF, TecDoc export) in audit trail
3. Enter verified data into JSON manually
4. Never use sequential `400663300xxxx` placeholders

### Explicitly forbidden

- Inventing EAN/GTIN/MPN/OEM numbers
- Modifying existing EANs to pass checksum without supplier proof
- Using `SUP-DEMO-001`, `MOCK-001`, or mock adapter data as production source
- Scraping random web data to inflate PASS count
- Weakening validation or security guards

---

## Safety confirmation

| Constraint | Status |
|------------|--------|
| BUZZARD_SALES_ENABLED | 0 |
| Stripe | OFF |
| PayPal | OFF |
| Supplier Orders | OFF |
| Go-Live Lock | ACTIVE |
| Live import | NO |
| Publish | NO |
| Part 16 | NOT STARTED |

---

## Conclusion

**MANUAL SUPPLIER DATA REQUIRED**

The Buzzard platform has supplier integration **architecture** ready but **no real supplier connection** and **no credentials**. Zero products among the 14 reviewed SKUs have verified GTIN, MPN, images, or fitment from a trustworthy supplier source. All remain **BLOCKED** until real supplier/manufacturer data is provided externally.

Do not start Part 16. Do not enable sales. Do not run live import or publish until verified data exists and dry-run shows eligible products with legitimate identifiers.
