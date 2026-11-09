# Buzzard AB-27 logistics acceptance

**Date:** 5 November 2026 (Europe/Berlin)  
**Branch:** `cursor/ab27-carrier-inventory-c293`  
**Schema:** `buzzard.eu27-carrier-master.v1`  
**Sales / live shipment / push:** no

## Country table

Official register ≠ active last-mile. 25 countries: register not accessed.

| Country | Official register | Active verified legal (this snapshot) | National post | Other verified | Regional | Status |
|---|---:|---:|---:|---:|---:|---|
| Germany | 7183 observed | 8 | 1 | 7 | 2 | PARTIAL_REGISTER_FETCH |
| France | NOT_ACCESSED | 1 | 1 | 0 | 0 | KISMEN_DOGRULANDI |
| Italy | NOT_ACCESSED | 1 | 1 | 0 | 0 | KISMEN_DOGRULANDI |
| Spain | NOT_ACCESSED | 1 | 1 | 0 | 0 | KISMEN_DOGRULANDI |
| Netherlands | NOT_ACCESSED | 1 | 1 | 0 | 0 | KISMEN_DOGRULANDI |
| Belgium | NOT_ACCESSED | 1 | 1 | 0 | 0 | KISMEN_DOGRULANDI |
| Austria | NOT_ACCESSED | 1 | 1 | 0 | 0 | KISMEN_DOGRULANDI |
| Poland | NOT_ACCESSED | 1 | 1 | 0 | 0 | KISMEN_DOGRULANDI |
| Czechia | NOT_ACCESSED | 1 | 1 | 0 | 0 | KISMEN_DOGRULANDI |
| Slovakia | NOT_ACCESSED | 1 | 1 | 0 | 0 | KISMEN_DOGRULANDI |
| Hungary | NOT_ACCESSED | 1 | 1 | 0 | 0 | KISMEN_DOGRULANDI |
| Romania | NOT_ACCESSED | 1 | 1 | 0 | 0 | KISMEN_DOGRULANDI |
| Bulgaria | NOT_ACCESSED | 1 | 1 | 0 | 0 | KISMEN_DOGRULANDI |
| Greece | NOT_ACCESSED | 1 | 1 | 0 | 0 | KISMEN_DOGRULANDI |
| Portugal | NOT_ACCESSED | 1 | 1 | 0 | 0 | KISMEN_DOGRULANDI |
| Ireland | NOT_ACCESSED | 1 | 1 | 0 | 0 | KISMEN_DOGRULANDI |
| Denmark | 18 | 10 | 1 | 9 | 0 | REGISTER_TABLE_PUBLISHED |
| Sweden | NOT_ACCESSED | 1 | 1 | 0 | 0 | KISMEN_DOGRULANDI |
| Finland | NOT_ACCESSED | 1 | 1 | 0 | 0 | KISMEN_DOGRULANDI |
| Estonia | NOT_ACCESSED | 1 | 1 | 0 | 0 | KISMEN_DOGRULANDI |
| Latvia | NOT_ACCESSED | 1 | 1 | 0 | 0 | KISMEN_DOGRULANDI |
| Lithuania | NOT_ACCESSED | 1 | 1 | 0 | 0 | KISMEN_DOGRULANDI |
| Luxembourg | NOT_ACCESSED | 1 | 1 | 0 | 0 | KISMEN_DOGRULANDI |
| Malta | NOT_ACCESSED | 1 | 1 | 0 | 0 | KISMEN_DOGRULANDI |
| Cyprus | NOT_ACCESSED | 1 | 1 | 0 | 0 | KISMEN_DOGRULANDI |
| Slovenia | NOT_ACCESSED | 1 | 1 | 0 | 0 | KISMEN_DOGRULANDI |
| Croatia | NOT_ACCESSED | 1 | 1 | 0 | 0 | KISMEN_DOGRULANDI |
| **AB-27** | DE 7183 + DK 18 + 25 unknown | **43 verified legal rows** | 27 | — | — | **not fully verified** |

DE 8 = USP + 7 BNetzA-named networks (not 7183 locals). DK 10 = USP + 9 named licenses (register lists 18).

## Ten answers

1. **Verified distinct legal entities in this snapshot:** 43. Not the EU population of all licensed posts.  
2. **Per-country activity:** only DE (named + 7183 register rows observed) and DK (18 licenses) have register-backed counts. Others: 1 USP verified via UPU, last-mile others NOT_VERIFIED.  
3. **Multi-country brands:** PostNord (SE group vs DK Post Danmark A/S), GLS/DHL/UPS/FedEx operate via **country legal entities** — counted separately.  
4. **Direct API ready:** 0. Public developer portals exist for several brands; no Buzzard sandbox credential.  
5. **Contract required:** treat as YES for all commercial APIs until a signed account exists.  
6. **File/manual:** most national posts and local couriers — NOT_VERIFIED channel.  
7. **Phase-1 technical adapters (still BLOCKED live):** Deutsche Post/DHL, DPD, GLS, UPS, Hermes (DE register), PostNL, La Poste/Colissimo, country USP.  
8. **Coverage gaps:** 25 NRA registers unread; CY/MT/small markets last-mile unverified; Amazon/InPost/Packeta still candidates.  
9. **Still unverified:** VAT, dimensions, lockers, loss rates, live prices, full DE local-name export as active carriers.  
10. **Needed to go live:** carrier contracts + sandbox keys, NRA register dumps for 25 countries, egress exception only if approved, no sales enable.

## Tests

`npx vitest run server/__tests__/eu27CarrierMaster.test.mjs` — 6 passed this run.

## Files

- `data/logistics/eu27_carrier_master.v1.json`
- `server/lib/logistics/*`
- this folder
