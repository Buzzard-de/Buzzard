# Buzzard Intelligence v1–v6

Erweiterbares **Markt-/Produkt-Intelligence-MVP** (Python + SQLite), getrennt vom Node-Shop.

## Module

| Version | Modul | Zweck |
|---------|-------|-------|
| v1 | `database.py` | Kategorien, Beobachtungen, Reports |
| v2 | `memory.py` | Speicher + Änderungserkennung |
| v3 | `collector.py` | robots.txt-konforme HTML-Sammlung |
| v4 | `scheduler.py` | Aufgaben-Registry, Intervalle |
| v5 | `api_layer.py` | Offizielle APIs/Feeds |
| v6 | `analysis.py` | Markt-/Kategorie-Analyse aus v2 Memory |

## Setup

```bash
cd intelligence
pip install -r requirements.txt
python main.py init
python main.py seed-de
python main.py demo
python main.py analyze
```

## v6 Analysis

Entscheidungsunterstützung aus v2 Memory — **keine Bestseller-Behauptungen ohne Verkaufsdaten**.

```bash
python main.py demo
python main.py analyze
```

Bericht enthält: häufigste Beobachtungen, Popularitätssignale, Preis-/Popularitäts-Events, Kategorie-Dichte, Länder-Sichtbarkeit, Daten-Warnung.

## v5 API Layer

```bash
python main.py add-api --name "Example" --base-url "https://example.com/api" --category "Automotive"
python main.py test-apis
```

## Archive

`archive/Buzzard_Intelligence_v1.zip` … `v6_Analysis.zip`

Siehe: `docs/BUZZARD_INTELLIGENCE.md`
