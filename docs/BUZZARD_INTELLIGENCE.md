# Buzzard Intelligence v1–v7

Python-MVP für quellenbasierte Markt- und Produktbeobachtungen — getrennt vom Node-Shop und der Render-API.

## Überblick

| Version | Modul | Speicher |
|---------|-------|----------|
| v1 | `database.py` | `buzzard_intelligence.db` |
| v2 | `memory.py` | `buzzard_intelligence_v2.db` |
| v3 | `collector.py` | nutzt v2 |
| v4 | `scheduler.py` | `buzzard_intelligence_v4.db` |
| v5 | `api_layer.py` | `buzzard_intelligence_v5.db` |
| v6 | `analysis.py` | liest v2 Memory |
| v7 | `trends.py` | liest v2 Memory |

Archive: `intelligence/archive/Buzzard_Intelligence_v*.zip`

## Schnellstart

```bash
cd intelligence
pip install -r requirements.txt
python main.py init
python main.py demo-trends
python main.py trends
```

## v7 Trend & Opportunity — neu

Zeitreihen-Signale aus v2 Memory-Beobachtungen.

| Signal | Beschreibung |
|--------|--------------|
| STEIGEND / FALLEND / STABIL | Popularitätsänderung über Zeit |
| PreisΔ | Preisänderung über Zeitreihe |
| Momentum | Beobachtungsfrequenz (14-Tage-Fenster) |
| Opportunity-Score | Erklärbarer Score (≠ Kaufempfehlung) |
| Datenlücken | Hauptkategorien ohne Beobachtungen |

### Wichtig

- Opportunity-Score ist **keine** Entscheidung oder Verkaufsprognose
- Bei < 2 Datenpunkten: „DATEN UNZUREICHEND“
- Score erst ab 3 Beobachtungen

```bash
python main.py demo-trends   # Zeitreihen-Demo (Motoröl steigend, Schlauch fallend)
python main.py trends        # Trend- & Opportunity-Bericht
```

## v6 Analysis

Markt-/Kategorie-Analyse, Events, Länder-Sichtbarkeit.

```bash
python main.py demo
python main.py analyze
```

## v5–v1

API Layer, Scheduler, Collector, Memory, Database — parallel nutzbar.

## Alle CLI-Befehle

| Befehl | Version |
|--------|---------|
| `init` | v1 + v2 + v4 + v5 |
| `demo-trends` / `trends` | v7 |
| `demo` / `analyze` | v6 |
| `sources` / `add-api` / `test-apis` | v5 |
| `seed-tasks-de` / `run` | v4 |
| `collect` | v3 |
| `add-observation` / `changes` / `memory` | v2 |
| `report` | v1 |

## Grenzen

- Keine Shop-/Katalog-Änderungen
- Keine erfundenen Verkaufszahlen
- SQLite lokal

## Dateien

```
intelligence/
├── main.py
├── buzzard_intelligence/
│   ├── database.py
│   ├── memory.py
│   ├── collector.py
│   ├── scheduler.py
│   ├── api_layer.py
│   ├── analysis.py
│   └── trends.py
└── archive/
    └── Buzzard_Intelligence_v7_Trend_Opportunity.zip
```
