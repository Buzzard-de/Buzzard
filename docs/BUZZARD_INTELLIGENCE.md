# Buzzard Intelligence v1–v9

Python-MVP für quellenbasierte Markt- und Produktbeobachtungen — getrennt vom Node-Shop und der Render-API.

## Überblick

| Version | Modul | Speicher |
|---------|-------|----------|
| v1–v8 | … | siehe vorherige Abschnitte |
| v9 | `reporting.py` | `buzzard_intelligence_v9.db` (Warnungen) |

Liest zusätzlich v2 Memory und v8 Discovery für Alert-Generierung.

Archive: `intelligence/archive/Buzzard_Intelligence_v*.zip`

## Schnellstart

```bash
cd intelligence
pip install -r requirements.txt
python main.py init
python main.py demo-reporting
python main.py intel-report
python main.py alerts
```

## v9 Reporting & Alerts — neu

| Befehl | Beschreibung |
|--------|--------------|
| `refresh-alerts` | Warnungen aus Memory/Discovery-Events neu aufbauen |
| `intel-report` | Management-Übersicht (7-Tage-Fenster) |
| `alerts` | Aktive Warnungen nach Schweregrad |
| `queue` | Priorisierte Review-Warteschlange |
| `demo-reporting` | Demo-Daten v6/v7/v8 + Alert-Refresh |

### Warnungstypen

- `NEW_PRODUCT` — v2 `NEW_DISCOVERY`
- `NEW_CATEGORY` — v8 Kategorie-Signale
- `PRICE_CHANGE` — v2 Preis-Events
- `TREND` — Popularität steigend/fallend
- `DATA_GAP` — zu wenig Beobachtungen

### Wichtig

- Warnungen sind **Prüfprioritäten**, keine Shop-Automatik
- Keine Verkaufsprognosen oder Bestseller-Behauptungen

## v8–v1

Unverändert nutzbar (`discover`, `trends`, `analyze`, `collect`, …).

## Alle CLI-Befehle (Auszug)

| Befehl | Version |
|--------|---------|
| `init` | v1 + v2 + v4 + v5 + v8 + v9 |
| `refresh-alerts` / `intel-report` / `alerts` / `queue` | v9 |
| `sync-categories` / `discover` | v8 |
| `trends` | v7 |
| `analyze` | v6 |

## Grenzen

- Keine Shop-/Katalog-Änderungen ohne manuelle Freigabe
- SQLite lokal

## Dateien

```
intelligence/
├── main.py
├── buzzard_intelligence/
│   └── reporting.py
└── archive/
    └── Buzzard_Intelligence_v9_Reporting_Alerts.zip
```
