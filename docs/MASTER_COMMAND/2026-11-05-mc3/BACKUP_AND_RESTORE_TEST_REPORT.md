# Backup ve restore test

**Tarih:** 5 Kasım 2026, ~09:00 Europe/Berlin  
**Ortam:** izole temp SQLite  
**Sonuç:** `ISOLATED_RESTORE_TESTED`  
**PRODUCTION_DR_VERIFIED:** hayır

Sentetik akışlar restore sonrası:

| Akış | Sonuç |
| --- | --- |
| Ürün oluştur/oku | evet |
| Stok oku | qty=10 |
| Sipariş yaşam + iptal | CANCELLED, paid=0 |
| İade muhasebe satırı | journal only, ödeme yok |
| Tedarikçi oku | evet |
| Vergi FR net 100 → rezerv 25 | evet |
| payTax | PAYMENT_AUTHORITY_DENIED |
| Pusat görev | OPEN |
| AI hafıza | dogu unverified-research |
| Audit | var |

Ölçüm: prove 15 ms, drill 36 ms, duvar 51 ms. Production SLA değil.
