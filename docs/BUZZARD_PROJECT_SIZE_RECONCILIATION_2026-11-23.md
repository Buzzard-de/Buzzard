# Buzzard — eski ve yeni sayımın karşılaştırması

Ölçüm: 23 Kasım 2026. Karşılaştırılan HEAD: `360d8a1367cac19b300fb5d5d9777df4f110e23e`.  
Bu dosya ve yanındaki CSV, sayım bittikten sonra eklendi. Satırlara dahil değildir.  
Kaynak kod, bağımlılık ve audit kayıtları değiştirilmedi. Paket kurulmadı.

Eski rakamların kaynağı depodaki `BUZZARD_DEFINITIVE_CODEBASE_SIZE_AUDIT.md` dosyasıdır. Dosyanın kendi tarihi 19 Kasım 2026, 18:27 Europe/Berlin’dir. Bu karşılaştırma o dosyadaki sayıları değiştirmiyor.

## Yedi cevap

1. **265.827 fiziksel kaynak satırı** commit `9b86c1b70159c32d644f2596f61ae8388ad401ec` içindeki 2.741 programlama dosyasıdır. Eski raporun altı kovası bu committe dosya sayısı ve fiziksel satır olarak yeniden çıktı. Döküm aşağıdaki bölüm 1’dedir.
2. **203.355 Production LOC**, aynı 23 Kasım sayacının `360d8a13` üzerinde üretim saydığı 2.457 dosyanın kod satırıdır. Test, üretilmiş dosya, `exports/` ve `intelligence/archive/` bu sayıda yoktur. Boş satır ve yorum da yoktur.
3. **34.360 satırın 8.795’i kapsam değil, ağaç farkıdır.** 265.827 daha küçük olan `9b86c1b7` ağacının fiziksel kaynağıdır. `360d8a13` üzerinde aynı eski yöntem 274.622 fiziksel satır verir. Ağaç 8.795 fiziksel kaynak satırı büyümüştür.
4. **Aynı HEAD üzerindeki yöntem farkı 43.155 satırdır**, 34.360 değil. Bunun 26.979’u ortak dosyalardaki boş satır ve yeni sayacın yorum satırıdır. 6.678’i üretilmiş dosya, 11.199’u paket kopyasıdır. SQL ve iki `.cmd` dosyası yeni sayaçta olup eski kaynak kümesinde olmadığı için farktan 1.701 düşer. Test sınıflandırması ve JSON bu 43.155’e satır eklemez.
5. **Aynı HEAD `360d8a13`:** eski yöntem 2.809 dosya, 274.622 fiziksel, 246.363 etkin. Yeni yöntem 203.355 üretim kodu + 28.112 test kodu = 231.467 kod satırı.
6. **Karşılaştırılabilir Production LOC, yeni tanımla 203.355’tir.** Eski 238.170 etkin satır testleri, üretilmiş çevirileri ve paket kopyalarını da içerir ve başka bir ağaçtadır. İkisi aynı sorunun cevabı değildir.
7. **25 Temmuz kökünden `360d8a13`’e, yeni yöntemle üretim kodu 636 satırdan 203.355 satıra çıkmıştır. Net büyüme 202.719 kod satırıdır.** Bu, git geçmişindeki ekleme toplamı değildir.

34.360’ın kapanışı:

```text
265.827 − 231.467 = 34.360
43.155 − 8.795   = 34.360
```

43.155, `360d8a13` üzerinde eski fiziksel kaynak eksi yeni üretim+test kodudur. 8.795, `9b86c1b7` ile `360d8a13` arasında eski yöntemin fiziksel kaynak büyümesidir. İkisi ayrı ölçüdür. CSV’deki `difference` sütununun toplamı 43.155’tir.

## Eski rapor olduğu gibi

`BUZZARD_DEFINITIVE_CODEBASE_SIZE_AUDIT.md` şunları yazar. Bu tablo yeniden hesaplanmadı.

| Ölçü | Yayınlanan sayı |
| --- | ---: |
| Toplam depo satırı | 5.751.587 |
| Fiziksel kaynak | 265.827 |
| Etkin kaynak | 238.170 |
| Kaynak dosyası | 2.741 |
| Toplam dosya | 24.240 |
| Git takipli dosya | 4.417 |
| Commit | 745 |
| Backend fiziksel / etkin | 90.725 / 80.912 |
| Frontend fiziksel / etkin | 67.517 / 63.103 |
| Test fiziksel / etkin | 28.166 / 24.752 |

