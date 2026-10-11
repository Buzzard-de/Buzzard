"""PostgreSQL fixtures for AI Core P0 verification."""

from __future__ import annotations

import os
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config

from buzzard_ai_complete.ai_core.database.base import dispose_engine, get_engine, get_session_factory

DEFAULT_PG_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+psycopg2://buzzard_test:buzzard_test_secret@localhost:5432/buzzard_ai_core_test",
)


def _alembic_config(database_url: str) -> Config:
    root = Path(__file__).resolve().parents[1]
    cfg = Config(str(root / "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", database_url)
    return cfg


def _postgres_available() -> bool:
    try:
        import psycopg2

        conn = psycopg2.connect(
            host=os.getenv("TEST_PG_HOST", "localhost"),
            port=int(os.getenv("TEST_PG_PORT", "5432")),
            user=os.getenv("TEST_PG_USER", "buzzard_test"),
            password=os.getenv("TEST_PG_PASSWORD", "buzzard_test_secret"),
            dbname=os.getenv("TEST_PG_DB", "buzzard_ai_core_test"),
        )
        conn.close()
        return True
    except Exception:
        return False


postgres_required = pytest.mark.skipif(
    not _postgres_available(),
    reason="PostgreSQL test database is not available",
)


@pytest.fixture(scope="session")
def postgres_database_url():
    if not _postgres_available():
        pytest.skip("PostgreSQL test database is not available")
    return DEFAULT_PG_URL


@pytest.fixture()
def postgres_session(postgres_database_url, monkeypatch):
    import buzzard_ai_complete.config.settings as settings

    monkeypatch.setenv("DATABASE_URL", postgres_database_url)
    settings.DATABASE_URL = postgres_database_url
    dispose_engine()

    cfg = _alembic_config(postgres_database_url)
    command.downgrade(cfg, "base")
    command.upgrade(cfg, "head")

    session = get_session_factory()()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
        dispose_engine()
        import buzzard_ai_complete.config.settings as settings
        from tests.conftest import SQLITE_TEST_URL

        os.environ["DATABASE_URL"] = SQLITE_TEST_URL
        settings.DATABASE_URL = SQLITE_TEST_URL


@pytest.fixture()
def postgres_services(postgres_session):
    from buzzard_ai_complete.ai_core.services.audit_service import AuditService
    from buzzard_ai_complete.ai_core.services.exception_service import ExceptionService
    from buzzard_ai_complete.ai_core.services.memory_service import CentralMemoryService
    from buzzard_ai_complete.ai_core.services.orchestrator import UnifiedOrchestrator

    audit = AuditService(postgres_session)
    memory = CentralMemoryService(postgres_session, audit, "pg-test")
    exceptions = ExceptionService(postgres_session, audit, "pg-test")
    orchestrator = UnifiedOrchestrator(postgres_session, audit, memory, exceptions, "pg-test")
    return {
        "audit": audit,
        "memory": memory,
        "exceptions": exceptions,
        "orchestrator": orchestrator,
        "session": postgres_session,
    }
