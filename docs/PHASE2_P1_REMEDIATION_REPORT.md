# BUZZARD AI CORE — PHASE 2 P1 REMEDIATION REPORT

**Date:** 2026-08-22  
**Branch:** `cursor/phase2-p1-remediation-c293`  
**Baseline:** 72/100 — `PHASE2_PARTIAL` (15 P1 gaps)  
**Post-remediation:** 84/100 — `PHASE2_PARTIAL` (4 P1 gaps remaining)

---

## Summary

| Metric | Before | After |
|--------|--------|-------|
| P0 blockers | 0 | 0 |
| P1 gaps | 15 | 4 |
| P1 FIXED (code) | 0 | 11 |
| P1 EXTERNAL_DEPENDENCY | 0 | 3 |
| P1 PARTIALLY_FIXED | 0 | 1 |
| Total tests | 366 | 386 |
| Phase 2 tests | 24 | 44 |

---

## P1 Item Remediation Details

### GAP-A-001 — Worker output schema validation

| Field | Value |
|-------|-------|
| **P1-ID** | GAP-A-001 |
| **DESCRIPTION** | Worker output schema validation not implemented in `WorkerExecutor` |
| **ROOT CAUSE** | No schema module; executor accepted any successful worker output |
| **FIX** | Added `ai_core/schemas/workers/validation.py` with per-task required keys; `WorkerExecutor` validates on `result.success` before returning |
| **FILES CHANGED** | `ai_core/schemas/workers/validation.py`, `ai_core/workers/executor.py`, `ai_core/workers/deterministic.py` (added `status` to `category_scan` output) |
| **TESTS** | `test_worker_output_schema_validation_rejects_invalid`, `test_worker_output_schema_validation_accepts_valid`, `test_executor_validates_output_schema` |
| **STATUS** | **FIXED** |

---

### GAP-A-002 — Permissions enforced at execution

| Field | Value |
|-------|-------|
| **P1-ID** | GAP-A-002 |
| **DESCRIPTION** | Worker permissions declared but not enforced at execution time |
| **ROOT CAUSE** | `WorkerExecutor` only checked permissions when `required_permission` was manually passed; orchestrator never passed it |
| **FIX** | Added `task_permissions.py` mapping task types → permissions; executor auto-resolves via `required_permission_for_task()` |
| **FILES CHANGED** | `ai_core/security/task_permissions.py`, `ai_core/workers/executor.py` |
| **TESTS** | `test_executor_enforces_task_permission` |
| **STATUS** | **FIXED** |

---

### GAP-A-003 — Domain workers scaffolds

| Field | Value |
|-------|-------|
| **P1-ID** | GAP-A-003 |
| **DESCRIPTION** | Domain workers return `EXTERNAL_INTEGRATION_PENDING` / `NO_DATA_AVAILABLE` for real commerce paths |
| **ROOT CAUSE** | `CommerceBridge` and integration adapters are not connected to live commerce systems (by design until Step 13) |
| **FIX** | Workers return honest `NO_DATA_AVAILABLE` / `EXTERNAL_INTEGRATION_PENDING` without faking success; failure results persisted on task |
| **FILES CHANGED** | `ai_core/services/orchestrator.py` (persist `task.result` on worker failure) |
| **TESTS** | `test_domain_worker_returns_external_pending_not_fake_data`, `test_commerce_bridge_returns_no_data_not_fake` |
| **STATUS** | **EXTERNAL_DEPENDENCY** — requires live commerce platform connection (GAP-I-001, GAP-M-002) |

---

### GAP-B-001 — Kurmay trigger on HIGH/CRITICAL exceptions

| Field | Value |
|-------|-------|
| **P1-ID** | GAP-B-001 |
| **DESCRIPTION** | Kurmay not triggered on HIGH/CRITICAL exceptions |
| **ROOT CAUSE** | `_should_trigger_kurmay()` only inspected memory entry impact, not exception severity |
| **FIX** | Extended `_should_trigger_kurmay()` to return `True` when any exception entry has HIGH or CRITICAL severity; `_trigger_kurmay()` calls `KurmayService.synthesize()` before spawning child task |
| **FILES CHANGED** | `ai_core/services/orchestrator.py` |
| **TESTS** | `test_kurmay_trigger_on_high_exception`, `test_exception_entries_feed_kurmay_trigger`, `test_phase2_e2e_kurmay_synthesis_persisted` |
| **STATUS** | **FIXED** |

---

### GAP-D-001 — Namespace write guard enforced

