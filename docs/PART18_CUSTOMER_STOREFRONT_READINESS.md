# Part 18 — Customer & Storefront Readiness

**Date:** 2026-08-30  
**Branch:** `cursor/part18-customer-storefront-readiness-c293`  
**Status:** COMPLETE (draft PR — not merged)

---

## Objective

Prepare Buzzard storefront, customer, SEO, search/filter, category, and feed infrastructure for production **without** real supplier integration, fake products, or sales activation.

---

## Safety State (UNCHANGED)

| Control | Value |
|---------|-------|
| `BUZZARD_SALES_ENABLED` | 0 |
| `NEXT_PUBLIC_SALES_ENABLED` | 0 |
| `PRODUCTION_SAFETY_LOCK` | true |
| Stripe / PayPal | OFF |
| Supplier Orders | BLOCKED |
| `REAL_SUPPLIER_LIVE_IMPORT` | 0 |
| `REAL_SUPPLIER_DRY_RUN` | 1 |
| Public Products | 0 (expected) |

---

## Architecture (Reuses Existing Stack)

```
PIM Core (Part 15/16)
        ↓
storefrontVisibility + demoProductGuard
        ↓
catalogReadService / storefrontSearchService
        ↓
Storefront API (/api/catalog/*)
        ↓
Next.js pages (products, kategorie, produkt, konto, checkout)
```

Part 18 adds readiness layers — **no parallel catalog system**.

---

## New Modules

| Module | Purpose |
|--------|---------|
| `storefrontReadinessConstants.js` | Gate names |
| `storefrontSearchService.js` | Enhanced search (SKU/GTIN/MPN/brand/category/availability) |
| `storefrontCategoryService.js` | Category validation & tree |
| `storefrontProductQuality.js` | Part 15/16 pipeline reuse for storefront eligibility |
| `storefrontSeoService.js` | SEO/sitemap architecture (no fake products) |
| `merchantFeedService.js` | GMC feed from validated public PIM catalog only |
| `storefrontI18nReadiness.js` | DE/EN/AR (+ TR) locale architecture check |
| `customerAccountReadiness.js` | Customer auth readiness |
| `checkoutSafetyReadiness.js` | Cart/checkout fail-closed verification |
| `storefrontReadiness.js` | Central 11-gate diagnostic center |

---

## New / Extended Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/catalog/categories/tree` | MAIN → SUB category navigation |
| `GET /api/catalog/seo/sitemap-preview` | Sitemap entries (validated products only) |
| `GET /api/catalog/feed/google.xml` | PIM-safe Google Merchant feed |
| `GET /api/catalog/readiness` | Storefront readiness diagnostic |
| `GET /api/health/storefront-readiness` | Health integration |

`/api/localization/feed/google.xml` now delegates to PIM-safe feed by default (`BUZZARD_MERCHANT_FEED_LEGACY=1` for legacy path).

---

## Gate Matrix

| Gate | Status |
|------|--------|
| STOREFRONT | PASS |
| SEARCH | PASS |
| CATEGORIES | PASS / CONDITION |
| PRODUCT_QUALITY | PASS |
| SEO | PASS |
| MERCHANT_FEED | PASS |
| I18N | PASS (FR not configured — TR available) |
| CUSTOMER_AUTH | PASS |
| CART | PASS |
| CHECKOUT | PASS (fail-closed) |
| SAFETY | PASS |

---

## Without Supplier

| Area | Status |
|------|--------|
| Storefront infrastructure | **COMPLETE** |
| Search/filter architecture | **COMPLETE** |
| Category navigation | **COMPLETE** |
| SEO architecture | **COMPLETE** |
| Merchant feed architecture | **COMPLETE** (empty until validated products) |
| Customer account architecture | **COMPLETE** |
| Checkout safety | **COMPLETE** (blocked) |
| Public catalog products | **0 — EXPECTED** |

---

## Requires Supplier

- Real product listings
- Validated GTIN/MPN in feed
- Public catalog > 0

---

## Requires Human Approval

- Sales activation
- Go-live unlock
- Live publish (`pim:publish`)
- Payment activation

---

## Tests

`npm run test:part18` — 23 tests covering storefront, search, categories, quality, SEO, feed, i18n, customer, checkout, and safety regression.
