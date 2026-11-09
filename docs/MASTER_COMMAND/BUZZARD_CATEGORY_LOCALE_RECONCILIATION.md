# Kategori ve locale uzlaştırma

Command 2 ayrıntısı: `docs/MASTER_COMMAND/2026-11-05/BUZZARD_CATEGORY_LOCALE_RECONCILIATION.md`

**Zaman:** 5 Kasım 2026, ~07:25 Europe/Berlin  
**Dal:** `cursor/master-command-unified-c293`  
**Production DB yok. PIM birleştirilmedi.**

## Ayrı sayılar

| Kavram | Sayı |
| --- | ---: |
| Onaylı Master Category Tree | 50 |
| Master 49 | Fahrrad & E-Bike (`bz.49`) |
| Master 50 | Erneuerbare Energie (`bz.50`) |
| Shop L1 JSON kayıt | 53 |
| Aktif shop L1 | 50 |
| Hub | 3 |
| Navigable (aktif L1 + hub) | 53 |
| Marketplace mapping satırı | 56 |
| Arşiv master-48 | 48 |

`getMainCategories()` hâlâ ham 53+3 kaydı döner (tarihsel). Nav `getNavigableMainCategories()`.

## Retired (aktif değil)

cat-25 Lebensmittel, cat-46 Getränke, cat-43 Schmuck. Ürün hold boş. Sipariş/finans dokunulmadı.

## 30 dil

Katalog 30/30. URL prefix 30/30. Çeviri fallback `de`. Dil ve ülke ayrı. RTL `ar`.

---

## Command 1 notu (tarihsel)

O turda 53 L1 + 3 hub ve 4 URL prefix raporlanmıştı. Command 2 bu çakışmayı kodla kapattı; ham JSON satırları durur.
