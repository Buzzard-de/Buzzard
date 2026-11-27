# Buzzard — kaynak kodu büyüklüğü ve gelişim

Ölçüm saati: 23 Kasım 2026, 12:39:56 Europe/Berlin  
Sayılan ağaç: `360d8a1367cac19b300fb5d5d9777df4f110e23e`  
Sayılan dal: `cursor/237-morning-status-c293`  
Bu dosya sayım bittikten sonra eklendi. Aşağıdaki satırlara dahil değildir.

## Üç ana rakam

1. **Bugünkü Production LOC: 203.355 kod satırı** (2.457 üretim kaynak dosyası).
2. **Test kodu LOC: 28.112 kod satırı** (308 test dosyası).
3. **25 Temmuz 2026, 17:11:04 Europe/Berlin** ile ölçüm saati arasında **120 gün, 19 saat, 28 dakika** geçti. Bu süre **2.899,48 saat**tir.

Kod satırı, boş satır ve yorum satırı çıkarıldıktan sonra kalan satırdır. Üretim ile test birbirine eklenmeden ayrı durur. İkisinin kod satırı toplamı **231.467** satır ve **2.765** dosyadır.

## 1. Güncel sayım

| Kalem | Dosya | Kod satırı | Boş | Yorum | Fiziksel |
| --- | ---: | ---: | ---: | ---: | ---: |
| Git dizinindeki yollar | 4.792 | — | — | — | — |
| Okunan dosyalar | 4.781 | — | — | — | — |
| Üretim kaynak kodu | 2.457 | 203.355 | 19.979 | 3.305 | 226.639 |
| Test kodu | 308 | 28.112 | 3.419 | 297 | 31.828 |
| Üretim + test | 2.765 | 231.467 | 23.398 | 3.602 | 258.467 |
| Dokümantasyon | 832 | 133.460 | 21.504 | 0 | 154.964 |
| Yapılandırma ve veri dosyaları | 309 | 1.283.758 | 108 | — | — |
| SQL (üretimin içinde) | 2 | 1.685 | 4 | 14 | 1.703 |
| Üretilmiş dosyalar (üretimin dışında) | 5 | 6.668 | — | — | — |
| Paketlenmiş kopyalar (üretimin dışında) | 199 | 23.498 | — | — | — |
| Diğer metin | 298 | — | — | — | 40.647 |
| İkili dosyalar | 373 | satır sayılmadı | — | — | — |
| Tüm metin dosyaları | — | — | 50.849 | 3.787 | 1.773.186 |

4.792 dizin yolu = 4.781 okunan dosya + 10 dizin sembolik bağı + 1 kırık sembolik bağ (`intelligence/buzzard_ki_gesamt/snapshots/latest`). On bir sembolik bağ satır hesabına girmedi.

Üretim kodunun 203.355 satırı iki parçadır:

- Uygulama ağacı (`intelligence/` hariç): **1.470 dosya, 160.450 kod satırı**.
- `intelligence/` altındaki kaynak (arşiv zip ve `intelligence/archive/` hariç): **987 dosya, 42.905 kod satırı**.

SQL iki dosyadır ve üretim toplamının içindedir: `data/buzzard_categories.sql`, `intelligence/buzzard_ai_complete/master_taxonomy/docs/MIGRATION.sql`. Ayrı SQL kalemi bu iki dosyayı ikinci kez eklemez.

Yapılandırma kaleminin 1.283.758 dolu satırı el yazması ayar dosyası değildir. İçinde `package-lock.json` ve `yarn.lock` vardır: **2 dosya, 8.050 satır**. Geri kalanın büyük bölümü tekrarlanan veri JSON dosyalarıdır. Yalnızca `data/logistics/eu27_carrier_master.v3.json` … `v11.json` dosyalarının fiziksel satırları:

