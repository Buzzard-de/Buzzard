# Buzzard Intelligence v1–v5

Erweiterbares **Markt-/Produkt-Intelligence-MVP** (Python + SQLite), getrennt vom Node-Shop.

## Module

| Version | Modul | Zweck |
|---------|-------|-------|
| v1 | `database.py` | Kategorien, Beobachtungen, Reports |
| v2 | `memory.py` | Speicher + Änderungserkennung |
| v3 | `collector.py` | robots.txt-konforme HTML-Sammlung |
| v4 | `scheduler.py` | Aufgaben-Registry, Intervalle |
| v5 | `api_layer.py` | Offizielle APIs/Feeds statt Blind-Crawl |

## Setup

```bash
cd intelligence
pip install -r requirements.txt
python main.py init
python main.py seed-de
python main.py sources
```

## v5 API Layer

API-Schlüssel **nur** über Umgebungsvariablen (z. B. `BUZZARD_API_KEY`), nie im Code.

```bash
export BUZZARD_API_KEY="your-key-here"

python main.py add-api \
  --name "Example Catalog API" \
  --base-url "https://example.com/api/products" \
  --category "Automotive"

python main.py sources
python main.py test-apis
python main.py schema
```

Quellen-Schema: `buzzard_intelligence/source_schema.json`

## v4 Scheduler

```bash
python main.py seed-tasks-de
python main.py add-task --category "Automotive" --url "https://example.com/page"
python main.py run
```

## v3 Collector

```bash
python main.py collect --url "https://example.com/page" --category "Automotive"
```

## Archive

- `archive/Buzzard_Intelligence_v1.zip` … `v5_API_Layer.zip`

Siehe: `docs/BUZZARD_INTELLIGENCE.md`
