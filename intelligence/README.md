# Buzzard Intelligence v1–v9

Erweiterbares **Markt-/Produkt-Intelligence-MVP** (Python + SQLite), getrennt vom Node-Shop.

## Module

| Version | Modul | Zweck |
|---------|-------|-------|
| v1–v8 | … | Memory, Collector, Scheduler, API, Analysis, Trends, Discovery |
| v9 | `reporting.py` | Management-Reports, Warnungen, Prioritäts-Warteschlange |

## Setup

```bash
cd intelligence
pip install -r requirements.txt
python main.py init
python main.py demo-reporting
python main.py intel-report
python main.py alerts
python main.py queue
```

## v9 Reporting & Alerts

Aggregiert Signale aus v2 Memory und v8 Discovery — **keine automatischen Entscheidungen**.

```bash
python main.py refresh-alerts
python main.py intel-report
python main.py alerts
python main.py queue
```

Warnungstypen: `NEW_PRODUCT`, `NEW_CATEGORY`, `PRICE_CHANGE`, `TREND`, `DATA_GAP`

Archive: `archive/Buzzard_Intelligence_v9_Reporting_Alerts.zip`

Siehe: `docs/BUZZARD_INTELLIGENCE.md`
