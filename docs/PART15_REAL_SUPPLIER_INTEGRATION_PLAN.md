# Part 15 — Real Supplier Integration Plan

**Date:** 2026-08-30  
**Phase:** 15 — Real Supplier Integration Discovery  
**Status:** BLOCKED — Manual supplier data required  
**Do not start Part 16. Do not enable sales. Do not publish products.**

---

## Executive Summary

| Check | Result |
|-------|--------|
| **REAL SUPPLIER CONNECTED** | **NO** |
| **SUPPLIER CREDENTIALS** | **NOT PROVIDED** |
| **LIVE IMPORT** | **NO** |
| **PUBLISH** | **NO** |
| **SALES** | **DISABLED** |
| **STRIPE** | **OFF** |
| **PAYPAL** | **OFF** |
| **SUPPLIER ORDERS** | **OFF** |
| **GO-LIVE LOCK** | **ACTIVE** |

The Buzzard platform has a complete supplier integration **scaffold** but **zero live supplier connections**. All existing adapters are mock/test-only. A production-ready connector interface (`server/lib/supplier/realSupplierConnector.js`) is prepared but **does not call any real endpoint** until credentials are provided.

---

## Phase 1 — Existing Architecture Inspection

### What is implemented

| Component | Path | Status |
|-----------|------|--------|
| P1 adapter registry | `server/lib/adapters/supplierAdapter.js` | Mock dispatch only (`mock`, `mock-xml`, `tecdoc`) |
| Mock supplier adapter | `server/lib/adapters/mockSupplierAdapter.js` | 2 hardcoded SKUs — TEST ONLY |
| TecDoc adapter | `server/lib/adapters/tecdocAdapter.js` | Mock vehicles/compatibility — no real API calls |
| Part 5 base adapter | `server/lib/supplier/baseAdapter.js` | Foundation class; orders throw |
| Part 5 mock adapter | `server/lib/supplier/mockAdapter.js` | 1 mock product — TEST ONLY |
| Part 5 adapter registry | `server/lib/supplier/adapterRegistry.js` | Registers mock only |
| Supplier Hub (SQLite) | `server/lib/supplierHub.js` | CRUD + XML/JSON parse from **POSTed payloads** |
| Supplier Integration Hub | `server/lib/supplierIntegrationHub.js` | Mapping/sync job queue — no live worker |
| PIM import pipeline | `server/lib/pim/importPipeline.js` | Normalization + validation stages |
| PIM catalog migration | `server/lib/pim/productCatalogMigration.js` | Multi-source dry-run/import |
| Product validation | `server/lib/pim/productValidation.js` | EAN checksum, images, brand, stock |
| Production safety gate | `server/lib/pim/productionSafetyGate.js` | Blocks if sales/payments enabled |
| Demo product guard | `server/lib/pim/demoProductGuard.js` | Blocks demo SKUs from storefront |
| Real supplier connector | `server/lib/supplier/realSupplierConnector.js` | **NEW** — dry-run default, no live HTTP |
| Production supplier guard | `server/lib/supplier/supplierProductionGuard.js` | **NEW** — blocks TEST ONLY suppliers |
| Supplier master JSON | `data/buzzard_suppliers.json` | 2 entries (internal + demo) |
| Import CLI | `scripts/pim-import.mjs` | Dry-run default; live requires safety gate |
| Environment template | `.env.example` | Empty supplier/TecDoc keys |
| Render blueprint | `render.yaml` | Feature flags only — no supplier secrets |

### What is missing for a real supplier connection

1. **Real supplier credentials** (API URL, API key, auth type)
2. **Outbound HTTP connector** wired to a verified B2B endpoint (scaffold exists, not activated)
3. **Supplier-specific field mapping** (each B2B feed uses different schema)
4. **Verified GTIN/EAN/MPN data** for automotive SKUs (13 of 14 candidates blocked)
5. **Product images** from supplier CDN or licensed assets
6. **TecDoc live integration** (`TECDOC_API_KEY` unused for real calls)
7. **Scheduled sync worker** that pulls remote feeds (hub queues jobs but has no live fetch worker)
8. **Order dispatch connector** (Part 16+ — explicitly out of scope)

### Architecture flow (current vs target)

