# Buzzard Intelligence — Final Integration / Test / Go-Live Pack

Praktischer Arbeitsblock nach v200:
Integration → Live-Connectoren → Datenpipeline → Tests → Security →
Monitoring → Backup → Deployment → Go-Live.

Keine erfundenen Live-Ergebnisse. Echte Credentials und externe Dienste bleiben
PENDING/REVIEW, bis sie tatsächlich verbunden und getestet wurden.

## Start
```bash
cd intelligence
python main.py fint-preflight
python main.py fint-test
python main.py fint-go-live
python main.py fint-status
```

## CLI
| Befehl | Zweck |
|--------|-------|
| `fint-preflight` | Prüft alle Pflicht-Checklisten und Manifest |
| `fint-test` | Führt pytest auf `04_tests/` aus |
| `fint-go-live` | Go-Live-Check (blockiert ohne echte Verifikation) |
| `fint-status` | Status-Zusammenfassung |
| `fint-gate` | Go-Live-Gate-Dokument |
| `fint-dod` | Final Definition of Done |

## Abgrenzung
- `prod-*` = Production Completion Workstreams
- `mint-*` = Master Integration Systemhülle (SQLite Gates)
- `fint-*` = Final Integration/Test/Go-Live Checklisten und Tests
- `live-*` = Live Data Connector Adapter
