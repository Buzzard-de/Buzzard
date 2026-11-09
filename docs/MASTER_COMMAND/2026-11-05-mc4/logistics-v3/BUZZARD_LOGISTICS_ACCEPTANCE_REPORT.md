# Acceptance v3

**Date:** 5 November 2026 (Europe/Berlin)  
**Branch:** `cursor/ab27-carrier-inventory-c293`  
**COMPLETE_VERIFIED:** 0  
**Push/sales/live:** no  
**v1/v2 files kept.**

| Ülke | Sicil kaydı | Benzersiz şirket | Aktif taşıyıcı | Özel ulusal | Uluslararası | Bölgesel/yerel | Locker/PUDO |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Almanya | 7183 | — | 0 | 5 | 5 | 2 | 0 |
| Fransa | 45 | 45 | 0 | 0 | 0 | 44 | 0 |
| İtalya | 3722 | — | 0 | 0 | 0 | 0 | 0 |
| İspanya | 4734 | — | 0 | 0 | 0 | 0 | 0 |
| Hollanda | — | — | 0 | 0 | 0 | 0 | 0 |
| Belçika | 7 | 7 | 5 | 0 | 0 | 6 | 0 |
| Avusturya | 16 | 16 | 0 | 0 | 4 | 15 | 0 |
| Polonya | — | — | 0 | 0 | 0 | 0 | 0 |
| Çekya | 3 | 3 | 1 | 0 | 0 | 2 | 0 |
| Slovakya | 47 | — | 0 | 19 | 7 | 0 | 0 |
| Macaristan | — | — | 0 | 0 | 0 | 0 | 0 |
| Romanya | — | — | 0 | 10 | 2 | 0 | 0 |
| Bulgaristan | 218 | — | 0 | 11 | 0 | 0 | 0 |
| Yunanistan | — | — | 0 | 0 | 0 | 0 | 0 |
| Portekiz | — | — | 0 | 0 | 0 | 0 | 0 |
| İrlanda | 16 | 16 | 0 | 15 | 0 | 0 | 0 |
| Danimarka | 18 | 18 | 0 | 6 | 4 | 0 | 2 |
| İsveç | 19 | 19 | 0 | 0 | 0 | 18 | 0 |
| Finlandiya | 14 | 14 | 0 | 0 | 0 | 13 | 0 |
| Estonya | — | — | 0 | 0 | 0 | 0 | 0 |
| Letonya | — | — | 0 | 0 | 0 | 0 | 0 |
| Litvanya | — | — | 0 | 0 | 0 | 0 | 0 |
| Lüksemburg | 43 | 43 | 0 | 42 | 4 | 0 | 0 |
| Malta | 37 | 37 | 0 | 36 | 1 | 0 | 0 |
| Kıbrıs | 23 | 23 | 0 | 0 | 2 | 0 | 0 |
| Slovenya | 29 | 29 | 0 | 7 | 5 | 12 | 1 |
| Hırvatistan | 23 | — | 0 | 0 | 0 | 0 | 0 |
| AB-27 | 16197 (katman toplamı; tekil değil) | 316 (DB adlı SOURCE_VERIFIED/VERIFIED; sicil toplamı değil) | activityVerified ayrı | aday ayrı | aday ayrı | aday ayrı | locker ayrı |

## Thirteen answers

1. Named rows in v3 DB: 389 (316 SOURCE_VERIFIED/VERIFIED, 73 candidates). Register-layer sum of known countries is not unique companies.
2. Unique named verified legal in DB: 316. v1 43 preserved.
3. National posts: 27 (UPU 15 Feb 2025).
4. Private national: country register named rows; not a completed EU census.
5. International brands: docs for DHL/UPS/GLS only. Country presence is affiliate-row based, not 27-country own-fleet.
6. Regional/local: letter/correspondence/PEV/AKOS local classes + RESEARCH_CANDIDATE examples.
7. Locker/PUDO named rows: 15. Separate table.
8. Largest official layers: DE Stammnr 7183, ES inscriptions 4734, IT sequential 3722, BG 218 registered / 87 active-in-year. Those are not ranked last-mile quality.
9. Coverage gap: postal-code UNKNOWN in all 27. EE/LV/LT/HU/EL/NL/PL/PT bulk still incomplete.
10. API-ready only after contract: DHL Parcel DE, UPS, GLS ShipIT — OFFICIAL_API_DOCUMENTED.
11. Contract required: all of the above. SANDBOX_VERIFIED false.
12. First order after contracts: DHL Parcel DE, GLS, UPS, one USP.
13. Still unverified: Austria 138, most local example names, parcel markets outside letter registers, live rates.

Austria 138: NOT_FOUND_IN_FETCHED_RTR_2024_REPORT.
