# Buzzard Intelligence v1 + v2 Memory

Python-MVP für quellenbasierte Markt- und Produktbeobachtungen — getrennt vom Node-Shop und der Render-API.

## Überblick

| Aspekt | Details |
|--------|---------|
| v1 Speicher | SQLite `intelligence/buzzard_intelligence.db` |
| v2 Speicher | SQLite `intelligence/buzzard_intelligence_v2.db` |
| Export | `intelligence/buzzard_memory_snapshot.json` (gitignored) |
| Sprache | Python 3.10+ |
| Archive | `intelligence/archive/Buzzard_Intelligence_v1.zip`, `Buzzard_Intelligence_v2_Memory.zip` |

Das MVP **crawlt nicht** automatisch das Web. Beobachtungen werden manuell oder über erlaubte APIs, Feeds und XML/CSV mit `--source-url` erfasst.

## Schnellstart

```bash
cd intelligence
pip install -r requirements.txt
python main.py init
python main.py seed-de
python main.py report-v2
```

## v2 Memory — neu

| Feature | Beschreibung |
|---------|--------------|
| `events` Tabelle | Preis-, Popularitäts- und Entdeckungs-Ereignisse |
| `--confidence` | 0.0–1.0 pro Beobachtung (Standard: 0.70) |
| `--source-name` | Lesbarer Quellenname |
| `memory <query>` | Suche in Produkten, Marken, Kategorien |
| `export-memory` | Vollständiger JSON-Snapshot |

### Ereignistypen

- `NEW_DISCOVERY` — neues Produkt im Speicher
- `PRICE_CHANGE` — Preisabweichung zur letzten Beobachtung
- `POPULARITY_UP` / `POPULARITY_DOWN` — Popularitätsdelta ≥ 5

## Befehle

| Befehl | Beschreibung |
|--------|--------------|
| `init` | v1 + v2 Schema |
| `seed-de` | 41 deutsche Hauptkategorien |
| `add-observation` | v2 Beobachtung mit Änderungserkennung |
| `changes` | v2 Änderungsreport |
| `memory` | v2 Speichersuche |
| `export-memory` | JSON-Export |
| `report` | v1 Übersicht (Legacy) |

## Beispiel

```bash
python main.py add-observation \
  --category "Automotive" \
  --subcategory "Bremssystem" \
  --product "Beispiel Bremsbelag" \
  --price 49.90 \
  --popularity 82 \
  --confidence 0.85 \
  --source-url "https://example.com/public-page"

python main.py add-observation \
  --category "Automotive" \
  --subcategory "Bremssystem" \
  --product "Beispiel Bremsbelag" \
  --price 44.90 \
  --popularity 90 \
  --source-url "https://example.com/public-page"

python main.py changes
```

## Integration mit Buzzard Shop

| Bereich | Status |
|---------|--------|
| `data/buzzard_categories.json` | DE-Hauptkategorien als Seed |
| Admin AI Center | Geplant |
| Produktimport | **Nicht aktiv** — Katalog-Modus |
| Automatisches Crawling | **Nicht erlaubt** |

Seed neu erzeugen:

```bash
node scripts/generate-intelligence-seed.mjs
```

## Grenzen

- Keine automatischen Kauf-/Listing-Entscheidungen
- Kein Blind-Crawl
- SQLite nur lokal

## Dateien

```
intelligence/
├── main.py
├── buzzard_intelligence/
│   ├── database.py          # v1
│   ├── memory.py            # v2 Memory Engine
│   └── seed_categories_de.json
└── archive/
    ├── Buzzard_Intelligence_v1.zip
    └── Buzzard_Intelligence_v2_Memory.zip
```
