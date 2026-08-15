# Buzzard Marketing & Advertising Engine v1

Includes:
- budget allocation across ad channels
- campaign models and provider adapters (Google Ads, Meta Ads)
- performance evaluation and ROAS optimization
- attribution event tracking
- marketing compliance and consent gates
- audience segment selection
- creative registry foundation
- deterministic tests

External ad platform APIs are not faked; without configured credentials
the provider layer reports `NOT_CONFIGURED`.

## CLI

```bash
cd intelligence
python3 main.py complete-marketing-demo
python3 main.py complete-marketing-budget --total 1000 --channels google_ads,meta_ads --weights google_ads:2,meta_ads:1
python3 main.py complete-marketing-docs
```

## API

- `GET /marketing/demo` — full demo flow
- `POST /marketing/budget` — allocate budget across channels
- `POST /marketing/campaign` — create campaign via provider adapter

## Environment (optional)

Google Ads: `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`,
`GOOGLE_ADS_REFRESH_TOKEN`, `GOOGLE_ADS_CUSTOMER_ID`

Meta Ads: `META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID`

## Note

`commerce.promotions` is the Commerce catalog extension scaffold.
`buzzard_ai_complete.marketing` is the operational marketing & advertising engine.
