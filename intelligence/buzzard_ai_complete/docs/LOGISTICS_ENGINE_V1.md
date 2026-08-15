# Buzzard Logistics & Smart Shipping Engine v1

The engine:
- validates parcels
- evaluates carrier quotes
- selects cheapest / fastest / balanced options
- supports DHL, DPD, GLS, Hermes and UPS adapters
- supports tracking and label integration points
- supports volume-contract pricing
- does not claim a real carrier quote when credentials/API integration is absent

Real carrier APIs and negotiated business rates must be configured separately.

## CLI

```bash
cd intelligence
python3 main.py complete-logistics-demo
python3 main.py complete-logistics-recommend --weight 2 --length 30 --width 20 --height 15 --country DE --postal-code 35075 --priority cheapest
python3 main.py complete-logistics-docs
```

## API

`POST /logistics/recommend` — carrier recommendation (FastAPI)

## Note

`commerce.logistics` stores DB-backed shipping rates for Commerce.
`buzzard_ai_complete.logistics` is the Smart Shipping Engine with carrier adapters.
