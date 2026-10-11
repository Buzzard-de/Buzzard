# Module Integration Status

Columns: **code** / **test** / **production**. Production is never inferred from local tests.

| Module | Code | Test | Production | Notes |
| --- | --- | --- | --- | --- |
| Pusat | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | Facade over controlCenter / jobQueue / aiOrchestrator |
| AI memory | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | SQLite; cross-process proven in `test:ai` |
| Guardian | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | Execute-path deny; approval does not unlock sales |
| Approval center | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | Input hash bind; admin `/api/admin/approvals` 200 with auth |
| Specialist agents | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | Recommend only; no engine bypass |
| LLM providers | IMPLEMENTED | TESTED (stub) | BLOCKED | Live keys missing |
| Product engine | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | dry-run + ACTIVE reject; import dry-run validation stage |
| Product SoT | PARTIALLY_IMPLEMENTED | PARTIALLY_IMPLEMENTED | NOT_IMPLEMENTED | Kept closed |
| Catalog / 50-tree | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | Homepage 50 tiles Playwright; local public PIM rows exist |
| i18n 30 locales | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | Playwright DE/EN/TR/FR/AR + `dir=rtl` for AR |
| Market 35 | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | locale ≠ market on homepage controls |
| Pricing | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | Node canonical; price-tamper e2e |
| Inventory | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | Fail-closed reserve |
| Supplier | PARTIALLY_IMPLEMENTED | TESTED (mock) | BLOCKED | `MockSupplierAdapter` |
| Order / PO | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | Draft ≠ send; commercial attempt blocked; READINESS_TEST only |
| Payment | PARTIALLY_IMPLEMENTED | TESTED (mock) | BLOCKED | No auto financial retry |
| Returns | PARTIALLY_IMPLEMENTED | PARTIALLY_IMPLEMENTED | NOT_IMPLEMENTED | Existing RMA; not live |
| Marketplace | PARTIALLY_IMPLEMENTED | TESTED (mock) | BLOCKED | Classified; publish blocked |
| Shipping / tracking | TESTED | PARTIALLY_IMPLEMENTED | BLOCKED | No live carrier; no invented GPS |
| Customer | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | Isolation on order + tracking + cart IDOR e2e |
| Admin / Control Center | PARTIALLY_IMPLEMENTED | PARTIALLY_IMPLEMENTED | NOT_IMPLEMENTED | APIs verified; Control Center UI not |
| Storefront | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | Static `:3040` homepage 18/18; not production Pages |
| Search | PARTIALLY_IMPLEMENTED | PARTIALLY_IMPLEMENTED | NOT_IMPLEMENTED | Mobile search route Playwright; software helper isolated |
| Voice / digital human | PARTIALLY_IMPLEMENTED | TESTED (blocked) | BLOCKED | No call placed |
| Database | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | Additive software schema |
| API | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | Health + commerce + admin overview |
| Security | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | Sales lock + guardian + isolation + tamper e2e |
| Workers | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | No double-claim; expired lock recovery |
| CI | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | `quality` SUCCESS observed; does not run unit/e2e |

## Wiring that was proven in code

1. `software.orders.createDraft` → pricing + inventory reliability + customs + sales lock.
2. `software.inventory.reserve` → `stockEngine.evaluateStockRecord`.
3. `software.tracking.getForCustomer` → customer id match only.
4. `software.marketplace.draftListing` → `pusat.integrations.marketplaceDraft`.
5. `/api/customer/tracking/:orderId` → `requireCustomer` then tracking isolation.
6. `/api/health/software` → `software.health(pusat.getHealth())`.
7. `db.js` → `migrateSoftwareCompletion()` after Pusat schema.
8. `/api/commerce/checkout/attempt` → diagnostic block when demo SKU hidden and sales off.
9. Cart / coupon / IDOR / READINESS_TEST → live local API `:3001`.

## Documented conflicts (not silently merged)

- Node `pricing.js` vs Python `MIN_NET_PROFIT=0.50`.
- Multiple product-create helpers vs `productCore.createProduct`.
- Pusat facade vs leftover orchestrator bridges (bridges remain health/legacy, not a second executor).
- Demo SKU not storefront-visible vs older e2e that queried `q=BZ-CORE`.
