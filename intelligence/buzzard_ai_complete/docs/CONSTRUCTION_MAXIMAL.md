# BUZZARD CONSTRUCTION MAXIMAL

Construction-need-first taxonomy: **İnşaat & İnşaat Makineleri**.

## Features

- **22 branches** — Materials, earthmoving, concrete, road, lifting, drilling, compaction, tools, safety, parts, attachments, hydraulic, electrical, maintenance, survey, site services, recycling
- **Flat sub-sub taxonomy** — Main category → sub-sub → product group → product → machine fitment
- **ConstructionCatalog** — keyword search and sub-subcategory listing
- **ConstructionFitmentEngine** — machine selection and compatible parts with evidence
- **ConstructionMarketSignals** — demand, competition, margin, supply, seasonality, risk
- **ConstructionGapDetector** — compare Buzzard taxonomy with competitor nodes

## CLI

```bash
cd intelligence
python3 main.py complete-construction-health
python3 main.py complete-construction-branches
python3 main.py complete-construction-demo
python3 main.py complete-construction-schema
python3 main.py complete-construction-taxonomy
python3 main.py complete-construction-docs
```

## API

- `GET /construction/health`
- `GET /construction/branches`
- `GET /construction/schema`
- `GET /construction/taxonomy`
- `GET /construction/demo`

## Important

Fitment requires evidence. Conflicts require human review. `live_activation: false`.

See also: `construction_maximal/docs/CONSTRUCTION_MAXIMAL.md`

Archive: `intelligence/archive/construction_taxonomy.json`