Dosyanın yazdığı HEAD `3df03351626a9147374b0dd3b1fe622d875a1094`, 19 Kasım 2026, 07:47 Europe/Berlin’de işlenmiş commit’tir. Bu committe `git rev-list --count` **745**, `git ls-tree -r` **4.417** yol verir. İkisi de rapordaki git rakamıdır.

Kaynak satırı 265.827 bu committe çıkmaz. Aynı kural `3df03351` üzerinde 2.647 dosya ve 252.158 fiziksel satır verir. Rapor, HEAD’i yazarken çalışma ağacını yürümüştür: o anda 90 değiştirilmiş ve 118 izlenmeyen durum satırı vardır.

22 dakika sonra, 19 Kasım 2026, 18:49 Europe/Berlin’de `9b86c1b7` mesajı “Save the full worktree before the pause” olan commit’tir. Eski kaynak kuralı bu committe şunu verir:

| Kova | Dosya | Fiziksel | Boş | Yazılı kurala göre yorum | Etkin |
| --- | ---: | ---: | ---: | ---: | ---: |
| intelligence | 994 | 51.697 | 6.330 | 262 | 45.105 |
| backend `server/` | 768 | 90.725 | 7.661 | 2.152 | 80.912 |
| frontend | 511 | 67.517 | 4.102 | 268 | 63.147 |
| scripts ve kabuk | 101 | 12.669 | 1.426 | 569 | 10.674 |
| test | 271 | 28.166 | 3.117 | 297 | 24.752 |
| diğer kaynak | 96 | 15.053 | 1.249 | 180 | 13.624 |
| **Toplam** | **2.741** | **265.827** | **23.885** | **3.728** | **238.214** |

Dosya, fiziksel, boş ve backend yorumu yayınlanan tabloyla aynıdır. Frontend yorumu 268 çıktı. Raporda 312 yazar. Fark 44 satırdır.

Bu 44 satır üç CSS dosyasında, `/*` ile açılmış bloğun içinde duran ve satırı `*`, `//` veya `/*` ile başlamayan satırlardır:

| Dosya | Satır |
| --- | ---: |
| `styles/globals.css` | 38 |
| `styles/pusart.css` | 4 |
| `styles/shop.css` | 2 |

Raporun cümlesi yalnız satır başını sayar. Bloğun devamını ayrıca yazmaz. Bu 44 satır bloğun devamı sayılırsa etkin toplam 238.214 − 44 = **238.170** olur ve frontend etkin 63.103 olur. Bu devam kuralı, sonuçtan geri okunmuştur. Yazılı cümlede yoktur. Fiziksel 265.827 ve 2.741 dosya, bu yoruma gerek kalmadan `9b86c1b7` üzerinde çıkar.

5.751.587, 24.240 dosya ve JSON 1.318.880, diskin `node_modules` ve `.next` dahil yürüyüşüdür. Bunlar git commit’inde yoktur. `9b86c1b7` içindeki JSON/veri kovası 314 dosya ve 1.300.833 fiziksel satırdır. Yayınlanan 320 dosya ve 1.318.880 satırdan 6 dosya ve 18.047 satır bu committe yoktur. O altı dosyanın yolu commit’te kayıtlı olmadığı için burada adlandırılmadı.

Raporun kendi dokümantasyon sayısı 854 dosya ve 61.727 fiziksel satırdır. `9b86c1b7` dokümantasyonu 855 dosya ve 61.896 satırdır. Fark, bu sayım raporunun kendisidir: `BUZZARD_DEFINITIVE_CODEBASE_SIZE_AUDIT.md`, 169 satır. Kaynak kümesi bu dosyadan etkilenmez.

## İki yöntemin kuralı

### Yöntem A — eski rapor

Kural, raporun “Sayım kuralı” bölümünden alındı. İlk eşleşen kova kazanır.