| Field | Value |
|-------|-------|
| **P1-ID** | GAP-D-001 |
| **DESCRIPTION** | Namespace write permission guard not enforced in `CentralMemoryService` |
| **ROOT CAUSE** | `PolicyEngine.can_write_namespace()` existed but was never called from `memory.write()` |
| **FIX** | `CentralMemoryService.write()` enforces `can_write_namespace(actor_role, namespace)`; API passes token-bound `actor_role`; orchestrator maps internal actors to `system` role |
| **FILES CHANGED** | `ai_core/services/memory_service.py`, `ai_core/services/orchestrator.py`, `ai_core/api/v1/router.py` |
| **TESTS** | `test_namespace_write_guard_blocks_unauthorized` |
| **STATUS** | **FIXED** |

---

### GAP-E-001 — ExceptionCoordinator injected into worker

| Field | Value |
|-------|-------|
| **P1-ID** | GAP-E-001 |
| **DESCRIPTION** | `ExceptionCoordinatorWorker` not wired with `ExceptionCoordinator` instance |
| **ROOT CAUSE** | `build_phase2_registry()` instantiated worker without coordinator; worker returned `NO_DATA_AVAILABLE` |
| **FIX** | `build_phase2_registry(coordinator=...)` injects `ExceptionCoordinator`; orchestrator `_execution_registry()` passes session-scoped coordinator |
| **FILES CHANGED** | `ai_core/workers/registry.py`, `ai_core/services/orchestrator.py`, `ai_core/exception/coordinator.py` (DETECTED→CLASSIFIED→ASSIGNED transition) |
| **TESTS** | `test_exception_coordinator_worker_routes` |
| **STATUS** | **FIXED** |

---

### GAP-E-002 — Exception→Kurmay routing

| Field | Value |
|-------|-------|
| **P1-ID** | GAP-E-002 |
| **DESCRIPTION** | Exception entries not fed to Kurmay trigger path |
| **ROOT CAUSE** | `_should_trigger_kurmay()` ignored `exception_entries`; worker failures created exceptions but did not route to Kurmay |
| **FIX** | Exception batch from `_complete_running` passed to `_should_trigger_kurmay()` and `_trigger_kurmay()`; HIGH/CRITICAL severities trigger synthesis |
| **FILES CHANGED** | `ai_core/services/orchestrator.py` |
| **TESTS** | `test_exception_entries_feed_kurmay_trigger`, `test_phase2_e2e_kurmay_synthesis_persisted` |
| **STATUS** | **FIXED** |

---

### GAP-F-001 — Token-based RBAC (no spoofable roles)

| Field | Value |
|-------|-------|
| **P1-ID** | GAP-F-001 |
| **DESCRIPTION** | API auth used single token; `X-Actor-Role` header was self-asserted |
| **ROOT CAUSE** | `get_actor_role()` trusted client header by default |
| **FIX** | Added `API_TOKEN_ROLES` mapping in settings; `resolve_actor_role()` returns token-mapped role; `ALLOW_ROLE_HEADER=false` by default; `authorize()` accepts all configured token keys |
| **FILES CHANGED** | `config/settings.py`, `ai_core/security/token_roles.py`, `ai_core/api/deps.py` |
| **TESTS** | `test_token_role_mapping`, `test_spoofed_header_ignored_when_disabled`, `test_api_approve_uses_token_role_not_spoofed_header` |
| **STATUS** | **FIXED** |

---

### GAP-G-001 — `ai_core_workers` DB table populated

| Field | Value |
|-------|-------|
| **P1-ID** | GAP-G-001 |
| **DESCRIPTION** | `ai_core_workers` table migrated but never populated |
| **ROOT CAUSE** | Registry built in-memory only; no sync service |
| **FIX** | `WorkerRegistryService.sync_registry()` upserts workers on first orchestrator metadata sync; agents API triggers sync when V2 enabled |
| **FILES CHANGED** | `ai_core/services/worker_registry_service.py`, `ai_core/services/orchestrator.py`, `ai_core/api/v1/agents.py` |
| **TESTS** | `test_worker_registry_persisted_to_db` |
| **STATUS** | **FIXED** |

---

### GAP-G-002 — `ai_core_integration_status` DB table populated

| Field | Value |
|-------|-------|
| **P1-ID** | GAP-G-002 |
| **DESCRIPTION** | `ai_core_integration_status` table never written |
| **ROOT CAUSE** | API used static in-memory `IntegrationStatusRegistry` only |
| **FIX** | `IntegrationStatusService` persists defaults and syncs from registry; `/integrations/status` reads from DB |
| **FILES CHANGED** | `ai_core/services/integration_status_service.py`, `ai_core/services/orchestrator.py`, `ai_core/api/v1/integrations.py` |
| **TESTS** | `test_integration_status_persisted_to_db`, `test_integrations_api_reads_from_db` |
| **STATUS** | **FIXED** |

