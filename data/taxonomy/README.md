# Buzzard Master Kfz Category Tree V1

Canonical automotive parts taxonomy for Buzzard — **43 main categories**, **454 subcategories**.

## Files

| File | Description |
|------|-------------|
| `buzzard_master_kfz_category_tree_v1.html` | Interactive browser UI (search, expand, JSON export) |
| `buzzard_master_kfz_category_tree_v1.json` | Machine-readable taxonomy |

## Architecture rule

Vehicle make/model/year, HSN/TSN, OEM numbers, TecDoc ID, manufacturer part numbers, viscosity, dimensions, etc. are **not** categories — they belong in the **Product Attribute / Compatibility** layer (vehicle, OEM, TecDoc).

## Relation to Buzzard catalog

- General shop navigation: `data/buzzard_categories.json` (41 mains, `cat-05` = Automotive)
- Deep KFZ parts tree: this folder (43 KFZ-specific mains)
- Shop bridge: `kfz_shop_bridge.json` (KFZ id → `cat-05` L2 mapping)

## Sync bridge

```bash
cd intelligence
python3 main.py complete-sync-kfz-category-tree
```

## URLs

- Shop Automotive: `/kategorie/automotive/`
- KFZ tree index: `/kategorie/automotive/kfz/`
- API: `/api/kfz-tree`
- Intelligence API: `/automotive-taxonomy/kfz-tree`
