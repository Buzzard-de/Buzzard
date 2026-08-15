# BUZZARD RENEWABLE ENERGY MAXIMAL

Machine-need-first renewable energy taxonomy: **Yenilenebilir Enerji**.

## Features

- **9 branches** — Solar, wind, storage, hybrid, home/building, agriculture energy, electrical protection, maintenance/spares, commercial/industrial
- **Deep taxonomy** — Main → sub → sub-sub → product group → product → system compatibility
- **Compatibility engine** — Conservative matching with evidence; missing data = unknown
- **Market intelligence** — Demand, margin, competition gap, supply stability, seasonality, risk
- **Gap detection** — Compare Buzzard taxonomy with public competitor categories
- **Supplier connector contract** — Provider-neutral, credentials injected at runtime

## CLI

```bash
cd intelligence
python3 main.py complete-renewable-energy-health
python3 main.py complete-renewable-energy-branches
python3 main.py complete-renewable-energy-demo
python3 main.py complete-renewable-energy-schema
python3 main.py complete-renewable-energy-docs
python3 main.py complete-renewable-energy-taxonomy
```

## API

- `GET /renewable-energy/health`
- `GET /renewable-energy/branches`
- `GET /renewable-energy/schema`
- `GET /renewable-energy/taxonomy`
- `GET /renewable-energy/demo`

## Important

Compatibility requires evidence. Conflicts require human review. `live_activation: false`.

See also: `renewable_energy_maximal/docs/RENEWABLE_ENERGY_MAXIMAL.md`

Archive: `intelligence/archive/buzzard_renewable_energy_maximal.py`
