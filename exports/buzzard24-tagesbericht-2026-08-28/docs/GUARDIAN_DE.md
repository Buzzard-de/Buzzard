# Buzzard AI Guardian MAX

**Datei:** `intelligence/buzzard_ai_guardian_max.py`  
**API:** `intelligence/buzzard_guardian_api.py`  
**Modus:** Katalog — Verkauf/Zahlung/Lieferanten-Dispatch standardmäßig **aus**

---

## Funktionen

1. **Disaster Recovery** — SQLite-Backup, Verify, Restore (mit Approval)
2. **AI-Kostenkontrolle** — Budgets, Circuit Breaker pro Agent
3. **Zentrale AI-Memory** — Knowledge Base mit Provenance
4. **Anomalie-Erkennung** — Preis/Stok/Supplier-Feed → Incidents
5. **Human Approval Center** — High-Risk-Aktionen blockiert bis Freigabe

---

## Umgebungsvariablen

| Variable | Default | Beschreibung |
|----------|---------|--------------|
| `BUZZARD_GUARDIAN_DB` | `./buzzard_guardian.sqlite3` | SQLite-Pfad |
| `BUZZARD_BACKUP_DIR` | `./backups` | Backup-Ordner |
| `BUZZARD_SALES_ENABLED` | `0` | Muss 0 bleiben im Katalogmodus |
| `BUZZARD_GUARDIAN_URL` | — | Node-API-Bridge (Render Service URL) |

---

## Lokal starten

```bash
cd intelligence
pip install fastapi uvicorn pydantic
python buzzard_ai_guardian_max.py self-test
uvicorn buzzard_guardian_api:app --host 0.0.0.0 --port 8001
```

---

## API (Guardian Service)

```
GET  /health
GET  /status
GET  /approvals/pending
POST /approvals/{id}/decide
GET  /incidents/open
GET  /costs/dashboard
POST /task-gate
POST /backup
GET  /self-test
```

---

## Node-Bridge (buzzard-api)

```
GET /api/guardian/status
GET /api/guardian/health
GET /api/admin/guardian/approvals
GET /api/admin/guardian/incidents
GET /api/admin/guardian/costs
```

Setze `BUZZARD_GUARDIAN_URL=https://buzzard-guardian.onrender.com` in Render.

---

## Render Deploy

Service `buzzard-guardian` in `render.yaml` — Blueprint Sync erforderlich.

---

## Grenzen

- Kein Stripe/PayPal, keine echten Lieferantenbestellungen
- `REAL_SUPPLIER_ORDER` / `REAL_PAYMENT` fail-closed
- Secrets nie in DB persistieren
