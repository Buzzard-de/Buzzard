# Buzzard Intelligence v1–v8

Python-MVP für quellenbasierte Markt- und Produktbeobachtungen — getrennt vom Node-Shop und der Render-API.

## Überblick

| Version | Modul | Speicher |
|---------|-------|----------|
| v1 | `database.py` | `buzzard_intelligence.db` |
| v2 | `memory.py` | `buzzard_intelligence_v2.db` |
| v3 | `collector.py` | nutzt v2 |
| v4 | `scheduler.py` | `buzzard_intelligence_v4.db` |
| v5 | `api_layer.py` | `buzzard_intelligence_v5.db` |
| v6 | `analysis.py` | liest v2 |
| v7 | `trends.py` | liest v2 |
| v8 | `discovery.py` | `buzzard_intelligence_v8.db` |

Archive: `intelligence/archive/Buzzard_Intelligence_v*.zip`

## Schnellstart

```bash
cd intelligence
pip install -r requirements.txt
python main.py init
python main.py sync-categories
python main.py demo-discovery
python main.py discover
```

## v8 Category Discovery — neu

Kategoriebaum-Erweiterung mit Quellen-Nachweis.

| Feature | Beschreibung |
|---------|--------------|
| `sync-categories` | Lädt bekannte Kategorien aus `data/buzzard_categories.json` |
| `add-category` | Neues Kategorie-Signal mit Quelle und Konfidenz |
| `discover` | Report: Signale, Ereignisse, Abdeckungslücken |
| Normalisierung | Gleiche Kategorie in unterschiedlicher Schreibweise erkennen |

### Wichtig

- Signale sind **keine** automatischen Shop-Entscheidungen
- Vor Aufnahme: Quelle und Rechtemäßigkeit prüfen
- Erweitert den 41-Hauptkategorien-Omorga, ersetzt ihn nicht

```bash
python main.py add-category \
  --name "Bremsbeläge" \
  --parent "Bremsystem" \
  --level 3 \
  --source "demo-source"

python main.py demo-discovery
python main.py discover
```

## v7 Trends / v6 Analysis

Siehe vorherige Abschnitte — `demo-trends`, `trends`, `demo`, `analyze`.

## Alle CLI-Befehle

| Befehl | Version |
|--------|---------|
| `init` | v1 + v2 + v4 + v5 + v8 |
| `sync-categories` / `add-category` / `discover` / `demo-discovery` | v8 |
| `demo-trends` / `trends` | v7 |
| `demo` / `analyze` | v6 |
| `sources` / `add-api` / `test-apis` | v5 |
| `seed-tasks-de` / `run` | v4 |
| `collect` | v3 |
| `add-observation` / `changes` / `memory` | v2 |

## Grenzen

- Keine Shop-/Katalog-Änderungen ohne manuelle Freigabe
- SQLite lokal

## Dateien

```
intelligence/
├── main.py
├── buzzard_intelligence/
│   └── discovery.py
└── archive/
    └── Buzzard_Intelligence_v8_Category_Discovery.zip
```
