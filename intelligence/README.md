# Buzzard Intelligence v1 + v2 Memory + v3 Collector

Erweiterbares **Markt-/Produkt-Intelligence-MVP** (Python + SQLite), getrennt vom Node-Shop.

## Zweck

**v1** — Kategorien, Beobachtungen, einfache Reports  
**v2 Memory** — persistenter Speicher mit Änderungserkennung  
**v3 Collector** — robots.txt-konforme Sammlung öffentlicher HTML-Quellen

- JSON-LD `Product`-Daten oder Title/H1 auslesen
- Beobachtungen in v2 Memory speichern
- Kein CAPTCHA-/Login-/Paywall-Bypass

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
| `seed-de` | 41 deutsche Buzzard-Hauptkategorien |
| `collect --url ...` | Eine öffentliche HTML-Seite sammeln (v3) |
| `collect-list sources.txt` | Mehrere URLs aus Datei |
| `add-observation` | Manuelle Beobachtung (v2) |
| `changes` | Erkannte Änderungen |
| `memory <query>` | Speichersuche |
| `export-memory` | JSON-Snapshot |

## v3 Collector

```bash
python main.py collect \
  --url "https://example.com/product-page" \
  --category "Automotive" \
  --subcategory "Bremssystem" \
  --country DE

python main.py collect-list examples/sources.example.txt --category "Automotive"
```

## Beispiel (manuell)

```bash
python main.py add-observation \
  --category "Automotive" \
  --subcategory "Bremssystem" \
  --product "Beispiel Bremsbelag" \
  --price 49.90 \
  --source-url "https://example.com/public-page"

python main.py changes
python main.py memory "bremsbelag"
```

## Dateien

| Pfad | Inhalt |
|------|--------|
| `buzzard_intelligence/database.py` | v1 |
| `buzzard_intelligence/memory.py` | v2 |
| `buzzard_intelligence/collector.py` | v3 |
| `examples/sources.example.txt` | URL-Liste Vorlage |
| `archive/Buzzard_Intelligence_v3_Collector.zip` | Original v3 |

Siehe auch: `docs/BUZZARD_INTELLIGENCE.md`
