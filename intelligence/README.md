# Buzzard Intelligence v1–v10

Erweiterbares **Markt-/Produkt-Intelligence-MVP** (Python + SQLite), getrennt vom Node-Shop.

## Module

| Version | Modul | Zweck |
|---------|-------|-------|
| v1–v9 | … | Memory → Reporting |
| v10 | `council.py` | Review-Workflow, Posteingang, Audit-Trail |

## Setup

```bash
cd intelligence
pip install -r requirements.txt
python main.py init
python main.py demo-reporting
python main.py sync-council
python main.py inbox
python main.py council-board
```

## v10 Council Integration

Trennt **Intelligence-Signale** von **menschlichen Entscheidungen**.

```bash
python main.py council-event \
  --type TREND \
  --title "Steigendes Produktsignal" \
  --details "..." \
  --source "https://example.com"

python main.py council-assign --event-id 1 --agent "Review Lead"
python main.py council-review --event-id 1 --decision "WATCH" --note "Beobachten"
```

Archive: `archive/Buzzard_Intelligence_v10_Council_Integration.zip`

Siehe: `docs/BUZZARD_INTELLIGENCE.md`
