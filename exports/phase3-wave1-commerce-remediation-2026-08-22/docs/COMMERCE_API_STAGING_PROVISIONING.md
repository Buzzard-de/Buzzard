# Commerce API Staging Provisioning Checklist

**Gap:** GAP-I-001  
**Date:** 2026-08-22  
**Status:** NOT_CONNECTED — external dependency pending

---

## Required URL

| Variable | Description | Example |
|----------|-------------|---------|
| `COMMERCE_API_URL` | Base HTTPS URL for Buzzard Commerce API staging | `https://commerce-staging.buzzard.example` |

Requirements:
- Must use `https` in staging/production
- Must include a valid host (no trailing path required; adapter strips trailing `/`)
- Must expose REST JSON endpoints documented below

---

## Required Token

| Variable | Description |
|----------|-------------|
| `COMMERCE_API_TOKEN` | Bearer token for service-to-service authentication |

Requirements:
- Stored in environment or secrets vault only — never in Git
- Passed as `Authorization: Bearer <token>` header
- Scoped to AI Core service identity (`X-Service-Identity: commerce-adapter`)

---

## Required Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `COMMERCE_API_URL` | **Yes** | Commerce API base URL |
| `COMMERCE_API_TOKEN` | **Yes** | Bearer authentication token |
| `COMMERCE_WEBHOOK_SECRET` | Recommended | HMAC verification for inbound commerce webhooks |
| `REQUEST_TIMEOUT` | Optional (default `15`) | HTTP timeout in seconds |
| `BUZZARD_AI_CORE_V3` | **Yes for Wave 1** | Enables Phase 3 integration registry and live health probes |

Validation without contacting API: `validate_commerce_configuration()` in `ai_core/integrations/commerce_config.py`.

---

## Authentication Requirements

- **Outbound (AI Core → Commerce API):** Bearer token via `Authorization` header
- **Inbound (Commerce API → AI Core webhooks):** HMAC signature when `COMMERCE_WEBHOOK_SECRET` is set
- **Service identity:** `X-Service-Identity: commerce-adapter` on outbound requests
- **Idempotency:** `Idempotency-Key` header on mutating requests

---

## Required Test Account / Data

Provision staging data sufficient for E2E verification:

| Resource | Minimum |
|----------|---------|
| Products | At least 1 SKU readable via `GET /products` and `GET /products/{sku}` |
| Stock | At least 1 stock record via `GET /stock` |
| Orders | Optional for read-path verification; required for order-engine E2E |
| Actions | `POST /actions/{action}` endpoint for write-path idempotency tests |

---

## Required API Capabilities

Per `PHASE2_COMMERCE_BRIDGE_SPEC.md` and Wave 1 adapter contract:

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Connectivity and authentication probe |
| `GET` | `/products` | Product catalog list |
| `GET` | `/products/{sku}` | Single product read |
| `GET` | `/orders` | Order list |
| `GET` | `/orders/{id}` | Single order read |
| `GET` | `/stock` | Stock list |
| `GET` | `/stock/{sku}` | Single SKU stock read |
| `POST` | `/actions/{action}` | Approved commerce actions (idempotent) |

Expected health response statuses: `ok`, `healthy`, or `CONNECTED`.

---

## Required Connectivity Check

After provisioning, run:

```bash
cd intelligence/buzzard_ai_complete
export COMMERCE_API_URL="https://<staging-host>"
export COMMERCE_API_TOKEN="<token>"
export BUZZARD_AI_CORE_V3=1
python3 -m pytest tests/test_phase3_commerce_staging_e2e.py -v
```

All tests in that file must **pass** (not skip) for GAP-I-001 to be marked CONNECTED.

Additional manual check:

```bash
curl -s -H "Authorization: Bearer $COMMERCE_API_TOKEN" \
  "$COMMERCE_API_URL/health"
```

---

## Required E2E Scenarios

Connected E2E suite (`tests/test_phase3_commerce_staging_e2e.py`):

1. **Connectivity health** — `connector.health_check()` returns `CONNECTED`
2. **Adapter status** — `CommerceIntegrationAdapter.status()` returns `CONNECTED`
3. **Read products** — `CommerceBridge.read_products()` returns live data (not `NO_DATA_AVAILABLE`)
4. **Read stock** — `CommerceBridge.read_stock()` returns live data
5. **Idempotency header** — requests accept `Idempotency-Key` without error
6. **Error handling** — invalid path returns structured error without token leakage

Unit/mock tests remain in `test_phase3_commerce_adapter.py` and must not substitute for connected E2E.

---

## Required Cleanup Procedure

After staging E2E runs:

1. Revoke or rotate `COMMERCE_API_TOKEN` if exposed during testing
2. Remove any test orders/actions created via `POST /actions/*`
3. Clear CI/CD secret caches if tokens were injected for pipeline runs
4. Verify no tokens appear in application logs (`grep -r COMMERCE_API_TOKEN` must return only env references, never values)
5. Confirm `alembic_version` and integration status rows reflect test state (no orphaned test data in `ai_core_events`)

---

## Provisioning Owner

| Role | Responsibility |
|------|----------------|
| Platform / Commerce team | Deploy staging Commerce API, issue token |
| DevOps | Inject `COMMERCE_API_URL` + `COMMERCE_API_TOKEN` into staging environment |
| AI Core team | Run connected E2E, update GAP-I-001 status |

---

*Do not invent credentials. Do not commit secrets. Status remains `PHASE3_WAVE1_PARTIAL` until connected E2E passes.*