| Dosya | Fiziksel satır |
| --- | ---: |
| eu27_carrier_master.v11.json | 146.706 |
| eu27_carrier_master.v10.json | 146.121 |
| eu27_carrier_master.v9.json | 127.674 |
| eu27_carrier_master.v8.json | 127.271 |
| eu27_carrier_master.v7.json | 111.648 |
| eu27_carrier_master.v6.json | 58.082 |
| eu27_carrier_master.v5.json | 56.424 |
| eu27_carrier_master.v4.json | 41.132 |
| eu27_carrier_master.v3.json | 9.155 |

Bu dokuz dosya birlikte 824.213 fiziksel satırdır. Taksonomi JSON kopyaları da aynı yapılandırma kovasına girer. Bu yüzden 1.773.186 fiziksel satır, 203.355 üretim kod satırı ile aynı şey değildir.

### Dillere göre dağılım

Dosya sayıları ve kod satırları üretim ile test için ayrıdır. Paket kopyası ve üretilmiş dosya bu tabloda yoktur.

| Dil | Üretim dosyası | Üretim kod satırı | Test dosyası | Test kod satırı |
| --- | ---: | ---: | ---: | ---: |
| JavaScript (js, mjs, cjs, jsx) | 905 | 98.029 | 208 | 23.529 |
| TypeScript (ts, tsx) | 507 | 50.968 | 29 | 1.901 |
| Python | 974 | 40.243 | 71 | 2.682 |
| CSS | 10 | 5.949 | 0 | 0 |
| HTML | 35 | 5.544 | 0 | 0 |
| SQL | 2 | 1.685 | 0 | 0 |
| Kabuk (sh, ps1, cmd) | 24 | 937 | 0 | 0 |
| Toplam | 2.457 | 203.355 | 308 | 28.112 |

### Üretimin dışında bırakılanlar

Üretilmiş, üretim LOC’a katılmayan dosyalar:

- `lib/categories/translations/ar.generated.ts`
- `lib/categories/translations/de.generated.ts`
- `lib/categories/translations/en.generated.ts`
- `lib/categories/translations/tr.generated.ts`
- `next-env.d.ts`

Beşi birlikte 6.668 kod satırıdır.

Paketlenmiş kopyalar da üretim LOC’a katılmadı: `exports/**` ve `intelligence/archive/**`. 199 dosya, 23.498 kod satırı. İzlenen arşivlerin içinde 273 zip dosyası vardır; zip, png, m4a ve benzeri 373 ikili dosya satır hesabının dışındadır.

Git’in görmediği, bu sayılara girmeyen ağaçlar:

| Yol | Dosya | Neden dışında |
| --- | ---: | --- |
| `node_modules/` | 19.311 | bağımlılık, yok sayılan |
| `server/node_modules/` | 552 | bağımlılık, yok sayılan |
| `.next/` | 82 | derleme çıktısı, yok sayılan |
| `scripts/__pycache__/` | 3 | önbellek, yok sayılan |
| `server/data/` | 1 | yok sayılan yerel veri |

Yok sayılmayan izlenmemiş dosya yoktur. Çalışma ağacı sayım anında temizdi.

## 2. Sayım yöntemi

`scc`, `tokei` ve `cloc` bu makinede yüklü değildir. Paket kurulmadı. Sayım Python 3 standart kütüphanesi ile yapıldı. Mevcut ağaç `git ls-files` üzerinden diskten okundu. `9b86c1b7` ve `d4f8ddc2` aynı kuralla `git archive` akışından okundu.

Üretim kaynak uzantıları: `.py`, `.js`, `.mjs`, `.cjs`, `.jsx`, `.ts`, `.tsx`, `.css`, `.scss`, `.html`, `.vue`, `.sh`, `.ps1`, `.cmd`, `.sql`.

Test sayılan yollar: parçalarından biri `__tests__`, `tests`, `test`, `e2e` veya `spec` olanlar; `test_*.py`, `*_test.py`, dosya adında `.test.` veya `.spec.` geçenler. Bu dosyalar üretimden çıkarılıp test kovasına kondu.

