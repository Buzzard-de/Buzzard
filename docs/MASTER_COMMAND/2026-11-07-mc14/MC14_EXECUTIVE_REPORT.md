# MC14 executive report

**Date:** 7 November 2026 (Europe/Berlin)  
**Branch:** `cursor/ab27-carrier-inventory-c293`  
**Start HEAD:** `a93380ae` (MC13 v10, local; MC13 forbade push)  
**This command:** local commit only. **No push, merge, deploy, live shipment, sales, or production writes.**

v1–v10 JSON and MC10–MC13 reports were not modified. v11 wraps v10 on the **existing v5 logistics engine** (no second stack). Hermes Germany HSI public docs added (maturity 1). No new legal names.

## What actually runs vs mock

| Surface | Status |
| --- | --- |
| Named census load (1602 / 1465 keys) | WORKS (frozen inventory) |
| Shared adapter mock ops (validate, track mock, coverage UNKNOWN) | MOCK_READY |
| Live createShipment / generateLabel / pickup | BLOCKED (CODE_READY_MOCK) |
| Selection | WORKS as HOLD: no autoselect if coverage ≠ POSTCODE_LEVEL |
| Webhook HMAC + replay window | WORKS in unit tests (no live intake) |
| Returns | MOCK; supplier refund never assumed |
| Germany pilot | MOCK/CODE_READY; **not** SANDBOX_READY |
| Postcode files | Shape rules only; **0/27 ingested** |
| Sandbox HTTP | **0** |
| Live usable carriers | **0** |

## Counts (MC13 freeze vs MC14)

| Metric | MC13 / v10 | MC14 / v11 |
| --- | ---: | ---: |
| Named rows | 1602 | 1602 |
| Unique legal keys | 1465 | 1465 |
| Register-layer | 17453 | 17453 |
| New legal names this command | 0 | **0** |
| Parcel independently verified | 0 | 0 |
| Last-mile independently verified | 0 | 0 |
| Own fleet independently verified | 0 | 0 |
| Subcontractor independently verified | 0 | 0 |
| Postcode countries verified | 0/27 | **0/27** |
| API documentation entries | 16 | **17** (Hermes HSI added) |
| Adapter design ready | 16 | 17 |
| MOCK_TESTED | 3 | **3** (DHL/GLS/UPS shared adapter) |
| SANDBOX_READY | 0 | 0 |
| SANDBOX_VERIFIED | 0 | 0 |
| Live usable | 0 | **0** |

Hermes docs ≠ mock test ≠ sandbox. DPD eSolutions remains maturity 1.

## First sandbox after contract (not obtained)

**DHL Parcel DE** — public Parcel DE Shipping API + existing MOCK_TESTED adapter. Still `CONTRACT_AND_DEVELOPER_ACCOUNT_REQUIRED`. No application filed.

## Sales / live

Sales closed. Live shipment disabled. No customer notifications sent. `buzzard_guardian.sqlite3` not committed.
