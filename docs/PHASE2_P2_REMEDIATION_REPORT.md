# BUZZARD AI CORE — PHASE 2 P2 REMEDIATION REPORT

**Date:** 2026-08-22  
**Branch:** `cursor/phase2-p2-remediation-c293`  
**Baseline:** 88/100 — P2: 14 open (per `PHASE2_P1_FINAL_VERIFICATION_V3.md`)  
**Method:** Gap verification against current source + implementation + tests

---

## Summary

| Status | Count |
|--------|-------|
| FIXED | 11 |
| PARTIALLY_FIXED | 1 |
| READY_FOR_INTEGRATION | 2 |
| **Remaining P2** | **3** |

---

## GAP-A-004 — ExecutionPolicy / WorkerHealth missing

| Field | Value |
|-------|-------|
| **P2-ID** | GAP-A-004 |
| **DESCRIPTION** | No ExecutionPolicy or WorkerHealth models; trivial health-check |
| **ROOT CAUSE** | Health models never implemented; agents API checked `bool(capabilities)` only |
| **FIX** | Added `ExecutionPolicy`, `WorkerHealth`, `probe_worker_health()`, `default_execution_policy()` in `ai_core/workers/health.py`; agents API uses real probes |
| **FILES CHANGED** | `ai_core/workers/health.py`, `ai_core/api/v1/agents.py` |
| **TESTS** | `test_execution_policy_and_worker_health_models`, `test_agent_health_check_api_reports_probe` |
| **RESULT** | PASS |
| **STATUS** | **FIXED** |

---

## GAP-B-002 — Kurmay conflict synthesis shallow

| Field | Value |
|-------|-------|
| **P2-ID** | GAP-B-002 |
| **DESCRIPTION** | Rule engine detected data gaps only, not specialist conflicts |
| **ROOT CAUSE** | `KurmayRuleEngine` had no numeric divergence or namespace collision logic |
| **FIX** | Added `_detect_conflicts()` — price divergence ≥5%, duplicate key collisions |
| **FILES CHANGED** | `ai_core/kurmay/rule_engine.py`, `tests/test_ai_core_phase2_kurmay.py` |
| **TESTS** | `test_kurmay_detects_price_conflicts`, updated `test_kurmay_rule_engine_synthesizes_conflicts` |
| **RESULT** | PASS |
| **STATUS** | **FIXED** |

---

## GAP-C-001 — Legacy category-worker in V2 registry

| Field | Value |
|-------|-------|
| **P2-ID** | GAP-C-001 |
| **DESCRIPTION** | `CategoryScanWorker` coexisted with 48 taxonomy-driven experts |
| **ROOT CAUSE** | `build_phase2_registry()` registered legacy stub alongside factory workers |
| **FIX** | Removed `CategoryScanWorker` from Phase 2 registry; V2 `category_scan` requires `category_id` or routes to orchestrator; Phase 1 unchanged |
| **FILES CHANGED** | `ai_core/workers/registry.py`, `ai_core/services/orchestrator.py` |
| **TESTS** | `test_phase2_registry_excludes_legacy_category_worker` |
| **RESULT** | PASS |
| **STATUS** | **FIXED** |

---

## GAP-C-002 — Legacy bridge coverage per L1 unclear

| Field | Value |
|-------|-------|
| **P2-ID** | GAP-C-002 |
| **DESCRIPTION** | Unclear whether all L1 categories have legacy agent depth |
| **ROOT CAUSE** | Bridge imports `category_intelligence_43_maximal` but no coverage audit existed |
| **FIX** | Added `audit_legacy_bridge_coverage()` — dynamically audits all L1 from `TaxonomyRegistry` |
| **FILES CHANGED** | `ai_core/taxonomy/bridge_coverage.py` |
| **TESTS** | `test_legacy_bridge_coverage_audit_matches_taxonomy` |
| **RESULT** | PASS — coverage ratio computed at runtime, not hard-coded |
| **STATUS** | **FIXED** |

---

## GAP-D-002 — Domain memory namespaces incomplete

