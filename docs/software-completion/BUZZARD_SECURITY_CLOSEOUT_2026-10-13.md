# Buzzard — Security closeout (local)

Date: 2026-10-13  
Branch: `cursor/security-session-closeout-c293`

This does not overwrite earlier Phase/verification reports.

## Closed in this change

- Finance confirm/refund fail-closed (no fake succeeded/refunded rows).
- Unlisted write routes fail-closed in `wrapRouteHandler`.
- Explicit public storefront writes.
- CORS default `null` removed; credentials allowed only for allowed origins.
- Public health payloads strip filesystem path and internal counts.
- GET `/api/orders/:orderNumber` requires customer ownership.
- GET `/api/commerce/payments/:id` requires `orders.read`.
- Admin session JWT is an HttpOnly `SameSite=None; Secure` cookie.
- Browser clients no longer store `buzzard_admin_token` in `sessionStorage`.
- CSRF is required for cookie-authenticated writes (disable only with `BUZZARD_CSRF_ENFORCE=0`).
- Scripts/tests may still use Bearer (CSRF-exempt).

## Not claimed

- Production not probed.
- Sales / Product SoT / live payments remain off.
- Seed admin material still exists in the repo for local bootstrap.
- Customer account tokens are no longer stored in `sessionStorage`.
  The customer session uses an HttpOnly `buzzard_customer` cookie and CSRF.
- No production readiness claim.
- Sales / live payments stay disabled on purpose.
- This change is not deployed to production by this work.
