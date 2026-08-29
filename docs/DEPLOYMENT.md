# Deployment Guide (Part 13–14)

See also: `docs/PART12_DEPLOY_CHECKLIST.md`, `docs/PRODUCTION_RUNBOOK.md`, `docs/PART14_FINAL_REPORT.md`

## Deployment identity

```
GET /api/health/version
```

Returns commit, branch, version, environment, `salesEnabled` (no secrets).

## Drift detection

```
GET /api/health/production
```

Compare `deployment.expectedCommit` vs `deployment.runningCommit`.

Admin panel: Control Center → **Deployment** tab.

Environment variable for CI smoke:

```
BUZZARD_EXPECTED_GIT_COMMIT=<git sha>
```

## Health endpoints

| Endpoint | Purpose |
|----------|---------|
| `/api/health` | Legacy aggregate + production summary |
| `/api/health/version` | Commit/branch identity |
| `/api/health/db` | SQLite + persistence |
| `/api/health/worker` | Worker + queue |
| `/api/health/production` | Full production summary |
| `/api/health/ai` | Orchestrator + Guardian |
| `/api/security/health` | RBAC + rate limit backend |

## Environment rules

| Variable | Production |
|----------|------------|
| `BUZZARD_SALES_ENABLED` | `0` (Part 13) |
| `BUZZARD_TEST_MODE` | **must NOT be set** |
| `BUZZARD_DB_PATH` | `/var/data/buzzard.db` |
| `BUZZARD_RATE_LIMIT_DISABLED` | **must NOT be set** |

Startup validates environment and database in production — fatal on misconfiguration.

## Render services

- `buzzard-api` — main API (this repo)
- See `render.yaml` for full service list

## Storefront

- https://buzzard24.de → static Next.js export
- API: `NEXT_PUBLIC_BUZZARD_API_URL=https://buzzard-api.onrender.com`

## Live verification status

Run after each deploy:

```bash
BUZZARD_API_URL=https://buzzard-api.onrender.com npm run test:production-smoke
BUZZARD_API_URL=https://buzzard-api.onrender.com npm run test:part14
```

If endpoints return 404 → **DEPLOYMENT_DRIFT / STALE DEPLOY** — do not report PASS.

### Manual Render deploy (when agent blocked)

1. Merge PR to `main`
2. Render Dashboard → `buzzard-api` → **Manual Deploy** → Deploy latest commit
3. Watch build logs; confirm health check passes
4. Re-run smoke tests above

### Resolving deployment drift

| Signal | Action |
|--------|--------|
| `/api/health/version` → 404 | Redeploy — Part 13+ not live |
| `deployment.drift=true` | Redeploy expected commit; set `RENDER_GIT_COMMIT` via Render |
| `main` behind feature branch | Merge PR first |

**Part 14 baseline (2026-08-29):** `DEPLOYMENT_DRIFT=true`, production on pre-Part-13 code.
