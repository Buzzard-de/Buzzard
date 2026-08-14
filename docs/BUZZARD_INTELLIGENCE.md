# Buzzard Intelligence v1–v5

Python-MVP für quellenbasierte Markt- und Produktbeobachtungen — getrennt vom Node-Shop und der Render-API.

## Überblick

| Version | Modul | Speicher |
|---------|-------|----------|
| v1 | `database.py` | `buzzard_intelligence.db` |
| v2 | `memory.py` | `buzzard_intelligence_v2.db` |
| v3 | `collector.py` | nutzt v2 |
| v4 | `scheduler.py` | `buzzard_intelligence_v4.db` |
| v5 | `api_layer.py` | `buzzard_intelligence_v5.db` |

Archive: `intelligence/archive/Buzzard_Intelligence_v*.zip`

## Schnellstart

```bash
cd intelligence
pip install -r requirements.txt
python main.py init
python main.py seed-de
python main.py sources
```

## v5 API Layer — neu

Nachhaltige Quellen-Anbindung statt HTML-Crawl wo möglich:

- Offizielle API
- JSON/XML/CSV-Feed
- Erlaubte offene Datenquellen

### Sicherheit

- API-Keys nur via Umgebungsvariable (`BUZZARD_API_KEY` oder `--auth-env`)
- Kein CAPTCHA-/Login-/Rate-Limit-Bypass
- Connector-Framework — plattformspezifische Adapter folgen separat

### Befehle

```bash
python main.py add-api \
  --name "Example Catalog API" \
  --base-url "https://example.com/api/products" \
  --category "Automotive" \
  --country DE \
  --auth-env BUZZARD_API_KEY

python main.py sources
python main.py test-apis
python main.py schema
```

Schema-Vorlage: `intelligence/buzzard_intelligence/source_schema.json`

## v4 Scheduler

Aufgaben-Registry mit Priorität/Intervall, Ausführung via v3 Collector.

## v3 Collector

robots.txt-aware HTML → v2 Memory.

## v2 Memory

Änderungserkennung, Suche, JSON-Export.

## Alle CLI-Befehle

| Befehl | Version |
|--------|---------|
| `init` | v1 + v2 + v4 + v5 |
| `sources` / `add-api` / `test-apis` / `schema` | v5 |
| `seed-tasks-de` / `add-task` / `tasks` / `run` | v4 |
| `collect` / `collect-list` | v3 |
| `add-observation` / `changes` / `memory` / `export-memory` | v2 |
| `report` | v1 |

## Grenzen

- Keine Shop-/Katalog-Änderungen
- Kein Blind-Crawl wenn API/Feed verfügbar
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
│   └── source_schema.json
└── archive/
    └── Buzzard_Intelligence_v5_API_Layer.zip
```
