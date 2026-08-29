# Production Runbook (Part 13–14)

**Safety:** `BUZZARD_SALES_ENABLED=0` until explicit human approval.

**Live status (2026-08-29):** Deploy hook configured; see `docs/PART14_LIVE_CLOSEOUT_REPORT.md`.

## 0. Production sync checklist (Part 14)

Target: `LOCAL CODE = GIT MAIN = RENDER PRODUCTION` and `DEPLOYMENT_DRIFT=false`.

1. Push to `main` (server/render paths) → GitHub Action **Deploy Buzzard API** triggers `RENDER_DEPLOY_HOOK_URL`
2. Or: Render Dashboard → `buzzard-api` → **Manual Deploy** (branch `main`)
3. Optional: mount persistent disk at `/var/data`; set `BUZZARD_DB_PATH=/var/data/buzzard.db`
4. Verify:
   ```bash
   curl https://buzzard-api.onrender.com/api/health/version
   curl https://buzzard-api.onrender.com/api/health/production
   BUZZARD_API_URL=https://buzzard-api.onrender.com npm run test:production-smoke
   BUZZARD_API_URL=https://buzzard-api.onrender.com npm run test:part14
   ```
5. Admin → Control Center → **Deployment** tab: `SYNCED`, Sales `DISABLED`, Go-live lock `ACTIVE`

Fallback if no deploy hook: set `RENDER_API_KEY` in GitHub Secrets and run workflow **Setup Render API**.

## 1. Deploy

1. Merge PR to `main`
2. Deploy hook or Render auto-deploy from `render.yaml` (`startCommand: node server/server.js`)
3. Set environment variables (see `docs/PART12_DEPLOY_CHECKLIST.md`)
4. Optional: mount persistent disk at `/var/data`
5. Optional: set `BUZZARD_DB_PATH=/var/data/buzzard.db`

## 2. DB persistence

- Catalog mode (sales off): ephemeral SQLite on Render free tier is **allowed** (warning only)
- Commerce / sales: require persistent disk
- Verify: `GET /api/health/db` → `database.persistence.persistent` = `true` when disk mounted

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
