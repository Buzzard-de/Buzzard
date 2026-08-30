# Part 16 — Category Mapping Example (TEST ONLY)

**Status:** Documentation only — no production supplier data.

This file shows how supplier categories map to Buzzard taxonomy. Unknown categories **BLOCK** import.

## Example mapping (TEST ONLY supplier)

| Supplier code | Supplier category | Buzzard category ID | Buzzard label |
|---------------|-------------------|---------------------|---------------|
| `TEST-SUPPLIER-MAP` | `automotive/brakes/disc` | `cat-01` | Automotive / Brakes |
| `TEST-SUPPLIER-MAP` | `automotive/filters/oil` | `cat-02` | Automotive / Filters |
| `TEST-SUPPLIER-MAP` | `automotive/engine/oil` | `cat-03` | Automotive / Engine |

## JSON format (`data/buzzard_supplier_category_mappings.json`)

```json
{
  "mappings": [
    {
      "supplier_id": "TEST-SUPPLIER-MAP",
      "supplier_category": "automotive/brakes/disc",
      "buzzard_category_id": "cat-01",
      "notes": "TEST ONLY — not a real supplier"
    }
  ]
}
```

## Rules

1. **Unknown category → BLOCKED** (`CATEGORY_UNMAPPED`)
2. No silent fallback to random taxonomy nodes
3. `SUP-DEMO-001` categories are **TEST ONLY** — never production
4. Real supplier mappings require human approval before live import

## Validation module

`server/lib/pim/categoryMappingValidator.js` — used by `productValidationPipeline.js`