---

### GAP-I-001 — CommerceBridge connected

| Field | Value |
|-------|-------|
| **P1-ID** | GAP-I-001 |
| **DESCRIPTION** | CommerceBridge read path not connected to external commerce system |
| **ROOT CAUSE** | `CommerceBridge.read_*()` returns `NO_DATA_AVAILABLE` until Step 13 adapter is built |
| **FIX** | Bridge remains honest stub; workers surface `NO_DATA_AVAILABLE` without synthetic data |
| **FILES CHANGED** | None (existing honest behavior verified) |
| **TESTS** | `test_commerce_bridge_returns_no_data_not_fake` |
| **STATUS** | **EXTERNAL_DEPENDENCY** — requires commerce API/DB adapter |

---

### GAP-J-001 — Approval API role trust

| Field | Value |
|-------|-------|
| **P1-ID** | GAP-J-001 |
| **DESCRIPTION** | Approval flow API used spoofable role header |
| **ROOT CAUSE** | Same as GAP-F-001 — role from `X-Actor-Role` |
| **FIX** | Token-bound roles via `resolve_actor_role()`; approve/reject API uses `get_actor_role` dependency; `reject()` enforces `can_approve()` |
| **FILES CHANGED** | `ai_core/api/deps.py`, `ai_core/services/orchestrator.py`, `ai_core/security/token_roles.py` |
| **TESTS** | `test_api_approve_uses_token_role_not_spoofed_header`, `test_reject_requires_authorized_role` |
| **STATUS** | **FIXED** |

---

### GAP-L-001 — Phase 2 test coverage

| Field | Value |
|-------|-------|
| **P1-ID** | GAP-L-001 |
| **DESCRIPTION** | Phase 2 test coverage ~17% of plan (24/143) |
| **ROOT CAUSE** | Most planned domain/integration tests not yet implemented |
| **FIX** | Added `tests/test_ai_core_phase2_p1.py` with 20 dedicated P1 tests; Phase 2 total now 44 tests |
| **FILES CHANGED** | `tests/test_ai_core_phase2_p1.py`, minor updates to `test_ai_core_phase1.py`, `test_ai_core_phase2_kurmay.py` |
| **TESTS** | 20 new P1 tests (44 Phase 2 total vs 24 baseline) |
| **STATUS** | **PARTIALLY_FIXED** — 44/143 (~31%); remaining domain worker and integration tests deferred to P2 scope |

---

### GAP-L-002 — Phase 2 E2E integration test

| Field | Value |
|-------|-------|
| **P1-ID** | GAP-L-002 |
| **DESCRIPTION** | No Phase 2 end-to-end integration test |
| **ROOT CAUSE** | E2E tests covered Phase 1 paths only |
| **FIX** | Added `test_phase2_e2e_category_to_memory` and `test_phase2_e2e_kurmay_synthesis_persisted` covering category→memory and Kurmay synthesis lifecycle |
| **FILES CHANGED** | `tests/test_ai_core_phase2_p1.py` |
| **TESTS** | `test_phase2_e2e_category_to_memory`, `test_phase2_e2e_kurmay_synthesis_persisted` |
| **STATUS** | **FIXED** |

---

### GAP-M-002 — Commerce platform integration

| Field | Value |
|-------|-------|
| **P1-ID** | GAP-M-002 |
| **DESCRIPTION** | Commerce platform integration not available |
| **ROOT CAUSE** | External supplier feeds, WMS, and commerce DB not provisioned |
| **FIX** | Integration status honestly reports `EXTERNAL_INTEGRATION_PENDING`; DB persistence tracks status |
| **FILES CHANGED** | `ai_core/services/integration_status_service.py` |
| **TESTS** | `test_integration_status_persisted_to_db`, `test_commerce_bridge_returns_no_data_not_fake` |
| **STATUS** | **EXTERNAL_DEPENDENCY** — requires external commerce platform team |

---

## Status Summary

| Status | Count | IDs |
|--------|-------|-----|
| FIXED | 11 | A-001, A-002, B-001, D-001, E-001, E-002, F-001, G-001, G-002, J-001, L-002 |
| EXTERNAL_DEPENDENCY | 3 | A-003, I-001, M-002 |
| PARTIALLY_FIXED | 1 | L-001 |
| BLOCKED | 0 | — |

---

## Regression Notes

- Full suite: **386 passed**, 1 skipped (V2=0 and V2=1)
- No tests deleted or assertions weakened
- Phase 1 tests updated only to pass `actor_role` where namespace guard applies
