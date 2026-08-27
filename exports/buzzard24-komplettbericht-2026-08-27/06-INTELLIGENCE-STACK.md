# 06 — Intelligence Stack

## Übersicht

Buzzard hat einen umfangreichen **Python Intelligence-Stack** (`intelligence/`) — getrennt vom Node-Shop, aber über eine Bridge verbunden.

## Drei Ebenen

```
Website (GitHub Pages)
    ↓ API-Calls
buzzard-api (Node.js, Render)
    ↓ Bridge
buzzard-intelligence (Python/FastAPI, Render Docker)
    ↓ optional
buzzard-orchestrator (Python/FastAPI, PR #238)
```

## Embedded Intelligence (aktiv)

Wenn `BUZZARD_EMBEDDED_INTELLIGENCE=1`:
- Node-API liefert Intelligence-Daten ohne Python
- Fallback wenn buzzard-intelligence cold/slow
- Katalogmodus, Taxonomy, Production Bridge

Env: `BUZZARD_EMBEDDED_INTELLIGENCE=1` ✅

## Intelligence Bridge

| Endpunkt | Beschreibung |
|----------|--------------|
| `/api/intelligence/status` | Bridge-Status |
| `/api/intelligence/production/readiness` | Production Readiness |
| `/api/intelligence/storefront/products` | Storefront-Produkte |

Plugin: `server/plugins/intelligenceProductionBridgePlugin.js`

## buzzard-intelligence (Render)

| Eigenschaft | Wert |
|-------------|------|
| Docker | `intelligence/buzzard_ai_complete/deploy/docker/Dockerfile` |
| Port | 8000 |
| Health | `/health` |
| Free Tier | Cold Start möglich |

## AI Core (separater Kontext)

- Frozen Baseline Score 94/100
- Commerce E2E blockiert (externe Secrets)
- **Nicht ändern** ohne explizite Freigabe
- Secrets: `COMMERCE_API_TOKEN`, `COMMERCE_WEBHOOK_SECRET`, `BUZZARD_AI_CORE_V3`
- **Nicht nötig** für Katalog-Website

## Taxonomie

- 53 Hauptkategorien (DE)
- Auto-Sync Workflow: `.github/workflows/taxonomy-auto-sync.yml`
- Artifacts: `public/taxonomy/`

## Dokumentation im Repo

- `docs/BUZZARD_INTELLIGENCE.md`
- `intelligence/README.md`
- `intelligence/buzzard_ai_complete/docs/`
