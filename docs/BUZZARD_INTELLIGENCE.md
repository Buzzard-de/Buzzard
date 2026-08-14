# Buzzard Intelligence v1

Python-MVP für quellenbasierte Markt- und Produktbeobachtungen — getrennt vom Node-Shop und der Render-API.

## Überblick

| Aspekt | Details |
|--------|---------|
| Speicher | SQLite (`intelligence/buzzard_intelligence.db`, lokal, gitignored) |
| Sprache | Python 3.10+ |
| Abhängigkeiten | `requests`, `beautifulsoup4` (für spätere Feed/API-Importer) |
| Original-Paket | `intelligence/archive/Buzzard_Intelligence_v1.zip` |

Das MVP **crawlt nicht** automatisch das Web. Beobachtungen werden manuell oder über erlaubte APIs, Feeds und XML/CSV mit `--source-url` erfasst.

## Schnellstart

```bash
cd intelligence
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py init
python main.py seed-de
python main.py report
```

## Befehle

| Befehl | Beschreibung |
|--------|--------------|
| `init` | SQLite-Schema anlegen |
| `seed-de` | 41 deutsche Buzzard-Hauptkategorien aus `seed_categories_de.json` |
| `seed` | Legacy 100+ TR-Kategorien (Original-Paket) |
| `add-observation` | Produktbeobachtung mit Pflichtfeld `--source-url` |
| `report` | Übersicht Kategorien, Produkte, Beobachtungen |
| `changes` | Letzte 30 Beobachtungen |

## Beispiel-Beobachtung

```bash
python main.py add-observation \
  --category "Automotive" \
  --subcategory "Bremssystem" \
  --product "Beispiel Bremsbelag" \
  --platform "Example Marketplace" \
  --country "DE" \
  --price 49.90 \
  --currency EUR \
  --popularity 82 \
  --source-url "https://example.com/public-page"
```

## Datenmodell

```
categories (3 Ebenen)
  └── products
        └── observations → sources (URL, first/last seen)
```

Felder pro Beobachtung: Plattform, Land, Preis, Währung, Popularität, Zeitstempel, Quellen-URL.

## Integration mit Buzzard Shop

| Bereich | Status |
|---------|--------|
| `data/buzzard_categories.json` | DE-Hauptkategorien als Seed (`seed-de`) |
| Admin AI Center | Geplant — Sync über Render API |
| Produktimport | **Nicht aktiv** — Katalog-Modus, 15 Demo-Produkte |
| Automatisches Crawling | **Nicht erlaubt** ohne explizite Freigabe |

Seed-JSON neu erzeugen (nach Kategorie-Änderungen):

```bash
node scripts/generate-intelligence-seed.mjs
```

## Grenzen (v1)

- Keine automatischen Kauf-/Listing-Entscheidungen
- Keine Preis-Manipulation im Shop
- Kein Blind-Crawl — nur dokumentierte Quellen
- SQLite nur lokal; kein Production-Deploy ohne separates Konzept

## Dateien

```
intelligence/
├── main.py                          CLI
├── requirements.txt
├── README.md
├── archive/Buzzard_Intelligence_v1.zip
└── buzzard_intelligence/
    ├── __init__.py                  Legacy TR SEED_CATEGORIES
    ├── database.py                  SQLite-Logik
    └── seed_categories_de.json      41 DE-Hauptkategorien
```
