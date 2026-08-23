# Buzzard Commerce API — Staging Provisioning Request

**Date:** 2026-08-22  
**Requestor:** Buzzard AI Core Team  
**Purpose:** Close P1-001 — Commerce staging E2E verification  
**Current status:** `COMMERCE: NOT_CONNECTED` | `P1-001: BLOCKED_EXTERNAL_DEPENDENCY`

---

## 1. Summary

Provision a **Commerce API staging environment** accessible to the Buzzard AI Core Cloud Agent / staging runtime so that connected E2E tests can run against a **live** (non-mocked) Commerce API.

**Success criteria:** All 6 tests in `tests/test_phase3_commerce_staging_e2e.py` must **PASS** (skipped does not count).

---

## 2. Secrets Delivery (Secure — Not Git)

Deliver the following **only** via staging/runtime secret store (Cursor environment secrets, Vercel env, vault, or secure channel):

| Variable | Required | Description |
|----------|----------|-------------|
| `COMMERCE_API_URL` | **Yes** | HTTPS base URL, e.g. `https://commerce-staging.<domain>` |
| `COMMERCE_API_TOKEN` | **Yes** | Bearer token scoped to AI Core / `commerce-adapter` |
| `COMMERCE_WEBHOOK_SECRET` | **Yes** | HMAC secret for inbound commerce webhooks |
| `BUZZARD_AI_CORE_V3` | **Yes** | Set to `1` in AI Core runtime |

**Do not** commit values to Git, PRs, or export packages.

---

## 3. Security Requirements

- **HTTPS only** for `COMMERCE_API_URL` (valid TLS certificate)
- **Bearer authentication** on all protected endpoints
- Token scoped to AI Core service identity (`commerce-adapter`)
- Token rotatable without AI Core code changes (env-only)
- Error responses must **not** leak tokens or secrets

---

## 4. Outbound Authentication (AI Core → Commerce)

```
Authorization: Bearer <COMMERCE_API_TOKEN>
```

Optional (recommended):

```
X-Service-Identity: commerce-adapter
```

---

## 5. Idempotency

All **mutating** requests must accept:

```
Idempotency-Key: <unique-key>
```

E2E test `test_staging_idempotency_header_on_action` sends `Idempotency-Key` on `GET /health` and expects a successful response (`ok`, `healthy`, or `CONNECTED`).

---

## 6. Required Staging Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Connectivity + auth probe |
| `GET` | `/products` | Product catalog list |
| `GET` | `/products/{sku}` | Single product read |
| `GET` | `/stock` | Stock list |
| `GET` | `/stock/{sku}` | Single SKU stock |
| `GET` | `/orders` | Order list |
| `GET` | `/orders/{id}` | Single order read |
| `POST` | `/actions/{action}` | Approved commerce actions (idempotent) |

### Health response

`GET /health` must return JSON including `status` equal to one of:

- `ok`
- `healthy`
- `CONNECTED`

(AI Core maps these to `CONNECTED` in `BuzzardCommerceConnector.health_check()`.)

---

## 7. Minimum Test Data

| Resource | Minimum | Verification |
|----------|---------|--------------|
| Product | 1 SKU | `GET /products` returns live data; `GET /products/{sku}` returns same SKU |
| Stock | 1 record | `GET /stock` returns live data; `GET /stock/{sku}` returns record |

Responses must **not** return AI Core placeholder statuses `NO_DATA_AVAILABLE` or `ERROR` for valid list endpoints.

---

## 8. Webhooks (Inbound Commerce → AI Core)

Provide `COMMERCE_WEBHOOK_SECRET` for HMAC verification on:

```
POST /api/v1/integrations/webhooks/commerce
```

Signature header: `X-Commerce-Signature` (SHA-256 HMAC).

---

## 9. E2E Test Contract (Authoritative)

File: `intelligence/buzzard_ai_complete/tests/test_phase3_commerce_staging_e2e.py`

| # | Test | Assertion |
|---|------|-----------|
| 1 | `test_staging_connectivity_health` | `health_check()` → `status == "CONNECTED"` |
| 2 | `test_staging_adapter_status_connected` | `adapter.status() == "CONNECTED"` |
| 3 | `test_staging_read_products_list` | `read_products()` status ∉ `{NO_DATA_AVAILABLE, ERROR}` |
| 4 | `test_staging_read_stock_list` | `read_stock()` status ∉ `{NO_DATA_AVAILABLE, ERROR}` |
| 5 | `test_staging_idempotency_header_on_action` | Request with `Idempotency-Key` succeeds |
| 6 | `test_staging_error_handling_invalid_path` | Invalid path → structured error, no token leakage |

Tests run only when `commerce_staging_ready()` is true (`COMMERCE_API_URL` + `COMMERCE_API_TOKEN` valid).

---

## 10. Verification Commands (Post-Provisioning)

```bash
# Quick connectivity
curl -s -H "Authorization: Bearer $COMMERCE_API_TOKEN" \
  "$COMMERCE_API_URL/health"

# Commerce E2E (must be 6 passed, 0 skipped)
cd intelligence/buzzard_ai_complete
export COMMERCE_API_URL="..."
export COMMERCE_API_TOKEN="..."
export COMMERCE_WEBHOOK_SECRET="..."
export BUZZARD_AI_CORE_V3=1
python3 -m pytest tests/test_phase3_commerce_staging_e2e.py -v

# Full regression
python3 -m pytest -v
```

---

## 11. Closure Criteria

| Item | Before | After success |
|------|--------|---------------|
| P1-001 | `BLOCKED_EXTERNAL_DEPENDENCY` | `CLOSED` |
| P1 count | 1 | 0 |
| COMMERCE | `NOT_CONNECTED` | `CONNECTED` |
| Commerce E2E | 6/6 SKIPPED | 6/6 PASS |
| Go-live | `GO_LIVE_READY_WITH_EXTERNAL_DEPENDENCIES` | `GO_LIVE_READY` (if no other blockers) |

---

## 12. Owners

| Role | Action |
|------|--------|
| **Commerce / Platform team** | Deploy staging API, seed test data, issue token + webhook secret |
| **DevOps** | Inject secrets into Cursor Cloud Agent / staging runtime secret store |
| **AI Core team** | Run E2E + regression, publish closure export |

---

*No Wave 6. No code changes required for provisioning. Credentials must never appear in Git.*
