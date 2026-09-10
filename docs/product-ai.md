# Buzzard Product AI Foundation

## Overview

Product AI is the first production-oriented AI worker foundation in Buzzard. It sits on top of the Product Engine/PIM and executes through the AI Task Orchestrator (#320) and AI Worker Execution Layer (#321).

```
Supplier → Supplier Integration Engine → PIM → Product Engine
                                                    ↓
                                              PRODUCT_AI
                                                    ↓
                                    Analysis / Recommendation
                                                    ↓
                                    Deterministic Product Validation
                                                    ↓
                                    ALLOW / REJECT / REVIEW
                                                    ↓
                                    Product Engine / PIM (source of truth)
```

**Critical principle:** Product Engine/PIM remains authoritative. Product AI recommends and analyzes — it never silently mutates canonical product data.

## Module: `lib/ai-workers/product/`

| File | Purpose |
|------|---------|
| `types.ts` | Input/output contracts, classifications |
| `constants.ts` | Thresholds, category IDs, marketplace channels |
| `productInput.ts` | Build input from Product Engine |
| `productContext.ts` | Context security, customer-safe filtering |
| `productQuality.ts` | Quality issues and deterministic scoring |
| `productCategory.ts` | Category recommendations |
| `productAttributes.ts` | Attribute recommendations (OBSERVED/UNKNOWN) |
| `productTranslation.ts` | Translation recommendations and validation |
| `productDuplicate.ts` | Duplicate detection signals |
| `productAnomaly.ts` | Anomaly detection |
| `productCompliance.ts` | Compliance-data completeness |
| `productMarket.ts` | Market and marketplace readiness |
| `productActions.ts` | Proposed action model |
| `productOutput.ts` | Output schema validation |
| `productValidation.ts` | Policy + Product Engine validation |
| `productAiWorker.ts` | Worker execution entry point |
| `fixtures.ts` | 12 deterministic test scenarios |

## Worker Integration

- **Worker ID:** `PRODUCT_AI`
- **Task types:** `PRODUCT_ANALYSIS`, `PRODUCT_TRANSLATION`
- **Provider:** `MOCK_PROVIDER` (foundation only — no real LLM)
- **Execution path:** Orchestrator → Worker Execution Layer → `executeProductAiWorker()`

## Input Contract

Product AI consumes canonical Product Engine data via `buildProductAiInput()`:

- `productId`, `supplierId`, `market`, `channel`, `language`
- `title`, `description`, `brand`, `manufacturer`, `mpn`, `ean`, `gtin`
- `category`, `attributes`, `imagesMetadata`, `dimensions`, `weight`
- `compatibility`, `existingTranslations`, `marketAvailability`, `stockStatus`

Only fields available in the canonical model are used. No invented product information.

## Output Contract

Structured `ProductAiResult` containing:

- Quality issues and scores (0–100, deterministic)
- Category, attribute, content, translation recommendations
- Duplicate signals, anomalies
- Market readiness, marketplace readiness
- Compliance-data status
- Proposed actions, human review request
- Provenance and fact/recommendation classification

## Quality Scoring

Deterministic scores (no hidden model reasoning):

| Score | Weight |
|-------|--------|
| `qualityScore` | Composite |
| `completenessScore` | Required fields filled |
| `contentScore` | Title/description quality |
| `attributeScore` | Category-critical attributes |
| `translationScore` | Translation coverage |
| `marketReadinessScore` | Market field readiness |
| `complianceDataScore` | Compliance field population |

## Category Recommendations

- References existing Buzzard category IDs (`cat-05-*`)
- Returns `primaryCategory`, `categoryConfidence`, `categoryReasons`
- Below confidence threshold (0.75) → `REVIEW_REQUIRED`
- Never auto-assigns canonical category

## Attribute Recommendations

Each attribute classified as:

- `OBSERVED` — from PIM/Product Engine
- `DERIVED` — computed from existing data
- `RECOMMENDED` — AI suggestion
- `UNKNOWN` — missing, never presented as fact

## Translation

- Uses Market Engine language configuration (not a separate locale registry)
- Product-content translations only (separate from UI i18n catalogs)
- Preserves EAN, GTIN, MPN, OEM numbers — never translated
- Validates placeholders, unsupported claims, identifier integrity

## Duplicate Detection

Recommendation-only via Product Engine `findDuplicateProduct()`:

- EAN/GTIN exact match, MPN+manufacturer, title similarity
- Returns `duplicateCandidate`, `matchType`, `confidence`, `matchedProductId`
- Never auto-merges products

## Anomaly Detection

Deterministic signals: conflicting dimensions, negative values, duplicate identifiers, inconsistent category, language mismatch, conflicting supplier data.

## Market Readiness

Uses Market Engine configuration. Returns `READY`, `NEEDS_REVIEW`, or `NOT_READY` based on required fields, translations, and quality scores.

## Marketplace Readiness

Analyzes channels: AMAZON, EBAY, KAUFLAND, ALLEGRO, BOL, CDISCOUNT, OTTO via Marketplace Engine registry. Returns missing-data signals only — no direct publishing.

## Automotive Support

Category-aware validation for tires, engine oil, brake components. Compatibility missing → `UNKNOWN` / `NEEDS_DATA`. Never invents vehicle fitment.

## Compliance Data

Data-completeness foundation only — not legal advice. Returns `DATA_COMPLETE`, `DATA_INCOMPLETE`, or `REVIEW_REQUIRED`. Never claims legal compliance.

## Provenance

Every recommendation includes `sourceType`, `sourceId`, `sourceTimestamp`, `sourceField`.

## Fact vs Recommendation

Values classified as `FACT`, `AI_RECOMMENDATION`, `DERIVED_VALUE`, or `UNKNOWN`. AI recommendations never silently become facts.

## Human Review

Uses existing Orchestrator approval when priority is HIGH or policy decision is REVIEW. Triggers: low-confidence category, duplicates, anomalies, unsupported claims, automotive fitment uncertainty.

## Security

- Secrets never enter AI context (recursive metadata scan)
- Financial/supplier cost excluded from default context
- Customer-safe output strips internal scores, duplicate internals, compliance analysis
- Deterministic validation blocks canonical mutation, invented compatibility, identifier modification

## Validation Pipeline

```
AI recommendation → schema validation → Product AI policy → Product Engine validation → ALLOW/REJECT/REVIEW
```

## Testing

```bash
npm run test:product-ai
```

56 tests covering worker contract, 12 fixtures, 18 security tests, orchestrator integration.

## Future Real AI Integration

Replace mock analysis functions with provider calls while preserving:

- Input/output contracts
- Deterministic validation pipeline
- Fact/recommendation distinction
- Product Engine as source of truth
