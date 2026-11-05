# Kategori ve locale uzlaştırma — kayıpsız rapor

**Otomatik birleştirme yapılmadı.** Onaylı “50 master” ile repo **çakışıyor**.

## Sayımlar (dal 4.4 tabanı)

| Kaynak | Sayı | Not |
| --- | ---: | --- |
| `data/buzzard_categories.json` | **53** L1 | `cat-01`…`cat-53` |
| Hub eklentisi | **+3** | `cat-54`…`cat-56` → servis **56** |
| `buzzard_master_48_main_categories_*.json` | **48** | eski anlık |
| Intelligence OS JSON | **47** | eski |
| KFZ ağacı | **43** | yalnızca KFZ |

## Kullanıcı onayı vs repo

İstenen: 50 (bisiklet 49, yenilenebilir 50; gıda ve takı kaldırılmış).

Repoda:
- `cat-49` = Bücher, Medien  
- `cat-50` = Geschenke  
- `cat-25` Lebensmittel **duruyor**  
- `cat-43` Schmuck & Uhren **duruyor**  
- Bisiklet / yenilenebilir 50. sıra değil  

**Sessiz silme/yeniden adlandırma yapılmadı.** Ürün bağları korunur. Değişiklik ayrı onay ister.

## 30 dil

- Katalog: **30** dosya `lib/i18n/locales`.  
- URL öneki: **4** (`de|en|tr|ar`).  
- Kategori çevirisi: **4** generated.  

Eksik: 26 locale için kategori metinleri fallback. `toLocaleUpperCase("tr-TR")` korunmalı (mevcut testler).

## Test önerisi (çalıştırılan)

`lib/categories/i18n.test.ts` 56 L1+hub bekler — 50’ye çekmek bu testi kırar. Önce onay.
