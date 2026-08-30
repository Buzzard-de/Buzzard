# Part 15 — Product Data Audit

**Status:** COMPLETE  
**Date:** 2026-08-30  
**Scope:** 13 P1 products with `VALIDATION_FAILED` (invalid EAN/GTIN checksum)  
**Method:** Repository inspection + `npm run pim:import` dry-run only — **no live import, no publish, no EAN invention**

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **PART 15 PRODUCT DATA AUDIT** | **COMPLETE** |
| **PRODUCTS REVIEWED** | **13** |
| **LEGITIMATE EANs FOUND** | **0** |
| **EANs REQUIRING REAL SUPPLIER DATA** | **13** |
| **PRODUCTS READY AFTER DATA FIX** | **13** *(genuine products — blocked until real identifiers/media supplied)* |
| **PRODUCTS STILL BLOCKED** | **13** *(current state unchanged)* |
| **SALES** | **DISABLED** |
| **STRIPE** | **OFF** |
| **PAYPAL** | **OFF** |
| **SUPPLIER ORDERS** | **OFF** |
| **GO-LIVE LOCK** | **ACTIVE** |

### Root cause (proven)

All 13 EAN/GTIN values originate from `scripts/generate-product-catalog.mjs`, which assigns **sequential placeholder codes** in the range `4006633001234`–`4006633001247`. These are **not** sourced from manufacturers, suppliers, TecDoc, or any other trustworthy identifier store in the repository.

Repository search confirms:

- **Only occurrence** of these EANs: `data/buzzard_products.json` and `scripts/generate-product-catalog.mjs`
- **`supplier_products`:** no rows for any `BUZ-AUTO-*` SKU
- **`pim_products`:** only `BZ-OIL-5W30` (unrelated; demo brand)
- **Legacy SQLite `products`:** no EAN column; synced rows contain title/price/stock only
- **`buzzard_product_translations.json`:** i18n text only — no EAN/GTIN/MPN

**Action:** Do **not** replace these values with invented GTINs. Obtain real EAN/GTIN (or verifiable MPN + brand article number) from supplier/manufacturer feeds before import/publish.

---

## Per-Product Audit

| SKU | Title | Brand |
|-----|-------|-------|
| BUZ-AUTO-000002 | Bremsscheibe Vorderachse 280mm | ATE |
| BUZ-AUTO-000003 | Bremsbeläge Satz Vorderachse | Bosch |
| BUZ-AUTO-000004 | Motoröl 5W-30 Fullsynthetic 5L | Castrol |
| BUZ-AUTO-000005 | Ölfilter Universal OEM-kompatibel | MANN-FILTER |
| BUZ-AUTO-000006 | Innenraumfilter Pollenfilter Premium | MANN-FILTER |
| BUZ-AUTO-000007 | Zündkerze Iridium IX NGK | NGK |
| BUZ-AUTO-000008 | Starterbatterie 12V 72Ah 680A | Varta |
| BUZ-AUTO-000010 | Getriebeöl 75W-90 Vollsynthetisch 1L | LIQUI MOLY |
| BUZ-AUTO-000011 | Bremsflüssigkeit DOT 4 500ml | ATE |
| BUZ-AUTO-000012 | Keilrippenriemen 6PK1548 | Continental |
| BUZ-AUTO-000013 | Kühlerfrostschutzmittel G12+ 5L | LIQUI MOLY |
| BUZ-AUTO-000014 | Bosch Aerotwin Scheibenwischer Set | Bosch |
| BUZ-AUTO-000015 | Michelin Pilot Sport 4 Reifen 225/45 R17 | Michelin |

---

### BUZ-AUTO-000002 — Bremsscheibe Vorderachse 280mm

| Field | Status |
|-------|--------|
| **CURRENT EAN/GTIN** | `4006633001234` |
| **EAN STATUS** | PLACEHOLDER — invalid checksum; generated in `scripts/generate-product-catalog.mjs` line 9 |
| **BRAND STATUS** | PRESENT (`ATE`) — needs `pim_core_brands` mapping on import |
| **IMAGE STATUS** | MISSING — `images: []`; only `attributes.image_key: bremsen-disc` (no URL/asset in repo) |
| **CATEGORY STATUS** | OK — `cat-05-03` (Brakes), taxonomy resolvable |
| **VALIDATION STATUS** | FAIL — `invalid_ean_checksum` |
| **ACTION REQUIRED** | Obtain real ATE/manufacturer GTIN or MPN for 280mm front brake disc; add product image URL(s); map brand in PIM Core; replace placeholder EAN — do not invent |

