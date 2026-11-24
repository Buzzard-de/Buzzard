# Madde 1 — 24 Kasım 2026, 07:49 Europe/Berlin

Dal: `cursor/237-morning-status-c293`  
HEAD: `a6533275f7ba8968a2170b91e5e4e14e2365ddef`  
Kayıt: `6e9d1926df05b4205748bc53b58fd9070c9c465a` içindeki `docs/software-completion/BUZZARD_237_MASTER_EXECUTION_REGISTER.md`  
Orijinal başlık: UNKNOWN  
Orijinal kabul kriteri: UNKNOWN  
Kurulu kapsam: depo tabanı ve çalışma ağacı bütünlüğü  
Son durum: **PARTIAL**

23 Kasım durum dosyaları değiştirilmedi. `server/data/buzzard.db` ve `phase1CoreIntegrity` test beklentileri bu kayıtta değiştirilmedi.

## Hash uyuşmazlığı

Taban `artifacts/buzzard-security-admin-final-sprint-checkpoint-2026-11-18/baseline-hashes.json`. Commit `a22c94f8562e239e2db10bcdc2a45c5095e72674`, 18 Kasım 2026 saat 17:30 Europe/Berlin. Ölçüm zamanı 18 Kasım 2026 saat 06:43 Europe/Berlin. Not, ölçümün `/tmp/buzzard-final-sprint` içinde, dal `cursor/dev-list-51-remainder-c293`, HEAD `fdc3132c` iken alındığını yazar.

Beklenen `buzzard.db`: SHA-256 `42224f804208319768768672e43b90b3d240284d26e91c713beea554bafa497e`, 1.761.280 bayt, dosya zamanı 17 Kasım 2026 saat 17:52 Europe/Berlin.

Bu ağaçtaki `server/data/buzzard.db`: SHA-256 `27d460eca7461f5093406296256be9c9d98b45eaf5493ab91192483902fc0a0f`, 1.744.896 bayt. Doğum 22 Kasım 2026 saat 21:38 Europe/Berlin. Son yazma 24 Kasım 2026 saat 07:35 Europe/Berlin. `CORE_PROTECTED_DATA` bu yüzden reddeder. Baytlar tabanla aynı değildir.

Dosya, Vitest dışında `server/lib/db.js` varsayılan yolu açılınca oluşan katalog şemasıdır. Tek sipariş `BZ-2026-DEMO01` ve bu satır `migrateOrderManagementV22` tohumuyla aynıdır. 217 tablo vardır: 216 uygulama tablosu ve `sqlite_sequence`.

## Silinme kanıtı yok

Yedi korunan yol Git'te hiç commit edilmemiştir. Silme commit'i yoktur. Yokluk, bu dalda bir silme kaydı değildir.

## 18 Kasım dosyaları bu ortamda yok

`/tmp/buzzard-final-sprint`, `/tmp/buzzard-eu27` ve `/var/data` bu makinede yoktur. `work-tree.tgz` içinde `buzzard.db` yoktur. `/tmp`, iş ağaçları, `/workspace` ve `/opt/cursor` tarandı. Taban hash'iyle eşleşen dosya sayısı 0'dır.

Altı JSON adı `server/data` içinde yoktur: `admin-sessions.json`, `admin-users.json`, `audit-log.json`, `automation-events.json`, `customers.json`, `security-log.json`. Başka dizinlerdeki kopyalar taban hash'iyle eşleşmez. Bu dosyalar yazan kod çağrılınca oluşur. Burada yazılmamış olmaları, silindikleri anlamına gelmez.

`/workspace/server/data/buzzard.db` ayrı bir kopyadır. SHA-256 `1bf558e7b3568fc43de4a1716fa8b875c6e96f04338698e65841a8ec30d0a526`, 1.634.304 bayt. O da taban değildir.

## Ayrılan bağımlılık

Madde 1'in açık kısmı bu ortamda bulunmayan 18 Kasım baytlarıdır. Bu, sonraki maddelerin kodunu kilitlemez. Kayıttaki "önceki maddeler" cümlesi 1–19 bandının her satırında tekrar eder. O cümle, bu veritabanı hash'ine teknik bağımlılık değildir.

Madde 1 PARTIAL kaldığı için Madde 2 tamamlanmış sayılmaz. Madde 2 kendi ölçütüyle ayrıca durur.
