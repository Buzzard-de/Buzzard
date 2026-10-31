# Code Implementation Status

Lineage: `40c35af` (AI) → software facade → `8ed00ba` lifecycle/safe marketplace → `0d76330` gap-closure (PIM write auth, supplier conflict, tracking/comms fail-closed). Implementation status is **code present and reachable**, not production proof.

## New / changed implementation

| Path | Role |
| --- | --- |
| `server/lib/software/*` | Facade. Not a second orchestrator. |
| `server/lib/software/supplierFeeds.js` | CSV/XML/JSON dry-run preview. No live fetch. No PO. |
| `server/lib/software/communications.js` | Message drafts; send always BLOCKED. |
| `server/lib/software/returns.js` | Wraps existing RMA; customer refund ≠ supplier credit. |
| `server/lib/software/search.js` | Canonical catalog search via `catalogReadService`. |
| `server/lib/software/reporting.js` | Local diagnostic counts; `inventedRevenue:false`. |
| `server/lib/software/schema.js` | Additive tables including `software_return_ledger`. |
| `server/plugins/softwareCompletionPlugin.js` | Health + report + search + tracking + checklist + safe-workflow. |
| `server/lib/software/payments.js` | Charge/refund interpretation; timeout = UNCERTAIN, never retried. |
| `server/lib/software/carriers.js` | DHL/DPD/GLS/Hermes/UPS stubs; outage/malformed fail-closed. |
| `server/lib/software/externalIntegrations.js` | Secret-free inventory + checklist. |
| `server/lib/software/workflow.js` | Safe customer workflow + `software_audit` row. |
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
| Admin UI | Login, dashboard, Control Center, Sessions, PIM, and Approval/Commerce/Workers/Integration tabs browser-verified on static `:3040`. |
| Storefront | Existing UI kept. Homepage viewports verified on static export. Full checkout UI not run. |
| Voice | Python/legacy files exist; Node adapter is interface + BLOCKED/NOT_CONFIGURED. |
| Marketplace live | Classification only. |
| Supplier live | Mock adapter only. |

A file existing in `server/plugins/*` is not treated as end-to-end completion.