---

### BUZ-AUTO-000003 — Bremsbeläge Satz Vorderachse

| Field | Status |
|-------|--------|
| **CURRENT EAN/GTIN** | `4006633001235` |
| **EAN STATUS** | PLACEHOLDER — invalid checksum; generator line 10 |
| **BRAND STATUS** | PRESENT (`Bosch`) — needs PIM brand mapping |
| **IMAGE STATUS** | MISSING — `image_key: bremsen-pads`, no URLs |
| **CATEGORY STATUS** | OK — `cat-05-03` |
| **VALIDATION STATUS** | FAIL — `invalid_ean_checksum` |
| **ACTION REQUIRED** | Real Bosch/supplier GTIN or article number; product images; supplier data from non-demo source (`SUP-DEMO-001` is mock) |

---

### BUZ-AUTO-000004 — Motoröl 5W-30 Fullsynthetic 5L

| Field | Status |
|-------|--------|
| **CURRENT EAN/GTIN** | `4006633001236` |
| **EAN STATUS** | PLACEHOLDER — invalid checksum; generator line 11 |
| **BRAND STATUS** | PRESENT (`Castrol`) — needs PIM brand mapping |
| **IMAGE STATUS** | MISSING — `image_key: oel` |
| **CATEGORY STATUS** | OK — `cat-05-01` (Oils/Fluids) |
| **VALIDATION STATUS** | FAIL — `invalid_ean_checksum` |
| **ACTION REQUIRED** | Real Castrol 5W-30 5L GTIN from supplier; product images; volume/spec attributes beyond generic `OEM-kompatibel` |

---

### BUZ-AUTO-000005 — Ölfilter Universal OEM-kompatibel

| Field | Status |
|-------|--------|
| **CURRENT EAN/GTIN** | `4006633001237` |
| **EAN STATUS** | PLACEHOLDER — invalid checksum; generator line 12 |
| **BRAND STATUS** | PRESENT (`MANN-FILTER`) — needs PIM brand mapping |
| **IMAGE STATUS** | MISSING — `image_key: filter-oil` |
| **CATEGORY STATUS** | OK — `cat-05-02` (Filters) |
| **VALIDATION STATUS** | FAIL — `invalid_ean_checksum` |
| **ACTION REQUIRED** | Real MANN-FILTER article/GTIN (generic “Universal” needs specific part number); images; MPN/OEM cross-ref |

---

### BUZ-AUTO-000006 — Innenraumfilter Pollenfilter Premium

| Field | Status |
|-------|--------|
| **CURRENT EAN/GTIN** | `4006633001238` |
| **EAN STATUS** | PLACEHOLDER — invalid checksum; generator line 13 |
| **BRAND STATUS** | PRESENT (`MANN-FILTER`) — needs PIM brand mapping |
| **IMAGE STATUS** | MISSING — `image_key: filter-cabin` |
| **CATEGORY STATUS** | OK — `cat-05-02` |
| **VALIDATION STATUS** | FAIL — `invalid_ean_checksum` |
| **ACTION REQUIRED** | Real MANN-FILTER cabin filter GTIN/MPN; images; vehicle compatibility data if applicable |

---

### BUZ-AUTO-000007 — Zündkerze Iridium IX NGK

| Field | Status |
|-------|--------|
| **CURRENT EAN/GTIN** | `4006633001239` |
| **EAN STATUS** | PLACEHOLDER — invalid checksum; generator line 14 |
| **BRAND STATUS** | PRESENT (`NGK`) — needs PIM brand mapping |
| **IMAGE STATUS** | MISSING — `image_key: zuendung` |
| **CATEGORY STATUS** | OK — `cat-05-11` |
| **VALIDATION STATUS** | FAIL — `invalid_ean_checksum` |
| **ACTION REQUIRED** | Real NGK Iridium IX part number + GTIN; images; spark plug spec attributes (thread, gap, heat range) |

---

### BUZ-AUTO-000008 — Starterbatterie 12V 72Ah 680A

