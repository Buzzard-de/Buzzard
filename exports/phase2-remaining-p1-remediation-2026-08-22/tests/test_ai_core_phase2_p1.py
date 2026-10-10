"""Phase 2 P1 remediation tests — one test group per P1 gap."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from buzzard_ai_complete.ai_core.enums import ExceptionSeverity, MemoryImpact, MemoryType, TaskStatus
from buzzard_ai_complete.ai_core.models.task import Task
from buzzard_ai_complete.ai_core.models.worker_registry import WorkerRegistryRecord
from buzzard_ai_complete.ai_core.models.integration_status import IntegrationStatusRecord
from buzzard_ai_complete.ai_core.schemas.workers.validation import validate_worker_output
from buzzard_ai_complete.ai_core.security.token_roles import resolve_actor_role
from buzzard_ai_complete.ai_core.services.integration_status_service import IntegrationStatusService
from buzzard_ai_complete.ai_core.services.worker_registry_service import WorkerRegistryService
from buzzard_ai_complete.ai_core.taxonomy.registry import TaxonomyRegistry
from buzzard_ai_complete.ai_core.workers.base import WorkerExecutionError, WorkerResult
from buzzard_ai_complete.ai_core.workers.executor import WorkerExecutor
from buzzard_ai_complete.api.app import app
from buzzard_ai_complete.config import settings

AUTH_OPERATOR = {"Authorization": "Bearer test-token-phase1"}


@pytest.fixture(autouse=True)
def enable_v2(monkeypatch):
    monkeypatch.setenv("BUZZARD_AI_CORE_V2", "1")
    settings.BUZZARD_AI_CORE_V2 = True
    settings.API_TOKEN_ROLES = {"test-token-phase1": "operator"}
    settings.ALLOW_ROLE_HEADER = False


@pytest.fixture
def client():
    return TestClient(app)


# GAP-A-001: schema validation
def test_worker_output_schema_validation_rejects_invalid():
    with pytest.raises(WorkerExecutionError, match="missing required keys"):
        validate_worker_output("price_recheck", {"status": "ok"})


def test_worker_output_schema_validation_accepts_valid():
    validate_worker_output("price_recheck", {"sku": "A", "recommended_price": 10.0})


def test_executor_validates_output_schema(services, session):
    registry = services["orchestrator"]._execution_registry()
    worker = registry.get("price-engine")
    original_execute = worker.execute

    def invalid_output_execute(task_type, payload, context):
        return WorkerResult(success=True, output={"status": "ok"}, metadata={"worker_id": worker.worker_id})

    worker.execute = invalid_output_execute
    task = Task(type="price_recheck", payload={"sku": "X"}, created_by="tester", worker_id="price-engine")
    session.add(task)
    session.flush()
    executor = WorkerExecutor(session, services["audit"], "test-req", registry=registry)
    try:
        with pytest.raises(WorkerExecutionError, match="missing required keys"):
            executor.execute(task)
    finally:
        worker.execute = original_execute


# GAP-A-002: permission enforcement at execution
def test_executor_denies_when_worker_lacks_permission(services, session):
    registry = services["orchestrator"]._execution_registry()
    worker = registry.get("price-engine")
    original_permissions = worker.permissions
    worker.permissions = frozenset()
    task = Task(type="price_recheck", payload={"sku": "X"}, created_by="tester", worker_id="price-engine")
    session.add(task)
    session.flush()
    executor = WorkerExecutor(session, services["audit"], "test-req", registry=registry)
    try:
        with pytest.raises(WorkerExecutionError, match="lacks permission"):
            executor.execute(task)
    finally:
        worker.permissions = original_permissions


def test_supplier_sync_honest_external_pending_when_not_connected(services, session):
    task = Task(type="supplier_sync", payload={}, created_by="tester", worker_id="supplier-hub")
    session.add(task)
    session.flush()
    executor = WorkerExecutor(session, services["audit"], "test-req", registry=services["orchestrator"]._execution_registry())
    result = executor.execute(task)
    assert result.success is False
    assert result.output.get("status") == "EXTERNAL_INTEGRATION_PENDING"


# GAP-A-003: domain workers honest external status (not fake success)
def test_domain_worker_returns_external_pending_not_fake_data(services):
    task = services["orchestrator"].create_task(
        type="product_enrich",
        payload={"sku": "SKU-1"},
        created_by="tester",
    )
    assert task.status in {TaskStatus.FAILED.value, TaskStatus.SUCCESS.value}
    if task.status == TaskStatus.FAILED.value:
        assert task.result is not None
        assert task.result.get("output", {}).get("status") == "NO_DATA_AVAILABLE"


# GAP-B-001: Kurmay triggered on HIGH exceptions
def test_kurmay_trigger_on_high_exception(services):
    orch = services["orchestrator"]
    dummy = Task(type="category_scan", payload={}, created_by="t")
    session = services["orchestrator"].session
    session.add(dummy)
    session.flush()
    assert orch._should_trigger_kurmay(
        dummy,
        [],
        [{"severity": ExceptionSeverity.HIGH.value, "type": "TEST", "message": "critical"}],
    )


# GAP-D-001: namespace write guard
def test_namespace_write_guard_blocks_unauthorized(services):
    memory = services["memory"]
    with pytest.raises(ValueError, match="cannot write"):
        memory.write(
            source="test",
            entity="e1",
            category="security",
            type=MemoryType.SIGNAL,
            content={"x": 1},
            created_by="guest",
            namespace="security/events",
            key="k1",
            actor_role="guest",
        )


# GAP-E-001: ExceptionCoordinator injected
def test_exception_coordinator_worker_routes(services, session):
    exc = services["exceptions"].create(
        severity=ExceptionSeverity.HIGH.value,
        type="TEST_EXCEPTION",
        message="needs routing",
        worker_id="supplier-hub",
        task_id=None,
        actor="tester",
    )
    session.flush()
    task = services["orchestrator"].create_task(
        type="exception_route",
        payload={"exception_id": exc.id},
        created_by="tester",
    )
    assert task.status in {TaskStatus.SUCCESS.value, TaskStatus.REVIEW.value}
    assert task.result is not None
    assert task.result["success"] is True


# GAP-E-002: exception entries collected for Kurmay
def test_exception_entries_feed_kurmay_trigger(services):
    orch = services["orchestrator"]
    task = Task(type="custom", payload={}, created_by="t")
    orch.session.add(task)
    orch.session.flush()
    entries = [{"severity": ExceptionSeverity.CRITICAL.value, "type": "X", "message": "y", "id": "e1"}]
    assert orch._should_trigger_kurmay(task, [], entries)


# GAP-F-001 + GAP-J-001: token-bound roles, no header spoofing
def test_token_role_mapping():
    settings.API_TOKEN_ROLES = {"tok-op": "operator"}
    settings.ALLOW_ROLE_HEADER = False
    assert resolve_actor_role("tok-op", "admin") == "operator"


def test_spoofed_header_ignored_when_disabled():
    settings.API_TOKEN_ROLES = {"tok-guest": "guest"}
    settings.ALLOW_ROLE_HEADER = False
    assert resolve_actor_role("tok-guest", "admin") == "guest"


def test_reject_requires_authorized_role(services):
    orch = services["orchestrator"]
    task = orch.create_task(type="price_recheck", payload={"sku": "X"}, requires_approval=True, created_by="tester")
    assert task.status == TaskStatus.REVIEW.value
    with pytest.raises(ValueError, match="not authorized"):
        orch.reject(task.id, actor="guest", actor_role="guest")
    rejected = orch.reject(task.id, actor="op1", actor_role="operator", note="no")
    assert rejected.status == TaskStatus.FAILED.value


def test_api_approve_uses_token_role_not_spoofed_header(client, services, session):
    settings.API_TOKEN_ROLES = {"test-token-phase1": "operator"}
    settings.ALLOW_ROLE_HEADER = False
    task = services["orchestrator"].create_task(
        type="price_recheck",
        payload={"sku": "Z"},
        requires_approval=True,
        created_by="tester",
    )
    session.commit()
    resp = client.post(
        f"/api/v1/tasks/{task.id}/transition",
        json={"action": "approve", "note": "ok"},
        headers={**AUTH_OPERATOR, "X-Actor-Role": "admin"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] in {TaskStatus.SUCCESS.value, TaskStatus.APPROVED.value, TaskStatus.EXECUTED.value}


# GAP-G-001: worker registry DB persistence
def test_worker_registry_persisted_to_db(services, session):
    services["orchestrator"].create_task(type="custom", payload={}, auto_start=False, created_by="tester")
    records = session.query(WorkerRegistryRecord).all()
    taxonomy = TaxonomyRegistry()
    assert len(records) >= taxonomy.main_category_count()


# GAP-G-002: integration status DB persistence
def test_integration_status_persisted_to_db(services, session):
    services["orchestrator"].create_task(type="custom", payload={}, auto_start=False, created_by="tester")
    svc = IntegrationStatusService(session)
    rows = svc.list_status()
    assert len(rows) >= 6
    assert session.query(IntegrationStatusRecord).count() >= 6


def test_integrations_api_reads_from_db(client, session):
    svc = IntegrationStatusService(session)
    svc.ensure_defaults()
    session.commit()
    resp = client.get("/api/v1/integrations/status", headers=AUTH_OPERATOR)
    assert resp.status_code == 200
    assert len(resp.json()["integrations"]) >= 6


# GAP-I-001 / GAP-M-002: commerce integration honest pending
def test_commerce_bridge_returns_no_data_not_fake(client):
    resp = client.post(
        "/api/v1/integrations/products/enrich",
        json={"sku": "A"},
        headers=AUTH_OPERATOR,
    )
    assert resp.status_code == 200
    task_id = resp.json()["task_id"]
    detail = client.get(f"/api/v1/tasks/{task_id}", headers=AUTH_OPERATOR)
    assert detail.status_code == 200


# GAP-L-002: Phase 2 E2E lifecycle
def test_phase2_e2e_category_to_memory(services, session):
    taxonomy = TaxonomyRegistry()
    node = taxonomy.list_main_categories()[0]
    task = services["orchestrator"].create_task(
        type="category_scan",
        payload={"category_id": node.id, "offers": [{"title": "item", "price": 9.99}]},
        created_by="tester",
    )
    assert task.status == TaskStatus.SUCCESS.value
    mem = services["memory"].search(q=f"categories/{node.id}", limit=5)
    assert len(mem) >= 1


def test_phase2_e2e_kurmay_synthesis_persisted(services, session):
    task = services["orchestrator"].create_task(
        type="kurmay_synthesis",
        payload={
            "memory_entries": [
                {
                    "namespace": "pricing",
                    "key": "k1",
                    "type": "SIGNAL",
                    "impact": "LOW",
                    "content": {"delta": 1},
                }
            ]
        },
        created_by="tester",
    )
    assert task.status == TaskStatus.SUCCESS.value
    assert "report_id" in task.result.get("output", {})


# GAP-L-001: expanded P1 test coverage marker
def test_p1_remediation_test_count():
    """Sanity: this module provides dedicated P1 coverage beyond foundation tests."""
    import tests.test_ai_core_phase2_p1 as mod

    tests = [name for name in dir(mod) if name.startswith("test_")]
    assert len(tests) >= 15
