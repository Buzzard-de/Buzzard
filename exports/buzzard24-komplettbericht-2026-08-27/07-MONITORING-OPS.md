# 07 — Monitoring, Ops & Backup

## Automatische Checks

| Workflow | Trigger | Was |
|----------|---------|-----|
| `ci.yml` | Push/PR | Lint, Typecheck, Build |
| `deploy-pages.yml` | Push main | Website deploy |
| `verify-go-live.yml` | Push main | Live-Routen + API |
| `uptime-monitor.yml` | Alle 6h | Uptime (PR #238) |

## Manuelle Prüfung

```bash
npm run verify:go-live
npm run render:preflight
npm run security:check
```

## Render Health Checks

| Service | Pfad |
|---------|------|
| buzzard-api | /api/health |
| buzzard-intelligence | /health |
| buzzard-orchestrator | /health (PR #238) |

## Backup

| Was | Befehl | Hinweis |
|-----|--------|---------|
| SQLite lokal | `npm run db:backup` | Nur wenn API lokal |
| KI-Snapshot | `npm run backup:ki:quick` | Intelligence-Ordner |
| Render DB | Kein Auto-Backup | Persistent Disk nötig |

## Cloudflare (optional, nicht eingerichtet)

- DDoS, Bot-Filter, WAF
- Anleitung: `docs/CLOUDFLARE_SETUP_DE.md`

## Google Search Console (optional)

- Sitemap: https://buzzard24.de/sitemap.xml
- Secret: `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`
- Anleitung: `docs/GOOGLE_SEARCH_CONSOLE.md`

## Security

- Admin 2FA: `/admin/security-dashboard/`
- Rate-Limit: 180 req/min
- Account-Lockout: 5 Fehlversuche → 30 Min.
- `docs/SECURITY.md`

## Alerts (empfohlen)

- GitHub → Settings → Notifications → Action failures
- Optional: UptimeRobot auf buzzard24.de + API health

Dokumentation: `docs/MONITORING.md`
