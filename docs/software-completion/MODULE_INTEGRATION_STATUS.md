# Module Integration Status

Columns: **code** / **test** / **production**. Production is never inferred from local tests.

| Module | Code | Test | Production | Notes |
| --- | --- | --- | --- | --- |
| Pusat | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | Facade over controlCenter / jobQueue / aiOrchestrator |
| AI memory | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | SQLite; cross-process proven in `test:ai` |
| Guardian | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | Execute-path deny; approval does not unlock sales |
| Approval center | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | Input hash bind; admin `/api/admin/approvals` 200 with auth |
| Specialist agents | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | Recommend only; extra returns/shipping/marketplace/i18n/health assistants |
| LLM providers | IMPLEMENTED | TESTED (stub) | BLOCKED | Live keys missing |
| Product engine | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | dry-run + ACTIVE reject; admin PIM API proven |
| Product SoT | PARTIALLY_IMPLEMENTED | PARTIALLY_IMPLEMENTED | NOT_IMPLEMENTED | Kept closed: `productCore` is declared canonical, but `product-catalog-pim`, `pim-catalog`, storefront catalog, and search retain separate product stores/write paths. `product-catalog-pim` writes now require admin auth; storage consolidation and cross-path verification remain blocked. |
| Catalog / 50-tree | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | 50 customer L1 / 48 taxonomy / 53 shop JSON is intentional |
| i18n 30 locales | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | Playwright DE/EN/TR/FR/AR + `dir=rtl` for AR |
| Market 35 | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | locale ≠ market on homepage controls |
| Pricing | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | Node canonical; price-tamper e2e |
| Inventory | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | Fail-closed reserve; conflicting supplier offers not auto-resolved |
| Supplier | PARTIALLY_IMPLEMENTED | TESTED (fixture dry-run) | BLOCKED | CSV/XML preview; live fetch BLOCKED |
| Order / PO | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | Draft ≠ send; commercial attempt blocked |
| Payment | PARTIALLY_IMPLEMENTED | TESTED (mock) | BLOCKED | No auto financial retry |
| Returns | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | Ledger keeps customer refund ≠ supplier credit; no refund executed |
| Marketplace | PARTIALLY_IMPLEMENTED | TESTED (mock) | BLOCKED | Classified; publish blocked |
| Shipping / tracking | TESTED | PARTIALLY_IMPLEMENTED | BLOCKED | No live carrier; no invented GPS; out-of-order held; simulated labelled |
| Customer | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | Isolation + blocked message drafts; queued ≠ delivered |
| Admin / Control Center | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | Authenticated browser on static `:3040` + API `:3001` |
| Storefront | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | Static `:3040` homepage 18/18 + CI e2e-storefront |
| Search | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | `software.search` uses `catalogReadService`; invented:false |
| Voice / digital human | PARTIALLY_IMPLEMENTED | TESTED (blocked) | BLOCKED | No call placed |
| Database | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | Additive software schema including return ledger |
| API | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | Health + commerce + admin PIM + software report |
| Security | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | Sales lock + guardian + isolation + tamper e2e |
| Workers | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | No double-claim; expired lock recovery |
| CI | TESTED | INTEGRATION_TESTED | NOT_IMPLEMENTED | `a26b51d` quality + e2e-storefront + e2e-admin SUCCESS (run 38153709074) |

## Wiring that was proven in code

1. `software.orders.createDraft` → pricing + inventory reliability + customs + sales lock.
2. `software.inventory.reserve` → `stockEngine.evaluateStockRecord`.
3. `software.tracking.getForCustomer` → customer id match only.
4. `software.marketplace.draftListing` → `pusat.integrations.marketplaceDraft`.
5. `software.returns` → existing RMA + ledger; supplier credit never assumed.
6. `software.searchCanonicalCatalog` → `catalogReadService.listProducts`.
7. `/api/customer/tracking/:orderId` → `requireCustomer` then tracking isolation.
8. `/api/health/software` → `software.health(pusat.getHealth())` with explicit engine statuses.
9. `/api/admin/software/report` and `/api/software/search`.
10. `db.js` → `migrateSoftwareCompletion()` after Pusat schema.
11. `/api/commerce/checkout/attempt` → diagnostic block when demo SKU hidden and sales off.
12. `software.workflow.runSafeCustomerWorkflow` → product + price + inventory + draft + Guardian + UNCERTAIN payment/refund + blocked comms/listing/carrier + audit.
13. `/api/admin/software/external-checklist` and `/api/admin/software/safe-workflow` → admin auth + `ai.read`.
14. `pusat.worker.recoverAbandoned` + `jobQueue.markDeadLetter` → stale lock → RETRYING → DEAD_LETTER; payment/refund classify `retryable:false`.

## Documented conflicts (not silently merged)

- Node `pricing.js` vs Python `MIN_NET_PROFIT=0.50`.
- Multiple product-create helpers vs `productCore.createProduct`.
- Pusat facade vs leftover orchestrator bridges (bridges remain health/legacy, not a second executor).
- 50 customer-facing L1 vs 48 master taxonomy vs 53 shop JSON — intentional hide of removed categories, not a new tree.
- Demo SKU not storefront-visible vs older e2e that queried `q=BZ-CORE`.
- Local shared SQLite public PIM rows vs empty CI catalog.