| Field | Status |
|-------|--------|
| **CURRENT EAN/GTIN** | `4006633001240` |
| **EAN STATUS** | PLACEHOLDER — invalid checksum; generator line 15 |
| **BRAND STATUS** | PRESENT (`Varta`) — needs PIM brand mapping |
| **IMAGE STATUS** | MISSING — `image_key: batterie` |
| **CATEGORY STATUS** | OK — `cat-05-04` (Battery) |
| **VALIDATION STATUS** | FAIL — `invalid_ean_checksum` |
| **ACTION REQUIRED** | Real Varta 72Ah/680A battery GTIN; images; battery spec attributes (dimensions, terminal type, EN rating) |

---

### BUZ-AUTO-000010 — Getriebeöl 75W-90 Vollsynthetisch 1L

| Field | Status |
|-------|--------|
| **CURRENT EAN/GTIN** | `4006633001242` |
| **EAN STATUS** | PLACEHOLDER — invalid checksum; generator line 17 |
| **BRAND STATUS** | PRESENT (`LIQUI MOLY`) — needs PIM brand mapping |
| **IMAGE STATUS** | MISSING — `image_key: oel-gear` |
| **CATEGORY STATUS** | OK — `cat-05-01` |
| **VALIDATION STATUS** | FAIL — `invalid_ean_checksum` |
| **ACTION REQUIRED** | Real LIQUI MOLY 75W-90 1L GTIN; images; API/GL spec attributes |

---

### BUZ-AUTO-000011 — Bremsflüssigkeit DOT 4 500ml

| Field | Status |
|-------|--------|
| **CURRENT EAN/GTIN** | `4006633001243` |
| **EAN STATUS** | PLACEHOLDER — invalid checksum; generator line 18 |
| **BRAND STATUS** | PRESENT (`ATE`) — needs PIM brand mapping |
| **IMAGE STATUS** | MISSING — `image_key: bremsen-fluid` |
| **CATEGORY STATUS** | OK — `cat-05-03` |
| **VALIDATION STATUS** | FAIL — `invalid_ean_checksum` |
| **ACTION REQUIRED** | Real ATE DOT 4 500ml GTIN; images; safety/hazmat attributes if required |

---

### BUZ-AUTO-000012 — Keilrippenriemen 6PK1548

| Field | Status |
|-------|--------|
| **CURRENT EAN/GTIN** | `4006633001244` |
| **EAN STATUS** | PLACEHOLDER — invalid checksum; generator line 19 |
| **BRAND STATUS** | PRESENT (`Continental`) — needs PIM brand mapping |
| **IMAGE STATUS** | MISSING — `image_key: fahrwerk-belt` |
| **CATEGORY STATUS** | OK — `cat-05-11` |
| **VALIDATION STATUS** | FAIL — `invalid_ean_checksum` |
| **ACTION REQUIRED** | Real Continental 6PK1548 GTIN; images; belt length/profile already in title — add TecDoc/OEM refs |

---

### BUZ-AUTO-000013 — Kühlerfrostschutzmittel G12+ 5L

| Field | Status |
|-------|--------|
| **CURRENT EAN/GTIN** | `4006633001245` |
| **EAN STATUS** | PLACEHOLDER — invalid checksum; generator line 20 |
| **BRAND STATUS** | PRESENT (`LIQUI MOLY`) — needs PIM brand mapping |
| **IMAGE STATUS** | MISSING — `image_key: oel-coolant` |
| **CATEGORY STATUS** | OK — `cat-05-01` |
| **VALIDATION STATUS** | FAIL — `invalid_ean_checksum` |
| **ACTION REQUIRED** | Real LIQUI MOLY G12+ 5L GTIN; images; coolant spec (ASTM/OEM approval) |

---

### BUZ-AUTO-000014 — Bosch Aerotwin Scheibenwischer Set

| Field | Status |
|-------|--------|
| **CURRENT EAN/GTIN** | `4006633001246` |
| **EAN STATUS** | PLACEHOLDER — invalid checksum; generator line 21 |
| **BRAND STATUS** | PRESENT (`Bosch`) — needs PIM brand mapping |
| **IMAGE STATUS** | MISSING — `image_key: wischer` |
| **CATEGORY STATUS** | OK — `cat-05-07` (Wipers) |
| **VALIDATION STATUS** | FAIL — `invalid_ean_checksum` |
| **ACTION REQUIRED** | Real Bosch Aerotwin set GTIN (specific length combo); images; vehicle fitment |

