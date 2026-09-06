"""P0 end-to-end integration tests on PostgreSQL."""

from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

from buzzard_ai_complete.ai_core.database.base import dispose_engine, get_session_factory
from buzzard_ai_complete.ai_core.enums import TaskStatus
from buzzard_ai_complete.ai_core.services.audit_service import AuditService
from buzzard_ai_complete.ai_core.services.exception_service import ExceptionService
from buzzard_ai_complete.ai_core.services.memory_service import CentralMemoryService
from buzzard_ai_complete.ai_core.services.orchestrator import UnifiedOrchestrator
from buzzard_ai_complete.ai_core.services.worker_state_service import WorkerStateService
from buzzard_ai_complete.api.app import app
from tests.conftest_postgres import postgres_required

pytestmark = postgres_required

AUTH = {"Authorization": "Bearer test-token-phase1"}


def _restore_sqlite_settings() -> None:
    import buzzard_ai_complete.config.settings as settings
    from tests.conftest import SQLITE_TEST_URL

    os.environ["DATABASE_URL"] = SQLITE_TEST_URL
    settings.DATABASE_URL = SQLITE_TEST_URL
    dispose_engine()


def _new_services(postgres_database_url, monkeypatch):
    import buzzard_ai_complete.config.settings as settings

    monkeypatch.setenv("DATABASE_URL", postgres_database_url)
    monkeypatch.setenv("BUZZARD_API_TOKEN", "test-token-phase1")
    settings.DATABASE_URL = postgres_database_url
    settings.API_TOKEN = "test-token-phase1"
    dispose_engine()
    session = get_session_factory()()
    audit = AuditService(session)
    memory = CentralMemoryService(session, audit, "e2e")
    exceptions = ExceptionService(session, audit, "e2e")
    orchestrator = UnifiedOrchestrator(session, audit, memory, exceptions, "e2e")
    return session, audit, memory, exceptions, orchestrator


def test_e2e_task_success_pipeline(postgres_services):
    orch = postgres_services["orchestrator"]
    memory = postgres_services["memory"]
    audit = postgres_services["audit"]
    session = postgres_services["session"]

    task = orch.create_task(
        type="category_scan",
        payload={"scope": "electronics", "categories": ["phones", "laptops"]},
        created_by="e2e",
    )
    session.commit()

    assert task.status == TaskStatus.SUCCESS.value
    assert task.result["success"] is True
    assert task.result["execution_mode"] == "deterministic"
    assert task.result["output"]["categories_found"] >= 2

    mem = memory.get_by_key("tasks", task.id)
    assert mem is not None
    assert mem.content["success"] is True

    audit_entries = audit.list_entries(task_id=task.id)
    actions = {e.action for e in audit_entries}
    assert "task.create" in actions
    assert "worker.execute.start" in actions
    assert "worker.execute.finish" in actions


def test_e2e_task_failure_retry_success(postgres_services):
    orch = postgres_services["orchestrator"]
    session = postgres_services["session"]

    task = orch.create_task(
        type="category_scan",
        payload={"scope": "retry-test", "fail_until_attempt": 2},
        max_attempts=3,
        created_by="e2e",
    )
    session.commit()

    assert task.status == TaskStatus.SUCCESS.value
    assert task.attempts >= 2
    assert task.result["success"] is True


def test_e2e_critical_exception_worker_halt_survives_restart(postgres_services, postgres_database_url, monkeypatch):
    exc_svc = postgres_services["exceptions"]
    session = postgres_services["session"]

    exc_svc.create(
        severity="CRITICAL",
        type="SECURITY_ANOMALY",
        message="halt worker after restart test",
        worker_id="price-engine",
        actor="esat-bey",
    )
    session.commit()
    assert exc_svc.is_worker_halted("price-engine")

    # Simulate application restart: new service instances, same PostgreSQL data.
    dispose_engine()
    session.close()

    _session, _audit, _memory, new_exc, new_orch = _new_services(postgres_database_url, monkeypatch)
    try:
        assert new_exc.is_worker_halted("price-engine")

        task = new_orch.create_task(
            type="price_recheck",
            payload={"sku": "SKU-RESTART"},
            worker_id="price-engine",
            auto_start=True,
            created_by="e2e",
        )
        _session.commit()
        assert task.status == TaskStatus.BLOCKED.value
    finally:
        _session.close()
        _restore_sqlite_settings()


def test_auth_missing_server_token_returns_503(monkeypatch):
    import buzzard_ai_complete.config.settings as settings

    monkeypatch.setenv("BUZZARD_API_TOKEN", "")
    settings.API_TOKEN = ""
    client = TestClient(app)
    response = client.post("/api/v1/tasks", json={"type": "custom", "auto_start": False})
    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "AUTH_NOT_CONFIGURED"


def test_auth_wrong_token_returns_401(monkeypatch):
    import buzzard_ai_complete.config.settings as settings

    monkeypatch.setenv("BUZZARD_API_TOKEN", "configured-token")
    settings.API_TOKEN = "configured-token"
    client = TestClient(app)
    response = client.post(
        "/api/v1/tasks",
        json={"type": "custom", "auto_start": False},
        headers={"Authorization": "Bearer wrong-token"},
    )
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "UNAUTHORIZED"


def test_auth_valid_token_allows_access(postgres_database_url, monkeypatch):
    import buzzard_ai_complete.config.settings as settings

    monkeypatch.setenv("DATABASE_URL", postgres_database_url)
    monkeypatch.setenv("BUZZARD_API_TOKEN", "test-token-phase1")
    settings.DATABASE_URL = postgres_database_url
    settings.API_TOKEN = "test-token-phase1"
    dispose_engine()

    try:
        client = TestClient(app)
        response = client.post(
            "/api/v1/tasks",
            json={"type": "category_scan", "payload": {"scope": "api"}, "auto_start": True},
            headers=AUTH,
        )
        assert response.status_code == 201
        body = response.json()
        assert body["status"] == TaskStatus.SUCCESS.value
        assert body["result"]["execution_mode"] == "deterministic"
    finally:
        _restore_sqlite_settings()
