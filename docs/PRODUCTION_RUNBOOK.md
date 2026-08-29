# Production Runbook (Part 13)

**Safety:** `BUZZARD_SALES_ENABLED=0` until explicit human approval.

## 1. Deploy

1. Merge PR to `main`
2. Render auto-deploys `buzzard-api` from `render.yaml`
3. Set environment variables (see `docs/PART12_DEPLOY_CHECKLIST.md`)
4. Mount persistent disk at `/var/data`
5. Set `BUZZARD_DB_PATH=/var/data/buzzard.db`

## 2. DB persistence

- Verify: `GET /api/health/db` → `database.persistence.mode` = `render_persistent_disk`
- Verify: `GET /api/health/production` → `database.persistence.persistent` = `true`
- Never run production without persistent disk

## 3. Redis (optional, multi-instance)

```
BUZZARD_RATE_LIMIT_STORE=redis
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

Verify: `GET /api/security/health` → `protections.redisConfigured`

## 4. Health check

```bash
curl https://buzzard-api.onrender.com/api/health/version
curl https://buzzard-api.onrender.com/api/health/production
curl https://buzzard-api.onrender.com/api/health/worker
```

## 5. Smoke test

```bash
BUZZARD_API_URL=https://buzzard-api.onrender.com npm run test:production-smoke
```

Expected: PASS or documented BLOCKED (stale deployment).

## 6. Rollback

1. Revert commit on `main` or redeploy previous Render deploy
2. Verify `/api/health/version` commit matches expected
3. Run production smoke

## 7. Backup

```bash
npm run backup:db
# On Render shell with BUZZARD_DB_PATH=/var/data/buzzard.db
```

Backup creates `.db` file + `.meta.json` with integrity check.

## 8. Restore

```bash
# Staging only unless explicitly approved:
BUZZARD_ALLOW_PRODUCTION_RESTORE=1 npm run restore:db -- --from /var/data/backups/buzzard-....db
```

Pre-restore snapshot created automatically.

## 9. Incident response

1. Check `/api/health/production` overall status
2. Check Admin → Control Center → Deployment tab
3. Review `/api/admin/security/events`
4. Do NOT enable sales as incident fix

## 10. Sales activation prerequisites (MANUAL ONLY)

All required before `BUZZARD_SALES_ENABLED=1`:

- [ ] Persistent DB verified
- [ ] Security PASS
- [ ] Commerce readiness PASS
- [ ] Category readiness PASS
- [ ] Supplier readiness PASS
- [ ] Backup/restore tested
- [ ] Live smoke PASS
- [ ] Go-live approval workflow completed
- [ ] Explicit human approval + environment change
- [ ] Go-live lock removal (separate step)

Child flags, frontend flags, AI tasks, or admin approval alone **cannot** enable sales.