```
CURRENT (all mock):
  Admin POST → supplierHub.parseSupplierFeed(payload) → SQLite supplier_products
  PIM import → productCatalogMigration ← local JSON/SQLite only
  Adapters → return hardcoded MOCK records

TARGET (when credentials provided):
  REAL_SUPPLIER_* env → realSupplierConnector.fetchCatalog()
    → validateGtin/MPN/images → supplierMapping
    → pim/importPipeline → pim_core_products (HIDDEN)
    → explicit pim:publish (still sales OFF)
```

---

## Phase 2 — Supplier Requirements

### 1. Required supplier API/XML capabilities

| Capability | Required | Notes |
|------------|----------|-------|
| Product catalog export | **Yes** | REST JSON or XML feed |
| Stock/availability | **Yes** | Real-time or ≤15 min delta |
| Purchase/net price | **Yes** | B2B net price in EUR |
| Recommended retail (RRP) | Recommended | For margin calculation |
| Product images | **Yes** | HTTPS URLs or binary download API |
| Category mapping | **Yes** | Supplier category → Buzzard taxonomy |
| GTIN/EAN | **Yes** | Manufacturer-assigned, checksum-valid |
| MPN/OEM article number | **Yes** | Brand-specific part number |
| Vehicle fitment / TecDoc | Recommended | KType, OE refs, or TecDoc article ID |
| Order submission API | Phase 16+ | Not required for Part 15 |

Supported feed formats in scaffold: `json`, `xml` (via `fast-xml-parser` in supplierHub).

### 2. Required credentials

Provide via Render secret manager or local untracked `.env`:

| Variable | Purpose |
|----------|---------|
| `REAL_SUPPLIER_CODE` | Unique supplier code (e.g. `REAL-INTERCARS-001`) — **not** `SUP-DEMO-001` |
| `REAL_SUPPLIER_API_URL` | Base catalog endpoint (HTTPS) |
| `REAL_SUPPLIER_API_KEY` | API key or token |
| `REAL_SUPPLIER_AUTH_TYPE` | `api_key` \| `bearer` \| `basic` |
| `REAL_SUPPLIER_FEED_FORMAT` | `json` \| `xml` |
| `REAL_SUPPLIER_TIMEOUT_MS` | Default 30000 |
| `REAL_SUPPLIER_MAX_RETRIES` | Default 3 |
| `REAL_SUPPLIER_RATE_LIMIT_RPM` | Default 60 |
| `REAL_SUPPLIER_DRY_RUN` | Default `1` — keep until validated |
| `REAL_SUPPLIER_LIVE_IMPORT` | Default `0` — set `1` only after credential validation |

Optional TecDoc (fitment enrichment):

| Variable | Purpose |
|----------|---------|
| `TECDOC_API_URL` | TecDoc/RapidAPI endpoint |
| `TECDOC_API_KEY` | TecDoc credentials |

Alternative: per-supplier secrets file `server/data/supplier-secrets.json` (gitignored).

### 3. Required product fields

| Field | Required | Buzzard mapping |
|-------|----------|-----------------|
| Supplier SKU | **Yes** | `supplier_sku` → Buzzard SKU mapping |
| Title/name | **Yes** | `pim_core_products.title` |
| Brand | **Yes** | `pim_core_brands` |
| Description | Recommended | `description` / `short_description` |
| Buzzard category | **Yes** | Via `categoryEngine` taxonomy mapping |

### 4. GTIN/EAN requirements

- Must be **manufacturer-assigned** (GS1 registered)
- Length: 8, 12, 13, or 14 digits
- Must pass **modulo-10 checksum** (`productValidator.validateEan`)
- **Do not invent** sequential placeholders (current `4006633001234`–`1247` range is blocked)
- Unique per SKU in PIM Core (`idx_pim_core_ean`, `idx_pim_core_gtin`)

### 5. MPN/OEM requirements

- Manufacturer part number or OE reference required for automotive parts
- Min 2 chars, max 64 chars
- Placeholders (`mock`, `demo`, `test`, `n/a`) rejected by connector validation
- Stored in `pim_core_products.mpn` and supplier mapping tables

### 6. Brand/manufacturer

- Official brand name (ATE, Bosch, Mann-Filter, etc.)
- Must resolve to `pim_core_brands` entry
- White-label suppliers must disclose source brand

### 7. Product images

- At least **one HTTPS image URL** per product
- No `example.com` or `.example` TLD hosts
- Preferred: supplier CDN with stable URLs
- Stored in PIM media table / `images[]` on product

### 8. Stock

- Integer ≥ 0
- `in_stock` / `out_of_stock` / `low_stock` derived from quantity + safety stock rules
- Update frequency: see §15

