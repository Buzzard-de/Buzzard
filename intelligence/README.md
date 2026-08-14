# Buzzard Intelligence v1–v7

Erweiterbares **Markt-/Produkt-Intelligence-MVP** (Python + SQLite), getrennt vom Node-Shop.

## Module

| Version | Modul | Zweck |
|---------|-------|-------|
| v1 | `database.py` | Kategorien, Beobachtungen, Reports |
| v2 | `memory.py` | Speicher + Änderungserkennung |
| v3 | `collector.py` | robots.txt-konforme HTML-Sammlung |
| v4 | `scheduler.py` | Aufgaben-Registry |
| v5 | `api_layer.py` | Offizielle APIs/Feeds |
| v6 | `analysis.py` | Markt-/Kategorie-Analyse |
| v7 | `trends.py` | Trend- & Opportunity-Signale |

## Setup

```bash
cd intelligence
pip install -r requirements.txt
python main.py init
python main.py demo-trends
python main.py trends
```

## v7 Trends

Zeitreihen aus v2 Memory — **kein Opportunity-Score ohne genug Datenpunkte**.

```bash
python main.py demo-trends
python main.py trends
python main.py analyze
```

## v6 Analysis

```bash
python main.py demo
python main.py analyze
```

## Archive

`archive/Buzzard_Intelligence_v1.zip` … `v7_Trend_Opportunity.zip`

Siehe: `docs/BUZZARD_INTELLIGENCE.md`
