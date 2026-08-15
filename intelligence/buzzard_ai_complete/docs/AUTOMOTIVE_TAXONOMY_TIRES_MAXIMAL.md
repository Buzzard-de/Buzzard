# BUZZARD AUTOMOTIVE TAXONOMY — TIRES MAXIMAL

Dedicated tire category inside Automotive: **Otomotiv → Lastikler → vehicle type → subcategory → sub-subcategory**.

## Features

- **Separate category** — Tires are not a sub-product under wheels; they have their own deep taxonomy
- **12 vehicle types** — Passenger car, SUV/4x4, light commercial, truck, bus, trailer, motorcycle, ATV/quad, tractor, agricultural machines, construction/industrial, specialty
- **Deep sub-trees** — Season, performance, EV, run-flat, reinforced, terrain types, axle roles, etc.
- **Size validation** — Width, aspect ratio, rim diameter with provider-neutral search contract
- **Fitment engine** — Vehicle-specific tire fitment with evidence and confidence
- **18 vehicle scope** — Binek, SUV/4x4, Kamyon, Traktör, Motosiklet, EV/Hybrid, etc.
- **PIM integration** — Catalog source via Buzzard PIM / verified fitment data

## CLI

```bash
cd intelligence
python3 main.py complete-automotive-taxonomy-tires-categories
python3 main.py complete-automotive-taxonomy-tires-demo
python3 main.py complete-automotive-taxonomy-tires-schema
python3 main.py complete-automotive-taxonomy-tires-docs
```

## API

- `GET /automotive-taxonomy/tires/categories`
- `GET /automotive-taxonomy/tires/demo`
- `GET /automotive-taxonomy/tires/config`

## Important

Fitment requires evidence. Size validation enabled. `live_activation: false`.

See also: `automotive_taxonomy_maximal/docs/TIRES_SEPARATE_CATEGORY_MAXIMAL.md`

Archive: `intelligence/archive/BUZZARD_AUTOMOTIVE_TAXONOMY_MAXIMAL_WITH_TIRES.zip`
