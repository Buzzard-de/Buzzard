# Test results — MC10 / v6

**Run:** 6 November 2026 07:31 UTC (08:31 Europe/Berlin)  
**Command:** `npx vitest run server/__tests__/eu27CarrierMaster.test.mjs` … `V2` … `V6`  
**Result:** 6 files, **39 passed / 39**, 0 failed.

| Suite | Tests |
| --- | ---: |
| v1 `eu27CarrierMaster.test.mjs` | 6 |
| v2 | 11 |
| v3 | 6 |
| v4 | 6 |
| v5 | 6 |
| v6 | 4 |

v6 covers: v1–v5 preservation; COMPLETE_VERIFIED=0; live=0; sandbox=0; Eurostat 2024=224523 and 197424 not reproduced; ownFleetVerified=0; networkRole present; DHL/GLS/UPS LEVEL 2; adapter errors (address, size, postcode, outage, timeout, live block); webhook HMAC + replay; idempotency; returns without assumed refund; security stored secrets 0; Pusat hold; sales closed.

No live order, label, or shipment was created. Failed tests were not hidden (one accessConditions miss was fixed before this run).
