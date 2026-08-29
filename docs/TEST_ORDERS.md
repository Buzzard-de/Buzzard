# Test Orders (Part 9)

While `BUZZARD_SALES_ENABLED=0`, storefront checkout creates:

| Type | Use |
|------|-----|
| `READINESS_TEST` | Default storefront submit (Part 9) |
| `DRY_RUN` | Quote preview / internal validation |
| `TEST_ORDER` | Explicit test type |
| `COMMERCIAL` | **Blocked** |

## Identification

Commerce orders include:

- `orderType` field
- `metadata.dryRun: true` for non-commercial
- `metadata.realMoneyMovement: false`

## Success page

`/checkout/erfolg/?order=<id>&source=commerce&type=READINESS_TEST`

Loads via `GET /api/commerce/orders/:id`.

## Critical test

Customer full flow with SALES=0 must result in:

- `commercialOrders = 0`
- `realPayment = false`
- `supplierOrders = 0`
