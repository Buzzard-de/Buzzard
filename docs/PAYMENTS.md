# Payments (Part 8)

## Providers

- **MockPaymentProvider** — default, no real money movement
- **StripeProvider** — OFF (`BUZZARD_STRIPE_ENABLED=0`)
- **PayPalProvider** — OFF (`BUZZARD_PAYPAL_ENABLED=0`)

## Security

- Never store card numbers, CVV, or full credentials
- `sanitizePaymentPayload()` rejects credential fields
- Payment intents use provider reference tokens only
- Secrets never exposed in API responses

## Webhooks

`POST /api/commerce/webhooks/:provider`

- Signature verification foundation
- Idempotency via `commerce_webhook_events`
- Blocked while `BUZZARD_SALES_ENABLED=0` — cannot create orders/payments