| Field | Value |
|-------|-------|
| **P2-ID** | GAP-D-002 |
| **DESCRIPTION** | Domain workers did not emit `memory_entries` to domain namespaces |
| **ROOT CAUSE** | Only category and Kurmay workers wrote memory; orchestrator skipped memory on failure |
| **FIX** | Added `domain_memory_entry()` helper; all domain workers emit namespace memory; orchestrator `_persist_worker_memory_entries()` on success and failure |
| **FILES CHANGED** | `ai_core/workers/domain_memory.py`, supplier/product/price/stock/order workers, `orchestrator.py` |
| **TESTS** | `test_domain_worker_writes_supplier_memory_on_external_pending`, `test_price_worker_writes_pricing_memory` |
| **RESULT** | PASS |
| **STATUS** | **FIXED** |

---

## GAP-E-003 — exception_triage routing alias missing

| Field | Value |
|-------|-------|
| **P2-ID** | GAP-E-003 |
| **DESCRIPTION** | `exception_triage` task type not in `WORKER_ROUTING` |
| **ROOT CAUSE** | Only `exception_route` was registered |
| **FIX** | Added `exception_triage` → `exception-coordinator` alias |
| **FILES CHANGED** | `ai_core/services/orchestrator.py` |
| **TESTS** | `test_exception_triage_routes_to_coordinator` |
| **RESULT** | PASS |
| **STATUS** | **FIXED** |

---

## GAP-F-003 — API rate limiting not middleware-wired

| Field | Value |
|-------|-------|
| **P2-ID** | GAP-F-003 |
| **DESCRIPTION** | `RateLimiter` existed but no HTTP 429 enforcement |
| **ROOT CAUSE** | Only `RequestIdMiddleware` registered on FastAPI app |
| **FIX** | Added `RateLimitMiddleware`; registered on `api/app.py` |
| **FILES CHANGED** | `ai_core/api/middleware.py`, `api/app.py` |
| **TESTS** | `test_api_rate_limit_middleware_returns_429` |
| **RESULT** | PASS |
| **STATUS** | **FIXED** |

---

## GAP-F-004 / GAP-K-001 — EsatBey dual-write missing

| Field | Value |
|-------|-------|
| **P2-ID** | GAP-F-004, GAP-K-001 |
| **DESCRIPTION** | Security events not written to `ai_core_audit_log` |
| **ROOT CAUSE** | `SecurityService.record()` called EsatBey only |
| **FIX** | Optional `AuditService` injection; dual-write to audit on `record()`; orchestrator passes audit |
| **FILES CHANGED** | `ai_core/security/service.py`, `ai_core/services/orchestrator.py` |
| **TESTS** | `test_security_service_dual_writes_audit` |
| **RESULT** | PASS |
| **STATUS** | **FIXED** |

---

## GAP-H-001 — Trivial agent health-check

| Field | Value |
|-------|-------|
| **P2-ID** | GAP-H-001 |
| **DESCRIPTION** | Health-check returned HEALTHY for any worker with capabilities |
| **ROOT CAUSE** | Same as GAP-A-004 |
| **FIX** | `probe_worker_health()` checks taxonomy, integration status, capabilities per family |
| **FILES CHANGED** | `ai_core/workers/health.py`, `ai_core/api/v1/agents.py` |
| **TESTS** | `test_agent_health_check_api_reports_probe` |
| **RESULT** | PASS |
| **STATUS** | **FIXED** |

---

## GAP-H-002 — Approval API not integration-tested

| Field | Value |
|-------|-------|
| **P2-ID** | GAP-H-002 |
| **DESCRIPTION** | Missing API tests for approve-denied and reject-success |
| **ROOT CAUSE** | Only orchestrator-level and partial API tests existed |
| **FIX** | Added `test_api_approve_denied_for_guest`, `test_api_reject_success_for_operator` |
| **FILES CHANGED** | `tests/test_ai_core_phase2_p2.py` |
| **TESTS** | Both tests PASS |
| **RESULT** | PASS |
| **STATUS** | **FIXED** |

