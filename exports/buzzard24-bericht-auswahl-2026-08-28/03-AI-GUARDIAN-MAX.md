# 03 — AI Guardian MAX

**Datei:** `intelligence/buzzard_ai_guardian_max.py` (uploaded + integriert)

---

## Funktionen

1. **Disaster Recovery** — SQLite Backup, Verify, Restore (mit Approval)
2. **AI-Kostenkontrolle** — Budgets pro Agent, Circuit Breaker
3. **Zentrale AI-Memory** — Knowledge Base mit Provenance
4. **Anomalie-Erkennung** — Preis, Stok, Supplier-Feed → Incidents
5. **Human Approval Center** — High-Risk blockiert bis Freigabe

## Services

| Komponente | Pfad |
|------------|------|
| Core | `intelligence/buzzard_ai_guardian_max.py` |
| FastAPI | `intelligence/buzzard_guardian_api.py` |
| Docker | `intelligence/deploy/Dockerfile.guardian` |
| Render | Service `buzzard-guardian` |
| Node Bridge | `server/lib/guardianBridge.js` |
| Plugin | `server/plugins/guardianBridgePlugin.js` |

## API

```
GET  /api/guardian/status
GET  /api/admin/guardian/approvals
GET  /api/admin/guardian/incidents
GET  /api/admin/guardian/costs
```

## Integration Preis/Stok

`server/lib/priceStockQueue.js` → Guardian bei großen Preisänderungen

## Self-Test

```bash
npm run guardian:self-test
# → passed: true, sales_enabled: false
```

## Doku

`docs/GUARDIAN_DE.md`
