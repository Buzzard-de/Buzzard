# Buzzard Intelligence v1 + v2 Memory

Erweiterbares **Markt-/Produkt-Intelligence-MVP** (Python + SQLite), getrennt vom Node-Shop.

## Zweck

**v1** — Kategorien, Beobachtungen, einfache Reports  
**v2 Memory** — persistente Hafıza mit Änderungserkennung:

- Preisänderungen (`PRICE_CHANGE`)
- Popularitätsänderungen (`POPULARITY_UP` / `POPULARITY_DOWN`)
- Neue Entdeckungen (`NEW_DISCOVERY`)
- Speichersuche und JSON-Export
- Konfidenz-Score pro Beobachtung

**Keine automatischen Entscheidungen** — nur quellenbasierte Informationen.

## Setup

```bash
cd intelligence
pip install -r requirements.txt
python main.py init
python main.py seed-de
python main.py report-v2
```

## Befehle

| Befehl | Beschreibung |
|--------|--------------|
| `init` | v1 + v2 Schema anlegen |
| `seed-de` | 41 deutsche Buzzard-Hauptkategorien (v1 + v2) |
| `seed` | Legacy 100+ TR-Kategorien |
| `add-observation` | Beobachtung mit `--source-url`, optional `--confidence` |
| `report` | v1 Übersicht |
| `report-v2` | v2 Memory-Übersicht inkl. Ereignisse |
| `changes` | Erkannte Änderungen (Preis, Popularität, Entdeckungen) |
| `memory <query>` | Speichersuche |
| `export-memory` | JSON-Snapshot nach `buzzard_memory_snapshot.json` |

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
  --confidence 0.85 \
  --source-url "https://example.com/public-page"

python main.py changes
python main.py memory "bremsbelag"
python main.py export-memory
```

## Dateien

| Pfad | Inhalt |
|------|--------|
| `buzzard_intelligence/database.py` | v1 SQLite-Logik |
| `buzzard_intelligence/memory.py` | v2 Memory Engine |
| `buzzard_intelligence/seed_categories_de.json` | 41 DE-Hauptkategorien |
| `archive/Buzzard_Intelligence_v1.zip` | Original v1 |
| `archive/Buzzard_Intelligence_v2_Memory.zip` | Original v2 |

Siehe auch: `docs/BUZZARD_INTELLIGENCE.md`
