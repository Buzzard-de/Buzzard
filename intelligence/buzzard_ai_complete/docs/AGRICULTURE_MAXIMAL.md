# BUZZARD AGRICULTURE MAXIMAL

Machine-need-first agriculture taxonomy: **Tarım & Tarım Makineleri**.

## Features

- **9 branches** — Machines, spare parts, farm materials, consumables, equipment, irrigation, greenhouse, orchard/vineyard, tools
- **Deep taxonomy** — Main → sub → sub-sub → product group → product → machine fitment
- **Machine fitment** — Type, manufacturer, model, year, engine, engine code, system, position
- **Market signals** — Demand, competition, price, margin, supply risk scoring
- **Gap detection** — Compare public competitor taxonomies with Buzzard catalog
- **Connector contracts** — OEM, licensed parts catalogs, supplier API/XML

## CLI

```bash
cd intelligence
python3 main.py complete-agriculture-health
python3 main.py complete-agriculture-branches
python3 main.py complete-agriculture-demo
python3 main.py complete-agriculture-schema
python3 main.py complete-agriculture-docs
```

## API

- `GET /agriculture/health`
- `GET /agriculture/branches`
- `GET /agriculture/schema`
- `GET /agriculture/demo`

## Important

Fitment requires evidence. Conflicts require human review. `live_activation: false`.

See also: `agriculture_maximal/docs/AGRICULTURE_MAXIMAL.md`

Archive: `intelligence/archive/BUZZARD_AGRICULTURE_MAXIMAL.zip`