### 9. Purchase price

- B2B net purchase price in EUR (or supplier currency with FX conversion)
- Stored as `cost` in PIM; never exposed on public storefront while `BUZZARD_SALES_ENABLED=0`

### 10. Recommended retail price

- RRP/list price for margin calculation
- Used with `DEFAULT_MARGIN` / `MIN_MARGIN` env vars
- Public price hidden until sales enabled

### 11. Categories

- Supplier category code/name → Buzzard 48-category taxonomy
- Mapping file: `data/buzzard_supplier_category_mappings.json`
- Unmapped categories block import (`CATEGORY_MAPPING_REQUIRED`)

### 12. TecDoc/vehicle fitment

- TecDoc article ID, KType, or structured `{ brand, model, year_from, year_to, engine }`
- Enrichment via `tecdocAdapter` once `TECDOC_API_KEY` configured
- Optional for Part 15 import; recommended before publish

### 13. Availability

- Stock status + lead time days
- Preorder/backorder flags if applicable
- Supplier hub fields: `lead_time_days`, `dropship`, `blind_shipping`

### 14. Shipping information

- Weight (kg) for carrier rate calculation
- Hazmat/DG flags for oils, batteries, aerosols
- Origin country for customs (DE/EU preferred)
- Carrier preferences per supplier (DHL/DPD/GLS)

### 15. Update frequency

| Data type | Recommended frequency |
|-----------|----------------------|
| Stock/price | Every 15–60 minutes |
| Full catalog | Daily off-peak |
| New articles | Daily delta sync |
| Fitment | Weekly or on-demand |

Cron hook: `SUPPLIER_SYNC_CRON` (not yet wired to live fetch).

### 16. Order API requirements (later phases — Part 16+)

Not in scope for Part 15. Future requirements:

- Order submission endpoint
- Order status webhook/polling
- Tracking number push
- RMA/returns endpoint
- `BUZZARD_SUPPLIER_ORDERS_ENABLED=1` only after go-live approval

---

## Phase 3 — TEST ONLY Suppliers (explicitly marked)

| ID / Host | Status | Notes |
|-----------|--------|-------|
| **`SUP-DEMO-001`** | **TEST ONLY** | Demo Automotive Parts GmbH — never production |
| **`demo-automotive.example`** | **TEST ONLY** | Fake hostname — never production |
| `SUP-DEMO` | TEST ONLY | SQLite seed |
| `DEMO-SUP` | TEST ONLY | Integration hub seed (`supplier.example`) |
| `SUP-DE-01`, `SUP-DE-02`, `SUP-NL-01` | TEST ONLY | SQLite demo B2B suppliers |
| `mock`, `mock-xml`, `tecdoc` adapter IDs | TEST ONLY | Hardcoded mock data |
| `MOCK-001`, `MOCK-002` | TEST ONLY | Mock adapter SKUs |

Enforced by: `server/lib/supplier/supplierProductionGuard.js`

---

## Phase 4 — Real Supplier Shortlist

**No supplier in this repository is connected.** The following is a requirements-based shortlist of REAL B2B automotive suppliers suitable for Germany/EU integration. Inclusion does **not** imply partnership, API access, or existing Buzzard integration.

| Supplier | HQ | Feed types | GTIN/MPN | Images | Stock | TecDoc | DE/EU | Notes |
|----------|-----|------------|----------|--------|-------|--------|-------|-------|
| **Inter Cars** | PL/EU | API, XML | Yes | Yes | Yes | Partial | Yes | Large EU aftermarket wholesaler |
| **Partslink24** | DE | API | Yes | Yes | Yes | Yes | Yes | OE + aftermarket, TecDoc-backed |
| **AD Autoteile (Autodistribution)** | DE/EU | API, CSV | Yes | Yes | Yes | Partial | Yes | AD Group B2B platform |
| **Lorch (Schwarz Group)** | DE | API, EDI | Yes | Yes | Yes | Partial | Yes | Independent workshop supplier |
| **FEBI Bilstein (via wholesaler)** | DE | Wholesaler feed | Yes | Yes | Varies | Yes | Yes | Brand data via B2B distributor |
| **Parts World / Stahlgruber** | DE | API, XML | Yes | Yes | Yes | Partial | Yes | Multi-brand wholesaler |
| **WM SE (Würth)** | DE | API, EDI | Yes | Yes | Yes | Partial | Yes | Workshop + automotive range |

