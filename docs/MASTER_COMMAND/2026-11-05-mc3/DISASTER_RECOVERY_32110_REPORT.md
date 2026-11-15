# 3-2-1-1-0 felaket kurtarma

**Durum:** PARTIAL. COMPLETE yok. PRODUCTION_DR_VERIFIED yok.

| Katman | Hedef | Gerçek |
| --- | --- | --- |
| 3 kopya | bağımsız | yerel copy1/2/3 + gzip — aynı VM |
| 2 medya | bağımsız sistem | PARTIAL (disk + gzip) |
| 1 offsite | ayrı lokasyon | BLOCKED |
| 1 WORM/offline | üretim kimliği silemez | BLOCKED |
| 0 hata | doğrulanmış | lab integrity ok |

Önerilen offsite (kurulmadı, ücret başlatılmadı):

1. S3/GCS Object Lock (COMPLIANCE) veya Azure WORM — ayrı hesap, MFA delete.  
2. Offline: şifreli disk operatör kasası.  
3. Anahtarlar: ayrı vault; backup objelerinde yok.

Tahmini maliyet: operatör kararı (aylık object-lock + egress). Bu turda hesap açılmadı.
