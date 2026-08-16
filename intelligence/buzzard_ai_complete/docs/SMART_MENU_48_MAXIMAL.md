# BUZZARD SMART MEGA MENU — 48 CATEGORY ENGINE

Smart mega-menu with merchandising signal slots on all 796 subcategories.

## Features

- 48 main / 796 sub / 6,411 sub-sub categories
- Popular category signals per subcategory
- Top brands and product card demo slots (Bestseller / Angebot / Neu)
- 3-level search
- Responsive demo HTML and React component

## CLI

```bash
python3 main.py complete-smart-menu-48-health
python3 main.py complete-smart-menu-48-demo
python3 main.py complete-smart-menu-48-docs
```

## API

- `GET /smart-menu-48/health`
- `GET /smart-menu-48/taxonomy`
- `GET /smart-menu-48/main-categories`
- `GET /smart-menu-48/search?q=...`
- `GET /smart-menu-48/signals/{sub_id}`
- `GET /smart-menu-48/demo`

## Safety

- Merchandising signals are **demo placeholders** until live product/brand feeds are connected
- `live_activation: false`
- `BUZZARD_SALES_ENABLED=0`
