# Buzzard Intelligence v1 + v2 Memory + v3 Collector

Python-MVP für quellenbasierte Markt- und Produktbeobachtungen — getrennt vom Node-Shop und der Render-API.

## Überblick

| Aspekt | Details |
|--------|---------|
| v1 Speicher | SQLite `intelligence/buzzard_intelligence.db` |
| v2 Speicher | SQLite `intelligence/buzzard_intelligence_v2.db` |
| Export | `intelligence/buzzard_memory_snapshot.json` (gitignored) |
| Sprache | Python 3.10+ |
| Archive | v1, v2, v3 ZIPs unter `intelligence/archive/` |

## Schnellstart

```bash
cd intelligence
pip install -r requirements.txt
python main.py init
python main.py seed-de
python main.py report-v2
```

## v3 Collector — neu

Legal-public-source collector on top of v2 Memory.

| Schritt | Verhalten |
|---------|-----------|
| robots.txt | Zugriff nur wenn erlaubt; bei Unklarheit: Abbruch |
| Fetch | Langsame Anfragen, Research User-Agent |
| Parse | JSON-LD `Product`, sonst Title/H1 |
| Store | v2 `observe()` mit Quellen-URL und Konfidenz 0.80 |

### Grenzen (v3)

- Kein CAPTCHA-, Login-, Bot-Schutz- oder Paywall-Bypass
- Nur HTML — für APIs/Feeds spätere Adapter
- „Bestseller“ nur wenn Quelle das explizit veröffentlicht
- 1,5 s Pause zwischen Requests in `collect-list`

### Befehle

```bash
python main.py collect \
  --url "https://example.com/product-page" \
  --category "Automotive" \
  --subcategory "Bremssystem"

python main.py collect-list examples/sources.example.txt --category "Automotive"
```

## v2 Memory

| Feature | Beschreibung |
|---------|--------------|
| `events` | Preis-, Popularitäts-, Entdeckungs-Ereignisse |
| `--confidence` | 0.0–1.0 (Standard 0.70; Collector nutzt 0.80) |
| `memory <query>` | Speichersuche |
| `export-memory` | JSON-Snapshot |

## Alle Befehle

| Befehl | Beschreibung |
|--------|--------------|
| `init` | v1 + v2 Schema |
| `seed-de` | 41 deutsche Hauptkategorien |
| `collect` | v3 Einzel-URL |
| `collect-list` | v3 URL-Datei |
| `add-observation` | Manuelle v2 Beobachtung |
| `changes` | Änderungsreport |
| `memory` | Suche |
| `export-memory` | JSON-Export |

## Integration mit Buzzard Shop

| Bereich | Status |
|---------|--------|
| `data/buzzard_categories.json` | DE-Hauptkategorien als Seed |
| Admin AI Center | Geplant |
| Produktimport | **Nicht aktiv** — Katalog-Modus |
| Shop-Preise | Unverändert |

## Dateien

```
intelligence/
├── main.py
├── examples/sources.example.txt
├── buzzard_intelligence/
│   ├── database.py          # v1
│   ├── memory.py            # v2
│   └── collector.py         # v3
└── archive/
    ├── Buzzard_Intelligence_v1.zip
    ├── Buzzard_Intelligence_v2_Memory.zip
    └── Buzzard_Intelligence_v3_Collector.zip
```
