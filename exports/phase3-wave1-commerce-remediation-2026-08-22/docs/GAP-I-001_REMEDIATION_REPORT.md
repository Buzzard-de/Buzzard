# GAP-I-001 Remediation Report

**Gap ID:** GAP-I-001  
**Title:** Commerce API staging not provisioned  
**Date:** 2026-08-22  
**Remediation branch:** `cursor/phase3-wave1-commerce-remediation-c293`

---

## Gap Definition

`CommerceBridge` read path and `CommerceIntegrationAdapter` must return live commerce records when the Buzzard Commerce API staging deployment is connected (`PHASE2_COMMERCE_BRIDGE_SPEC.md` Step 13, Wave 1 acceptance criterion).

**Classification:** READY_FOR_INTEGRATION — adapter code complete; live staging unavailable.

---

## Where GAP-I-001 Is Raised

| Location | Evidence |
|----------|----------|
| `docs/PHASE2_COMMERCE_API_EXTERNAL_DEPENDENCIES.md` | GAP-I-001 section |
| `exports/phase3-wave1-implementation-2026-08-22/docs/PHASE3_WAVE1_FINAL_VERIFICATION.md` | P1 remaining |
| `phase3/architecture/PHASE3_ARCHITECTURE_VERIFICATION_V2.md` | Wave 1 blocker |
| Integration registry | Commerce status `EXTERNAL_INTEGRATION_PENDING` when env unset |
| Connected E2E suite | `tests/test_phase3_commerce_staging_e2e.py` — 6 tests skipped |

---

## Expected Integration

```
CommerceBridge / CommerceIntegrationAdapter
  → BuzzardCommerceConnector
    → GET {COMMERCE_API_URL}/health
    → GET {COMMERCE_API_URL}/products[/{sku}]
    → GET {COMMERCE_API_URL}/orders[/{id}]
    → GET {COMMERCE_API_URL}/stock[/{sku}]
    → POST {COMMERCE_API_URL}/actions/{action}
```

Authentication: `Authorization: Bearer {COMMERCE_API_TOKEN}`

---

## Environment Check (This Run)

| Variable | Present | Valid |
|----------|---------|-------|
| `COMMERCE_API_URL` | **No** | — |
| `COMMERCE_API_TOKEN` | **No** | — |
| `BUZZARD_API_TOKEN` | Yes | AI Core API only |
| `BUZZARD_AI_CORE_V2` | Yes | Phase 2 flag |

**Result:** Staging NOT provisioned. No credentials invented. No mock E2E claimed as connected.

---

## Remediation Actions Completed

### 1. Configuration validation (no external contact)

- **File:** `ai_core/integrations/commerce_config.py`
- `validate_commerce_configuration()` — URL scheme/host + token presence
- `commerce_staging_ready()` — gate for connected E2E tests
- **Tests:** `tests/test_phase3_commerce_config.py` (4 tests)

### 2. Connector hardening

- **File:** `ai_core/integrations/connectors/buzzard_commerce.py`
- `is_configured()` and `request()` use config validation before HTTP
- Invalid URLs return honest `NO_DATA_AVAILABLE` / `DISCONNECTED` — no crash on `/health/ready`

### 3. Readiness endpoint transparency

- **File:** `ai_core/api/v1/router.py`
- `GET /api/v1/health/ready` includes `commerce_config` block (configured, valid, errors, warnings)

### 4. Connected E2E test separation

- **File:** `tests/test_phase3_commerce_staging_e2e.py`
- 6 tests skip when staging not provisioned
- Tests contact **real** API only when `commerce_staging_ready()` is true
- Distinct from unit tests in `test_phase3_commerce_adapter.py` (mocked)

### 5. Provisioning documentation

- **File:** `docs/COMMERCE_API_STAGING_PROVISIONING.md` (this export)

### 6. Postgres test error remediation (unrelated to GAP-I-001)

Three ERROR-class test failures from Wave 1 verification were investigated and fixed.

---

## Test Error Investigation

### ERROR-001 / ERROR-002 / ERROR-003 (postgres e2e)

| Field | Value |
|-------|-------|
| **ERROR ID** | ERR-PG-001 |
| **Tests** | `test_e2e_task_success_pipeline`, `test_e2e_task_failure_retry_success`, `test_e2e_critical_exception_worker_halt_survives_restart` |
| **Root cause** | Alembic revision ID `008_ai_core_idempotency_and_events` (34 chars) exceeded `alembic_version.version_num` VARCHAR(32) limit on PostgreSQL |
| **Expected** | Migration 008 applies cleanly on postgres fixture |
| **Actual** | `StringDataRightTruncation` during `alembic upgrade head` |
| **Classification** | CODE ISSUE |
| **Remediation** | Renamed revision to `008_ai_core_idem_events` (22 chars) |
| **Result** | **FIXED** — all 3 e2e tests pass |

### ERROR-004 / ERROR-005 / ERROR-006 (postgres integration)

| Field | Value |
|-------|-------|
| **ERROR ID** | ERR-PG-002 |
| **Tests** | `test_postgres_transaction_rollback`, `test_postgres_idempotency_unique_constraint`, `test_postgres_concurrent_idempotency_lookup` |
| **Root cause** | Same migration revision ID truncation (fixture `postgres_session` failed during setup) |
| **Expected** | Postgres session fixture provides clean migrated schema |
| **Actual** | Setup error propagated as test ERROR |
| **Classification** | CODE ISSUE (cascading from ERR-PG-001) |
| **Remediation** | Revision ID fix + `_reset_postgres_schema()` in `conftest_postgres.py` |
| **Result** | **FIXED** — all 3 postgres tests pass |

---

## Security Verification

| Check | Result |
|-------|--------|
| No secrets in Git | **PASS** |
| No credentials in source code | **PASS** |
| No credentials in logs | **PASS** |
| No token leakage in exceptions | **PASS** — error responses omit token values |
| Environment-based secret handling | **PASS** — `os.getenv` only |
| Safe auth failure handling | **PASS** — returns structured error, no retry with leaked headers |

---

## GAP-I-001 Status

```
GAP-I-001: NOT_CONNECTED
```

Connected E2E: **6 skipped** (staging credentials absent)  
Unit/adapter tests: **PASS**  
Configuration validation: **PASS**

---

## What Closes GAP-I-001

1. Platform team provisions Buzzard Commerce API staging
2. Set `COMMERCE_API_URL` + `COMMERCE_API_TOKEN` in environment
3. Run `pytest tests/test_phase3_commerce_staging_e2e.py` — all 6 must pass
4. Verify `CommerceIntegrationAdapter.status()` → `CONNECTED` on staging
5. Update status to `PHASE3_WAVE1_READY`, P1 → 0

---

*Honest verification. No fake commerce data. No mock claimed as connected E2E.*
