# 05 — AI Orchestrator

## Was ist das?

Zentraler **Task-Management-Service** für Buzzard-AI-Agenten. Verwaltet Aufgaben, Berechtigungen, menschliche Freigaben und Audit-Logs.

**Datei:** `intelligence/buzzard_orchestrator.py`  
**Status:** Im PR #238 — noch nicht auf `main` / Render

## Registrierte Agenten

| ID | Name | Rolle |
|----|------|-------|
| nesrin | Nesrin Hanım | Zentrale Koordination |
| supplier_ai | Tedarik AI | Einkauf / Lieferanten |
| product_ai | Ürün AI | Produkte / Kategorien |
| pricing_ai | Fiyat AI | Preise / Margen |
| order_ai | Sipariş AI | Bestellungen / Versand |
| customs_ai | Gümrük AI | Zoll / Import |
| security_ai | Esat Bey | Sicherheit |

## Features

- Task-Queue mit Priorität (critical → low)
- Retry (max 3), Timeout (120s)
- Menschliche Freigabe ab 500 € oder bei High-Risk
- SQLite-Persistenz
- REST API (FastAPI)
- Audit-Log aller Aktionen

## API-Endpunkte

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| GET | /health | Status |
| GET | /agents | Alle Agenten |
| POST | /tasks | Aufgabe erstellen |
| POST | /tasks/{id}/execute | Ausführen |
| POST | /tasks/{id}/approval | Freigabe |
| GET | /audit | Audit-Log |
| POST | /demo/daily-summary | Demo |
| POST | /demo/purchase-request | Demo (High-Risk) |

## Integration mit buzzard-api

Nach Deploy:
```
GET https://buzzard-api.onrender.com/api/orchestrator/status
GET https://buzzard-api.onrender.com/api/orchestrator/agents
GET https://buzzard-api.onrender.com/api/orchestrator/tasks
```

Bridge: `server/lib/orchestratorBridge.js`

## Lokal starten

```bash
npm run orchestrator:dev
# → http://127.0.0.1:8010/docs
```

## Wichtig

- **Simulation only** — keine echten Zahlungen/Bestellungen
- SQLite auf Render Free: `/tmp` (Reset bei Redeploy)
- Verkauf bleibt deaktiviert (`BUZZARD_SALES_ENABLED=0`)

Dokumentation: `docs/ORCHESTRATOR_DE.md`
