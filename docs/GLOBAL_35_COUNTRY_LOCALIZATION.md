# Global 35-Country Localization + Product Intelligence

Architecture foundation for 35-country catalog localization, multilingual product discovery, and PIM integration — **diagnostic only, no activation**.

## Safety contract

```json
{
  "ready": false,
  "status": "BLOCKED",
  "diagnosticOnly": true,
  "autoActivate": false,
  "activationAllowed": false,
  "supplierLive": false,
  "salesEnabled": false,
  "humanApprovalRequired": true
}
```

- Sales: OFF (`BUZZARD_SALES_ENABLED=0`)
- Payments: OFF
- Supplier live import: OFF (`REAL_SUPPLIER_LIVE_IMPORT=0`)
- Supplier dry-run: ON (`REAL_SUPPLIER_DRY_RUN=1`)
- Product publish: OFF (manual only)
- Go-live: BLOCKED

## Architecture

```
Country → Country Detection → Language Detection → Manual Override
  → Currency/Locale → Country Catalog Rules → Category → Product Search
  → Product Identity → GTIN/EAN/MPN → Automotive Fitment → Supplier Mapping
  → Image Validation → Translation → SEO → Country Availability
  → Product Validation → Admin Review → APPROVED → MANUAL PUBLISH
```

**APPROVED ≠ PUBLISHED** — never automatic.

## Core registries

| Module | Path |
|--------|------|
| 35-country registry | `server/core/globalCountryRegistry.js` |
| Language registry | `server/core/globalLanguageRegistry.js` |
| Currency registry | `server/core/globalCurrencyRegistry.js` |
| Safety policy | `server/core/globalSafetyPolicy.js` |
| Country data | `data/global/global_countries_35.json` |

### Countries (35)

DE, FR, IT, ES, NL, BE, AT, CH, LU, PL, CZ, SK, HU, RO, BG, HR, SI, DK, SE, NO, FI, EE, LV, LT, PT, GR, IE, GB, TR, US, CA, AU, NZ, AE, SA

### UI languages (preserved)

`de`, `en`, `tr`, `ar` — Arabic RTL preserved

### Prepared languages (architecture only)

`fr`, `it`, `es`, `nl`, `pl`, `cs`, `sk`, `hu`, `ro`, `bg`, `hr`, `sl`, `da`, `sv`, `no`, `fi`, `et`, `lv`, `lt`, `pt`, `el`

## Language resolution priority

1. Explicit user selection
2. Saved user preference (manual override flag)
3. Country default language
4. Browser Accept-Language
5. Country detection fallback
6. Global default (`de`)

Manual language selection is never overwritten by country changes.

## Key modules

| Area | Path |
|------|------|
| Locale resolution | `server/lib/global/localeResolution.js` |
| Country detection | `server/lib/global/countryDetection.js` |
| Product identity | `server/lib/global/productIdentity.js` |
| Translation validation | `server/lib/global/translationValidation.js` |
| Country availability | `server/lib/global/countryAvailability.js` |
| Search intelligence | `server/lib/global/searchIntelligence.js` |
| Synonym engine | `server/lib/global/synonymEngine.js` |
| Global product pipeline | `server/lib/global/globalProductPipeline.js` |
| SEO localization | `server/lib/global/seoLocalization.js` |
| hreflang | `server/lib/global/hreflang.js` |
| Global catalog health | `server/lib/global/globalCatalogHealth.js` |
| Country matrix | `server/lib/global/countryCatalogMatrix.js` |

## API endpoints

| Method | Path |
|--------|------|
| GET | `/api/config/countries` |
| GET | `/api/config/languages` |
| GET | `/api/config/locales` |
| GET | `/api/catalog/context` |
| GET | `/api/global/search` |
| GET | `/api/admin/pim-core/global-catalog-health` |
| GET | `/api/admin/pim-core/country-matrix` |
| POST | `/api/admin/global/products/validate` |

## Frontend

- `lib/global/context.tsx` — `GlobalLocaleProvider` / `useGlobalLocale()`
- Extended `LanguageSelector` — native names, RTL indicator, prepared languages
- Extended `CountrySelector` — 35-country registry
- Admin dashboard: `/admin/global-catalog`

## PIM + Automotive integration

`globalProductPipeline.js` integrates with existing modules when present:

- PIM validation pipeline (`productValidationPipeline.js`)
- Automotive PIM bridge (`automotivePimBridge.js`)
- Category resolver, GTIN/EAN/MPN, translation validation

### Integration dependency

This branch is based on **PR #300** (PIM #297 + Automotive #299 reconciliation). Merge PR #300 before or together with this PR for full integration.

## Data model principle

**One canonical product** with:

- `translations` (per language)
- `countryAvailability` (per country)
- Stable identity (`productId`, GTIN, EAN, MPN)
- Localized SEO, slugs, image alt text

Not: 35 copies × 20 languages.

## Testing

```bash
npm run test:global-localization   # 160 tests
npm run test:pim-catalog           # requires PR #300 base
npm run test:automotive            # requires PR #300 base
npm run test:part28 … test:part35
npm run typecheck && npm run lint && npm run build
```

## Admin health

`GET /api/admin/pim-core/global-catalog-health` reports:

- 35 countries configured
- Languages/currencies supported
- Product/review counts
- Country matrix (all BLOCKED until human approval)
- Safety compliance
