# Buzzard Intelligence v1–v8

Erweiterbares **Markt-/Produkt-Intelligence-MVP** (Python + SQLite), getrennt vom Node-Shop.

## Module

| Version | Modul | Zweck |
|---------|-------|-------|
| v1–v5 | … | Memory, Collector, Scheduler, API |
| v6 | `analysis.py` | Markt-/Kategorie-Analyse |
| v7 | `trends.py` | Trend- & Opportunity-Signale |
| v8 | `discovery.py` | Kategorie-Entdeckung & Normalisierung |

## Setup

```bash
cd intelligence
pip install -r requirements.txt
python main.py init
python main.py sync-categories
python main.py demo-discovery
python main.py discover
```

## v8 Category Discovery

Erweitert den Kategoriebaum mit quellenbasierten Signalen — **keine automatischen Shop-Änderungen**.

```bash
python main.py add-category \
  --name "Bremsbeläge" \
  --parent "Bremsystem" \
  --level 3 \
  --source "https://example.com/feed" \
  --confidence 0.85

python main.py discover
```

## Weitere Befehle

```bash
python main.py demo && python main.py analyze      # v6
python main.py demo-trends && python main.py trends # v7
```

Archive: `archive/Buzzard_Intelligence_v1.zip` … `v8_Category_Discovery.zip`

Siehe: `docs/BUZZARD_INTELLIGENCE.md`
