# Security Testing (Part 10)

## Automated

| Test | Command |
|------|---------|
| Production safety | `npm run test:production-safety` |
| Part 3 security smoke | `npm run test:part3` |
| Commerce security E2E | `e2e/commerce-security.spec.ts` |
| Secret scan | `npm run security:check` |
| npm audit | `npm run security:audit` |

## Commerce security scenarios

- Price tampering → `price_tampering`
- Coupon tampering → `coupon_tampering`
- Client totals rejected at checkout
- IDOR on cart/checkout (403/404)
- Commercial checkout blocked (`SALES=0`)
- Idempotent checkout complete

## Auth / RBAC

- Admin token ≠ customer token (separate realms)
- Control Center RBAC enforced server-side
- Session revocation (`/admin/sessions/`)

## CSRF

- Bearer-token API routes: CSRF not applicable
- Cookie-based flows: verify origin where enabled

## Rate limiting

Backend: memory (default), file, or Redis via security module.  
Commerce: separate cart (120/min) and checkout (30/min) limiters.

## Headers (production)

Verify via deployment:

- HSTS, CSP, X-Frame-Options, X-Content-Type-Options
- Referrer-Policy, COOP, CORP

See `server/plugins/securityPlugin.js` and `docs/SECURITY.md`.

## Secret scanning

`npm run security:check` + manual review of:

- `.env*` (must not contain production secrets in repo)
- test fixtures, scripts, documentation

Never print discovered secrets in CI logs.
