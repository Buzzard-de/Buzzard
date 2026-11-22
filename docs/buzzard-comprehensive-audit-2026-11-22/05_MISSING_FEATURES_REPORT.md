# Missing features

Date: 22 November 2026. Read-only.

A feature is listed here only when a named search found no implementation. Unknown tasks are not listed as missing.

## NOT_IMPLEMENTED

### MF-ORD-03 Partial cancellation

TASK ID: MF-ORD-03
TASK NAME: Partial cancellation
MODULE: Order engine
STATUS: NOT_IMPLEMENTED
CODE EVIDENCE: `server/lib/orderManagement.js` `cancelOrder` (around line 241) sets `order_status` to `cancelled` for the whole order. `splitOrder` (around line 255) creates a child order. A search for `partialCancel`, `cancelLine`, and `partial_cancel` under `server/` returned no function.
TEST EVIDENCE: No partial-cancel test was found. Whole-order cancel is covered by `canonicalOrderWriter.test.mjs`.
LIVE INTEGRATION: Not applicable. The function is absent.
MISSING COMPONENTS: Cancel selected lines, keep the remaining lines on the same order, recompute totals, and release only the cancelled reservation.
EXTERNAL DEPENDENCIES: None identified.
RISK LEVEL: P1. A full cancel is a different operation and must not be reused as a partial cancel.
RECOMMENDED ACTION: Design the line-level operation only after a human confirms the business rule. Do not rebuild whole-order cancel.
CONFIDENCE: High for absence of a same-order line cancel in `server/`.

### MF-LOG-03 Lost-shipment automation

TASK ID: MF-LOG-03
TASK NAME: Lost-shipment automation
MODULE: Logistics
STATUS: NOT_IMPLEMENTED
CODE EVIDENCE: `server/lib/logistics` carrier contract lists status `LOST` and can fold a tracking event into that token. `server/lib/logistics/v5/returnsEngine.js` `startReturn` sets later timeline states to `UNKNOWN`. `notifyStub.js` returns `sent: false`. No module was found that measures a tracking window, raises an automatic alert, and starts the next operational step.
TEST EVIDENCE: Orchestrator tests mention a `cargo_loss` claim that stays on a human gate. That is not an automation.
LIVE INTEGRATION: LIVE_VERIFICATION_REQUIRED for any carrier tracking feed.
MISSING COMPONENTS: Detection window, automatic alert, customer notice, and the following operational step.
EXTERNAL DEPENDENCIES: Carrier tracking API.
RISK LEVEL: P1 for live operations. P3 while sales are locked.
RECOMMENDED ACTION: Keep the human gate. Do not describe the `LOST` token as automation.
CONFIDENCE: High that the automation is absent. Medium that some future branch outside this clone contains it.

## Present and easy to mistake for these gaps

| Behavior | Where | What it is |
|---|---|---|
| Whole-order cancel | `cancelOrder` | Cancels every line by closing the order |
| Split | `splitOrder` | Moves lines to another dry order |
| LOST token | carrier status map | A label, not a workflow |
| Return timeline | `startReturn` | Placeholder states marked UNKNOWN |
| Stock purchase | `buyStock` | Returns `HUMAN_GATE_REQUIRED` and does not purchase |

## Not listed as missing

The other 386 formerly unknown tasks stay UNKNOWN_UNVERIFIED. An empty checkbox is not proof of a missing feature.
