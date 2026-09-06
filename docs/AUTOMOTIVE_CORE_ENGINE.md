# Buzzard Automotive Core Engine

## Overview

One shared **Automotive & Motor Vehicles Core Engine** powers all 12 automotive top-level categories. It extends the existing Buzzard architecture (PIM, validation, search, localization, safety) without replacing or duplicating those systems.

## Architecture

```
Buzzard
 └── Automotive Core Engine (server/core/automotiveCore/)
      ├── categoryEngine      — 12 data-driven categories
      ├── productEngine       — canonical AutomotiveProduct
      ├── identityEngine      — GTIN/EAN/MPN/OEM (wraps PIM)
      ├── vehicleEngine       — unified vehicle model
      ├── fitmentEngine       — confidence-scored fitment
      ├── tireEngine          — tire size parse/normalize/search
      ├── supplierEngine      — mock/dry-run supplier abstraction
      ├── tecdocAdapter       — Mock/DryRun/Real (real disabled)
      ├── oemEngine           — cross-reference (no auto-equivalence)
      ├── priceEngine         — margin calc (blocked when sales OFF)
      ├── stockEngine         — stock model (UNKNOWN = not available)
      ├── orderEngine         — order abstraction (LIVE blocked)
      ├── aiMatchingEngine    — recommendations only
      ├── ingestionPipeline   — supplier → staging → review
      ├── searchBridge        — extends searchIntelligence
      └── health / auditLog / safetyPolicy
```

## 12 Top-Level Categories

| ID | DE | TR |
|----|----|----|
| `tires_wheels` | Reifen & Felgen | Lastik & Jant |
| `brakes` | Bremsen | Fren Sistemi |
| `oils_fluids` | Motoröle & Flüssigkeiten | Motor Yağları & Sıvılar |
| `engine_parts` | Motor & Motor Teile | Motor & Motor Parçaları |
| `spare_parts` | Ersatzteile | Yedek Parça |
| `batteries_electrical` | Batterie & Elektrik | Akü & Elektrik |
| `agricultural_vehicles` | Traktor & Landwirtschaft | Traktör & Tarım Araçları |
| `trucks_commercial` | LKW & Nutzfahrzeuge | Kamyon & Ticari Araçlar |
| `buses_minibuses` | Bus & Minibus | Otobüs & Minibüs |
| `construction_machinery` | Baumaschinen | İş Makineleri |
| `motorcycles_scooters` | Motorrad & Roller | Motosiklet & Scooter |
| `trailers` | Anhänger & Trailer | Römork & Treyler |

Data file: `data/automotive/automotive_core_12_categories.json`  
Stats: **12** top-level · **125** subcategories · **500** product types

## Legacy Integration

- Existing **305-node / 15-subcategory** taxonomy (`automotive_category_tree.json`) is **preserved**
- Core categories map to legacy IDs via `legacyCategoryId`
- Product pipeline: `automotiveProductPipeline.js` + `ingestionPipeline.js`
- Search: **single engine** — `searchIntelligence.js` + `vehicleSearchIntelligence.js` + `searchBridge.js`

## Workflow

```
DRAFT → REVIEW → APPROVED → PUBLISHED
```

**APPROVED ≠ PUBLISHED.** Publish requires `manualPublish=true`, explicit admin permission, and safety gates (all OFF by default).

## API Endpoints

| Route | Purpose |
|-------|---------|
| `GET /api/automotive/core/manifest` | Engine manifest |
| `GET /api/automotive/core/categories` | 12-category tree |
| `GET /api/automotive/core/products` | Paginated catalog |
| `GET /api/automotive/core/search` | Search + structured intent |
| `GET /api/automotive/core/vehicles` | TecDoc mock/dry-run vehicles |
| `GET /api/automotive/core/fitment` | Fitment explanation |
| `GET /api/automotive/core/suppliers` | Supplier status |
| `GET /api/admin/automotive/health` | Health metrics |
| `POST /api/admin/automotive/products/:sku/validate` | Full validation |
| `POST /api/admin/automotive/products/:sku/approve` | Human approval |
| `POST /api/admin/automotive/products/:sku/publish` | **BLOCKED** |

## Safety (unchanged)

```
BUZZARD_SALES_ENABLED=0
REAL_SUPPLIER_LIVE_IMPORT=0
TECDOC_ENABLED=0
ORDER_LIVE_ENABLED=0
AUTOMOTIVE_PUBLISH_ENABLED=0
status=BLOCKED, publishBlocked=true
```

## Tests

```bash
npm run test:automotive-core
npm run test:automotive-core-integration
npm run test:automotive          # legacy 35 tests — still pass
```

## Future Integration

- **TecDoc**: set `TECDOC_ENABLED=1` + credentials + human approval (Real adapter remains fail-closed until all gates pass)
- **Supplier API/XML**: dry-run first via `supplierEngine`
- **Orders**: `orderEngine` ready but `ORDER_LIVE_ENABLED=0`
