# BUZZARD MAIN COLUMN — 48 CATEGORY ENGINE

Data-driven main column / mega-menu engine for the BUZZARD storefront.

## Assets

- `data/taxonomy.json` — nested browser-ready 48-category taxonomy
- `ui/index.html` — standalone responsive demo
- `ui/BuzzardCategoryMainColumn.jsx` — React/Next.js component

## CLI

```bash
python3 main.py complete-main-column-48-health
python3 main.py complete-main-column-48-demo
python3 main.py complete-main-column-48-docs
```

## API

- `GET /main-column-48/health`
- `GET /main-column-48/taxonomy`
- `GET /main-column-48/main-categories`
- `GET /main-column-48/search?q=...`
- `GET /main-column-48/main/{main_id}`
- `GET /main-column-48/demo`

## Integration

The UI is data-driven. Do not hard-code the 48 categories — replace
`data/taxonomy.json` when the master taxonomy changes.

## Safety

- `live_activation: false`
- `BUZZARD_SALES_ENABLED=0`
