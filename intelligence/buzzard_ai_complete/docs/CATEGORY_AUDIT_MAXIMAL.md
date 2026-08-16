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
python3 main.py complete-category-audit-sync
python3 main.py complete-category-audit-docs
```

## API

- `GET /category-audit/health`
- `GET /category-audit/policy`
- `GET /category-audit/live-categories`
- `GET /category-audit/audit`
- `GET /category-audit/demo`

## Live Input

Full export from `data/buzzard_categories.json` (41 main categories + 1 migration item).

| Action | Count |
|---|---|
| KEEP | 8 |
| RESTRUCTURE | 20 |
| MOVE_CONTENT | 7 (+1 migration) |
| SEPARATE | 1 |
| REVIEW | 5 |

## Safety

- Uses `master_taxonomy_48_maximal` as canonical reference (no duplicate taxonomy copy)
- `complete-category-audit-sync` refreshes live input from storefront catalog
- `live_activation: false`
- `BUZZARD_SALES_ENABLED=0`
