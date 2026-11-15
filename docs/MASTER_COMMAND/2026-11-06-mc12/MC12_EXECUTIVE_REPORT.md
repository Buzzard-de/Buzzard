# MC12 executive report

**Date:** 6 November 2026 (Europe/Berlin)  
**Branch:** `cursor/ab27-carrier-inventory-c293`  
**Start HEAD (verified):** `7db1c4f5`  
**Working from:** `7db1c4f5`  
**Schema:** `buzzard.eu27-carrier-master.v8`  
**Push / merge / deploy / live shipment / sales:** none  

v1–v7 JSON and MC10–MC11 reports were not modified. v8 extends the same engine: service-verification ladder, coverage granularity COUNTRY_LEVEL / POSTCODE_LEVEL / UNKNOWN, extra official API URLs at MC11 maturity 1, selection explanations (no invented price/ETA, international brand not auto-preferred).

## MC11 baseline vs this run

| Metric | MC11 frozen | This run |
| --- | ---: | ---: |
| Named rows | 1602 | 1602 |
| Unique legal keys | 1465 | 1465 |
| Register-layer | 17453 | 17453 |
| Active-business flags | 31 | 31 |
| Parcel independently verified | 0 | 0 |
| Postcode countries verified | 0/27 | 0/27 |
| API documentation entries | 7 | 12 (delta +5; docs only) |
| Sandbox tests | 0 | 0 |

No new named legal entities were invented or ingested.

## Answers

1. Unique legal keys in this sourced set: **1465** (1602 named rows). Not the EU-27 universe.
2. Active-business flags: **31**.
3. Parcel transport independently verified: **0**.
4. Last-mile independently verified: **0**.
5. Own fleet proven: **0**.
6. Subcontractor networks independently verified: **0** (UNKNOWN as a market size).
7. Postcode coverage verified countries: **0 / 27** (all granularity UNKNOWN).
8. Official API documentation entries in catalog: **12**.
9. Mock tests: **51/45 previous + 6 new = 51/51** vitest (v1–v8). Not sandbox e2e.
10. Sandbox tests passed: **0**.
11. Live contract-ready carriers Buzzard can use today: **0**.
12. Largest 10 blockers: HU Excel href; PT ANACOM 403; LT Power BI; RO TLS; AT §25 SPA not extracted; UKE remaining pages; EETT licence≠last-mile; ACM letter≠parcel proof; licensed postcode ingest; sandbox credentials.
13. Complete: **0**. Blocked registers: HU, PT, LT, RO. Partial names/register: AT, HR, NL, PL, EL and remaining EU-27 (USP + prior layers, not COMPLETE_VERIFIED).

`buzzard_guardian.sqlite3` was not written.
