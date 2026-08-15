# Buzzard MAXIMAL platform layer

This package upgrades the existing V1/V2 modules with a shared maximal
platform layer: registry, policy, audit, health, security helpers,
idempotency, retries, rate limiting, data quality, workflows, feature flags,
observability, backup snapshots, product intelligence and decisioning.

"Maximal" here means the software architecture is extended as far as can be
implemented safely without inventing third-party credentials, commercial
contracts, legal approvals or provider-specific production data.

Real eBay/Amazon/TecDoc/payment/carrier/ad-provider connections still require
real credentials and current provider contracts.

## CLI

```bash
cd intelligence
python3 main.py complete-max-demo
python3 main.py complete-max-snapshot
python3 main.py complete-max-docs
```

## API

- `GET /vmax/demo` — platform demo with module registry
- `GET /vmax/snapshot` — current platform snapshot

## V2 add-ons (additive, V1 intact)

| Module | V2 files |
|--------|----------|
| Logistics | `routing_v2`, `contracts_v2`, `webhooks_v2` |
| Order Engine | `idempotency`, `orchestration_v2` |
| Customer Billing | `document_numbering_v2`, `ledger_v2`, `tax_policy_v2` |
| CRM | `consent_v2`, `journeys_v2`, `service_levels_v2` |
| Marketing | `experiments_v2`, `pacing_v2`, `rules_v2` |
