# External Integration Verification

This document matches `server/lib/externalIntegrationVerification.js` and the existing supplier/marketplace connectors. It does not invent providers.

## Discovered connectors

**Suppliers** (from `supplierRegistry`): `mock`, `api-supplier-dry`, `xml-supplier-dry`, `csv-supplier-dry`, `REAL-WHOLESALER-001`.

**Marketplaces** (from `marketplaceHub.CHANNELS`): `amazon`, `ebay`, `google_shopping`, `tiktok_shop`. These are hub channel records, not live marketplace SDKs.

## Authentication

Reports only `{ configured, method, secretExposed: false }`. API keys, tokens, and headers are never copied into verification output.

## Read-only testing

Verification mode is `SAFE_READ_ONLY`. No supplier order, payment, listing, price, stock, cancel, or refund calls are executed.

## Mapping

External payloads normalize into domain engines, then SoT:

- supplier product → product_engine → Product SoT
- supplier stock → availability_engine → Availability SoT
- supplier price → pricing_engine → Price SoT
- supplier fulfillment → order_engine → Order SoT
- marketplace order → order_engine (ingestion)
- marketplace stock/price → observation / projection only

Stale external versions cannot rewind canonical SoT (`STALE_EXTERNAL_DATA`).

## Timeout, retry, idempotency

Timeouts are finite (default 30s from the real supplier connector). Retries apply only to safe reads. Order/payment writes do not blind-retry. Idempotency reuses the existing commerce adapter; verification does not perform external writes.

## Correlation and audit

Every check carries `correlationId`. Audit actions: `EXTERNAL_CONNECTOR_VERIFICATION_STARTED|PASSED|FAILED|CONDITIONAL`.

## Safety gates

Uses existing flags: `BUZZARD_PRODUCT_SOT_ACTIVE`, `BUZZARD_SALES_ENABLED`, `BUZZARD_SUPPLIER_ORDERS_ENABLED`, `BUZZARD_PAYMENT_LIVE`, `REAL_SUPPLIER_LIVE_IMPORT`. No duplicate gates.

## Status meanings

- **PASS** — connector + config + authenticated safe live read succeeded (not claimed without a live read)
- **CONDITIONAL** — code present, live/sandbox read not executed
- **FAIL** — expected connector missing or verification error
- **NOT_CONFIGURED** — connector exists, credentials absent
- **NOT_TESTABLE** — no safe read endpoint

Layers are reported separately: `CODE_VERIFICATION`, `CONFIG_VERIFICATION`, `SANDBOX_VERIFICATION`, `LIVE_READ_VERIFICATION`, `PRODUCTION_WRITE_VERIFICATION` (always `NOT_EXECUTED`).
