# Esat Bey — aktif savunma

**Zaman:** 1 Kasım 2026, 16:38 Europe/Berlin  
**Dal:** `cursor/esat-bey-defense-c293`

Esat süreç içinde **aktif**. Tek savunma değil. Satış ve production restore kapalı.

| Kanca | Davranış |
| --- | --- |
| Egress | AI/ödeme çıkışı hold, ağ yok |
| Mesaj | sır metni `ESAT_HOLD` |
| Yaptırım | belirsizlik hold |
| Satış kapısı | `BUZZARD_SALES_ENABLED` eksik şartla açılırsa kayıt |
| Tahsilat | `capture` red + hold |
| Vergi ödeme | `payTax` red + hold |
| Harici AI | Claude/OpenAI/Google yasak + hold |
| Restore | `/var/data` ve canlı DB red + hold |
| Exception | SECURITY_ALERT / PERMISSION_DENIED hold |
| SQLite | `esat_security_events` (busy ise bellek) |
| HTTP | `GET /api/health/esat` (ayrıntı yok) |
| Pusat | `ESAT_STATUS` / `ESAT_RECENT` / `ESAT_INSPECT` (Pusat kapalıyken de) |

Ek kilitler (yazılım): 27 ülke kasası, sahte kurum/phishing hold, yedek `completeClaim` yasağı.

Hâlâ operatörde: uzak kasa, gerçek WORM, SIP, vergi dairesi, canlı firewall, 7/24 host.

`completeClaim: false`. 7/24 ayrı host / canlı SOC değil.
