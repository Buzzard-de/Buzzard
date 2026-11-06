# MC11 executive report

**Date:** 6 November 2026 (Europe/Berlin)  
**Branch:** `cursor/ab27-carrier-inventory-c293`  
**HEAD at start:** `df3c7a95` (verified)  
**This report generated from:** `df3c7a95` + local MC11 work  
**Schema:** `buzzard.eu27-carrier-master.v7`  
**Push / merge / deploy / live shipment:** none  

v1–v6 JSON and MC10 reports are unchanged. v7 adds evidence profiles, supplier/carrier split, coverage-license matrix, MC11 API maturity (0–5), and official-source access probes with TLS left on.

`buzzard_guardian.sqlite3` was inspected read-only (empty Guardian tables) and was not committed.

## Layered counts (do not merge)

| Metric | Value |
| --- | ---: |
| Register-layer records | 17453 |
| Named entities | 1602 |
| Unique legal keys | 1465 |
| Active-business flags | 31 |
| Parcel-service verified | 0 |
| Last-mile verified | 0 |
| Own-fleet verified | 0 |
| Subcontractor networks verified | UNKNOWN (count of verified evidence: 0) |
| National postal USP rows | 27 |
| Private national class rows | 75 |
| Regional class rows | 4 |
| Local courier class rows | 10 |
| International brand×country ops | 64 |
| Locker networks | 14 |
| PUDO networks | 6 |
| Postcode coverage verified countries | 0 / 27 |
| API documentation entries (catalog) | 7 |
| Sandbox tests successful | 0 |
| Live usable carriers | 0 |
| COMPLETE_VERIFIED countries | 0 |

Eurostat H53 and ELA remain in v6 `naceStatistics` and are **not** added into these counts.

v6 freeze vs v7: named 1602=1602, keys 1465=1465, layer 17453=17453. No new invented legal names.

## Answers

1. Unique legal companies in this sourced set: **1465** keys (1602 named rows). Not the EU-27 universe.
2. Active business independently verified: **31** flags. Not a market census.
3. Parcel transport independently verified: **0** (UNKNOWN not shown as a made-up positive).
4. Last-mile independently verified: **0**.
5. Own fleet proven: **0**.
6. Postcode coverage verified countries: **0 / 27**.
7. API documentation entries: **7** (3 priority + additional national docs; EETT eRegistry in v4 is a register API, not shipping).
8. Mock tests: **45/45** vitest cases (v1–v7). Sandbox e2e is not included.
9. Sandbox tests successful: **0**.
10. Live usable under contract+tech: **0**.
11. Largest gaps: HU Excel href; PT 403/timeout; LT Power BI; RO TLS; licensed postcode ingest; own-fleet evidence; remaining UKE/EETT/ACM classification; sandbox credentials; §25 AT Anzeige; local/regional names without invention.

First contract talks remain DHL Parcel DE, GLS ShipIT, UPS Developer (MC11 maturity 3 = mock only).
