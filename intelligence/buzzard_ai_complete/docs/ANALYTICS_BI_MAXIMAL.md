# Buzzard MAXIMAL Analytics & Business Intelligence

Integrated analytics layer for the existing one-piece Buzzard system.

Capabilities:
- revenue, cost, gross profit and order KPIs
- refunds and return rate
- advertising ROAS
- product profitability
- customer cohorts
- moving-average forecasts
- anomaly detection
- executive dashboard snapshots
- alerts
- product and supplier ranking
- decision intelligence
- event data quality
- JSON export

This module is an application-layer foundation. It does not fabricate data or
claim access to external accounting, marketplace, advertising or payment data.
Real connectors can feed the same event model when configured.

## CLI

```bash
cd intelligence
python3 main.py complete-analytics-demo
python3 main.py complete-analytics-docs
```

## API

- `GET /analytics/demo` — full analytics demo with sample events
- `GET /analytics/dashboard` — executive dashboard snapshot

## Note

`commerce.analytics` is the Commerce catalog extension scaffold.
`buzzard_ai_complete.analytics_bi` is the operational analytics & BI engine.
