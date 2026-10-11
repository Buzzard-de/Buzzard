# Security and Safety

## Controls that stayed closed

| Control | Evidence |
| --- | --- |
| Sales lock | `BUZZARD_SALES_ENABLED` unset; `isSalesEnabled()` is false in tests |
| Product SoT | Not activated; product automation dry-run only |
| ACTIVE products | `createProduct` throws if `status === ACTIVE` |
| Real payments / refunds | `paymentSafety` uses `createPaymentIntent({ dryRun: true })`; `realMoneyMovement: false`; financial classify `retryable: false` |
| Real PO send | `purchaseOrder.submitted === false` |
| Real customer messages | `customerSend.blocked === true` |
| Marketplace publish | `published: false` |
| Secret logging | Guardian rejects secret payloads; `aiProviders.redact`; health/report JSON must not match `sk-` / api_key |

Guardian remains on `executeTask` (server-side), not only on HTTP entry. Worker `claimAndExecute` calls `executeTask` for AI_TASK jobs. `aiJobBridge.runAiJobSafely` also calls Pusat after blocked-permission checks.

Approval cannot lift the sales lock.

## Existing `security:check` warnings (not new)

Previously reported two warnings remain:

1. **Frontend npm audit** — vitest/tinypool, braces/micromatch, next/postcss/sharp advisories. Fixing them needs dependency major upgrades, out of this AI slice. Server `npm audit` was 0 vulnerabilities in the earlier run.
2. **Contact time-trap missing** — website form hardening, unrelated to Pusat.

These are not treated as new findings from this work.

## Fail-closed behavior

- Missing customs origin/destination/category → `validateCustomsDecision.ok === false`
- Missing supplier cost → price assistant does not invent a cost
- Unknown/stale stock → `failClosed: true`
- Missing LLM key → `provider_not_configured`
- Guardian deny on secrets, missing permission, paused agent, dangerous refund
