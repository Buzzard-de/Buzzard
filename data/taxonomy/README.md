# Buzzard Master Kfz Taxonomy & Intelligence OS

Canonical automotive parts taxonomy for Buzzard.

## Files

| File | Description |
|------|-------------|
| `buzzard_master_kfz_category_tree_v1.html` | Interactive browser UI (2 levels) |
| `buzzard_master_kfz_category_tree_v1.json` | Machine-readable taxonomy V1 |
| `buzzard_master_kfz_intelligence_os.json` | **Intelligence OS** — 43 mains, 454 subs, 412 L3, 8 competitors, coverage matrix |
| `buzzard_master_kfz_intelligence_os.html` | **Intelligence OS Console** — Dashboard, Taxonomie, Wettbewerber-Matrix, Gap-Analyse |
| `kfz_shop_bridge.json` | KFZ id → `cat-05` L2 mapping + L3 + competitor coverage |

## Intelligence OS

- **Taxonomy:** 3 levels (main → sub → product group)
- **Competitors:** AUTODOC, kfzteile24, ATU, ATP, Bandel, Motointegrator, pkwteile, daparto
- **Coverage:** per main category, which competitors are active (research seed)

## Architecture rule

Vehicle make/model/year, HSN/TSN, OEM numbers, TecDoc ID, manufacturer part numbers, viscosity, dimensions, etc. are **not** categories — they belong in the **Product Attribute / Compatibility** layer (vehicle, OEM, TecDoc).

## Relation to Buzzard catalog

- General shop navigation: `data/buzzard_categories.json` (41 mains, `cat-05` = Automotive)
- Deep KFZ parts tree: this folder
- Shop bridge: `kfz_shop_bridge.json`

## Sync bridge

```bash
cd intelligence
python3 main.py complete-sync-kfz-category-tree
```

## URLs

- Shop Automotive: `/kategorie/automotive/`
- KFZ tree index: `/kategorie/automotive/kfz/`
- **Intelligence OS Console (HTML):** `/taxonomy/buzzard_master_kfz_intelligence_os.html`
- API: `/api/kfz-tree`, `/api/kfz-intelligence`
- Intelligence API: `/automotive-taxonomy/kfz-intelligence-os`
