# BUZZARD AI CORE — PHASE 2 P1 TEST RESULTS

**Date:** 2026-08-22  
**Branch:** `cursor/phase2-p1-remediation-c293`  
**Environment:** Linux, Python 3.12.3, pytest 9.1.1

---

## Full Suite Summary

| Configuration | TOTAL | PASSED | FAILED | SKIPPED | ERRORS |
|---------------|-------|--------|--------|---------|--------|
| `BUZZARD_AI_CORE_V2=1` | 387 | 386 | 0 | 1 | 0 |
| `BUZZARD_AI_CORE_V2=0` | 387 | 386 | 0 | 1 | 0 |

**Skipped:** `tests/test_category_audit_maximal.py::test_angebote_sonderkollektionen_l1` — storefront catalog alignment (external, not ai_core blocker)

---

## Suite Breakdown by Category

| Category | Test file(s) | Count | Result |
|----------|--------------|-------|--------|
| Phase 1 | `test_ai_core_phase1.py` | 13 | 13 PASSED |
| Phase 2 foundation | `test_ai_core_phase2_foundation.py` | 5 | 5 PASSED |
| Phase 2 security | `test_ai_core_phase2_security.py` | 4 | 4 PASSED |
| Phase 2 category | `test_ai_core_phase2_category.py` | 6 | 6 PASSED |
| Phase 2 Kurmay | `test_ai_core_phase2_kurmay.py` | 3 | 3 PASSED |
| Phase 2 agents API | `test_ai_core_phase2_agents_api.py` | 6 | 6 PASSED |
| **Phase 2 P1 remediation** | `test_ai_core_phase2_p1.py` | **20** | **20 PASSED** |
| **Phase 2 total** | | **44** | **44 PASSED** |
| P0 E2E | `test_ai_core_p0_e2e.py` | 6 | 6 PASSED |
| Postgres / Alembic | `test_ai_core_postgres.py` | 6 | 6 PASSED |
| Worker / taxonomy audits | various | remainder | PASSED |

---

## P1 Targeted Test Run

```
BUZZARD_AI_CORE_V2=1 pytest tests/test_ai_core_phase2_p1.py -v
```

| Result | Count |
|--------|-------|
| PASSED | 20 |
| FAILED | 0 |
| SKIPPED | 0 |
| ERRORS | 0 |

### P1 Test Mapping

| Test | GAP-ID |
|------|--------|
| `test_worker_output_schema_validation_rejects_invalid` | GAP-A-001 |
| `test_worker_output_schema_validation_accepts_valid` | GAP-A-001 |
| `test_executor_validates_output_schema` | GAP-A-001 |
| `test_executor_enforces_task_permission` | GAP-A-002 |
| `test_domain_worker_returns_external_pending_not_fake_data` | GAP-A-003 |
| `test_kurmay_trigger_on_high_exception` | GAP-B-001 |
| `test_namespace_write_guard_blocks_unauthorized` | GAP-D-001 |
| `test_exception_coordinator_worker_routes` | GAP-E-001 |
| `test_exception_entries_feed_kurmay_trigger` | GAP-E-002 |
| `test_token_role_mapping` | GAP-F-001 |
| `test_spoofed_header_ignored_when_disabled` | GAP-F-001 |
| `test_reject_requires_authorized_role` | GAP-J-001 |
| `test_api_approve_uses_token_role_not_spoofed_header` | GAP-J-001 |
| `test_worker_registry_persisted_to_db` | GAP-G-001 |
| `test_integration_status_persisted_to_db` | GAP-G-002 |
| `test_integrations_api_reads_from_db` | GAP-G-002 |
| `test_commerce_bridge_returns_no_data_not_fake` | GAP-I-001 / GAP-M-002 |
| `test_phase2_e2e_category_to_memory` | GAP-L-002 |
| `test_phase2_e2e_kurmay_synthesis_persisted` | GAP-L-002 |
| `test_p1_remediation_test_count` | GAP-L-001 |

---

## Security Tests

| Test | Result |
|------|--------|
| `test_namespace_write_guard_blocks_unauthorized` | PASSED |
| `test_token_role_mapping` | PASSED |
| `test_spoofed_header_ignored_when_disabled` | PASSED |
| `test_reject_requires_authorized_role` | PASSED |
| `test_api_approve_uses_token_role_not_spoofed_header` | PASSED |
| `test_approve_requires_authorized_role` (phase2_security) | PASSED |
| `test_agents_endpoint_requires_auth` | PASSED |

---

## Database Tests

| Test | Result |
|------|--------|
| `test_worker_registry_persisted_to_db` | PASSED |
| `test_integration_status_persisted_to_db` | PASSED |
| `test_integrations_api_reads_from_db` | PASSED |
| `test_alembic_upgrade_head_postgres` | PASSED |
| `test_postgres_*` (6 tests) | PASSED |

---

## Integration Tests

| Test | Result |
|------|--------|
| `test_phase2_e2e_category_to_memory` | PASSED |
| `test_phase2_e2e_kurmay_synthesis_persisted` | PASSED |
| `test_commerce_bridge_returns_no_data_not_fake` | PASSED |
| `test_e2e_task_success_pipeline` (P0) | PASSED |
| `test_e2e_task_failure_retry_success` (P0) | PASSED |

---

## Worker Tests

| Test | Result |
|------|--------|
| `test_executor_validates_output_schema` | PASSED |
| `test_executor_enforces_task_permission` | PASSED |
| `test_exception_coordinator_worker_routes` | PASSED |
| `test_category_worker_registered_in_registry` | PASSED |
| `test_worker_count_matches_taxonomy_l1` | PASSED |

---

## Verification Integrity

- No tests deleted
- No assertions weakened
- No synthetic worker success or fake commerce data introduced
- Namespace guard and RBAC enforced in production code paths
