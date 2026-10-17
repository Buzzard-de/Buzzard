# Implementation Status

Existing Pusat modules were extended, not replaced.

## IMPLEMENTED

| Area | Evidence |
| --- | --- |
| Pusat central submit/execute | `server/lib/pusat/submit.js`, `lifecycle.js`; admin routes in `controlCenterPlugin.js` / `pusatPlugin.js` |
| Correlation + idempotency | `core_ai_task_meta`; tests A-C |
| Timeout / unavailable agent | `lifecycle.js`; orchestrator tests |
| SQLite memory + invalidate/delete | `server/lib/pusat/memory.js` |
| Cross-process memory restart | `server/__tests__/helpers/pusatMemoryChild.cjs` + test E-F |
| Local Guardian on `executeTask` | `guardian.js` + `lifecycle.js` |
| Approval hash / expire / duplicate | `approval.js` |
| Exception / no financial retry / DLQ | `exceptions.js` |
| `productCore.createProduct({ dryRun: true })` | `pim/productCore.js`; ACTIVE create rejected |
| `validateCustoms` + `validateCustomsDecision` | exported from `productValidator.js`; used by `customsAi.js` |
| Isolated `claimNextJob(..., { jobType })` | `jobQueue.js`; worker defaults to `AI_TASK` |
| Provider adapter (stub, redact, classify) | `aiProviders.js` — no live call (keys missing) |
| Supplier / customs agents | registry entries wrapping existing automations |

## PARTIALLY IMPLEMENTED

- Product write: authorized dry-run only; no PIM row unless a later authorized non-dry-run is explicitly requested (not done here).
- Order/PO: draft vs send modeled; send always false; sales lock blocks readiness.
- Supplier feeds: mock adapter inspected; not live.
- Shipping: estimate + stub health; no shipment created; no invented GPS.
- Marketplace: draft listing object; not published.
- Customer send: blocked wrapper.
- Worker default path is still `setImmediate` for HTTP submit; claim path is tested in isolation.

## BLOCKED / NOT IMPLEMENTED

See `BLOCKED_DEPENDENCIES.md`. Live providers, remote Python services, payments, carriers, marketplaces, voice, and production probes remain BLOCKED or not implemented.

## Pricing rules (unchanged)

`server/lib/pricing.js` still uses 38% markup / 12% minimum margin. Pusat Price Assistant additionally checks €0.50 minimum net profit against provided costs. **€0.10 undercut was not added.**
