# Checkout (Storefront — Part 9)

## UI

- Route: `/checkout/`
- Success: `/checkout/erfolg/?order=...&source=commerce`
- Component: `components/CheckoutForm.tsx`

## Commerce flow

1. Customer / address / shipping method steps (existing wizard)
2. Server quote preview via `previewCommerceCheckoutTotals()` on review step
3. Submit via `runCommerceCheckout()`:
   - `POST /api/commerce/checkout/start` (`orderType: READINESS_TEST`)
   - `POST /api/commerce/checkout/:id/validate`
   - `POST /api/commerce/checkout/:id/complete` with `Idempotency-Key`

## UX

- `CommerceDryRunBanner` when sales disabled
- Submit button disabled while loading
- Double-submit prevented client + server idempotency

## Address mapping

Storefront `street` / `zip` → Commerce `line1` / `postalCode`

## Legacy

When `NEXT_PUBLIC_COMMERCE_CORE=0`, existing `/api/orders` flow remains.
