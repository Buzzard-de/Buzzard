# Buzzard 51-item remainder — 17 Nov 2026 (Europe/Berlin)

Local **CODE + TEST** only. Completed ✅ items were not rewritten. Live 🔴 connections stay off. Sales gate = **LOCKED**. **LIVE_VERIFIED** = no. **PRODUCTION_READY** = no.

Scorecard: `evaluateDevList51()` → **45 ✅ / 0 🟡 / 6 🔴 / 0 ⬜**

## Command

Finish remaining 🟡 and ⬜ items in order. Do not touch completed work. Do not open live TecDoc, supplier, payment, refund, Tax Connect, or carrier-rate connections.

## HEAD

- Branch: `cursor/dev-list-51-remainder-c293`
- Parent: `cursor/dry-order-draft-remainder-c293` (PR #504)
- Guardian SQLite: unused
- PR #492: not merged
- 17 taxonomy `REVIEW_REQUIRED`: not auto-approved
- Egress: DENY, unchanged

## 1–51

| No. | Item | Was | Now | In-repo meaning |
| ---: | --- | --- | --- | --- |
| 1 | 50 master categories | ✅ | ✅ | Untouched |
| 2 | 50 active shop categories | ✅ | ✅ | Untouched |
| 3 | Retired categories off the sales tree | ✅ | ✅ | Untouched |
| 4 | Hub categories | ✅ | ✅ | Untouched |
| 5 | Category names TR/DE/EN | ✅ | ✅ | Untouched |
| 6 | Product–category bind | 🟡 | ✅ | `bindProductCategory` maps `automotive/bremssystem`, refuses `automotive/brakes`, no PIM write |
| 7 | EAN / MPN / SKU | 🟡 | ✅ | Existing validators + brand normalizer, no invented IDs |
| 8 | Product media | 🟡 | ✅ | HTTPS + alt, placeholder and demo blocked, no CDN upload |
| 9 | Brand registry | 🟡 | ✅ | Alias normalizer, no extra sqlite write |
| 10 | Demo vs real | 🟡 | ✅ | `productOrigin`: DEMO / DRY_RUN / MOCK / SUPPLIER_CANDIDATE |
| 11 | Catalog publish | 🟡 | ✅ | Demo publish `SKIPPED_DEMO`; sales stay off |
| 12 | Search and sort | 🟡 | ✅ | In-memory search/sort; OpenSearch not live |
| 13 | Supplier registry | 🟡 | ✅ | Adapter registry, orders disabled |
| 14 | API supplier | 🟡 | ✅ | Dry-run adapter, network blocked |
| 15 | XML supplier | 🟡 | ✅ | Dry-run adapter, network blocked |
| 16 | CSV supplier | 🟡 | ✅ | Dry-run adapter, network blocked |
| 17 | Auto import | 🟡 | ✅ | Feed import dry-run, no PIM write |
| 18 | Category mapping | 🟡 | ✅ | Active-catalog mapper, no unmapped guess |
| 19 | Live TecDoc | 🔴 | 🔴 | Mock only |
| 20 | Live supplier | 🔴 | 🔴 | Credentials/live import stay off |
| 21 | Price engine | 🟡 | ✅ | `quoteCommercialPrice`, `livePriceWrite: false` |
| 22 | Stock engine | 🟡 | ✅ | `deriveStockStatus`, no invented stock |
| 23 | Price/stock update | 🟡 | ✅ | Commercial dry run `READY_FOR_REVIEW` |
| 24 | Profit / cost | 🟡 | ✅ | Estimated vs realized; unreimbursed return is not realized |
| 25 | Cart price check | 🟡 | ✅ | Client price tamper rejected |
| 26 | Order status | 🟡 | ✅ | Transition table, no commercial create |
| 27 | Order engine | 🟡 | ✅ | Dry drafts, `payment.captured: false` |
| 28 | Take payment | 🔴 | 🔴 | Capture refused, sales locked |
| 29 | Return request | 🟡 | ✅ | Isolated dry RMA, no money |
| 30 | Real money refund | 🔴 | 🔴 | `REAL_REFUND_BLOCKED` |
| 31 | Coupons | 🟡 | ✅ | Server-authoritative, client discount rejected |
| 32 | Order automation | 🟡 | ✅ | Exists; jobs stay behind approval |
| 33 | AB-27 VAT | ✅ | ✅ | Untouched |
| 34 | Unknown-country VAT | ✅ | ✅ | Untouched (`VAT_UNKNOWN`) |
| 35 | 26-country tax pool | 🟡 | ✅ | Isolated ledger, 25% of net, DE refused |
| 36 | Germany tax path | 🟡 | ✅ | Separate UNVERIFIED ledger, not in the 26-pool, no ELSTER |
| 37 | Tax Connect live | 🔴 | 🔴 | `TAX_CONNECT_BLOCKED` |
| 38 | No auto-approve without sanctions | ✅ | ✅ | Untouched |
| 39 | Extra-EU / high value review | ✅ | ✅ | Untouched |
| 40 | Carrier master data | 🟡 | ✅ | Brand + EU-27 post profiles, `live: false` |
| 41 | Live carrier rates | 🔴 | 🔴 | No live shop |
| 42 | Auto shipment | 🟡 | ✅ | `createShipment` → `HUMAN_GATE_REQUIRED`, `liveShipment: false` |
| 43 | Tracking | 🟡 | ✅ | Mock status map only |
| 44 | Address verification | ⬜ | ✅ | Local EU-27 rules, Packstation, PO-box block for parcels, no postal API |
| 45 | Return logistics | 🟡 | ✅ | Dry timeline, refunds not assumed |
| 46 | 30 locales + hreflang | ✅ | ✅ | Untouched |
| 47 | Language independent of country | ✅ | ✅ | Untouched |
| 48 | Country independent of language | ✅ | ✅ | Untouched |
| 49 | Product content in 30 languages | 🟡 | ✅* | Envelope for all 30 keys. de native, en/tr/ar authored for the brake-pad sample, others MACHINE. **Not professional.** |
| 50 | Arabic RTL storefront | 🟡 | ✅* | `dir=rtl` contract + existing `rtl.css`. Visual QA of every page is not claimed |
| 51 | Sales gate | ✅ | ✅ | `LOCKED` |

\* 49 and 50 are **CODE_COMPLETE** software. They are not a translator sign-off or a pixel-perfect RTL audit.

## New files (this pass)

- `server/lib/pim/productOrigin.js`
- `server/lib/pim/productCategoryBind.js`
- `server/lib/pim/mediaReadiness.js`
- `server/lib/pim/productContentI18n.js`
- `server/lib/pim/catalogSearchSort.js`
- `server/lib/logistics/addressVerification.js`
- `server/lib/commerce/germanyTaxPath.js`
- `server/lib/commerce/taxPoolLedger.js`
- `server/lib/commerce/dryReturnRequest.js`
- `server/lib/i18n/rtlDir.js`
- `server/lib/platform/devList51.js`
- `server/__tests__/devList51Remainder.test.mjs`

## Tests — 17 Nov 2026, 16:56 Europe/Berlin

```
npm run lint                         # clean
npm run typecheck                    # tsc --noEmit exit 0
npx vitest run server/__tests__/devList51Remainder.test.mjs   # 9 passed
npm run test:unit                    # 119 files, 859 passed
```

Protected `server/data/buzzard.db` mtime/size unchanged in the 51-item test. Playwright was not re-run (no UI rewrite, no browser cache).

## Still gated on purpose

Live TecDoc, live supplier, live payment, real refund, Tax Connect/ELSTER, live carrier rates, professional 30-language product copy, main merge, deploy, sales enable, PR #492, taxonomy auto-approve.

## Honest close

In-repo 51-item remainder: **100% of software that this command was allowed to finish.**

Live world: **not** 100%. The six 🔴 rows stay 🔴.
