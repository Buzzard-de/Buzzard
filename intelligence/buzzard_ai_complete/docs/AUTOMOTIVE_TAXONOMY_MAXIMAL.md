# BUZZARD AUTOMOTIVE TAXONOMY MAXIMAL

Vehicle-need-first automotive taxonomy: system → component → product → exact fitment.

## Features

- 90+ master vehicle need systems (engine, brakes, fluids, EV, commercial, etc.)
- 6-level hierarchy with fitment dimensions
- Vehicle selector (make, model, year, engine, engine code, etc.)
- Fitment engine with source/confidence evidence
- TecDoc/OEM/supplier connector contracts
- Taxonomy validation and gap detection hooks

## CLI

```bash
cd intelligence
python3 main.py complete-automotive-taxonomy-health
python3 main.py complete-automotive-taxonomy-seed
python3 main.py complete-automotive-taxonomy-demo
python3 main.py complete-automotive-taxonomy-schema
python3 main.py complete-automotive-taxonomy-docs
```

## API

- `GET /automotive-taxonomy/health`
- `GET /automotive-taxonomy/seed`
- `GET /automotive-taxonomy/schema`
- `GET /automotive-taxonomy/demo`

## Important

Fitment requires evidence. No automatic fitment publish. `live_activation: false`.

See also: `automotive_taxonomy_maximal/docs/AUTOMOTIVE_TAXONOMY_MAXIMAL.md`
