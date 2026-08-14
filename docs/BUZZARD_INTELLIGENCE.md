# Buzzard Intelligence v1–v4

Python-MVP für quellenbasierte Markt- und Produktbeobachtungen — getrennt vom Node-Shop und der Render-API.

## Überblick

| Version | Modul | Speicher |
|---------|-------|----------|
| v1 | `database.py` | `buzzard_intelligence.db` |
| v2 | `memory.py` | `buzzard_intelligence_v2.db` |
| v3 | `collector.py` | nutzt v2 |
| v4 | `scheduler.py` | `buzzard_intelligence_v4.db` |

Archive: `intelligence/archive/Buzzard_Intelligence_v*.zip`

## Schnellstart

```bash
cd intelligence
pip install -r requirements.txt
python main.py init
python main.py seed-de
python main.py seed-tasks-de
python main.py tasks
```

## v4 Scheduler — neu

Orchestrierungsschicht über v3 Collector.

| Feature | Beschreibung |
|---------|--------------|
| `scan_tasks` | Kategorie, URL, Intervall, Priorität, Status |
| `seed-tasks-de` | 41 Platzhalter-Aufgaben (`WAITING_SOURCE`, inaktiv) |
| `add-task` | Echte Quelle mit URL registrieren |
| `run` | Fällige aktive Aufgaben ausführen |
| `tasks` | Aufgabenliste |

```bash
python main.py add-task \
  --category "Automotive" \
  --subcategory "Bremssystem" \
  --url "https://example.com/product-page" \
  --interval 1440 \
  --priority 10

python main.py run
```

- Mindestintervall: 60 Minuten
- Kein automatisches Crawling ohne konfigurierte URL
- Produktion: später PostgreSQL/Redis/Celery möglich

## v3 Collector

robots.txt-aware HTML-Sammlung → v2 Memory. Siehe v3-Abschnitt in vorherigen Releases.

## v2 Memory

Änderungserkennung (Preis, Popularität, Entdeckungen), Suche, JSON-Export.

## Alle CLI-Befehle

| Befehl | Version |
|--------|---------|
| `init` | v1 + v2 + v4 |
| `seed-de` | v1 + v2 |
| `seed-tasks-de` | v4 |
| `add-task` | v4 |
| `tasks` / `run` | v4 |
| `collect` / `collect-list` | v3 |
| `add-observation` / `changes` / `memory` / `export-memory` | v2 |
| `report` | v1 |

## Grenzen

- Keine Shop-/Katalog-Änderungen
- Kein CAPTCHA-/Login-Bypass
- SQLite lokal; kein Production-Deploy ohne separates Konzept

## Dateien

```
intelligence/
├── main.py
├── buzzard_intelligence/
│   ├── database.py
│   ├── memory.py
│   ├── collector.py
│   └── scheduler.py
└── archive/
    └── Buzzard_Intelligence_v4_Scheduler.zip
```
