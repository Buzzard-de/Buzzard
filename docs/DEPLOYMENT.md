# Deployment Guide (Part 13)

See also: `docs/PART12_DEPLOY_CHECKLIST.md`, `docs/PRODUCTION_RUNBOOK.md`

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
npm run test:production-smoke
```

If endpoints return 404 → **DEPLOYMENT_DRIFT / STALE DEPLOY**