1. Yolda `node_modules` varsa bağımlılık.
2. Yolda `.next`, `dist`, `out`, `coverage`, `.turbo`, `.cache`, `playwright-report`, `test-results` varsa build.
3. Kaynak uzantı ve test ise test. Test: yol parçası `__tests__` veya `e2e`, adında `.test.` veya `.spec.`, ya da `test_*.py`. `tests/`, `test/` ve `*_test.py` bu yazıda yoktur. Eklenmedi.
4. Kaynak uzantı `scripts/` altında veya uzantı `.sh .bash .ps1 .zsh` ise scripts. Sonra `intelligence/`, sonra `server/` backend, sonra `app/ components/ styles/ hooks/ lib/` frontend. Kalan kaynak “diğer kaynak”.
5. `.json .jsonl .geojson .csv .tsv` veri. `.md .mdx .rst .adoc` dokümantasyon. `.sql` kaynak değildir.
6. Fiziksel = `splitlines()`. Boş = `strip()` boş. Yorum, satırın tamamı `//`, `/*`, `*` (JS/TS/CSS), `#` (Python ve kabuk) veya `<!--` (HTML) ile başlıyorsa. Satır sonu yorumu ayrılmaz.
7. Etkin = fiziksel − boş − yorum. İlk 1024 baytta NUL varsa satır 0.

Kaynak uzantılar: `.js .mjs .cjs .ts .tsx .jsx .py .css .scss .sass .less .html .htm .vue .svelte .sh .bash .ps1 .zsh`.

### Yöntem B — 23 Kasım raporu

`docs/BUZZARD_PROJECT_SIZE_2026-11-23.md` ile aynı sınıflandırma. `360d8a13` üzerinde yeniden çalıştırıldı ve o rapordaki üretim 203.355, test 28.112, dosya 2.457 ve 308 yeniden çıktı.

Üretim uzantıları: `.py .js .mjs .cjs .jsx .ts .tsx .css .scss .html .vue .sh .ps1 .cmd .sql`.  
Test: `__tests__`, `tests`, `test`, `e2e`, `spec`, `.test.`, `.spec.`, `test_*.py`, `*_test.py`.  
Üretimden çıkanlar: `exports/`, `intelligence/archive/`, `next-env.d.ts`, `*.generated.ts`, `*.generated.js`, `*.min.js`, `*.min.css`, `docs/` altındaki her şey, JSON ve kilit dosyaları.  
Kod satırı, blok yorumunu kapatan `*/` satırına kadar yorum sayar. Eski kural bunu yazmaz.

`.sql` eski kaynak kümesinde değildir. Yeni üretim kümesindedir. `.cmd` yalnız yeni kümededir.

## Aynı HEAD: `360d8a13`

| Ölçüm | Eski yöntem | Yeni yöntem |
| --- | ---: | ---: |
| Fiziksel kaynak kodu | 274.622 | 258.467 (üretim+test dosyalarının fiziksel satırı) |
| Etkin kaynak kodu | 246.363 | 231.467 (üretim+test kod satırı) |
| Üretim LOC | Ayrı yayımlanmış bir kova yok. Test çıkarılmış fiziksel 242.808, etkin 218.261 | 203.355 |
| Test LOC | Fiziksel 31.814, etkin 28.102 | 28.112 |
| Kaynak kodu dosyası | 2.809 | 2.765 (2.457 üretim + 308 test) |
| Toplam metin satırı | 1.766.893 | 1.766.893 |

Toplam metin, bu commit arşivindeki 4.780 normal dosyanın fiziksel satırıdır. Sembolik bağlar izlenmedi. 23 Kasım raporundaki 1.773.186, çalışma ağacında `intelligence/buzzard_ki_gesamt/aktiv/main_py` sembolik bağını da açtığı için `intelligence/main.py` dosyasını ikinci kez saymıştır. O bağın adı `.py` ile bitmez. 6.293 satır “diğer metin”e gitmiştir. Üretim 203.355 değişmez. 1.773.186 − 1.766.893 = 6.293.

Eski yöntemin `360d8a13` kovaları:

| Kova | Dosya | Fiziksel | Etkin |
| --- | ---: | ---: | ---: |
| backend | 795 | 95.498 | 85.379 |
| frontend | 512 | 67.588 | 63.209 |
| intelligence | 994 | 51.697 | 45.105 |
| test | 306 | 31.814 | 28.102 |
| diğer kaynak | 96 | 15.053 | 13.624 |
| scripts | 106 | 12.972 | 10.944 |
| **Toplam** | **2.809** | **274.622** | **246.363** |

