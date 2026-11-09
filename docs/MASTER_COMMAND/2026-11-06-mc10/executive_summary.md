# MC10 executive summary

**Date:** 6 November 2026 (Europe/Berlin)  
**Branch:** `cursor/ab27-carrier-inventory-c293`  
**HEAD at start of this command (verified):** `9ded6157`  
**Schema:** `buzzard.eu27-carrier-master.v6`  
**COMPLETE_VERIFIED:** 0  
**Live carriers:** 0  
**Sandbox verified:** 0  
**Push:** not performed  

v1–v5 files kept. v6 adds networkRole, adapter errors, webhook/replay/idempotency, returns workflow, security policy. No second logistics stack.

v5 recount vs prior report: entities 1602=1602, keys 1465=1465, activityVerified 31=31, USP 27, lockers 14, PUDO 6, ops 64. Register layer sum live **17453** vs previously reported **17452** (HR overlay 24 vs 23).

# Executive answers (do not mix layers)

1. **Register-layer records (sum of country register.records, not unique companies):** 17453 (prior report 17452; live delta +1 from HR overlay 24 vs 23).
2. **Unique legal keys among source-verified named entities:** 1465 (named rows 1602). This is not the EU-27 universe.
3. **Active parcel carriers independently verified:** UNKNOWN as a market census. `activityVerified` flags: 31. networkRole ACTIVE_BUSINESS_VERIFIED: 24. PARCEL_SERVICE_VERIFIED companies: 0 (field default UNKNOWN).
4. **Own-fleet verified carriers:** 0 (not UNKNOWN-as-zero: evidence absent).
5. **Subcontractor networks independently counted:** UNKNOWN (not inferred from register class).
6. **National postal USP rows:** 27 (one designated operator per EU-27 in this seed; not 27 verified parcel last-mile networks).
7. **Private national class rows (PRIVATE_PARCEL + PRIVATE_EXPRESS + NATIONAL_PARCEL_LETTER):** 75. Not all parcel-service verified.
8. **International brand×country operation rows:** 64. Distinct brands in that table: 15. Not 64 companies and not 64 own fleets.
9. **Regional class rows:** 4.
10. **Local courier class rows:** 10.
11. **Last-mile / same-day class rows:** 3. EETT/ACM/UKE rows are not last-mile companies.
12. **Locker networks:** 14 (unchanged from v5).
13. **PUDO networks:** 6 (unchanged from v5).
14. **API documents in priority catalog:** 4 (DHL Parcel DE, GLS, UPS) — LEVEL 2 each.
15. **Sandbox tests successful:** 0.
16. **Countries with carrier postcode coverage verified:** 0 / 27.
17. **COMPLETE_VERIFIED countries:** 0.
18. **Live carriers Buzzard can technically use today:** 0.
19. **First contract talks (documents found, no sandbox):** DHL Parcel DE, GLS ShipIT, UPS Developer — still CONTRACT_REQUIRED.
20. **Largest gaps:** HU NMHH Excel href absent; PT ANACOM 403 + login wall; LT RRT Power BI; RO ANCOM TLS (no insecure bypass); licensed postcode files; own-fleet evidence; sandbox credentials.

UNKNOWN values are not shown as zero except where a count of verified evidence is explicitly 0 (own-fleet verified, sandbox, live, COMPLETE_VERIFIED).

