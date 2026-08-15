# BUZZARD PIM / Product Master MAXIMAL

Single source of truth for product identity: canonical category (`bz.*`), technical attributes, multilingual content, variants, media, and quality workflow.

## Pipeline

Supplier flow: CSV/XML/JSON/API → snapshot → normalize → deduplicate → category/attribute mapping → quality gate → review → publish.

Operational stock, orders, payment and finance remain in the commerce/ERP layer.

## Modules

- Product Master (SQLite schema)
- Variants, Attributes, Localization, Media
- Supplier Import + Deduplication
- Quality Gate (`bz.*` canonical categories required)
- API: `/pim/health`, `/pim/schema`, `/pim/import/process`, `/pim/validate`, `/pim/demo`

## CLI

```bash
cd intelligence
python3 main.py complete-pim-demo
python3 main.py complete-pim-health
python3 main.py complete-pim-schema
python3 main.py complete-pim-docs
```

## Taxonomy

Uses PIM taxonomy reference (`43 / 516 / 5160` nodes) aligned with canonical `bz.*` IDs.

Import template: `pim_product_master/data/product_import_template.csv`
