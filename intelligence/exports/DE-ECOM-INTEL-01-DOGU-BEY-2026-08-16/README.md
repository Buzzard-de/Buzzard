# DE-ECOM-INTEL-01 — Doğu Bey Scan Export

Operation: `DE-ECOM-INTEL-01-LIVE`
Datum: 2026-08-16
Agent: dogu_bey

## Inhalt

| Datei | Beschreibung |
|-------|--------------|
| `bericht.md` | Vollständiger deutscher Intelligence-Bericht |
| `scan.json` | Kompletter Scan als JSON |
| `live_connectors.json` | Status eBay, Amazon, Google Ads, Public Fetch |
| `oeffentliche_quellen.json` | Live-abgerufene öffentliche Quellen |
| `google_ads.json` | Google Ads Signale (falls konfiguriert) |
| `preisbenchmark.json` | Preisvergleich aller Benchmark-Produkte |
| `preis_quelle.json` | Modus der Preisdaten (live vs. Benchmark) |
| `hinweise.txt` | Betriebs- und Compliance-Hinweise |
| `category_intelligence_43/` | Einzelberichte pro Buzzard-Kategorie |

## Neu generieren

```bash
cd intelligence
python main.py complete-de-ecom-intel-export
```

Verkäufe bei Buzzard bleiben deaktiviert (Katalogmodus).
