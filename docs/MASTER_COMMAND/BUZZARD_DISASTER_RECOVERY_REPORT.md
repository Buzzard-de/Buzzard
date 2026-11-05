# Felaket kurtarma (Madde 16)

**Durum:** PARTIAL. Backup dosyası ≠ kurtarma. COMPLETE yok.

## 3-2-1-1-0

| Katman | Kod | Gerçek |
| --- | --- | --- |
| 3 kopya | `copies32110.createCopies` | yerel test |
| 2 medya | aynı disk mümkün | **PARTIAL** |
| 1 offsite | `BUZZARD_OFFSITE_BACKUP_DIR` | yoksa **BLOCKED** |
| offline | operatör | **BLOCKED** |
| WORM | `chmod 444` + `BUZZARD_WORM_CONFIRMED` | chmod **WORM değil** |
| 0 hata | `proveBackupRestore` yerel | canlı drill yok |

## Yedeklenecek alanlar

DB, katalog, sipariş, müşteri, tedarikçi, finans, vergi, config, kaynak, IaC, sertifika, anahtar, AI/Pusat bellek, audit.  
Anahtarlar yedeklerle aynı kasada tutulmamalı (operatör).

## RPO/RTO

**Tahmin (ölçülmedi):** API SQLite RPO saat mertebesi; RTO saat–gün. Canlı ölçüm **BLOCKED**.

## Kurtarma adımları (runbook; çalıştırılmadı)

Tespit → izolasyon → kimlik iptal → kanıt → temiz ortam → bütünlük → tarama → imaj → kontrollü restore → sipariş/ödeme/iade uzlaştırma → güvenlik onayı → kademeli açılış.

Production restore bu turda **yapılmadı**.

## Alarm

Esat in-process. Telefon **BLOCKED**. Alternatif: operator + exception bus (canlı 7/24 değil).
