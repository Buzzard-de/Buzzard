# Part 4 — Deployment Checklist

Use before merging PR and after Render deploy.

## Pre-Merge (Local / CI)

- [ ] `npm run test:part2` — 14/14
- [ ] `npm run test:part3` — 11/11
- [ ] `npm run test:part4` — 15/15
- [ ] `npm run test:unit` — 36/36
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Confirm `BUZZARD_SALES_ENABLED=0` in env

## Environment Variables

| Variable | Required | Notes |
|----------|----------|-------|
| `BUZZARD_SALES_ENABLED` | Yes | Must be `0` |
| `JWT_SECRET` | Yes | Strong random value |
| `BUZZARD_API_URL` | Yes | Frontend → API |
| `BUZZARD_SITE_URL` | Yes | CORS / redirects |
| `BUZZARD_RATE_LIMIT_STORE` | Optional | `memory` (default), `file`, `redis` |
| `BUZZARD_CSRF_ENFORCE` | Optional | `1` for cookie CSRF |
| `DATABASE_PATH` | Optional | SQLite path on Render disk |

## Database & Persistence

- [ ] SQLite file on persistent disk (Render)
- [ ] `server/data/security-log.json` writable
- [ ] If `BUZZARD_RATE_LIMIT_STORE=file`, `server/data/rate-limit-buckets.json` writable

## Secrets

- [ ] No secrets in git
- [ ] Render env vars set (not in repo)
- [ ] Stripe/PayPal keys **not** set (sales disabled)

## CORS / HTTPS

- [ ] API allows `BUZZARD_SITE_URL` origin
- [ ] HTTPS enforced in production
- [ ] Security headers active (HSTS, CSP)

## Health Endpoints

```bash
curl https://<api>/api/health
curl https://<api>/api/health/db
curl https://<api>/api/security/health
```

Expect: `globalRbac: true`, `rateLimitBackend` present

## Authentication

- [ ] Admin login works
- [ ] 2FA optional flow intact
- [ ] Read-only user gets 403 on write routes

## Admin Access

- [ ] `/admin/control-center/`
- [ ] `/admin/security-dashboard/`
- [ ] `/admin/sessions/`
- [ ] Nav filtered by role (catalog_manager vs order_manager)

## Rollback

- [ ] Previous Render deploy ID noted
- [ ] DB backup before migrate (`npm run db:backup`)

## Post-Deploy Smoke (Render)

```bash
BUZZARD_API_URL=https://buzzard-api.onrender.com npm run test:part3
BUZZARD_API_URL=https://buzzard-api.onrender.com npm run test:part4
```

Manual checks:

1. Login as admin → Control Center loads
2. Security Dashboard → events paginate
3. Sessions page → list + revoke (test session)
4. Read-only user → fewer nav items, 403 on config PUT
5. Confirm checkout/sales still disabled on storefront
