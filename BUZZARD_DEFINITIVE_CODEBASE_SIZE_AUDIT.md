# Buzzard — kesin kod tabanı sayımı

**Ölçüm:** 19.11.2026, 18:27 Avrupa/Berlin (17:27 UTC)  
**Kapsam:** Çalışma ağacı diski. `.git` yürünmedi.  
**HEAD:** `3df03351626a9147374b0dd3b1fe622d875a1094`  
**Kimlik:** Her dosya tek kategori. Her kategoride `fiziksel = boş + yorum + etkin`.

---

## Cevaplar

| Soru | Sayı | Kapsam |
|------|-----:|--------|
| **BUZZARD'IN TOPLAM DEPO SATIRI** | **5.751.587** | Fiziksel satır. `node_modules` ve `.next` dahil. `.git` hariç. |
| **BUZZARD'IN TOPLAM KAYNAK KOD SATIRI** | **265.827** | Fiziksel. Programlama uzantıları. `intelligence/` ve testler dahil. JSON ve Markdown değil. |
| **BUZZARD'IN ETKİN KAYNAK KOD SATIRI** | **238.170** | Aynı kaynak küme. Boş ve yorum-sezgiseli satırlar çıkarılmış. |
| **BUZZARD'IN TOPLAM DOSYA SAYISI** | **24.240** | Disk, `.git` hariç. Bunun **19.344**’ü bağımlılık, **323**’ü build çıktısı. |
| **BUZZARD'IN KAYNAK KOD DOSYA SAYISI** | **2.741** | Aşağıdaki altı kaynak kovası. |

Proje ağacı (bağımlılık ve build çıktısı çıkarılınca): **4.573 dosya**, **1.696.185 fiziksel satır**. Bunun **1.318.880** satırı JSON/veridir. Kaynak kod bu 1,7 milyonun içinde **265.827** satırdır.

Git’in izlediği dosya sayısı ayrıdır: **4.417**. Bu, diskteki 24.240’ın alt kümesidir.

---

## Sayım kuralı

Yürüyüş `os.walk`. İlk eşleşen kural kazanır.

1. Yolda `node_modules` varsa → bağımlılık.  
2. Yolda `.next`, `dist`, `out`, `coverage`, `.turbo`, `.cache`, `playwright-report`, `test-results` varsa → build.  
3. Uzantı kaynak ve dosya test ise → test. Test: `__tests__`, `e2e`, adında `.test.` / `.spec.`, ya da `test_*.py`.  
4. Kaynak uzantı: `scripts/` veya `.sh .bash .ps1 .zsh` → scripts. Sonra `intelligence/` → intelligence. `server/` → backend. `app/`, `components/`, `styles/`, `hooks/`, `lib/` → frontend. Kalan → diğer kaynak.  
5. `.json .jsonl .geojson .csv .tsv` → JSON/veri.  
6. `.md .mdx .rst .adoc` → dokümantasyon.  
7. `.sql .db .sqlite .sqlite3` → SQL.  
8. `.log` → log. `artifacts/` altındaki loglar buradadır, build’de değil.  
9. YAML, TOML, INI, Dockerfile, Makefile, `.gitignore`, `.lock` (JSON olmayan) → yapılandırma.  
10. Kalan → diğer.

Kaynak uzantılar: `.js .mjs .cjs .ts .tsx .jsx .py .java .go .rs .php .css .scss .sass .less .html .htm .vue .svelte .sh .bash .ps1 .zsh`.  
Bu depoda `.java .go .rs .php .vue .svelte` dosyası **yok** (uzantı sayacı sıfır).

Satır: `splitlines()`. Boş = `strip()` boş.  
Yorum-sezgiseli: JS/TS/CSS satırı `//`, `/*`, `*` ile başlıyorsa; Python ve shell `#` ile; HTML `<!--` ile; SQL `--` veya `/*`. Satır içi yorum ayrılmaz. JSON, CSV ve log için yorum sayısı **0**.  
Etkin = fiziksel − boş − yorum.  
İkili dosya (ilk 1024 baytta NUL): dosya sayılır, satır **0**. Toplam ikili: **370**. `server/data/buzzard.db` bu yüzden SQL dosyasıdır ve satıra girmez.

Kontrol: 14 kategorinin fiziksel toplamı **5.751.587**. Boş 213.142 + yorum 412.728 + etkin 5.125.717 = **5.751.587**.

---

