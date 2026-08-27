# 02 — API & Backend (Render)

## Service: buzzard-api

| Eigenschaft | Wert |
|-------------|------|
| URL | https://buzzard-api.onrender.com |
| Health | https://buzzard-api.onrender.com/api/health |
| Runtime | Node.js |
| Region | Frankfurt |
| Plan | Free |
| Branch | main |
| Start | `node server/server.js` |

## Live-Health (27.08.2026)

```json
{
  "status": "ok",
  "salesEnabled": false,
  "database": { "users": 1, "products": 26, "orders": 0 }
}
```

## Wichtige Env-Variablen (Render)

| Variable | Wert | Bedeutung |
|----------|------|-----------|
| `BUZZARD_SALES_ENABLED` | `0` | **Verkauf aus** |
| `ADMIN_EMAIL` | admin@buzzard24.de | Admin-Login |
| `ADMIN_PASSWORD` | *(in Render setzen)* | **Du musst das setzen** |
| `JWT_SECRET` | auto-generiert | Session-Tokens |
| `BUZZARD_EMBEDDED_INTELLIGENCE` | `1` | Intelligence ohne Python |
| `BUZZARD_INTELLIGENCE_BRIDGE` | `1` | Shop ↔ Intelligence |
| `BUZZARD_INTELLIGENCE_API_URL` | buzzard-intelligence | Python-Stack |
| `BUZZARD_ORCHESTRATOR_URL` | buzzard-orchestrator | Nach PR #238 |

## API-Endpunkte (Auswahl)

| Pfad | Beschreibung |
|------|--------------|
| `GET /api/health` | Systemstatus |
| `GET /api/intelligence/status` | Intelligence Bridge |
| `GET /api/orchestrator/status` | AI Orchestrator (PR #238) |
| `POST /api/auth/login` | Kunden-Login |
| Admin-Routen | `/api/admin/*` (JWT + optional 2FA) |

## Datenbank

- SQLite auf Render (`/opt/render/project/src/server/data/buzzard.db`)
- **Ohne Persistent Disk:** DB kann bei Redeploy zurückgesetzt werden
- Für Katalogmodus OK; vor Verkauf Persistent Disk einplanen

## Service: buzzard-intelligence

| Eigenschaft | Wert |
|-------------|------|
| Runtime | Docker (Python/FastAPI) |
| Health | `/health` |
| Cold Start | Free Tier — kann langsam sein |
| Fallback | Embedded Intelligence auf Node-API |

## Service: buzzard-orchestrator (PR #238)

| Eigenschaft | Wert |
|-------------|------|
| Datei | `intelligence/buzzard_orchestrator.py` |
| Health | `/health` |
| Zweck | AI-Task-Management, Approvals, Audit |
| Status | Im PR, noch nicht live |

## Blueprint

Konfiguration: `render.yaml` im Repo-Root  
Deutsche Anleitung: `docs/RENDER_API_SETUP_DE.md`

## Plugins (Node-Server)

56 Plugins unter `server/plugins/` — u.a.:
- `adminAuthPlugin.js` — Admin-Login
- `intelligenceProductionBridgePlugin.js` — Intelligence
- `orchestratorBridgePlugin.js` — Orchestrator (PR #238)
- `contactStoragePlugin.js` — Kontaktanfragen
