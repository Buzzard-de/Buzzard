# Security Remediation Report

**Date:** 2026-08-22

---

## Fixes Applied (FIX_NOW)

### P2-001: `BUZZARD_COMMERCE_WRITES_DISABLED` enforcement

**File:** `ai_core/bridge/commerce.py`

When `BUZZARD_COMMERCE_WRITES_DISABLED=true`, `CommerceBridge.write()` returns `WRITES_DISABLED` even with `approval_granted=True`. Checked after approval gate, before external call.

**Tests:** `test_p1_security_remediation.py::test_commerce_writes_disabled_blocks_write_even_with_approval`

---

### P2-002: Analytics metrics authentication

**File:** `ai_core/api/v1/analytics.py`

`GET /api/v1/analytics/metrics` now uses `Depends(enforce_api_permission)` requiring `analytics:read` (added to `ENDPOINT_PERMISSIONS`).

**Tests:** `test_phase4_observability.py`, `test_p1_security_remediation.py`

---

### P2-003 / P2-004: Webhook security when secrets unset

**File:** `ai_core/api/v1/integrations.py`

Per `PHASE3_SECURITY_MODEL.md` §7 ("Webhook ingress | HMAC verification"):

- When webhook secret is **not configured** and `BUZZARD_ALLOW_UNSIGNED_WEBHOOKS=false` (default): return **503 WEBHOOK_NOT_CONFIGURED**
- When secret **is configured**: require valid HMAC signature (401 on failure)
- When `BUZZARD_ALLOW_UNSIGNED_WEBHOOKS=true`: allow unsigned (development/test only)

**Tests:** `test_p1_security_remediation.py` (reject cases), `test_phase3_commerce_adapter.py` (dev mode)

---

### P2-005: ENDPOINT_PERMISSIONS gaps

**File:** `ai_core/security/api_permissions.py`

Added mappings:

| Route | Permission |
|-------|------------|
| `GET /api/v1/tasks` | `tasks:create` |
| `GET /api/v1/tasks/{task_id}` | `tasks:create` |
| `POST /api/v1/tasks/run-cycle` | `tasks:create` |
| `GET /api/v1/exceptions` | `exceptions:create` |
| `GET /api/v1/exceptions/{exception_id}` | `exceptions:create` |
| `GET /api/v1/reports/kurmay/{report_id}` | `reports:read` |
| `GET /api/v1/analytics/metrics` | `analytics:read` |

**Tests:** `test_p1_security_remediation.py::test_analyst_denied_tasks_list_when_permissions_enabled`

---

### P2-009: `exception_triage` worker support

**File:** `ai_core/workers/exception/coordinator_worker.py`

Added `exception_triage` to `supported_task_types`. Orchestrator already routes `exception_triage` → `exception-coordinator` per `orchestrator.py`. Architecture verification VF-P2-006 resolved.

**Tests:** `test_p1_security_remediation.py`, existing `test_exception_triage_routes_to_coordinator`

---

## Deferred / External (Not Fixed)

| ID | Classification | Reason |
|----|----------------|--------|
| P2-006 | EXTERNAL_DEPENDENCY | WMS credentials not provisioned |
| P2-007 | EXTERNAL_DEPENDENCY | CRM credentials not provisioned |
| P2-008 | DOCUMENTED_LIMITATION | DHL live API stub; mock default intentional |
| P3-001 | DEFER | Circular import; tests pass via bootstrap |
| P3-002 | DOCUMENTED_LIMITATION | `BUZZARD_ALLOW_ROLE_HEADER` default false |
| P3-003 | DEFER | Coordinator wiring at registry level |
| P3-004 | EXTERNAL_DEPENDENCY | Customs authority pending |
| P3-005 | DEFER | Alembic deprecation warning |
| P3-006 | DOCUMENTED_LIMITATION | Known taxonomy L1 gap |

---

## Security Verdict

**PASS** for implemented remediations. **PARTIAL** overall due to external integration dependencies.
