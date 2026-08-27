# 08 — Architektur

## Systemdiagramm

```
                    ┌─────────────────────────────────┐
                    │         Besucher / Admin         │
                    └───────────────┬─────────────────┘
                                    │ HTTPS
                    ┌───────────────▼─────────────────┐
                    │      buzzard24.de               │
                    │   (GitHub Pages / Next.js)      │
                    │   Static Export, Katalogmodus   │
                    └───────────────┬─────────────────┘
                                    │ API-Calls
                    ┌───────────────▼─────────────────┐
                    │   buzzard-api.onrender.com    │
                    │   Node.js + SQLite + Plugins  │
                    │   SALES_ENABLED = 0           │
                    └───┬───────────────────┬───────┘
                        │                   │
           ┌────────────▼──────┐   ┌───────▼──────────────┐
           │ buzzard-intelligence│   │ buzzard-orchestrator │
           │ Python / FastAPI   │   │ Python / FastAPI     │
           │ (Docker, Render)   │   │ (PR #238)            │
           └────────────────────┘   └──────────────────────┘

    Extern:
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │ IONOS E-Mail │  │  FormSubmit  │  │   GitHub     │
    │ info@buzzard │  │  Kontaktform │  │   CI/CD      │
    └──────────────┘  └──────────────┘  └──────────────┘
```

## Repository-Struktur (Auszug)

```
Buzzard/
├── app/                    # Next.js Frontend
├── components/             # React UI
├── lib/                    # Shared (contact, seo, categories)
├── server/                 # Node API
│   ├── server.js
│   ├── plugins/            # 56 Feature-Plugins
│   └── lib/
├── intelligence/           # Python AI Stack
│   ├── buzzard_orchestrator.py  (PR #238)
│   └── buzzard_ai_complete/
├── data/                   # Katalog, Taxonomie
├── docs/                   # Anleitungen
├── exports/                # Berichte (dieser Ordner)
├── render.yaml             # Render Blueprint
└── .github/workflows/      # CI/CD
```

## Deploy-Pipeline

```
git push main
    ├── GitHub Actions: npm run build → GitHub Pages (buzzard24.de)
    └── Render Auto-Deploy: buzzard-api + intelligence (+ orchestrator)
```

## Umgebungsvariablen (Website-Build)

| Variable | Wert | Wo |
|----------|------|-----|
| NEXT_PUBLIC_SITE_URL | https://buzzard24.de | deploy-pages.yml |
| NEXT_PUBLIC_CONTACT_EMAIL | info@buzzard24.de | deploy-pages.yml |
| NEXT_PUBLIC_SALES_ENABLED | 0 | deploy-pages.yml |
| NEXT_PUBLIC_BUZZARD_API_URL | buzzard-api.onrender.com | deploy-pages.yml |
| NEXT_PUBLIC_COMPANY_STREET | *(optional Secret)* | GitHub |
| NEXT_PUBLIC_COMPANY_VAT_ID | *(optional Secret)* | GitHub |

## Sicherheitsgrenzen

| Was | Wo gespeichert |
|-----|----------------|
| ADMIN_PASSWORD | Render Secrets |
| JWT_SECRET | Render (auto) |
| Stripe/PayPal Keys | Render (leer, Verkauf aus) |
| 2FA Secrets | server/data/admin-2fa.json (nicht in Git) |

## Skalierung (später)

- Cloudflare vor Domain
- Render Persistent Disk für SQLite
- PostgreSQL statt SQLite
- Redis/Queue für Orchestrator
