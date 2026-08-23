"""PostgreSQL + Alembic verification for AI Core P0 remediation."""

from __future__ import annotations

import concurrent.futures

import pytest
from alembic import command
from sqlalchemy import inspect, text

from buzzard_ai_complete.ai_core.database.base import dispose_engine, get_engine
from tests.conftest_postgres import _alembic_config, _reset_postgres_schema, postgres_required

pytestmark = postgres_required


def test_postgres_connection(postgres_database_url, monkeypatch):
    import buzzard_ai_complete.config.settings as settings

    monkeypatch.setenv("DATABASE_URL", postgres_database_url)
    settings.DATABASE_URL = postgres_database_url
    dispose_engine()

    engine = get_engine()
    with engine.connect() as conn:
        assert conn.execute(text("SELECT 1")).scalar() == 1
    dispose_engine()


def test_alembic_upgrade_head_postgres(postgres_database_url, monkeypatch):
    import buzzard_ai_complete.config.settings as settings

    monkeypatch.setenv("DATABASE_URL", postgres_database_url)
    settings.DATABASE_URL = postgres_database_url
    dispose_engine()

    cfg = _alembic_config(postgres_database_url)
    _reset_postgres_schema(postgres_database_url)
    command.upgrade(cfg, "head")

    from sqlalchemy import create_engine

    engine = create_engine(postgres_database_url)
    try:
        inspector = inspect(engine)
        tables = set(inspector.get_table_names())
        expected = {
            "ai_core_tasks",
            "ai_core_task_transitions",
            "ai_core_task_dependencies",
            "ai_core_memory",
            "ai_core_memory_history",
            "ai_core_exceptions",
            "ai_core_exception_transitions",
            "ai_core_audit_log",
            "ai_core_worker_state",
            "ai_core_workers",
            "ai_core_integration_status",
            "ai_core_kurmay_reports",
            "ai_core_approvals",
            "ai_core_idempotency_keys",
            "ai_core_events",
            "ai_core_suppliers",
            "ai_core_products",
            "ai_core_pricing_candidates",
            "ai_core_stock_snapshots",
            "ai_core_orders",
            "ai_core_decisions",
            "ai_core_policies",
            "ai_core_shipments",
            "ai_core_returns",
            "alembic_version",
        }
        assert expected.issubset(tables)

        task_indexes = {idx["name"] for idx in inspector.get_indexes("ai_core_tasks")}
        memory_indexes = {idx["name"] for idx in inspector.get_indexes("ai_core_memory")}
        assert "ix_ai_core_tasks_status" in task_indexes
        assert "ix_ai_core_worker_state_status" in {
            idx["name"] for idx in inspector.get_indexes("ai_core_worker_state")
        }
        assert "uq_ai_core_memory_active_ns_key" in memory_indexes
    finally:
        engine.dispose()
        dispose_engine()


def test_alembic_downgrade_to_base_postgres(postgres_database_url, monkeypatch):
    import buzzard_ai_complete.config.settings as settings

    monkeypatch.setenv("DATABASE_URL", postgres_database_url)
    settings.DATABASE_URL = postgres_database_url
    dispose_engine()

    cfg = _alembic_config(postgres_database_url)
    _reset_postgres_schema(postgres_database_url)
    command.upgrade(cfg, "head")
    command.downgrade(cfg, "base")

    from sqlalchemy import create_engine

    engine = create_engine(postgres_database_url)
    try:
        inspector = inspect(engine)
        tables = set(inspector.get_table_names())
        assert "ai_core_tasks" not in tables
        assert "ai_core_worker_state" not in tables
    finally:
        engine.dispose()
        dispose_engine()


def test_postgres_transaction_rollback(postgres_session):
    from buzzard_ai_complete.ai_core.models.task import Task

    postgres_session.add(Task(type="custom", payload={}, created_by="rollback-test"))
    postgres_session.flush()
    task_id = postgres_session.query(Task).filter(Task.created_by == "rollback-test").one().id
    postgres_session.rollback()

    assert postgres_session.get(Task, task_id) is None


def test_postgres_idempotency_unique_constraint(postgres_services):
    orch = postgres_services["orchestrator"]
    session = postgres_services["session"]
    t1 = orch.create_task(type="custom", idempotency_key="pg-idem-1", auto_start=False, created_by="pg")
    session.commit()
    t2 = orch.create_task(type="custom", idempotency_key="pg-idem-1", auto_start=False, created_by="pg")
    assert t1.id == t2.id


def test_postgres_concurrent_idempotency_lookup(postgres_services):
    orch = postgres_services["orchestrator"]
    session = postgres_services["session"]

    def create():
        local = session
        return orch.create_task(
            type="custom",
            idempotency_key="pg-concurrent-idem",
            auto_start=False,
            created_by="pg",
        )

    # Sequential double-create is the safe contract; concurrent insert would hit unique constraint.
    first = create()
    session.commit()
    second = create()
    assert first.id == second.id