## 43.155 satırın dosya payı

Ortak dosya, eski kaynak kümesinde ve yeni üretim veya test kümesinde olan dosyadır. Parçalar birbirini kesmez. Toplam 43.155’tir.

| Farkın kaynağı | Dosya | Satır farkı | Bu satır ne |
| --- | ---: | ---: | --- |
| Boş satırlar | 2.761 ortak | +23.391 | Eski fizikselde var, yeni kod satırında yok |
| Yorum satırları | aynı ortak küme | +3.588 | Yeni sayacın yorum saydığı satırlar |
| Generated dosyalar | 5 | +6.678 | Eski frontend veya diğer kaynak, yeni kümenin dışında |
| Paket kopyaları | 43 | +11.199 | `exports/` ve `intelligence/archive/` kaynağı |
| Yalnız yeni kümede olan SQL ve `.cmd` | 4 | −1.701 | Yeni kodda var, eski kaynakta yok |
| Test sınıflandırması | 2 | 0 | İki kümede de var. Farka ayrıca eklenmez |
| JSON ve veri | 0 | 0 | İki başlıkta da yok |
| **Toplam** | | **43.155** | 23.391 + 3.588 + 6.678 + 11.199 − 1.701 |

Üretilmiş beş dosya, fiziksel satır:

| Dosya | Fiziksel |
| --- | ---: |
| `lib/categories/translations/ar.generated.ts` | 1.666 |
| `lib/categories/translations/de.generated.ts` | 1.666 |
| `lib/categories/translations/en.generated.ts` | 1.666 |
| `lib/categories/translations/tr.generated.ts` | 1.674 |
| `next-env.d.ts` | 6 |

Paket kopyası olan 43 kaynak dosyanın fiziksel satırı:

| Konum | Dosya | Fiziksel |
| --- | ---: | ---: |
| `exports/buzzard24-p1-catalog-platform-2026-08-27` | 26 | 6.093 |
| `exports/buzzard24-tagesbericht-2026-08-28` | 8 | 2.677 |
| `intelligence/archive` | 9 | 2.429 |

Yalnız yeni kümede olanlar:

| Dosya | Yeni kod satırı |
| --- | ---: |
| `data/buzzard_categories.sql` | 1.677 |
| `intelligence/buzzard_ai_complete/master_taxonomy/docs/MIGRATION.sql` | 8 |
| `publish-github.cmd` | 8 |
| `repo/publish-github.cmd` | 8 |

Test adı değişen, iki toplamda da duran dosyalar: `intelligence/buzzard_ai_complete/scripts/smoke_test.py` (14 fiziksel, 10 yeni kod; eski kova intelligence) ve `intelligence/buzzard_ai_gesamt/tests/__init__.py` (0 satır). Eski kural `tests/` dizinini test saymaz. Yeni kural sayar. Satırları ortak kümenin boş ve yorum payındadır.

Ortak 2.761 dosyada eski yorum 3.647, yeni yorum 3.588’dir. Yorum ayracı 59 satırdır. Yeni kod, eski etkinden bu dosyalarda 59 satır büyüktür. 43.155 hesabı yeni kodu kullandığı için yorum payı 3.588’dir, 3.647 değil.

JSON `360d8a13` üzerinde 337 dosya ve 1.357.313 fiziksel satırdır. Ne 274.622’nin ne 231.467’nin içindedir.

## 8.795 satırlık ağaç büyümesi

Eski yöntem, `9b86c1b7` → `360d8a13`. `git diff --numstat -M` ve aynı kova kuralı. Intelligence ve diğer kaynak değişmedi.

| Kova | Değişen dosya | Eklenen | Silinen | Net fiziksel |
| --- | ---: | ---: | ---: | ---: |
| backend | 109 | 5.314 | 541 | +4.773 |
| test | 55 | 3.755 | 107 | +3.648 |
| scripts | 5 | 303 | 0 | +303 |
| frontend | 10 | 82 | 11 | +71 |
| **Toplam** | | | | **+8.795** |

