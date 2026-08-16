# BUZZARD CATEGORY AUDIT MAXIMAL

Safe comparison engine for live Buzzard24 categories against the 48-category Master Taxonomy.

## Actions

- `KEEP` — exact canonical master match
- `MOVE_CONTENT` — move content to dedicated ecosystem (e.g. tires)
- `RESTRUCTURE` — remap to canonical agriculture/construction ecosystems
- `SEPARATE` — approved standalone main category
- `REVIEW` — requires human/category-AI review

**DELETE is intentionally disabled.**

## CLI

```bash
python3 main.py complete-category-audit-health
python3 main.py complete-category-audit-demo
python3 main.py complete-category-audit-report
python3 main.py complete-category-audit-docs
```

## API

- `GET /category-audit/health`
- `GET /category-audit/policy`
- `GET /category-audit/live-categories`
- `GET /category-audit/audit`
- `GET /category-audit/demo`

## Safety

- Uses `master_taxonomy_48_maximal` as canonical reference (no duplicate taxonomy copy)
- Partial live input until full 41-category export is provided
- `live_activation: false`
- `BUZZARD_SALES_ENABLED=0`