Üretimden ayrıca çıkarılanlar: `node_modules/`, `vendor/`, `dist/`, `build/`, `.next/`, `coverage/`, `cache/`, `exports/`, `intelligence/archive/`, `*.generated.ts`, `*.generated.js`, `*.min.js`, `*.min.css`, `next-env.d.ts`.

Dokümantasyon: `.md`, `.rst`, `.adoc` ve `docs/` altındaki diğer dosyalar. Yapılandırma: `.json`, `.yml`, `.yaml`, `.toml`, kilit dosyaları ve benzeri ayar dosyaları. JSON veri dökümleri de bu kovadadır; yukarıda ayrıca gösterildi.

Yorum kuralı: yalnızca satırın tamamı yorum ise yorum sayılır. JavaScript ve CSS için `//` ve `/* */`, SQL için `--` ve `/* */`, Python ve kabuk için satır başı `#`, HTML için `<!-- -->`. Satır sonundaki yorum, kod satırı olarak kalır. Python üç tırnak dizeleri kod sayılır. Markdown içinde `#` başlıkları yorum değil, dokümantasyon satırı sayılır. Bu yorum toplamı cloc ile birebir aynı olmak zorunda değildir; cloc çalıştırılamadı.

## 3. Tarih ve süre

Tek kök commit `d4f8ddc2661b3d6f51173825df25f9ab9ffa77eb` dosyasıdır. `git rev-list --max-parents=0 HEAD` başka bir kök döndürmedi. Daha eski commit yoktur.

| Olay | Commit | Europe/Berlin |
| --- | --- | --- |
| İlk commit | `d4f8ddc2661b3d6f51173825df25f9ab9ffa77eb` | 25 Temmuz 2026, 17:11:04 |
| Kullanıcının son bilinen HEAD’i | `9b86c1b70159c32d644f2596f61ae8388ad401ec` | 19 Kasım 2026, 18:49:29 |
| Sayılan HEAD | `360d8a1367cac19b300fb5d5d9777df4f110e23e` | 23 Kasım 2026, 12:21:38 |
| Ölçüm saati | — | 23 Kasım 2026, 12:39:56 |

`9b86c1b7` commit’inin kendi tarihi 19 Kasım 2026, 18:49 Europe/Berlin’dir. Bu rapor, o SHA’yı 21 Kasım etiketiyle anılan ölçümün ağacı olarak yeniden saydı. Commit, sayılan HEAD’in atasıdır.

İlk commit ile sayılan HEAD arasında 120 gün, 19 saat, 10 dakika vardır.

| Git özeti | Değer |
| --- | ---: |
| Toplam commit | 774 |
| Merge commit | 248 |
| Merge olmayan commit | 526 |
| Aktif gün (farklı commit günü) | 45 |
| İlk gün | 25 Temmuz 2026 |
| Son gün | 23 Kasım 2026 |
| `9b86c1b7` sonrası commit | 28 |

İlk commit 19 dosyalık statik sitedir. Aynı sayaçla o ağaçta 6 üretim dosyası ve 636 kod satırı vardır. Test dosyası yoktur. Dosyalar: `index.html`, `products.html`, `datenschutz.html`, `impressum.html`, `scripts.js`, `styles.css` ve küçük destek dosyaları.

Merge olmayan commit’lerde `git log --no-merges -M --numstat` toplamı:

- Eklenen fiziksel satır: **1.804.377**
- Silinen fiziksel satır: **37.294**
- Fark: **1.767.083**

Bu toplam bütün metin dosyalarını kapsar: JSON veri dökümleri, dokümantasyon ve kaynak. Üretim LOC değildir. `-M` kullanıldığı için 49 yeniden adlandırma satırı, dosyanın tamamını silinip yeniden eklenmiş gibi saymaz. Merge commit’ler çift sayımı önlemek için toplama girmedi.

Commit başına ortalama, 526 merge olmayan commit üzerinden:

- Eklenen: 3.430,37 fiziksel satır
- Silinen: 70,90 fiziksel satır
- Eklenen + silinen: 3.501,28 fiziksel satır

