# Buzzard Production MAX Upgrade

This upgrade directly addresses storefront and go-live foundation gaps:

1. Real storefront foundation: catalog, search, cart, quote and checkout lifecycle.
2. Real product ingestion pipeline: JSON, CSV and XML normalization.
3. Profitability guard with minimum net-profit protection.
4. Provider configuration/status registry for payments, shipping, marketplaces, TecDoc and LLM.
5. eBay/Amazon/TecDoc/payment/carrier adapters that never fake a live success.
6. AI agent runtime boundary for Doğu Bey, Aslan Bey and Esat Bey.
7. Production readiness gate.
8. Production and storefront API routes.
9. Full regression testing of the combined package.

Important: this is production-oriented application code, not a claim that third-party
accounts are connected. Live activation requires real credentials, provider contracts,
current API permissions, sandbox verification, tax/legal configuration and deployment secrets.

## CLI

```bash
cd intelligence
python3 main.py complete-production-demo
python3 main.py complete-production-readiness
python3 main.py complete-production-bridge-manifest
python3 main.py complete-production-bridge-summary
python3 main.py complete-production-docs
```

## API

- `GET /production/demo` — full production demo flow
- `GET /production/integrations` — provider status registry
- `GET /production/agents` — agent runtime status
- `GET /production/readiness` — go-live readiness gate
- `GET /production/bridge/manifest` — Production Bridge Manifest (JSON)
- `GET /production/bridge/gates` — Gate-Evaluierung
- `GET /production/bridge/summary` — Manifest + Gate-Status
- `GET /storefront/products` — catalog search/list
- `POST /storefront/cart` — create cart
- `POST /storefront/cart/{id}/checkout` — checkout lifecycle

## Note

Separate from buzzard24.de Node shop — this is the intelligence-stack production layer.
Wire to live shop requires explicit integration work and credentials.
