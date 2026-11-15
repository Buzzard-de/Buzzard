# Buzzard logistics acceptance v2

**Date:** 5 November 2026 (Europe/Berlin)  
**Branch:** `cursor/ab27-carrier-inventory-c293`  
**Does not delete v1 reports.**  
**COMPLETE_VERIFIED countries:** 0  
**LIVE_VERIFIED carriers:** 0  
**Push / merge / deploy / sales:** no

## Executive table

| Ülke | Sicil kayıtları | Benzersiz tüzel | Aktif taşıyıcı | Ulusal posta | Özel / diğer adlı | Bölgesel/yerel adlı | Locker/PUDO adlı | Doğrulama |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Almanya | 7183 | — | 0 | 1 | 5 | 2 | 0 | PARTIAL_REGISTER_FETCH |
| Fransa | 45 | 45 | 0 | 1 | 0 | 44 | 0 | PARTIALLY_VERIFIED |
| İtalya | 3722 | — | 0 | 1 | 0 | 0 | 0 | PARTIALLY_VERIFIED |
| İspanya | 4734 | — | 0 | 1 | 0 | 0 | 0 | PARTIALLY_VERIFIED |
| Hollanda | — | — | 0 | 1 | 0 | 0 | 0 | DATA_INCOMPLETE |
| Belçika | 7 | 7 | 5 | 1 | 0 | 6 | 0 | PARTIALLY_VERIFIED |
| Avusturya | 16 | 16 | 0 | 1 | 15 | 15 | 0 | DATA_INCOMPLETE |
| Polonya | — | — | 0 | 1 | 0 | 0 | 0 | DATA_INCOMPLETE |
| Çekya | — | — | 0 | 1 | 0 | 0 | 0 | OFFICIAL_REGISTER_UNAVAILABLE |
| Slovakya | — | — | 0 | 1 | 0 | 0 | 0 | OFFICIAL_REGISTER_UNAVAILABLE |
| Macaristan | — | — | 0 | 1 | 0 | 0 | 0 | OFFICIAL_REGISTER_UNAVAILABLE |
| Romanya | — | — | 0 | 1 | 0 | 0 | 0 | DATA_INCOMPLETE |
| Bulgaristan | — | — | 0 | 1 | 0 | 0 | 0 | OFFICIAL_REGISTER_UNAVAILABLE |
| Yunanistan | — | — | 0 | 1 | 0 | 0 | 0 | OFFICIAL_REGISTER_UNAVAILABLE |
| Portekiz | — | — | 0 | 1 | 0 | 0 | 0 | DATA_INCOMPLETE |
| İrlanda | 16 | 16 | 0 | 1 | 0 | 0 | 0 | PARTIALLY_VERIFIED |
| Danimarka | 18 | 18 | 0 | 1 | 6 | 0 | 2 | PARTIALLY_VERIFIED |
| İsveç | 19 | 19 | 0 | 1 | 0 | 18 | 0 | PARTIALLY_VERIFIED |
| Finlandiya | 14 | 14 | 0 | 1 | 0 | 13 | 0 | PARTIALLY_VERIFIED |
| Estonya | — | — | 0 | 1 | 0 | 0 | 0 | OFFICIAL_REGISTER_UNAVAILABLE |
| Letonya | — | — | 0 | 1 | 0 | 0 | 0 | OFFICIAL_REGISTER_UNAVAILABLE |
| Litvanya | — | — | 0 | 1 | 0 | 0 | 0 | OFFICIAL_REGISTER_UNAVAILABLE |
| Lüksemburg | — | — | 0 | 1 | 0 | 0 | 0 | OFFICIAL_REGISTER_UNAVAILABLE |
| Malta | — | — | 0 | 1 | 0 | 0 | 0 | OFFICIAL_REGISTER_UNAVAILABLE |
| Kıbrıs | — | — | 0 | 1 | 0 | 0 | 0 | OFFICIAL_REGISTER_UNAVAILABLE |
| Slovenya | — | — | 0 | 1 | 0 | 0 | 0 | OFFICIAL_REGISTER_UNAVAILABLE |
| Hırvatistan | — | — | 0 | 1 | 0 | 0 | 0 | OFFICIAL_REGISTER_UNAVAILABLE |
| AB-27 | 15774 (yalnızca sayımı bilinen ülkeler; tekil değil) | 164 (veritabanı adlı kayıt; sicil toplamı değil) | 5 (yalnızca activityVerified) | 27 | aday ayrı | aday ayrı | 9 adlı satır | COMPLETE_VERIFIED yok |

## Thirteen questions

1. **Registered postal operators found (named in DB, not register-sum):** 164 SOURCE_VERIFIED/VERIFIED rows. Country register records that were counted: DE 7183 Stammnr, DK 18 permits, FI 14 letter notifications, FR 45 ARCEP names, SE 19 permits, BE 7 licences, IE ComReg extract, ES 4734 inscriptions, IT 3722 sequential, AT 16 PEV. These layers must not be added together as unique companies.
2. **Unique legal entities verified in this DB:** 164. v1 snapshot 43 is preserved and is not the EU-27 population.
3. **Active national/international carriers with activityVerified:** 5. USP designations: 27 (UPU 15 Feb 2025). That is designation, not last-mile activity proof.
4. **Regional/local named rows:** 81 letter/correspondence/licence classes. Not automatically parcel last-mile.
5. **Locker/PUDO named rows:** 9. Not added to carrier totals.
6. **Registers examined in substance:** DE (partial listing), DK (table), FI (full letter page), FR (ARCEP page), SE (stat + older name list), BE (licence table), IE (search extract, HTTP 307 on direct fetch), ES (CNMC 2025 + ministry PDF), IT (MIMIT PDF), AT (PEV list only), RO (first page).
7. **Still incomplete:** HU, CZ, SK, BG, EL, EE, LV, LT, LU, MT, CY, SI, HR (no usable count). NL ACM CSV, PL UKE search, PT ANACOM mixed list, AT full Anzeige, RO full ANCOM, IE redirect.
8. **Official API docs:** DHL Parcel DE Shipping v2, UPS Shipping, GLS ShipIT REST — OFFICIAL_API_DOCUMENTED + CONTRACT_REQUIRED.
9. **Contract + sandbox required:** all of the above. SANDBOX_VERIFIED = false. LIVE_VERIFIED = false.
10. **First integration priority after contracts:** DHL Parcel DE, GLS, UPS, then one USP. Not letter-notification printers.
11. **Coverage gaps:** postal-code coverage UNKNOWN for all 27. Do not infer own-fleet from accept-to-27-countries marketing.
12. **Corrections vs 43:** 43 remains v1 verified named rows. DE 7183 is Stammnummer rows. DK 18 is permits. FI letter list added. FR/SE/BE/IE/ES/IT/AT counts documented as register layers. New named SOURCE_VERIFIED rows added; register millions are not unique-legal.
13. **External access still required:** NRA bulk downloads, commercial API contracts, sandbox accounts, egress allow for those hosts, human approval for any live label. BLOCKED until then.
