# MC13 executive report

**Date:** 7 November 2026 (Europe/Berlin)  
**Verified git (do not use MC12 report as source of truth):**  
- Branch: `cursor/ab27-carrier-inventory-c293`  
- Live HEAD at MC13 start: `c3c629b9` (v9 already on origin; MC12 end was `facbf92e`)  
- Origin at start of this command: in sync (0 ahead). MC12 “5 unpushed” is stale.  
- Working from: `c3c629b9`  
**Push this command:** not performed (MC13 forbids push).  

v1–v8 JSON and MC10–MC12 reports were not modified. v9 from this morning is preserved. v10 adds independent evidence flags, API functionality matrix, sandbox readiness, many-to-many supplier–carrier.

## Counts (old vs this run)

| Metric | MC12 / v8 report | v9 (07:25 Europe/Berlin) | MC13 / v10 |
| --- | ---: | ---: | ---: |
| Named rows | 1602 | 1602 | 1602 |
| Unique legal keys | 1465 | 1465 | 1465 |
| Register-layer | 17453 | 17453 | 17453 |
| New legal names this command | — | 0 | **0** |
| New local/regional independently verified | — | 0 | **0** |
| Existing LOCAL/REGIONAL/LAST_MILE/SAME_DAY class rows | (taxonomy) | | 17 |
| Parcel independently verified | 0 | 0 | 0 |
| Last-mile independently verified | 0 | 0 | 0 |
| Own fleet independently verified | 0 | 0 | 0 |
| Subcontractor network independently verified | 0 | 0 | 0 |
| Postcode countries verified | 0/27 | 0/27 | 0/27 |
| API documentation entries | 12 | 16 | 16 |
| Adapter design ready | — | — | 16 |
| MOCK_TESTED | 3 shared | 3 | 3 |
| SANDBOX_READY | 0 | 0 | 0 |
| SANDBOX_VERIFIED | 0 | 0 | 0 |
| Live usable | 0 | 0 | 0 |

No invented company names. Existing local class rows are **not** new finds and **not** parcel-verified.

## Answers

1. New legal companies verified this command: **0**  
2. New local/regional independently verified: **0** (existing class rows: 17, listed in LOCAL_REGIONAL_CARRIERS.csv)  
3. Parcel independently verified: **0**  
4. Last-mile independently verified: **0**  
5. Own fleet independently verified: **0**  
6. Subcontractor networks independently verified: **0**  
7. Countries with postcode coverage verified: **0 / 27**  
8. API documentation entries: **16**  
9. Adapter design ready: **16** (shared mock adapter)  
10. Mock-tested (DHL/GLS/UPS shared adapter): **3**  
11. Sandbox-ready (credentials in hand): **0**  
12. Sandbox tests actually successful: **0**  
13. Live usable today: **0**  
14. Top blockers: HU Excel; PT 403; LT Power BI; RO TLS; AT §25 SPA; licensed postcode ingest; independent parcel evidence for named firms; UKE/EETT/ACM class≠service; sandbox credentials; local-name invention forbidden so empty new-name list.

Sales and live shipment remain closed. `buzzard_guardian.sqlite3` not committed.
