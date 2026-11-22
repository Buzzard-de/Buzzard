# Orders, payments, refunds, logistics

Date: 22 November 2026. No payment, refund, label, or shipment was created.

## Payment

| Step | Status | Evidence |
|---|---|---|
| Intent row | Local only | `createPaymentIntent` can write a demo intent when called directly. HTTP create is refused while sales are locked. |
| Authorization | Not live | Provider sessions are gated. |
| Capture | Blocked | `refuseWhileSalesLocked` returns 403 `PAYMENT_NOT_LIVE`. HTTP test passed at 21:40 Europe/Berlin. |
| Refund | Blocked | 403 `REFUND_NOT_LIVE`. `refundIssued` stays false. |
| Webhook signature | Local | `webhookGate.js` checks HMAC. Unsigned finance webhooks stay closed without a secret. |
| Duplicate webhook | Local | Replay is recorded. A signed finance webhook does not write money rows while sales are locked. |
| Reconciliation | Not live | Carrier reconcile returns no live match. |
| Failure handling | Local | Status stays unpaid when the lock refuses the call. |

LIVE INTEGRATION: LIVE_VERIFICATION_REQUIRED.
STATUS: COMPLETE_WITH_LIMITATIONS for the lock. BLOCKED_EXTERNAL for a real charge.

## Order

Full lifecycle locally: create, reserve, full cancel, status transitions that do not capture money. Supplier confirmation is a dry record with `transmitted: false`. Duplicate protection uses an idempotency hash.

Partial cancellation: NOT_IMPLEMENTED. See MF-ORD-03.

## Refund and return

`dryReturnRequest` does not send money. Supplier credit is recorded as not received. Return labels are not purchased.

STATUS: PARTIAL.

## Logistics

DHL, DPD, GLS, Hermes, and UPS are named in `carrierContract.js`. `createShipment` and `createLabel` return `HUMAN_GATE_REQUIRED`. `trackShipment` sets `live: false`. A `LOST` token can be folded from an event. Delay status exists as a token. Customer notification returns `sent: false`.

Lost-shipment automation: NOT_IMPLEMENTED. See MF-LOG-03.

STATUS: BLOCKED_EXTERNAL for every live carrier. LIVE_VERIFICATION_REQUIRED before any carrier can be called ready.

RISK LEVEL: P0 if the sales lock were removed without a sandbox test. P1 while the lock holds, because the business flow is not live.
RECOMMENDED ACTION: Keep the 403 path. Do not run a provider sandbox until a human supplies credentials outside this audit.
CONFIDENCE: High for the lock. High for the absence of a live label call in this pass.
