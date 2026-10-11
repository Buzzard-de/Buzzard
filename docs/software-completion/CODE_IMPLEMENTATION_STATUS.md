# Code Implementation Status

Lineage: `40c35af` (AI) → `8adcc87` (software facade) → isolation/verification commits → `25a48da` (engines + CI) → this report (part8 CI fixture + evidence). Implementation status is **code present and reachable**, not production proof.

## New / changed implementation

| Path | Role |
| --- | --- |
| `server/lib/software/*` | Facade. Not a second orchestrator. |
| `server/lib/software/returns.js` | Wraps existing RMA; customer refund ≠ supplier credit. |
| `server/lib/software/search.js` | Canonical catalog search via `catalogReadService`. |
| `server/lib/software/reporting.js` | Local diagnostic counts; `inventedRevenue:false`. |
| `server/lib/software/schema.js` | Additive tables including `software_return_ledger`. |
| `server/plugins/softwareCompletionPlugin.js` | Health + admin report + search + tracking routes. |
| `server/lib/pusat/agents.js` | Extra recommendation-only assistants. |
| `server/lib/db.js` | `migrateSoftwareCompletion()`. |
| `lib/admin/client.ts` | Runtime `window.__BUZZARD_API_URL__` override. |
| `e2e/helpers/adminAuth.ts` | Real login + token cache + init script. |
| `server/__tests__/part8Foundation.test.mjs` | Isolated READY/PUBLIC cart fixture. |
| `.github/workflows/ci.yml` | `test:unit` in quality; `e2e-storefront` job. |

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
| Returns RMA | `returnsRma` | IMPLEMENTED / TESTED (ledger wrap) |
| Customer orders | `customer/customerOrderBridge` | IMPLEMENTED / TESTED |
| Market registry | `lib/market-engine` | IMPLEMENTED / TESTED |
| Locales | `lib/i18n` 30 locales | IMPLEMENTED / TESTED |
| Sales lock | `server/lib/salesMode.js` | IMPLEMENTED / TESTED |

## Partial / not a full product

| Area | Why not complete |
| --- | --- |
| Product SoT | Intentionally closed. Code exists to keep it off. |
| Admin UI | Login + dashboard browser-verified; Control Center / Sessions / PIM **not**. Admin APIs work with bearer. |
| Storefront | Existing UI kept. Homepage viewports verified on static export. Full checkout UI not run. |
| Voice | Python/legacy files exist; Node adapter is interface + BLOCKED/NOT_CONFIGURED. |
| Marketplace live | Classification only. |
| Supplier live | Mock adapter only. |

A file existing in `server/plugins/*` is not treated as end-to-end completion.