---

### BUZ-AUTO-000015 — Michelin Pilot Sport 4 Reifen 225/45 R17

| Field | Status |
|-------|--------|
| **CURRENT EAN/GTIN** | `4006633001247` |
| **EAN STATUS** | PLACEHOLDER — invalid checksum; generator line 22 |
| **BRAND STATUS** | PRESENT (`Michelin`) — needs PIM brand mapping |
| **IMAGE STATUS** | MISSING — `image_key: tire` |
| **CATEGORY STATUS** | OK — `cat-05-05` (Tyres) |
| **VALIDATION STATUS** | FAIL — `invalid_ean_checksum` |
| **ACTION REQUIRED** | Real Michelin Pilot Sport 4 225/45 R17 GTIN; images; EU tyre label attributes (fuel/wet/noise class) |

---

## Cross-Cutting Quality Gaps (all 13 products)

| Data element | Status | Notes |
|--------------|--------|-------|
| **Title** | OK | Present in P1 JSON + i18n translations |
| **Description** | OK | Short + full description present |
| **Brand (source)** | OK | Real manufacturer names in JSON |
| **Brand (PIM Core)** | MISSING | No `pim_core_brands` entries yet (except Buzzard Demo) |
| **EAN/GTIN** | BLOCKED | All placeholders from catalog generator — **0 legitimate GTINs found** |
| **MPN/OEM/TecDoc** | MISSING | No article numbers in any repo source |
| **Images** | MISSING | All `images: []`; `image_key` hints exist but no asset URLs mapped |
| **Category** | OK | Valid taxonomy IDs (`cat-05-xx`) |
| **Attributes** | MINIMAL | Only `image_key` + `material: OEM-kompatibel` |
| **Vehicle compatibility** | MISSING | Not defined for any of the 13 |
| **Supplier** | MOCK | `SUP-DEMO-001` / `SUP-BUZ-AUTO-*` — not a real supplier feed |
| **Documents** | MISSING | No datasheets/manuals (except test product 000001) |

---

## What would legitimately unblock validation?

Per product, **minimum trustworthy data** before PIM import/publish:

1. **Real EAN/GTIN** from supplier/manufacturer feed (checksum-valid) **OR** documented decision to import without EAN (validation WARNING — import allowed, publish still requires PASS)
2. **Product image URL(s)** — at least one primary image
3. **`pim_core_brands` mapping** for named manufacturer
4. **Optional but recommended:** MPN, TecDoc article ID, vehicle compatibility, hazmat/shipping class where applicable

**Explicitly not acceptable:**

- Inventing sequential `400663300xxxx` replacements
- Reusing demo EANs (`4000000000012`, `5901234123457`)
- Stripping EAN to artificially reach PASS without supplier sign-off
- Weakening validation rules

---

## Note on BUZ-AUTO-000009 (outside this audit scope)

`BUZ-AUTO-000009` uses `4006633001241`, which **passes checksum** but is from the **same generator script** (line 16). It is **not** verified manufacturer data. It currently shows `READY_TO_IMPORT` in dry-run but should receive real BILSTEIN supplier GTIN before publish.

---

## Dry-Run Confirmation (2026-08-30)

Command executed: `npm run pim:import` (dry-run only)

```
PRODUCTS FOUND:          26
PRODUCTS ELIGIBLE:       6
VALIDATION FAILURES:     13  ← these 13 SKUs
DEMO PRODUCTS BLOCKED:   7
PUBLIC PRODUCTS CREATED: 0
```

All 13 audited SKUs remain `VALIDATION_FAILED` with reason `ean: invalid_ean_checksum`.

**Not executed:** `npm run pim:import:live`, `npm run pim:publish`

---

## Recommended Next Steps (post-audit)

1. Connect real supplier catalog feed (TecDoc/mock-xml adapter with real data — not `SUP-DEMO-001`)
2. For each SKU, obtain manufacturer GTIN + MPN from supplier
3. Update `data/buzzard_products.json` **only with verified identifiers**
4. Add product images (CDN URLs or uploaded media)
5. Re-run `npm run pim:import` dry-run until all 13 show `READY_TO_IMPORT`
6. Live import + publish only with explicit authorization

**Sales, Stripe, PayPal, supplier orders, and Go-Live Lock remain unchanged.**