En büyük net artışlar: `server/__tests__/devList51Items.test.mjs` +465, `server/lib/marketplace/phase10Evidence.js` +424, `server/lib/security/phase17Evidence.js` +293, `server/lib/commerce/dryQr.js` +276, `server/lib/pim/phase11Evidence.js` +257, `server/__tests__/phases6to21Gate.test.mjs` +234, `server/lib/buzzardNative/engines/digitalBodySession.js` +230.

Yeni yöntemle aynı aralık: üretim kodu 198.556 → 203.355 (**+4.799**), test kodu 24.762 → 28.112 (**+3.350**). İkisi 8.149’dur. Eski etkin de 238.214 → 246.363, yine **+8.149**. Fiziksel büyümenin 8.795 − 8.149 = 646 satırı bu aralıkta eklenen boş ve yorum satırıdır. Üretilmiş dosyalar ve paket kopyaları bu iki commit arasında değişmedi.

## Üç tarih, aynı iki yöntem

| Ağaç | Eski dosya | Eski fiziksel | Eski etkin | Yeni üretim kodu | Yeni test kodu | Yeni üretim+test |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `d4f8ddc2` 25 Temmuz 2026, 17:11 Europe/Berlin | 6 | 710 | 635 | 636 | 0 | 636 |
| `3df03351` raporun yazdığı HEAD | 2.647 | 252.158 | 226.546 | 193.877 | 17.773 | 211.650 |
| `9b86c1b7` 265.827’nin ağacı | 2.741 | 265.827 | 238.214 | 198.556 | 24.762 | 223.318 |
| `360d8a13` 23 Kasım 2026, 12:21 Europe/Berlin | 2.809 | 274.622 | 246.363 | 203.355 | 28.112 | 231.467 |

Kökteki 6 dosya `index.html`, `products.html`, `datenschutz.html`, `impressum.html`, `scripts.js`, `styles.css` dosyalarıdır. Eski etkin 635, yeni kod 636’dır. Bir satır eski kuralda yorum, yeni kuralda koddur. Bu tek satır kapatılmadı. Adı ayrıca aranmadı.

25 Temmuz’dan `360d8a13`’e net duran kod:

| Yöntem | Kök | `360d8a13` | Net |
| --- | ---: | ---: | ---: |
| Yeni üretim kodu | 636 | 203.355 | +202.719 |
| Yeni test kodu | 0 | 28.112 | +28.112 |
| Eski fiziksel kaynak | 710 | 274.622 | +273.912 |
| Eski etkin kaynak | 635 | 246.363 | +245.728 |

`9b86c1b7` ile `360d8a13` arasında commit sayısı 746’dan 774’e çıkar. Raporun 745’i `3df03351` sayımıdır.

Git geçmişindeki ekleme ve silme toplamı bu net büyüme değildir. 23 Kasım raporunda merge olmayan commit’lerin fiziksel numstat toplamı 1.804.377 ekleme ve 37.294 silmedir. O toplam JSON ve dokümantasyonu da içerir.

## CSV

`docs/BUZZARD_PROJECT_SIZE_FILE_DIFFERENCES_2026-11-23.csv`

`360d8a13` arşivindeki 4.780 dosya. Sütunlar:

- `path`
- `old_included` — eski kaynak kümesinde 1
- `new_included` — yeni üretim veya test kümesinde 1
- `physical`
- `effective_old` — eski etkin
- `effective_new` — yeni kod satırı
- `difference` — eski kümedeyse fiziksel, yeni kümedeyse kod satırı düşülür
- `old_bucket`, `new_bucket`

`difference` toplamı **43.155**’tir. 34.360 değildir. 34.360 başka bir commit’in fiziksel toplamı ile bu commit’in kod toplamının farkıdır.

## Uzlaşmayan tek kalem

Yazılı yorum cümlesi ile yayınlanan 238.170 arasında 44 CSS satırı vardır. Bu satırların yeri bulundu. Cümle, blok devamını yazmaz. Onun dışında 265.827, 2.741, backend 90.725 / 80.912, test 28.166 / 24.752 ve frontend’in dosya, fiziksel ve boş satırı `9b86c1b7` üzerinde yeniden çıktı.

5.751.587 ve 24.240, git ağacından yeniden üretilmedi. Eski rapor bunları `node_modules` ve build çıktısıyla birlikte diske bağlar. Bugünün `node_modules` ağacı o günün diski değildir ve burada o sayıya eşitlenmedi.
