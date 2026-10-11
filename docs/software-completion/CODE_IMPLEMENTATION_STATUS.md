# Code Implementation Status

Start HEAD: `40c35af`. Implementation status is **code present and reachable**, not production proof.

## New / changed implementation

| Path | Role |
| --- | --- |
| `server/lib/software/index.js` | Facade. Not a second orchestrator. |
| `server/lib/software/canonical.js` | Canonical engine map + documented conflicts. |
| `server/lib/software/schema.js` | SQLite tables for reservations, shipments, audit. |
| `server/lib/software/inventory.js` | Reliability + reserve/release + events. |
| `server/lib/software/pricing.js` | Quote wrapper over `pricing.js`. No undercut. |
| `server/lib/software/tracking.js` | Canonical tracking + customer isolation. |
| `server/lib/software/marketplace.js` | Connector classification + draft listing. |
| `server/lib/software/voice.js` | Adapter interface; live always blocked here. |
| `server/lib/software/customerAccess.js` | Own-order assertion. |
| `server/lib/software/orders.js` | Order/PO draft only. |
| `server/lib/software/health.js` | Code vs live health. |
| `server/lib/software/search.js` | Isolated catalog search over provided rows. |
| `server/plugins/softwareCompletionPlugin.js` | Health + admin + customer tracking routes. |
| `server/lib/db.js` | `migrateSoftwareCompletion()`. |
| `package.json` | `test:software`. |
| `.github/workflows/ci.yml` | runs `test:software`. |

## Existing engines reused (not rewritten)

| Engine | Canonical path | Status |
| --- | --- | --- |
| Pusat | `server/lib/pusat` | IMPLEMENTED / TESTED |
| Product core | `server/lib/pim/productCore.js` | IMPLEMENTED / TESTED |
| Stock status | `server/lib/operations/stockEngine.js` | IMPLEMENTED / TESTED |
| Pricing | `server/lib/pricing.js` | IMPLEMENTED / TESTED |
| Customs | `productValidator.validateCustomsDecision` | IMPLEMENTED / TESTED |
| Payment mock | `commerce/paymentService` + `pusat.integrations.paymentSafety` | PARTIALLY_IMPLEMENTED / BLOCKED live |
| Shipping stub | `commerce/shippingProvider` | PARTIALLY_IMPLEMENTED / BLOCKED live |
| Customer orders | `customer/customerOrderBridge` | IMPLEMENTED / TESTED |
| Market registry | `lib/market-engine` | IMPLEMENTED / TESTED |
| Locales | `lib/i18n` 30 locales | IMPLEMENTED / TESTED |
| Sales lock | `server/lib/salesMode.js` | IMPLEMENTED / TESTED |

## Partial / not a full product

| Area | Why not complete |
| --- | --- |
| Product SoT | Intentionally closed. Code exists to keep it off. |
| Returns | `returnsRma` exists; this slice did not finish financial reconciliation. |
| Admin UI | Plugins exist; many screens were not behavior-verified. |
| Storefront | Existing UI kept. No redesign. No browser proof this session. |
| Voice | Python/legacy files exist; Node adapter is interface + BLOCKED. |
| Marketplace live | Classification only. |
| Supplier live | Mock adapter only. |

A file existing in `server/plugins/*` is not treated as end-to-end completion.
