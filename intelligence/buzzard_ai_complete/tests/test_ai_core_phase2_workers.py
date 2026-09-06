"""Phase 2 domain worker execution tests — honest external integration behavior."""

from __future__ import annotations

import pytest

from buzzard_ai_complete.ai_core.enums import TaskStatus
from buzzard_ai_complete.ai_core.models.task import Task
from buzzard_ai_complete.ai_core.workers.executor import WorkerExecutor
from buzzard_ai_complete.config import settings


@pytest.fixture(autouse=True)
def enable_v2(monkeypatch):
    monkeypatch.setenv("BUZZARD_AI_CORE_V2", "1")
    settings.BUZZARD_AI_CORE_V2 = True


DOMAIN_TASKS = [
    ("supplier_sync", "supplier-hub", "EXTERNAL_INTEGRATION_PENDING"),
    ("product_enrich", "product-intelligence", "NO_DATA_AVAILABLE"),
    ("stock_sync", "stock-engine", "NO_DATA_AVAILABLE"),
    ("order_check", "order-engine", "NO_DATA_AVAILABLE"),
    ("customs_classify", "customs-classifier", "EXTERNAL_INTEGRATION_PENDING"),
]


@pytest.mark.parametrize("task_type,worker_id,expected_status", DOMAIN_TASKS)
def test_domain_worker_honest_external_status(services, session, task_type, worker_id, expected_status):
    task = Task(type=task_type, payload={"sku": "SKU-1"}, created_by="tester", worker_id=worker_id)
    session.add(task)
    session.flush()
    executor = WorkerExecutor(
        session,
        services["audit"],
        "test-req",
        registry=services["orchestrator"]._execution_registry(),
    )
    result = executor.execute(task)
    assert result.success is False
    assert result.output.get("status") == expected_status


def test_price_recheck_deterministic_success(services, session):
    task = Task(
        type="price_recheck",
        payload={"sku": "OK-1", "base_price": 10.0, "margin": 0.1},
        created_by="tester",
        worker_id="price-engine",
    )
    session.add(task)
    session.flush()
    executor = WorkerExecutor(
        session,
        services["audit"],
        "test-req",
        registry=services["orchestrator"]._execution_registry(),
    )
    result = executor.execute(task)
    assert result.success is True
    assert result.output.get("sku") == "OK-1"
    assert "recommended_price" in result.output


def test_customer_service_deterministic_resolution(services, session):
    task = Task(
        type="customer_service",
        payload={"question": "where is my order?", "ticket_id": "T-1"},
        created_by="tester",
        worker_id="customer-service-ai",
    )
    session.add(task)
    session.flush()
    executor = WorkerExecutor(
        session,
        services["audit"],
        "test-req",
        registry=services["orchestrator"]._execution_registry(),
    )
    result = executor.execute(task)
    assert result.success is True
    assert result.output.get("resolution") == "queued_for_human_review"


def test_security_scan_worker_executes(services, session):
    task = Task(type="security_scan", payload={}, created_by="tester", worker_id="security-ai")
    session.add(task)
    session.flush()
    executor = WorkerExecutor(
        session,
        services["audit"],
        "test-req",
        registry=services["orchestrator"]._execution_registry(),
    )
    result = executor.execute(task)
    assert result.success is True


def test_orchestrator_domain_task_product_enrich_fails_honestly(services):
    task = services["orchestrator"].create_task(
        type="product_enrich",
        payload={"sku": "P-99"},
        created_by="tester",
    )
    assert task.status == TaskStatus.FAILED.value
    assert task.result["output"]["status"] == "NO_DATA_AVAILABLE"
