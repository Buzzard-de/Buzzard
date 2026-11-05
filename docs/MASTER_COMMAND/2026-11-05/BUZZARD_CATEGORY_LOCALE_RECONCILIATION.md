# Kategori / locale — Command 2

**Zaman:** 5 Kasım 2026, Europe/Berlin  
**Dal:** `cursor/master-command-unified-c293`

## Ayrı sayılar (karıştırma)

| Kavram | Sayı | Kaynak |
| --- | ---: | --- |
| Onaylı Master Category Tree | **50** | `buzzard_master_50_main_categories.json` |
| 49 | Fahrrad & E-Bike | `bz.49` |
| 50 | Erneuerbare Energie | `bz.50` |
| Shop L1 (JSON kayıt) | **53** | `data/buzzard_categories.json` |
| Aktif shop L1 (nav) | **50** | 53 − cat-25 − cat-46 − cat-43 |
| Hub | **3** | cat-54…56 |
| Navigable L1+hub | **53** | aktif shop + hub |
| Marketplace mapping satırı | **56** | `master_shop_l1_mapping.json` (tarihsel satırlar durur) |
| Eski master-48 dosyası | 48 | arşiv; aktif kaynak değil |

## Silinen aktif kategoriler

| Shop | Ad | Master | Ürün |
| --- | --- | --- | --- |
| cat-25 | Lebensmittel & Supermarkt | bz.25 | hold boş — katalog SKU yok |
| cat-46 | Getränke | bz.26 | hold boş |
| cat-43 | Schmuck & Uhren | bz.20 | hold boş |

JSON satırları tarihsel lookup için durur. Nav, sitemap, arama filtresi, featured kartlar temiz. Production DB yok.

## Locale

30 katalog kodu: de en tr ar fr nl bg hr el cs da et fi hu it lv lt lb mt pl pt ro sk sl es ca eu gl sv ga.

URL prefix 30/30. Fallback de. Dil ≠ ülke (ayrı storage). RTL: ar. Statik export: `/de/` … `/ga/` landing. Middleware yok (`output: export`).
