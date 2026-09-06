"""Phase 1 P1 hardening tests."""

from __future__ import annotations

import threading

import pytest
from fastapi.testclient import TestClient

from buzzard_ai_complete.ai_core.database.base import dispose_engine, get_session_factory
from buzzard_ai_complete.ai_core.services.audit_service import AuditService
from buzzard_ai_complete.ai_core.services.exception_service import ExceptionService
from buzzard_ai_complete.ai_core.services.memory_service import CentralMemoryService
from buzzard_ai_complete.ai_core.services.orchestrator import UnifiedOrchestrator
from buzzard_ai_complete.api.app import app

AUTH = {"Authorization": "Bearer test-token-phase1"}


@pytest.fixture
def api_client():
    return TestClient(app)


def test_pagination_total_reflects_full_count(services, session):
    orch = services["orchestrator"]
    before = orch.count_tasks()
    for i in range(3):
        orch.create_task(type="custom", auto_start=False, created_by="tester", idempotency_key=f"page-{i}")
    session.commit()

    assert orch.count_tasks() == before + 3
    page = orch.list_tasks(limit=2, offset=0)
    assert len(page) == 2


def test_http_idempotency_key_header(api_client):
    headers = {**AUTH, "Idempotency-Key": "header-idem-1"}
    first = api_client.post(
        "/api/v1/tasks",
        json={"type": "custom", "auto_start": False},
        headers=headers,
    )
    second = api_client.post(
        "/api/v1/tasks",
        json={"type": "custom", "auto_start": False},
        headers=headers,
    )
    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["id"] == second.json()["id"]


def test_idempotency_header_body_conflict_returns_400(api_client):
    response = api_client.post(
        "/api/v1/tasks",
        json={"type": "custom", "auto_start": False, "idempotency_key": "body-key"},
        headers={**AUTH, "Idempotency-Key": "header-key"},
    )
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "VALIDATION_ERROR"


def test_duplicate_idempotency_integrity_recovery(services, session):
    orch = services["orchestrator"]
    barrier = threading.Barrier(2)
    results: list = []
    errors: list[Exception] = []

    def worker():
        local_session = get_session_factory()()
        try:
            audit = AuditService(local_session)
            memory = CentralMemoryService(local_session, audit, "idem-thread")
            exceptions = ExceptionService(local_session, audit, "idem-thread")
            local_orch = UnifiedOrchestrator(local_session, audit, memory, exceptions, "idem-thread")
            barrier.wait()
            task = local_orch.create_task(
                type="custom",
                idempotency_key="thread-idem-key",
                auto_start=False,
                created_by="thread",
            )
            local_session.commit()
            results.append(task.id)
        except Exception as exc:
            errors.append(exc)
        finally:
            local_session.close()

    t1 = threading.Thread(target=worker)
    t2 = threading.Thread(target=worker)
    t1.start()
    t2.start()
    t1.join()
    t2.join()

    assert not errors
    assert len(results) == 2
    assert results[0] == results[1]
    dispose_engine()


def test_global_request_id_header(api_client):
    response = api_client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.headers.get("X-Request-Id")

    custom = api_client.get("/api/v1/health", headers={"X-Request-Id": "custom-req-123"})
    assert custom.headers.get("X-Request-Id") == "custom-req-123"


def test_api_pagination_total(api_client):
    for i in range(3):
        api_client.post(
            "/api/v1/tasks",
            json={"type": "custom", "auto_start": False, "idempotency_key": f"api-page-{i}"},
            headers=AUTH,
        )
    listing = api_client.get("/api/v1/tasks?page=1&page_size=2", headers=AUTH)
    assert listing.status_code == 200
    body = listing.json()
    assert body["total"] >= 3
    assert len(body["items"]) == 2
    assert body["has_more"] is True


def test_worker_halt_persists_after_service_recreate(services, session):
    exc_svc = services["exceptions"]
    exc_svc.create(
        severity="CRITICAL",
        type="SECURITY_ANOMALY",
        message="p1 halt persistence",
        worker_id="halt-persist-worker",
        actor="esat-bey",
    )
    session.commit()
    assert exc_svc.is_worker_halted("halt-persist-worker")

    session.close()
    dispose_engine()

    new_session = get_session_factory()()
    audit = AuditService(new_session)
    new_exc = ExceptionService(new_session, audit, "restart")
    assert new_exc.is_worker_halted("halt-persist-worker")
    new_session.close()
    dispose_engine()
