# Buzzard Intelligence v1–v10

Python-MVP für quellenbasierte Markt- und Produktbeobachtungen — getrennt vom Node-Shop und der Render-API.

## Überblick

| Version | Modul | Speicher |
|---------|-------|----------|
| v1–v9 | … | siehe vorherige Abschnitte |
| v10 | `council.py` | `buzzard_council_v10.db` |

Archive: `intelligence/archive/Buzzard_Intelligence_v*.zip`

## Schnellstart

```bash
cd intelligence
pip install -r requirements.txt
python main.py init
python main.py demo-reporting
python main.py sync-council
python main.py inbox
python main.py council-board
```

## v10 Council Integration — neu

Review-Workflow zwischen Intelligence und menschlicher Entscheidung.

| Befehl | Beschreibung |
|--------|--------------|
| `inbox` | Offene Intelligence-Ereignisse |
| `council-board` | Status, Bewertungen, Audit-Trail |
| `council-event` | Ereignis manuell anlegen |
| `council-assign` | Zuständigkeit zuweisen |
| `council-review` | Bewertung/Entscheidung dokumentieren |
| `sync-council` | v9-Warnungen in Posteingang importieren |
| `demo-council` | Demo-Ereignisse |

### Regeln

1. Intelligence liefert Daten und Signale
2. Intelligence trifft **keine** alleinigen Geschäftsentscheidungen
3. Reviewer dokumentieren Bewertungen
4. Jedes Ereignis hat Quelle und Zeitstempel
5. Verifizierungsstatus (`UNVERIFIED`) für kritische Infos

```bash
python main.py council-event \
  --type CATEGORY_DISCOVERY \
  --title "Neues Kategorie-Signal" \
  --source "https://example.com" \
  --priority 8

python main.py council-assign --event-id 1 --agent "Category Lead"
python main.py council-review --event-id 1 --decision "DEFER" --note "Quelle prüfen"
```

## v9–v1

Reporting, Discovery, Trends, Analysis, Collector, … — unverändert nutzbar.

## Alle CLI-Befehle (Auszug)

| Befehl | Version |
|--------|---------|
| `init` | v1 + v2 + v4 + v5 + v8 + v9 + v10 |
| `inbox` / `council-board` / `sync-council` | v10 |
| `intel-report` / `alerts` | v9 |
| `discover` | v8 |
| `trends` | v7 |
| `analyze` | v6 |

## Grenzen

- Keine Shop-/Katalog-Änderungen ohne manuelle Freigabe
- v10 ist Kommunikations-/Review-Kern, kein Multi-Agent-Orchestrator

## Dateien

```
intelligence/
├── main.py
├── buzzard_intelligence/
│   └── council.py
└── archive/
    └── Buzzard_Intelligence_v10_Council_Integration.zip
```