Kök ile HEAD arasındaki tek ağaç farkı (`git diff --shortstat`): 4.806 dosya, **1.766.842** ekleme, **1.216** silme. Bu da tüm metin farkıdır. Ara commit’lerde eklenip sonra silinen satırlar burada görünmez; tarih toplamının ağaç farkından büyük olması bu yüzdendir.

Günlük ortalama büyüme, aynı sayacın kod satırı ile:

- Üretim: 636 satırdan 203.355 satıra. Artış 202.719 kod satırı.
- Geçen süreye bölüm: **1.677,97 üretim kod satırı / gün**.
- 45 aktif güne bölüm: **4.504,87 üretim kod satırı / aktif gün**.
- Üretim + test: 636 satırdan 231.467 satıra. Artış 230.831 kod satırı, yani **1.910,67 kaynak kod satırı / gün**.

## 4. Başlangıçtan bugüne kodun kendisi

Tarih toplamı ile bugün diskte duran kod ayrıdır.

| | Kök `d4f8ddc2` | Bugün `360d8a13` |
| --- | ---: | ---: |
| Üretim kod satırı | 636 | 203.355 |
| Üretim dosyası | 6 | 2.457 |
| Test kod satırı | 0 | 28.112 |
| Test dosyası | 0 | 308 |
| Metin fiziksel satır | 1.279 | 1.773.186 |

Bugün depoda duran üretim kodu 203.355 satırdır. Tarihte eklenen 1.804.377 satırın büyük kısmı veri JSON’u, dokümantasyon ve sonradan silinen veya değiştirilen satırlardır.

## 5. `9b86c1b7` ile aynı yöntemle karşılaştırma

21 Kasım 2026 etiketiyle verilen önceki rakamlar şunlardı: üretim 174.018 satır / 1.426 dosya, test 25.885 satır / 213 dosya, toplam 199.903 satır / 1.639 dosya, HEAD `9b86c1b7`.

Bu depoda o rakamların hangi araçla ve hangi dışlama kuralıyla alındığı bulunamadı. Aynı commit bu raporun sayacıyla yeniden okundu. Sonuç önceki tabloyla aynı değildir:

| Aynı sayaç | `9b86c1b7` | `360d8a13` | Fark |
| --- | ---: | ---: | ---: |
| Üretim kod satırı | 198.556 | 203.355 | +4.799 |
| Üretim dosyası | 2.424 | 2.457 | +33 |
| Uygulama ağacı kod satırı | 155.651 | 160.450 | +4.799 |
| `intelligence/` üretim kodu | 42.905 | 42.905 | 0 |
| Test kod satırı | 24.762 | 28.112 | +3.350 |
| Test dosyası | 273 | 308 | +35 |
| Üretim + test kod satırı | 223.318 | 231.467 | +8.149 |
| Üretim + test dosyası | 2.697 | 2.765 | +68 |

174.018 ile 203.355 arasındaki fark büyüme olarak yazılmadı. İki sayı farklı sayım kurallarının sonucudur. Büyüme olarak kullanılan tek fark, yukarıdaki aynı sayaç sütunudur.

İki commit arasındaki `git diff --numstat -M` fiziksel satırları, aynı dosya sınıflandırmasıyla:

| Sınıf | Değişen dosya | Eklenen fiziksel | Silinen fiziksel | Net |
| --- | ---: | ---: | ---: | ---: |
| Üretim kaynak dosyaları | 124 | 5.699 | 552 | +5.147 |
| Test dosyaları | 55 | 3.755 | 107 | +3.648 |

Üretimdeki +5.147 fiziksel satır = +4.799 kod + 244 boş + 104 yorum. Testteki +3.648 fiziksel satır = +3.350 kod + 298 boş. Kod satırı farkı ile fiziksel diff bu şekilde kapanır. Bu ekleme ve silme, tüm tarih toplamı değildir; yalnız `9b86c1b7` ağacı ile `360d8a13` ağacı arasındaki farktır.

