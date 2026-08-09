# Render API Go-Live — Buzzard

> **Status:** Preparation only. Deploy requires explicit user approval.  
> **Do not** set `SALES_ENABLED=1` or connect real payment providers until approved.

## Current architecture

| Layer | URL | Host |
|-------|-----|------|
| Frontend (static) | https://buzzard24.de | GitHub Pages |
| API (Node + SQLite) | https://buzzard-api.onrender.com | Render Web Service |

Frontend talks to API via `NEXT_PUBLIC_BUZZARD_API_URL` (baked at build time).  
Server uses `BUZZARD_*` feature flags and SQLite (`server/data/buzzard.db` by default).

## Render service definition

File: `render.yaml` (Blueprint)

| Setting | Value |
|---------|--------|
| Service name | `buzzard-api` |
| Runtime | Node 20 |
| Region | Frankfurt |
| Plan | Free |
| Build | `cd server && npm ci` |
| Start | `node server/server.js` |
| Health check | `GET /api/health` |
| Port | `10000` (Render injects `PORT`) |

## One-time provisioning (choose one)

### Option A — Render Blueprint (recommended)

1. Install Render GitHub App: https://github.com/apps/render  
2. Open Blueprint: https://dashboard.render.com/blueprint/new?repo=https://github.com/Buzzard-de/Buzzard  
3. Confirm env vars (JWT/ADMIN passwords auto-generated)  
4. Wait for deploy → `GET /api/health` returns 200  

### Option B — GitHub Actions

1. Add GitHub secret `RENDER_API_KEY` (Render Dashboard → Account → API Keys)  
2. Optional: `RENDER_OWNER_ID` repository variable  
3. Run workflow **Setup Render API**  
4. Optional: add `RENDER_DEPLOY_HOOK_URL` for push-triggered redeploys  

### Option C — Manual Render dashboard

Create Web Service from repo with same build/start commands as `render.yaml`.

## Post-provision steps

1. Verify health: `curl -s https://buzzard-api.onrender.com/api/health`  
2. Run smoke: `BUZZARD_API_URL=https://buzzard-api.onrender.com npm run test:smoke`  
3. Confirm GitHub Pages build uses correct API URL (repo variable `BUZZARD_API_URL` if custom)  
4. Rebuild Pages if API URL changed  
5. Admin panel → API status banner should disappear when health is OK  

## SQLite persistence on Render

| Plan | Behaviour |
|------|-----------|
| Free | `server/data/buzzard.db` survives restarts, **lost on redeploy** |
| Paid + disk | Mount disk at `/var/data`, set `BUZZARD_DB_PATH=/var/data/buzzard.db` |

For production orders/accounts, use a **persistent disk** or migrate to managed Postgres later.

## Security

- `JWT_SECRET` must be set in Render (Blueprint generates it)  
- Default `DEV_ONLY_CHANGE_ME` triggers production warning in server logs  
- `ADMIN_PASSWORD` syncs bootstrap admin on startup — store securely  
- No Stripe/PayPal/Klarna secrets required for API go-live  
- `BUZZARD_SALES_ENABLED=0` on server; `NEXT_PUBLIC_SALES_ENABLED=0` on frontend  

## Preflight script

```bash
node scripts/render-preflight.mjs
```

Checks repo config, `server npm ci`, and remote `/api/health` without deploying.

## Related files

- `render.yaml` — Blueprint definition  
- `.env.render.example` — Render env template (no secrets)  
- `scripts/render-bootstrap.mjs` — Create/update service via Render API  
- `scripts/wait-for-api-health.mjs` — Poll health after deploy  
- `.github/workflows/deploy-api.yml` — CI deploy trigger  
- `.github/workflows/setup-render-api.yml` — One-time bootstrap  
