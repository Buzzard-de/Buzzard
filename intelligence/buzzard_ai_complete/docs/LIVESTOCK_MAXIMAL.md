# BUZZARD LIVESTOCK MAXIMAL

Animal-need-first livestock taxonomy: **Hayvancılık**.

## Features

- **Animal groups** — Cattle, sheep/goat, poultry, pig, horse, beekeeping, aquaculture
- **System groups** — Housing, feeding, watering, milking, manure, transport, automation
- **Deep taxonomy** — Animal group → need/system → subcategory → sub-subcategory → product → equipment fitment
- **Equipment fitment** — Source-backed compatibility for farm equipment (not medical diagnosis)
- **Opportunity scoring** — Demand, competition gap, margin, supply, seasonality, risk
- **Gap detection** — Compare Buzzard taxonomy with competitor nodes

## CLI

```bash
cd intelligence
python3 main.py complete-livestock-health
python3 main.py complete-livestock-branches
python3 main.py complete-livestock-demo
python3 main.py complete-livestock-schema
python3 main.py complete-livestock-docs
```

## API

- `GET /livestock/health`
- `GET /livestock/branches`
- `GET /livestock/schema`
- `GET /livestock/demo`

## Important

Equipment fitment requires evidence. No medical diagnosis. `live_activation: false`.

See also: `livestock_maximal/docs/LIVESTOCK_MAXIMAL.md`

Archive: `intelligence/archive/BUZZARD_LIVESTOCK_MAXIMAL.zip`
