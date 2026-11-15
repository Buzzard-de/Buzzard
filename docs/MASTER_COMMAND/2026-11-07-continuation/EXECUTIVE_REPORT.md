# Continuation 2026-11-07 (Europe/Berlin)

**Start HEAD:** `facbf92e` (MC12 v8, verified)  
**Working from:** `facbf92e`  
**Branch:** `cursor/ab27-carrier-inventory-c293`  
**Schema:** `buzzard.eu27-carrier-master.v9`  
**Sales / live shipment / sandbox e2e:** closed  

v1–v8 JSON and MC10–MC12 reports unchanged.

| Metric | MC12 frozen | This run |
| --- | ---: | ---: |
| Named rows | 1602 | 1602 |
| Unique legal keys | 1465 | 1465 |
| Register-layer | 17453 | 17453 |
| Active-business flags | 31 | 31 |
| Parcel independently verified | 0 | 0 |
| Last-mile / own-fleet verified | 0 / 0 | 0 / 0 |
| Postcode coverage countries | 0/27 | 0/27 |
| API documentation entries | 12 | 16 (+4 docs only) |
| Sandbox tests | 0 | 0 |
| Live usable | 0 | 0 |

Added official docs (maturity 1): DPD eSolutions, DPD Baltic REST (sandbox hostname documented, **not** tested), Austrian Post Group developer, FAN Courier selfAWB PDF.

Postcode portals documented (not ingested, not carrier coverage): Eurostat GISCO CC-BY-SA-4.0; RTR AT PLZ; FR data.gouv codes postaux; DE GovData OSM-derived listing; NL BAG/PDOK note.

HU Excel href still absent (sha16 `99d7bafe9497d404`).

**Answers:** unique legal 1465; active flags 31; parcel 0; last-mile 0; own fleet 0; subcontractor 0; postcode countries 0/27; API docs 16; mock tests see TEST_RESULTS; sandbox 0; live 0; COMPLETE_VERIFIED 0; blocked HU/PT/LT/RO.
