# Part 12 — Render Deploy Checklist

**Safety:** `BUZZARD_SALES_ENABLED=0` until explicit go-live approval.

## Pre-deploy

- [ ] Branch merged or deploy from `cursor/p1-production-hardening-part12-c293`
- [ ] All tests pass locally (`npm run test:part12`, `test:production-safety`, `test:final-audit`)
- [ ] No secrets in repository
- [ ] Render secrets set in dashboard (not in `render.yaml`)

## Render service: buzzard-api

### 1. Persistent disk (P1 — required)

1. Upgrade from free tier to plan with persistent disk
2. Add disk mount: `/var/data` (1 GB minimum for SQLite + backups)
3. Set environment variables:

```
BUZZARD_DB_PATH=/var/data/buzzard.db
BUZZARD_BACKUP_DIR=/var/data/backups
NODE_ENV=production
BUZZARD_SALES_ENABLED=0
BUZZARD_CSRF_ENFORCE=1
JWT_SECRET=<strong-random>
ADMIN_SESSION_SECRET=<strong-random>
```

### 2. Optional Redis (rate limiting multi-instance)

```
BUZZARD_RATE_LIMIT_STORE=redis
UPSTASH_REDIS_REST_URL=<from Upstash dashboard>
UPSTASH_REDIS_REST_TOKEN=<from Upstash dashboard>
```

Redis credentials are **server-side only** — never in client bundle.

### 3. Build & start

```
Build: cd server && npm ci
Start: node server/server.js
Health: /api/health
```

### 4. Post-deploy smoke

```bash
BUZZARD_API_URL=https://buzzard-api.onrender.com npm run test:part12:live
npm run test:production-safety  # against live URL if configured
```

### 5. Initial backup

```bash
# On Render shell or one-off job
npm run backup:db
node scripts/sync-search-index.mjs
```

## Verify persistence

1. Deploy with disk mounted
2. `GET /api/health/db` → `persistence.mode` should be `render_persistent_disk`
3. Create test data, redeploy, confirm data survives

## Live verification status

If Render URL is unreachable or credentials not configured:

**LIVE VERIFICATION PENDING**

Run manually when API is deployed:

```bash
BUZZARD_API_URL=https://buzzard-api.onrender.com npm run test:part12:live
```

## Do NOT enable (Part 12)

- `BUZZARD_SALES_ENABLED=1`
- Stripe/PayPal keys for live payment
- `BUZZARD_SUPPLIER_ORDERS_ENABLED=1`
- Remove go-live lock