## 1. Depo envanteri

| Kategori | Dosya | Fiziksel | Boş | Yorum | Etkin |
|----------|------:|---------:|----:|------:|------:|
| Kaynak: intelligence | 994 | 51.697 | 6.330 | 262 | 45.105 |
| Kaynak: backend | 768 | 90.725 | 7.661 | 2.152 | 80.912 |
| Kaynak: frontend | 511 | 67.517 | 4.102 | 312 | 63.103 |
| Kaynak: scripts | 101 | 12.669 | 1.426 | 569 | 10.674 |
| Kaynak: test | 271 | 28.166 | 3.117 | 297 | 24.752 |
| Kaynak: diğer | 96 | 15.053 | 1.249 | 180 | 13.624 |
| JSON ve veri | 320 | 1.318.880 | 0 | 0 | 1.318.880 |
| Markdown ve dokümantasyon | 854 | 61.727 | 13.374 | 88 | 48.265 |
| Yapılandırma | 33 | 1.534 | 108 | 13 | 1.413 |
| SQL | 3 | 1.703 | 4 | 14 | 1.685 |
| Log | 53 | 17.845 | 150 | 0 | 17.695 |
| Build / generated | 323 | 106.468 | 26.250 | 54.444 | 25.774 |
| Bağımlılıklar | 19.344 | 3.948.934 | 148.476 | 354.397 | 3.446.061 |
| Diğer | 569 | 28.669 | 895 | 0 | 27.774 |
| **Toplam** | **24.240** | **5.751.587** | **213.142** | **412.728** | **5.125.717** |

Git durumu (bu rapordan önce): izlenen **4.417**, değiştirilmiş **90**, silinmiş **0**, izlenmeyen durum satırı **118**. Değiştirilmiş dosyaların satırları yukarıdaki çalışma ağacı sayılarının içindedir. Üzerine eklenmez.

`intelligence/` altındaki JSON kaynak kovasında değildir: **145 dosya, 317.885 fiziksel satır**, JSON satırının içindedir.

---

## 2. Kaynak kod

Altı kova birbirini kesmez.

| Kova | Dosya | Fiziksel | Boş | Yorum | Etkin |
|------|------:|---------:|----:|------:|------:|
| A parçası: intelligence | 994 | 51.697 | 6.330 | 262 | 45.105 |
| C backend `server/` | 768 | 90.725 | 7.661 | 2.152 | 80.912 |
| D frontend `app/ components/ styles/ hooks/ lib/` | 511 | 67.517 | 4.102 | 312 | 63.103 |
| E scripts ve shell | 101 | 12.669 | 1.426 | 569 | 10.674 |
| F test | 271 | 28.166 | 3.117 | 297 | 24.752 |
| G diğer kaynak (`public/` ve kök) | 96 | 15.053 | 1.249 | 180 | 13.624 |
| **A = C+D+E+F+G+intelligence** | **2.741** | **265.827** | **23.885** | **3.772** | **238.170** |
| **B = A − intelligence** | **1.747** | **214.130** | **17.555** | **3.510** | **193.065** |

Uzantı dağılımı (bu 2.741 dosya): `.py` 1.053, `.js` 800, `.ts` 301, `.mjs` 257, `.tsx` 244, `.html` 36, `.css` 10, `.sh` 7, `.ps1` 4, `.cjs` 3, `.jsx` 2.

Backend etkin **80.912**, aynı gün 15:52’de yazılmış `BUZZARD_SOURCE_CODE_STATISTICS.md` içindeki backend etkin satırla aynıdır. O raporun “uygulama etkin 169.831” sayısı bu tablodaki **238.170** değildir: o sayı `intelligence/` arşivini ve bir kısım kök kaynağı dışarıda bırakır, testleri ayrı tutar, `e2e` satırını frontend’e katar. Bu turda `e2e` test kovasıdır.

---

## 3. 241.000 satır

Depoda “241.000 kaynak satır” diye bir ölçüm cümlesi **yok**. `BUZZARD_*.md` içinde bu rakam arandı. Geçen eşleşmeler bir SHA ve PR numarasıdır, satır sayısı değildir.

Bu yüzden 241.000’in hangi dosyaları içerdiği **UNKNOWN**. Aynı tanım yeniden üretilemedi.

Aynı yöntemle bugün çıkan yakın sayılar:

