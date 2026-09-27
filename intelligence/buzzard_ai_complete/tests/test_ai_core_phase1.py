import pytest
from fastapi.testclient import TestClient

from buzzard_ai_complete.ai_core.enums import ExceptionSeverity, ExceptionStatus, MemoryType, TaskStatus
from buzzard_ai_complete.api.app import app

AUTH = {"Authorization": "Bearer test-token-phase1"}


def test_task_lifecycle_success(services):
    orch = services["orchestrator"]
    task = orch.create_task(type="category_scan", payload={"scope": "test"}, created_by="tester")
    assert task.status == TaskStatus.SUCCESS.value
    assert task.result is not None
    assert task.result["success"] is True
    assert task.result["execution_mode"] == "deterministic"
    assert "output" in task.result
    mem = services["memory"].get_by_key("tasks", task.id)
    assert mem is not None
    assert mem.type == MemoryType.TASK_RESULT.value


def test_task_requires_approval_flow(services):
    orch = services["orchestrator"]
    task = orch.create_task(
        type="price_recheck",
        payload={"sku": "SKU-1"},
        requires_approval=True,
        created_by="tester",
    )
    assert task.status == TaskStatus.REVIEW.value
    approved = orch.approve(task.id, actor="operator")
    assert approved.status == TaskStatus.SUCCESS.value


def test_task_cancel(services):
    orch = services["orchestrator"]
    task = orch.create_task(type="custom", auto_start=False, created_by="tester")
    cancelled = orch.cancel(task.id, actor="tester")
    assert cancelled.status == TaskStatus.CANCELLED.value


def test_task_idempotency(services):
    orch = services["orchestrator"]
    t1 = orch.create_task(type="custom", idempotency_key="idem-1", auto_start=False, created_by="tester")
    t2 = orch.create_task(type="custom", idempotency_key="idem-1", auto_start=False, created_by="tester")
    assert t1.id == t2.id


def test_task_invalid_transition_raises(services):
    orch = services["orchestrator"]
    task = orch.create_task(type="custom", auto_start=False, created_by="tester")
    with pytest.raises(ValueError):
        orch.transition(task.id, TaskStatus.SUCCESS, actor="tester")


def test_memory_write_and_version(services):
    mem = services["memory"]
    e1 = mem.write(
        source="test",
        entity="ent-1",
        category="cat",
        type=MemoryType.FACT,
        content={"v": 1},
        created_by="tester",
        namespace="ns",
        key="k1",
        confidence=0.9,
        actor_role="operator",
    )
    e2 = mem.write(
        source="test",
        entity="ent-1",
        category="cat",
        type=MemoryType.FACT,
        content={"v": 2},
        created_by="tester",
        namespace="ns",
        key="k1",
        confidence=0.95,
        actor_role="operator",
    )
    assert e1.id == e2.id
    assert e2.version == 2
    history = mem.history(e2.id)
    assert len(history) == 1


def test_exception_lifecycle(services):
    exc_svc = services["exceptions"]
    record = exc_svc.create(
        severity=ExceptionSeverity.MEDIUM,
        type="LOW_MARGIN",
        message="margin below threshold",
        actor="price-engine",
    )
    assert record.status == ExceptionStatus.DETECTED.value
    updated = exc_svc.transition(record.id, ExceptionStatus.CLASSIFIED, actor="operator")
    assert updated.status == ExceptionStatus.CLASSIFIED.value


def test_critical_exception_halts_worker(services):
    exc_svc = services["exceptions"]
    record = exc_svc.create(
        severity=ExceptionSeverity.CRITICAL,
        type="SECURITY_ANOMALY",
        message="critical issue",
        worker_id="price-engine",
        actor="esat-bey",
    )
    assert exc_svc.is_worker_halted("price-engine")
    assert record.worker_halted is True


def test_halted_worker_blocks_task(services):
    exc_svc = services["exceptions"]
    orch = services["orchestrator"]
    exc_svc.create(
        severity=ExceptionSeverity.CRITICAL,
        type="SECURITY_ANOMALY",
        message="halt worker",
        worker_id="price-engine",
        actor="esat-bey",
    )
    task = orch.create_task(type="price_recheck", worker_id="price-engine", auto_start=True, created_by="tester")
    assert task.status == TaskStatus.BLOCKED.value


def test_audit_append_only(services, session):
    audit = services["audit"]
    entry = audit.log(actor="tester", action="test.action", request_id="req-1")
    session.commit()
    entries = audit.list_entries(action="test.action")
    assert len(entries) >= 1
    assert entries[0].id == entry.id


def test_api_tasks_memory_exceptions_audit():
    client = TestClient(app)
    health = client.get("/api/v1/health")
    assert health.status_code == 200
    assert health.json()["status"] == "ok"

    denied = client.post("/api/v1/tasks", json={"type": "custom", "auto_start": False})
    assert denied.status_code == 401

    created = client.post(
        "/api/v1/tasks",
        json={"type": "category_scan", "payload": {"x": 1}, "auto_start": True},
        headers=AUTH,
    )
    assert created.status_code == 201
    task = created.json()
    assert task["status"] == TaskStatus.SUCCESS.value

    mem = client.post(
        "/api/v1/memory",
        json={
            "source": "api-test",
            "entity": "e1",
            "category": "test",
            "type": "FACT",
            "content": {"hello": "world"},
            "namespace": "api",
            "key": "k1",
        },
        headers=AUTH,
    )
    assert mem.status_code == 201

    exc = client.post(
        "/api/v1/exceptions",
        json={"severity": "LOW", "type": "TEST", "message": "api exception"},
        headers=AUTH,
    )
    assert exc.status_code == 201

    audit = client.get("/api/v1/audit", headers=AUTH)
    assert audit.status_code == 200
    assert audit.json()["total"] >= 1


def test_auth_not_configured_returns_503(monkeypatch):
    import buzzard_ai_complete.config.settings as settings

    monkeypatch.setenv("BUZZARD_API_TOKEN", "")
    settings.API_TOKEN = ""
    client = TestClient(app)
    response = client.post("/api/v1/tasks", json={"type": "custom", "auto_start": False})
    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "AUTH_NOT_CONFIGURED"


def test_alembic_migration_upgrade_downgrade(tmp_path, monkeypatch):
    from alembic import command
    from alembic.config import Config
    import buzzard_ai_complete.config.settings as settings
    from buzzard_ai_complete.ai_core.database.base import dispose_engine

    db_file = tmp_path / "alembic_test.db"
    db_url = f"sqlite:///{db_file}"
    monkeypatch.setenv("DATABASE_URL", db_url)
    settings.DATABASE_URL = db_url
    dispose_engine()

    cfg = Config("alembic.ini")
    cfg.set_main_option("sqlalchemy.url", db_url)
    command.upgrade(cfg, "head")
    command.downgrade(cfg, "base")
    command.upgrade(cfg, "head")
    dispose_engine()
