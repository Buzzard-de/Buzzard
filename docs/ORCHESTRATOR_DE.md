# Buzzard AI Görev Orkestratörü

Zentraler **AI-Task-Service** für Buzzard-Agenten (Nesrin, Tedarik AI, Esat Bey, …).

## Start lokal

```bash
cd intelligence
pip install fastapi uvicorn pydantic
uvicorn buzzard_orchestrator:app --reload --port 8010
```

- API-Docs: http://127.0.0.1:8010/docs
- Health: http://127.0.0.1:8010/health

Oder aus dem Repo-Root:

```bash
npm run orchestrator:dev
```

## Render (Blueprint)

Nach Merge auf `main` erstellt `render.yaml` den Service **`buzzard-orchestrator`**.

- Health: `https://buzzard-orchestrator.onrender.com/health`
- `buzzard-api` erhält automatisch `BUZZARD_ORCHESTRATOR_URL`
- Node-Proxy: `GET /api/orchestrator/status`

## Wichtige Endpunkte

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| GET | `/health` | Service-Status |
| GET | `/agents` | Registrierte AI-Agenten |
| POST | `/tasks` | Aufgabe erstellen |
| POST | `/tasks/{id}/execute` | Aufgabe ausführen |
| POST | `/tasks/{id}/approval` | Menschliche Freigabe |
| GET | `/audit` | Audit-Log |

## Demo-Aufrufe

```bash
curl -X POST http://127.0.0.1:8010/demo/daily-summary
curl -X POST http://127.0.0.1:8010/demo/purchase-request
```

## Hinweise

- **Simulation:** Keine echten Zahlungen, Bestellungen oder Lieferanten-APIs.
- **SQLite:** Auf Render Free Tier liegt die DB unter `/tmp` (Reset bei Redeploy). Für Produktion: Persistent Disk oder PostgreSQL.
- **Verkauf:** Orchestrator kann Vorbereitungs-Tasks ausführen; `BUZZARD_SALES_ENABLED=0` bleibt auf der API.

## Datei

`intelligence/buzzard_orchestrator.py`
