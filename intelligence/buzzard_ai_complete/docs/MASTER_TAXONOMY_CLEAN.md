# BUZZARD MASTER TAXONOMY CLEAN

Unified clean bundle for separate commercial taxonomy domains.

## Integrated Domains

- **Automotive / Tires** — vehicle-need-first + dedicated Lastikler category
- **Agriculture** — machine-need-first Tarım & Tarım Makineleri
- **Livestock** — animal-need-first Hayvancılık

## Features

- Unified health across all three taxonomy domains
- Sales activation defaults OFF (`BUZZARD_SALES_ENABLED=0`)
- Fitment requires evidence, human review on conflicts
- No live credentials in package

## CLI

```bash
cd intelligence
python3 main.py complete-master-taxonomy-clean-health
python3 main.py complete-master-taxonomy-clean-demo
python3 main.py complete-master-taxonomy-clean-manifest
python3 main.py complete-master-taxonomy-clean-docs
```

## API

- `GET /master-taxonomy-clean/health`
- `GET /master-taxonomy-clean/manifest`
- `GET /master-taxonomy-clean/sales-defaults`
- `GET /master-taxonomy-clean/demo`

## Important

`live_activation: false` — all domains remain catalog/intelligence mode.

Archive: `intelligence/archive/BUZZARD_MASTER_TAXONOMY_CLEAN.zip`
