"""Remaining P1 remediation tests — closes gaps from PHASE2_P1_RESULT_CHECK."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from buzzard_ai_complete.ai_core.enums import ExceptionSeverity, TaskStatus
from buzzard_ai_complete.ai_core.models.task import Task
from buzzard_ai_complete.ai_core.taxonomy.registry import TaxonomyRegistry
from buzzard_ai_complete.ai_core.workers.registry import build_default_registry, build_phase2_registry
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


# GAP-B-001 / GAP-E-002: failure-path HIGH risk triggers Kurmay child task
def test_worker_failure_high_risk_triggers_kurmay(services, session):
    before = session.query(Task).filter(Task.type == "kurmay_synthesis").count()
    task = services["orchestrator"].create_task(
        type="price_recheck",
        payload={"sku": "FAIL-SKU", "use_commerce_bridge": True},
        created_by="tester",
    )
    assert task.status == TaskStatus.FAILED.value
    after = session.query(Task).filter(Task.type == "kurmay_synthesis").count()
    assert after > before



def test_customs_classify_failure_high_risk_triggers_kurmay(services, session):
    before = session.query(Task).filter(Task.type == "kurmay_synthesis").count()
    task = services["orchestrator"].create_task(
        type="customs_classify",
        payload={"description": "electronic component"},
        created_by="tester",
    )
    assert task.status == TaskStatus.FAILED.value
    after = session.query(Task).filter(Task.type == "kurmay_synthesis").count()
    assert after > before


def test_high_severity_exception_routes_via_coordinator(services, session):
    orch = services["orchestrator"]
    exc = services["exceptions"].create(
        severity=ExceptionSeverity.HIGH.value,
        type="INTEGRATION_FAILURE",
        message="commerce bridge unavailable",
        worker_id="price-engine",
        task_id=None,
        actor="tester",
    )
    session.flush()
    route_task = orch.create_task(
        type="exception_route",
        payload={"exception_id": exc.id},
        created_by="tester",
    )
    assert route_task.result is not None
    assert route_task.result["success"] is True
    assert route_task.result["output"].get("owner")


# GAP-L-002: full lifecycle category → memory → REVIEW → approve → audit
def test_phase2_e2e_full_lifecycle_approve_audit(services, session):
    taxonomy = TaxonomyRegistry()
    node = taxonomy.list_main_categories()[0]
    orch = services["orchestrator"]
    audit = services["audit"]

    task = orch.create_task(
        type="category_scan",
        payload={
            "category_id": node.id,
            "offers": [{"title": "lifecycle-item", "price": 12.5}],
        },
        requires_approval=True,
        created_by="tester",
    )
    assert task.status == TaskStatus.REVIEW.value
    mem = services["memory"].search(q=f"categories/{node.id}", limit=5)
    assert len(mem) >= 1

    approved = orch.approve(task.id, actor="operator", actor_role="operator", note="lifecycle ok")
    assert approved.status == TaskStatus.SUCCESS.value

    entries = audit.list_entries(task_id=task.id)
    actions = {entry.action for entry in entries}
    assert "task.create" in actions
    assert "task.transition" in actions


def test_phase2_e2e_api_reject_requires_operator_role(client, services, session):
    task = services["orchestrator"].create_task(
        type="price_recheck",
        payload={"sku": "R1"},
        requires_approval=True,
        created_by="tester",
    )
    session.commit()
    assert task.status == TaskStatus.REVIEW.value
    settings.API_TOKEN_ROLES = {"test-token-phase1": "guest"}
    resp = client.post(
        f"/api/v1/tasks/{task.id}/transition",
        json={"action": "reject", "note": "no"},
        headers=AUTH_OPERATOR,
    )
    assert resp.status_code == 422


# GAP-L-003 collateral: V2 flag switches registry
def test_v2_flag_switches_worker_registry(monkeypatch):
    monkeypatch.setenv("BUZZARD_AI_CORE_V2", "0")
    settings.BUZZARD_AI_CORE_V2 = False
    phase1 = build_default_registry()
    assert "supplier-hub" not in phase1.list_worker_ids()

    monkeypatch.setenv("BUZZARD_AI_CORE_V2", "1")
    settings.BUZZARD_AI_CORE_V2 = True
    phase2 = build_phase2_registry()
    assert "supplier-hub" in phase2.list_worker_ids()
    taxonomy = TaxonomyRegistry()
    assert len(phase2.list_worker_ids()) >= taxonomy.main_category_count()
