# Buzzard Intelligence v1 + v2 Memory + v3 Collector + v4 Scheduler

Erweiterbares **Markt-/Produkt-Intelligence-MVP** (Python + SQLite), getrennt vom Node-Shop.

## Module

| Version | Modul | Zweck |
|---------|-------|-------|
| v1 | `database.py` | Kategorien, Beobachtungen, Reports |
| v2 | `memory.py` | Speicher + Änderungserkennung |
| v3 | `collector.py` | robots.txt-konforme HTML-Sammlung |
| v4 | `scheduler.py` | Aufgaben-Registry, Intervalle, Prioritäten |

## Setup

```bash
cd intelligence
pip install -r requirements.txt
python main.py init
python main.py seed-de
python main.py seed-tasks-de
python main.py tasks
```

## v4 Scheduler

Platzhalter-Aufgaben pro Kategorie (ohne URL = inaktiv), echte Aufgaben mit Quellen-URL:

```bash
python main.py add-task \
  --category "Automotive" \
  --url "https://example.com/product-page" \
  --interval 1440 \
  --priority 10

python main.py run
python main.py tasks
```

- Mindestintervall: **60 Minuten** (Standard 1440 = 24 h)
- Status: `WAITING_SOURCE`, `PENDING`, `SUCCESS`, `ERROR`
- Führt fällige Aufgaben über v3 Collector aus

## v3 Collector

```bash
python main.py collect --url "https://example.com/page" --category "Automotive"
python main.py collect-list examples/sources.example.txt --category "Automotive"
```

## v2 Memory

```bash
python main.py add-observation --category "Automotive" --product "Demo" --source-url "https://example.com"
python main.py changes
python main.py memory "demo"
python main.py export-memory
```

## Archive

- `archive/Buzzard_Intelligence_v1.zip`
- `archive/Buzzard_Intelligence_v2_Memory.zip`
- `archive/Buzzard_Intelligence_v3_Collector.zip`
- `archive/Buzzard_Intelligence_v4_Scheduler.zip`

Siehe: `docs/BUZZARD_INTELLIGENCE.md`