| Dilim | Fiziksel | 241.000’den fark |
|-------|----------:|------------------:|
| Çalışma ağacı kaynak, test dahil | 265.827 | +24.827 |
| Çalışma ağacı kaynak, test hariç | 237.661 | −3.339 |
| HEAD blob kaynak, bu uzantı kümesi, test dahil | 252.322 | +11.322 |
| HEAD blob kaynak, test hariç | 232.116 | −8.884 |
| Çalışma ağacı kaynak, intelligence hariç | 214.130 | −26.870 |

HEAD sayımı bu turda `git cat-file HEAD:path` ile yapıldı. İzlenen kaynak yol: **2.648**. Çalışma ağacı **2.741**. Fark, commit edilmemiş kaynak dosyalardır. HEAD backend etkin **76.416**, çalışma ağacı **80.912**. Aradaki **4.496** etkin satır commit’te yoktur.

`BUZZARD_SOURCE_CODE_STATISTICS.md` (15:52 Avrupa/Berlin) şunları yazar: uygulama etkin **169.831**, `intelligence/` için yaklaşık **400.967**. İkincisi kaynak satır olarak yeniden çıkmaz. `intelligence/` programlama dosyaları **51.697** fiziksel / **45.105** etkin satırdır. Aynı ağaçtaki JSON **317.885** satırdır. 400.967, Python kaynağı değildir.

JSON kaynak kod sayılmaz. Build ve `node_modules` kaynak kod sayılmaz. CSS ve HTML kaynak kovalarındadır (frontend veya diğer). Testler A’nın içindedir, B’nin de içindedir, intelligence’ın içinde değildir.

---

## 4. Tek tablo

| # | Ölçü | Sayı |
|---|------|-----:|
| 1 | Tüm depo fiziksel satır | 5.751.587 |
| 2 | Tüm depo etkin satır | 5.125.717 |
| 3 | Kaynak fiziksel (A) | 265.827 |
| 4 | Kaynak etkin (A) | 238.170 |
| 5 | intelligence dahil kaynak fiziksel | 265.827 |
| 6 | intelligence hariç kaynak fiziksel (B) | 214.130 |
| 6b | intelligence hariç kaynak etkin | 193.065 |
| 7 | Backend fiziksel / etkin | 90.725 / 80.912 |
| 8 | Frontend fiziksel / etkin | 67.517 / 63.103 |
| 9 | Test fiziksel / etkin | 28.166 / 24.752 |
| 10 | Dokümantasyon fiziksel | 61.727 |
| 11 | JSON/veri fiziksel | 1.318.880 |
| 12 | Build fiziksel | 106.468 |

Satır 5, satır 3 ile aynı kümedir.  
A fiziksel 265.827 = intelligence 51.697 + B 214.130.  
B 214.130 = backend 90.725 + frontend 67.517 + scripts 12.669 + test 28.166 + diğer kaynak 15.053.  
Depo 5.751.587 = proje 1.696.185 + bağımlılık 3.948.934 + build 106.468.

---

## 5. Sonuç

Bugünkü Buzzard çalışma ağacının programı **2.741 dosya** ve **265.827 fiziksel / 238.170 etkin** satırdır. Bunun **51.697** fiziksel satırı `intelligence/` arşividir. Uygulama kaynağı, arşiv çıkarılınca **214.130 fiziksel / 193.065 etkin** satırdır.

Deponun 5,75 milyon satırının **3.948.934**’ü `node_modules`, **1.318.880**’i JSON’dur. İkisi de yazdığımız uygulama mantığı değildir.

241.000 rakamı bu ağaçta kayıtlı bir ölçüm değildir. En yakın doğrulanmış dilim, testler çıkarılmış çalışma ağacı kaynağıdır: **237.661**. Bu, 241.000 değildir.

---

## Kapanış kontrolü

| | |
|--|--|
| HEAD | `3df03351626a9147374b0dd3b1fe622d875a1094` |
| Ölçüm saati | 19.11.2026 18:27 Avrupa/Berlin |
| Veritabanı SHA-256 | `f5617f673535c496f6bf39ad2b44e534f8f3d32f60139c58b6c012c92beef9b0` |
| SALES | `server/lib/salesSafetyGate.js`: bayraklar `"1"` değilse `LOCKED` |
| EGRESS | `data/security/egress_policy.v1.json` alanı `default`: `DENY` |
| productionReady / live | Bu sayımda değiştirilmedi |
| Yazılan dosya | Yalnızca bu rapor |
