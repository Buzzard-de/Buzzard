# Module Integration Status

Columns: **code** / **test** / **production**. Production is never inferred from local tests.

| Module | Code | Test | Production | Notes |
| --- | --- | --- | --- | --- |
| Pusat | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | Facade over controlCenter / jobQueue / aiOrchestrator |
| AI memory | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | SQLite; cross-process proven in `test:ai` |
| Guardian | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | Execute-path deny; approval does not unlock sales |
| Approval center | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | Input hash bind; duplicate decide blocked |
| Specialist agents | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | Recommend only; no engine bypass |
| LLM providers | IMPLEMENTED | TESTED (stub) | BLOCKED | Live keys missing |
| Product engine | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | dry-run + ACTIVE reject |
| Product SoT | PARTIALLY_IMPLEMENTED | PARTIALLY_IMPLEMENTED | NOT_IMPLEMENTED | Kept closed |
| Catalog / 50-tree | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | Existing taxonomy + i18n tests |
| i18n 30 locales | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | `localeMarketRtl` + languageIndependence |
| Market 35 | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | `marketEngine` 35 markets |
| Pricing | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | Node canonical; Python split documented |
| Inventory | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | Fail-closed reserve |
| Supplier | PARTIALLY_IMPLEMENTED | TESTED (mock) | BLOCKED | `MockSupplierAdapter` |
| Order / PO | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | Draft ≠ send |
| Payment | PARTIALLY_IMPLEMENTED | TESTED (mock) | BLOCKED | No auto financial retry |
| Returns | PARTIALLY_IMPLEMENTED | PARTIALLY_IMPLEMENTED | NOT_IMPLEMENTED | Existing RMA; not live |
| Marketplace | PARTIALLY_IMPLEMENTED | TESTED (mock) | BLOCKED | Classified; publish blocked |
| Shipping / tracking | TESTED | PARTIALLY_IMPLEMENTED | BLOCKED | No live carrier; no invented GPS |
| Customer | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | Isolation on order + tracking |
| Admin / Control Center | PARTIALLY_IMPLEMENTED | PARTIALLY_IMPLEMENTED | NOT_IMPLEMENTED | APIs exist; UI not clicked |
| Storefront | PARTIALLY_IMPLEMENTED | PARTIALLY_IMPLEMENTED | NOT_IMPLEMENTED | UI unchanged; no browser pass |
| Search | PARTIALLY_IMPLEMENTED | TESTED (isolated) | NOT_IMPLEMENTED | In-memory helper only |
| Voice / digital human | PARTIALLY_IMPLEMENTED | TESTED (blocked) | BLOCKED | No call placed |
| Database | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | Additive software schema |
| API | PARTIALLY_IMPLEMENTED | PARTIALLY_IMPLEMENTED | NOT_IMPLEMENTED | New health routes; not full contract audit |
| Security | TESTED | PARTIALLY_IMPLEMENTED | NOT_IMPLEMENTED | Sales lock + guardian + isolation |
| Workers | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | No double-claim; expired lock recovery |
| CI | IMPLEMENTED | PARTIALLY_IMPLEMENTED | NOT_IMPLEMENTED | Workflow edited; run not observed |

## Wiring that was proven in code

1. `software.orders.createDraft` → pricing + inventory reliability + customs + sales lock.
2. `software.inventory.reserve` → `stockEngine.evaluateStockRecord`.
3. `software.tracking.getForCustomer` → customer id match only.
4. `software.marketplace.draftListing` → `pusat.integrations.marketplaceDraft`.
5. `/api/customer/tracking/:orderId` → `requireCustomer` then tracking isolation.
6. `/api/health/software` → `software.health(pusat.getHealth())`.
7. `db.js` → `migrateSoftwareCompletion()` after Pusat schema.

## Documented conflicts (not silently merged)

- Node `pricing.js` vs Python `MIN_NET_PROFIT=0.50`.
- Multiple product-create helpers vs `productCore.createProduct`.
- Pusat facade vs leftover orchestrator bridges (bridges remain health/legacy, not a second executor).
