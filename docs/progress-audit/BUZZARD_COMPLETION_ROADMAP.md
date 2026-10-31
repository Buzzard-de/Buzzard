# Buzzard Completion Roadmap

Baseline `84166bb`. Current: technical **46.5%**, operational **16.2%**, sales **8.1%**.

## Critical path (do not skip)

```
PIM SoT (C39=0)
  → Supplier dry-run then live import (D41)
    → Unified pricing on checkout (E62) + fail-closed stock (D55)
      → Payment sandbox (F73/F74)
        → One paid order + supplier PO (F69/F77)
          → Refund/recovery (F82) + one carrier (H98)
            → Then first marketplace (G)
              → Then AI bind (I) / extras (J)
```

Empty SoT blocks sellable catalog, AI usefulness, feeds, and sales unlock.  
Missing supplier blocks dropship.  
Fragmented pricing blocks profit.  
Mock payment blocks real checkout.  
Blocked PO blocks fulfillment.  
Missing recovery blocks honest finance.  
Missing carrier blocks real shipping.  
Missing CI tests reduce confidence (parallel, not on critical sales path).  
`/tmp` AI DBs block reliable automation.

## Prioritized remaining work

| Milestone | Target | What must be true | Approx systems moved |
|-----------|--------|-------------------|----------------------|
| **25% operational** | already 16.2% ops | — | Infra/storefront already contribute |
| **50% technical** | now 46.5% | Maintain; do not chase P5–P9 first | — |
| **50% operational** | from 16.2% | SoT with ACTIVE SKUs + supplier dry-run verified + CI unit | C, D, M |
| **75% technical** | | Checkout uses €0.50; stock fail-closed; payment sandbox; return API aligned | E, F |
| **75% operational** | | One sandbox paid order + webhook + supplier dry PO | F, D |
| **90% technical** | | One EU channel sandbox + one real carrier + AI durable memory | G, H, I |
| **90% operational** | | Same, in production (sales still may stay off) | |
| **100% commercial** | | All PRODUCTION_READINESS 14 conditions + human unlock | N |

100% commercial is **not** “all competitor features.” Voice/Zalando/FBB/WMS remain optional (J/G extras).  
100% of *defined platform A–M* still requires EU connectors and voice if those stay in scope. If voice is descoped, document weight transfer (currently 2%).

## Completion criteria

| Level | Criteria (must all hold) |
|-------|--------------------------|
| 25% ops | Live site + API + persistent DB (met) |
| 50% ops | productCount>0 from PIM; supplier dry-run report; CI runs unit tests |
| 75% tech | €0.50 on publish+cart; reservation or fail-closed; webhook foundation tested |
| 75% ops | Sandbox payment + 1 order row + no mock-only for that test env |
| 90% | One carrier tracking URL; one channel sandbox; AI DB not `/tmp` |
| 100% sales | Human approval; DE VAT invoice; refunds not assumed from supplier; e2e purchase **RUN**; flags changed only by human |

## Do not do first

Digital human, native apps, Zalando, own warehouse, fake GPS, opening sales with 0 products.
