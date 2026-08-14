# Buzzard Intelligence v1–v6

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

Archive: `intelligence/archive/Buzzard_Intelligence_v*.zip`

## Schnellstart

```bash
cd intelligence
pip install -r requirements.txt
python main.py init
python main.py seed-de
python main.py demo
python main.py analyze
```

## v6 Analysis — neu

Markt- und Kategorie-Analyse aus v2 Memory-Daten.

| Signal | Quelle |
|--------|--------|
| Häufig beobachtete Produkte | Beobachtungsdichte (≠ Verkäufe) |
| Popularitätssignale | `observations.popularity` |
| Preisänderungen | v2 `events` (`PRICE_CHANGE`) |
| Popularität up/down | `POPULARITY_UP` / `POPULARITY_DOWN` |
| Neue Entdeckungen | `NEW_DISCOVERY` |
| Kategorie-Dichte | Hauptkategorien (level 1) |
| Länder-Sichtbarkeit | Beobachtungen pro Land |
| Daten-Warnung | bei < 5 Beobachtungen |

### Wichtig

- Keine „Bestseller“-Aussagen ohne verifizierte Verkaufszahlen
- Keine automatischen Shop-Entscheidungen
- Bericht dient der menschlichen Auswertung

```bash
python main.py demo      # DE Demo-Produkte in Automotive
python main.py analyze   # Vollständiger Analysebericht
```

## v5 API Layer

Offizielle APIs/Feeds, env-basierte Auth. Siehe v5-Dokumentation.

## v4–v1

Scheduler, Collector, Memory, Database — unverändert nutzbar.

## Alle CLI-Befehle

| Befehl | Version |
|--------|---------|
| `init` | v1 + v2 + v4 + v5 |
| `demo` / `analyze` | v6 |
| `sources` / `add-api` / `test-apis` | v5 |
| `seed-tasks-de` / `run` | v4 |
| `collect` | v3 |
| `add-observation` / `changes` / `memory` | v2 |
| `report` | v1 |

## Grenzen

- Keine Shop-/Katalog-Änderungen
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
│   └── analysis.py
└── archive/
    └── Buzzard_Intelligence_v6_Analysis.zip
```