**Internal warehouse (`SUP-INTERNAL-001`)** is for Buzzard-owned stock only — not an external B2B feed.

### Selection criteria applied

- API or XML catalog export
- GTIN/EAN and MPN in product data
- Brand and image URLs
- Stock and B2B pricing
- Germany/EU shipping
- TecDoc or fitment data where available

---

## Phase 5 — Connector Implementation (prepared, not connected)

Module: `server/lib/supplier/realSupplierConnector.js`

| Feature | Implemented |
|---------|-------------|
| Environment variables | Yes — `REAL_SUPPLIER_*` |
| Authentication abstraction | Yes — api_key, bearer, basic |
| Timeout | Yes — default 30s |
| Retry policy | Yes — exponential backoff, max 3 |
| Rate limiting | Yes — 60 req/min default |
| Logging without secrets | Yes — `redactSecrets()` |
| Schema validation | Yes — `validateSupplierRecord()` |
| GTIN validation | Yes — reuses `productValidator.validateEan` |
| MPN validation | Yes — rejects placeholders |
| Image validation | Yes — HTTPS only, blocks `.example` |
| Supplier mapping | Via existing `supplierMapping.js` |
| Dry-run mode | **Default ON** |
| Safety gate | Yes — `productionSafetyGate` + `supplierProductionGuard` |
| Live HTTP | **Blocked** until credentials + `REAL_SUPPLIER_LIVE_IMPORT=1` |

---

## Phase 6 — Tests (mock data only)

File: `server/__tests__/part15RealSupplierConnector.test.mjs`

Proves:

- Invalid GTIN rejected
- Missing MPN rejected
- Missing image rejected
- Unknown supplier rejected
- Demo supplier cannot become production supplier
- Safety gates remain active
- Live import remains disabled by default

Run: `npm run test:unit -- part15RealSupplierConnector`

---

## Phase 7 — What you must provide

To establish the **first REAL supplier connection**, provide:

### A. Supplier account & credentials

1. Signed B2B contract with chosen wholesaler (from shortlist or your preferred supplier)
2. **Supplier code** you assign in Buzzard (e.g. `REAL-INTERCARS-001`)
3. **API base URL** (HTTPS catalog endpoint)
4. **API key / token** (or OAuth client credentials)
5. **Auth type** (`api_key`, `bearer`, or `basic`)
6. **Feed format** documentation (JSON/XML schema, field names)

### B. Product data proof (minimum 1 SKU, ideally all 14 automotive candidates)

For each product to import:

1. **Verified GTIN/EAN** from supplier feed (not generated)
2. **MPN/OEM article number** from manufacturer
3. **Brand name** (official)
4. **At least one product image URL** (HTTPS)
5. **B2B purchase price** (net EUR)
6. **Stock quantity**
7. **Supplier category** → Buzzard taxonomy mapping

### C. Deployment configuration

Set in Render secret manager (never commit):

```
REAL_SUPPLIER_CODE=<your-supplier-code>
REAL_SUPPLIER_API_URL=https://...
REAL_SUPPLIER_API_KEY=<secret>
REAL_SUPPLIER_AUTH_TYPE=api_key
REAL_SUPPLIER_FEED_FORMAT=json
REAL_SUPPLIER_DRY_RUN=1          # validate first
REAL_SUPPLIER_LIVE_IMPORT=0      # enable only after dry-run validation
```

Optional TecDoc:

```
TECDOC_API_URL=...
TECDOC_API_KEY=...
```

### D. Operational approval (unchanged safety state)

Part 15 does **not** require enabling sales. For live import into PIM Core (still HIDDEN):

- Confirm `BUZZARD_SALES_ENABLED=0` remains
- Confirm Go-Live Lock stays ACTIVE
- Run connector dry-run validation
- Then set `REAL_SUPPLIER_LIVE_IMPORT=1` for fetch only
- Run `npm run pim:import -- --dry-run` to verify mapping
- **Do not run** `pim:import:live` or `pim:publish` without explicit authorization

---

## Related documents

- `docs/PART15_PRODUCT_CATALOG_READINESS.md` — import/publish pipeline
- `docs/PART15_PRODUCT_DATA_AUDIT.md` — EAN/MPN audit for BUZ-AUTO SKUs
- `docs/PART15_REAL_SUPPLIER_DATA_READINESS.md` — data gate verdict

---

**STOP — Part 15 complete. Do not start Part 16.**