---

## GAP-I-002 — Commerce write path not implemented

| Field | Value |
|-------|-------|
| **P2-ID** | GAP-I-002 |
| **DESCRIPTION** | `CommerceBridge.write()` always returned pending |
| **ROOT CAUSE** | No approval gate; no HTTP write adapter |
| **FIX** | Added `approval_granted` gate (`APPROVAL_REQUIRED`); HTTP write when `COMMERCE_API_*` configured; honest `EXTERNAL_INTEGRATION_PENDING` when not |
| **FILES CHANGED** | `ai_core/bridge/commerce.py`, `config/settings.py` |
| **TESTS** | `test_commerce_write_requires_approval_and_external_integration` |
| **RESULT** | PASS — approval gate verified; live write not verifiable |
| **STATUS** | **READY_FOR_INTEGRATION** |

---

## GAP-J-002 — No approvals query API

| Field | Value |
|-------|-------|
| **P2-ID** | GAP-J-002 |
| **DESCRIPTION** | `ApprovalRecord` persisted but not queryable via API |
| **ROOT CAUSE** | No `/approvals` router |
| **FIX** | Added `GET /api/v1/approvals` with task_id/decision filters + `ApprovalResponse` schema |
| **FILES CHANGED** | `ai_core/api/v1/approvals.py`, `ai_core/api/v1/router.py`, `ai_core/schemas/api.py` |
| **TESTS** | `test_approvals_query_api` |
| **RESULT** | PASS |
| **STATUS** | **FIXED** |

---

## GAP-M-001 — LLM provider not connected

| Field | Value |
|-------|-------|
| **P2-ID** | GAP-M-001 |
| **DESCRIPTION** | `EnvironmentAIProvider.generate()` raised even with credentials |
| **ROOT CAUSE** | HTTP client deliberately not implemented in Phase 1 |
| **FIX** | Real OpenAI-compatible HTTP client via `urllib` when `LLM_API_KEY` + `LLM_MODEL` set; honest error when not configured |
| **FILES CHANGED** | `ai_core/workers/provider.py`, `config/settings.py` (`LLM_API_BASE`) |
| **TESTS** | `test_llm_provider_not_configured_without_credentials` |
| **RESULT** | PASS — live LLM call not verified (no API key in CI) |
| **STATUS** | **READY_FOR_INTEGRATION** |

---

## GAP-DOC-001 — Architecture doc cross-sync incomplete

| Field | Value |
|-------|-------|
| **P2-ID** | GAP-DOC-001 |
| **DESCRIPTION** | Stale `category-kfz` and hard-coded worker count references |
| **ROOT CAUSE** | Docs written before taxonomy-driven model finalized |
| **FIX** | Updated `PHASE2_DATA_FLOW.md`, `PHASE2_PERMISSION_MATRIX.md`, `PHASE2_ARCHITECTURE_REVIEW.md` |
| **FILES CHANGED** | `docs/buzzard-ai-core/*.md` |
| **TESTS** | N/A |
| **RESULT** | Key architecture docs synced; historical blocker analysis docs retain audit trail |
| **STATUS** | **PARTIALLY_FIXED** |

---

## Test Results (Full Suite)

| Metric | V2=0 | V2=1 |
|--------|------|------|
| **TOTAL** | 467 | 467 |
| **PASSED** | 466 | 466 |
| **FAILED** | 0 | 0 |
| **SKIPPED** | 1 | 1 |
| **ERRORS** | 0 | 0 |

### By Category

| Category | Tests | Result |
|----------|-------|--------|
| Phase 1 | 13 | 13 passed |
| Phase 2 | 127 | 127 passed |
| P0 E2E | 6 | 6 passed |
| Postgres / Alembic | 6 | 6 passed |
| Worker / domain | 12+ | passed |
| Security | 10+ | passed |
| Integration / E2E | 8+ | passed |
| P2 remediation (new) | 18 | 18 passed |

---

*P3 not started. Phase 3 not started. STOP after P2 final verification.*
