# Buzzard Intelligence v1

Erweiterbares **Markt-/Produkt-Intelligence-MVP** (Python + SQLite), getrennt vom Node-Shop.

## Zweck

- Kategorien (3 Ebenen) und Produktbeobachtungen speichern
- Preis, Plattform, Land, Quelle, Popularität erfassen
- Wiederholte Beobachtungen vergleichen und reporten
- **Keine automatischen Entscheidungen** — nur quellenbasierte Informationen

## Wichtig

Dieses MVP crawlt **nicht** automatisch das Web. Erweiterungen nur über erlaubte APIs, Feeds, XML/CSV und robots.txt-konforme Quellen.

## Setup

```bash
cd intelligence
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python main.py init
python main.py seed-de        # 41 deutsche Buzzard-Hauptkategorien
python main.py report
```

## Befehle

| Befehl | Beschreibung |
|--------|--------------|
| `init` | SQLite-Schema anlegen |
| `seed-de` | Deutsche Hauptkategorien aus `data/buzzard_categories.json` |
| `seed` | Legacy 100+ TR-Kategorien (Original-Paket) |
| `add-observation` | Produktbeobachtung mit `--source-url` speichern |
| `report` | Übersicht |
| `changes` | Letzte Beobachtungen |

## Beispiel

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

python main.py report
python main.py changes
```

## Dateien

| Pfad | Inhalt |
|------|--------|
| `buzzard_intelligence/database.py` | SQLite-Logik |
| `buzzard_intelligence/seed_categories_de.json` | 41 DE-Hauptkategorien |
| `buzzard_intelligence.db` | Lokale DB (gitignored) |
| `archive/Buzzard_Intelligence_v1.zip` | Original-Upload |

## Integration (später)

- Anbindung an Admin AI Center / Render API
- Sync mit `data/buzzard_categories.json`
- Feed/API-Importer (kein Blind-Crawl)

Siehe auch: `docs/BUZZARD_INTELLIGENCE.md`
