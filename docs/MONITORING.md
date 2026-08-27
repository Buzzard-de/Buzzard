# Monitoring — Buzzard24

Überwachung ohne zusätzliche Kosten (GitHub Actions + Render Health Checks).

## Automatisch (nach Merge)

### 1. Verify Go-Live (bei Push auf `main`)

Workflow: `.github/workflows/verify-go-live.yml`

Prüft:

- Wichtige Seiten auf buzzard24.de (200 OK)
- API Health (`/api/health`)
- Taxonomy-Routen
- `salesEnabled: false`

Manuell:

```bash
npm run verify:go-live
```

### 2. Uptime Monitor (alle 6 Stunden)

Workflow: `.github/workflows/uptime-monitor.yml`

- Gleiche Checks wie oben
- Läuft per Cron — bei Fehler schlägt die GitHub Action fehl (E-Mail-Benachrichtigung wenn in GitHub aktiviert)

### 3. Render Health Checks

In `render.yaml` konfiguriert:

| Service | Pfad |
|---------|------|
| buzzard-api | `/api/health` |
| buzzard-intelligence | `/health` |
| buzzard-orchestrator | `/health` |

Render Dashboard → Service → **Events** bei Ausfällen prüfen.

## Manuell prüfen

```bash
# Website
curl -sS -o /dev/null -w "%{http_code}" https://buzzard24.de/

# API
curl https://buzzard-api.onrender.com/api/health

# Orchestrator (nach Deploy)
curl https://buzzard-api.onrender.com/api/orchestrator/status
```

## Backup

```bash
npm run db:backup          # Lokale SQLite-Kopie (wenn API lokal)
```

Auf Render **ohne Persistent Disk** geht die API-DB bei Redeploy verloren — für Katalogmodus OK, vor Verkauf Persistent Disk einplanen.

KI-Backup:

```bash
npm run backup:ki:quick
```

## Alerts erweitern (optional)

- GitHub → Settings → Notifications → Actions failures
- UptimeRobot / Better Stack (extern, kostenlos für 1 Monitor)
- Render Paid: E-Mail bei Service-Down

## Google Search Console

Kein Uptime-Monitoring, aber Index-Status: `docs/GOOGLE_SEARCH_CONSOLE.md`
