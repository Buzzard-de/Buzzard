# Code Implementation Status

Verification HEAD lineage: `40c35af` (AI) → `8adcc87` (software facade) → `ba95c26` (isolation/catalog tests) → checkout diagnostic + e2e catalog lookup. Implementation status is **code present and reachable**, not production proof.

## New / changed implementation

| Path | Role |
| --- | --- |
| `server/lib/software/*` | Facade. Not a second orchestrator. |
| `server/plugins/softwareCompletionPlugin.js` | Health + admin + customer tracking routes. |
| `server/lib/db.js` | `migrateSoftwareCompletion()`. |
| `server/lib/pim/importPipeline.js` | Dry-run still emits a `validation` stage, `written:false`. |
| `server/lib/commerce/commerceGuards.js` | Guest resources without `customerId` skip IDOR unauth. |
| `server/plugins/commerceCorePlugin.js` | `checkout/attempt` stays diagnostic when demo SKU is hidden. |
| `vitest.config.ts` | Sequential files; exclude `node:test` part24/27–35. |
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
| Admin UI | Login + dashboard browser-verified; Control Center / Sessions **not**. Admin APIs work with bearer. |
| Storefront | Existing UI kept. Homepage viewports verified on static export only. |
| Voice | Python/legacy files exist; Node adapter is interface + BLOCKED. |
| Marketplace live | Classification only. |
| Supplier live | Mock adapter only. |

A file existing in `server/plugins/*` is not treated as end-to-end completion.