Bu aralıkta dokümantasyonun dolu satırı 46.959’dan 133.460’a çıktı. SQL, üretilmiş dosyalar ve paket kopyaları değişmedi.

## 6. Alanlara göre kod

Alanlar üst üste biner. Bir dosya hem backend hem API satırında durabilir. Alanları toplamak 203.355’i vermez. Rakamlar üretim kod satırıdır; testler yalnız son satırdadır.

| Alan | Kural | Dosya | Kod satırı |
| --- | --- | ---: | ---: |
| Backend | `server/` üretim dosyaları | 795 | 85.379 |
| Frontend | `app/`, `components/`, `lib/`, `styles/` | 508 | 56.498 |
| API | `server/plugins/`, `server/routes/`, `app/api/`, `pages/api/` | 96 | 10.628 |
| AI motorları | `server/lib/buzzardNative/` ve `intelligence/` üretimi | 1.119 | 51.140 |
| Pusat Orchestrator | `server/lib/pusat/` | 20 | 4.207 |
| Digital Body | `digitalBody`, `engines/`, `speech/`, `hearing/`, `motion/` | 29 | 1.644 |
| Ürün ve katalog | `pim/`, `productService`, `productCore`, `catalogSeo`, `pimCatalog`, `productCatalog` | 65 | 6.193 |
| Tedarikçi | `adapters/` ve yolunda `supplier` geçen üretim dosyaları | 90 | 6.528 |
| Sipariş ve ödeme | `commerce/`, `orderService`, `paymentService`, `checkoutService` | 118 | 7.269 |
| Fiyatlandırma ve stok | yolunda `pricing` veya `inventory` geçen üretim dosyaları | 30 | 1.766 |
| Güvenlik | yolunda `auth`, `security`, `csrf` veya `rbac` geçen üretim dosyaları | 105 | 6.905 |
| Test | test kuralına uyan bütün dosyalar | 308 | 28.112 |

`public/` altındaki üretim kaynağı frontend satırına katılmadı: 15 dosya, 2.485 kod satırı. `scripts/` üretimi 88 dosya, 10.720 kod satırıdır ve backend satırında değildir.

Üst dizinlere göre üretim ve test:

| Dizin | Üretim dosyası | Üretim kod | Test dosyası | Test kod |
| --- | ---: | ---: | ---: | ---: |
| server | 795 | 85.379 | 208 | 23.529 |
| intelligence | 987 | 42.905 | 71 | 2.682 |
| lib | 260 | 32.117 | 8 | 244 |
| components | 149 | 17.027 | 0 | 0 |
| scripts | 88 | 10.720 | 1 | 7 |
| styles | 9 | 5.780 | 0 | 0 |
| data | 15 | 4.161 | 0 | 0 |
| public | 15 | 2.485 | 0 | 0 |
| e2e | 0 | 0 | 20 | 1.650 |
| app | 90 | 1.574 | 0 | 0 |

## 7. Araçlar ve commit

- Sayılan HEAD: `360d8a1367cac19b300fb5d5d9777df4f110e23e`
- HEAD zamanı: 23 Kasım 2026, 12:21:38 Europe/Berlin
- İlk commit: `d4f8ddc2661b3d6f51173825df25f9ab9ffa77eb`, 25 Temmuz 2026, 17:11:04 Europe/Berlin
- Karşılaştırılan ata: `9b86c1b70159c32d644f2596f61ae8388ad401ec`, 19 Kasım 2026, 18:49:29 Europe/Berlin
- Araç: Python 3, `git ls-files`, `git archive`, `git log --no-merges -M --numstat`, `git diff --numstat -M`, `git diff --shortstat`
- `scc`, `tokei`, `cloc`: yüklü değil, kurulmadı
- Kaynak, mimari, bağımlılık, satış kilidi ve 237 maddelik denetim kayıtları bu ölçümde değiştirilmedi
