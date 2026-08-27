# 10 — Befehle & Links

## Live-URLs

| Was | URL |
|-----|-----|
| Website | https://buzzard24.de |
| Impressum | https://buzzard24.de/impressum/ |
| Hilfe | https://buzzard24.de/hilfe/ |
| Admin | https://buzzard24.de/admin/login/ |
| API Health | https://buzzard-api.onrender.com/api/health |
| Intelligence Status | https://buzzard-api.onrender.com/api/intelligence/status |
| Sitemap | https://buzzard24.de/sitemap.xml |

## Dashboards

| Was | URL |
|-----|-----|
| GitHub Repo | https://github.com/Buzzard-de/Buzzard |
| PR #238 | https://github.com/Buzzard-de/Buzzard/pull/238 |
| Render | https://dashboard.render.com |
| IONOS Webmail | https://webmail.ionos.de |
| Google Search Console | https://search.google.com/search-console |
| Cloudflare | https://dash.cloudflare.com |

## Terminal-Befehle

```bash
# Live-Check
npm run verify:go-live

# Render-Config prüfen
npm run render:preflight

# Security-Audit
npm run security:check

# API Health manuell
curl https://buzzard-api.onrender.com/api/health

# Orchestrator Status (nach PR #238)
curl https://buzzard-api.onrender.com/api/orchestrator/status

# Orchestrator lokal
npm run orchestrator:dev

# Website lokal
npm run dev

# API lokal
npm run dev:api

# DB Backup (lokal)
npm run db:backup

# KI Backup
npm run backup:ki:quick
```

## Dokumentation im Repo

| Thema | Datei |
|-------|--------|
| Go-Live | docs/GO_LIVE_PREP.md |
| Restliste | docs/WAS_NOCH_ZU_TUN.md |
| Admin | docs/ADMIN_SETUP_DE.md |
| E-Mail IONOS | docs/EMAIL_SETUP_IONOS.md |
| Render API | docs/RENDER_API_SETUP_DE.md |
| Orchestrator | docs/ORCHESTRATOR_DE.md |
| Cloudflare | docs/CLOUDFLARE_SETUP_DE.md |
| Monitoring | docs/MONITORING.md |
| Search Console | docs/GOOGLE_SEARCH_CONSOLE.md |
| Security | docs/SECURITY.md |

## Kontakt

- E-Mail: info@buzzard24.de
- Telefon: +49 151 26219394
