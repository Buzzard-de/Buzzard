import os
import tempfile

import pytest

pytest_plugins = ["tests.conftest_postgres"]

# Isolated SQLite DB per test session — never touches production paths.
_TEST_DB = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_TEST_DB.close()
SQLITE_TEST_URL = f"sqlite:///{_TEST_DB.name}"
os.environ["DATABASE_URL"] = SQLITE_TEST_URL
os.environ["BUZZARD_API_TOKEN"] = "test-token-phase1"

from buzzard_ai_complete.ai_core.database.base import dispose_engine, get_session_factory, init_ai_core_db  # noqa: E402
from buzzard_ai_complete.ai_core.security.policies import PolicyEngine  # noqa: E402
from buzzard_ai_complete.ai_core.services.audit_service import AuditService  # noqa: E402
from buzzard_ai_complete.ai_core.services.exception_service import ExceptionService  # noqa: E402
from buzzard_ai_complete.ai_core.services.memory_service import CentralMemoryService  # noqa: E402
from buzzard_ai_complete.ai_core.services.orchestrator import UnifiedOrchestrator  # noqa: E402


@pytest.fixture
def session():
    init_ai_core_db()
    db = get_session_factory()()
    yield db
    db.rollback()
    db.close()


@pytest.fixture
def services(session):
    audit = AuditService(session)
    memory = CentralMemoryService(session, audit, "test-req", policy=PolicyEngine())
    exceptions = ExceptionService(session, audit, "test-req")
    orchestrator = UnifiedOrchestrator(session, audit, memory, exceptions, "test-req")
    return {"audit": audit, "memory": memory, "exceptions": exceptions, "orchestrator": orchestrator}


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    dispose_engine()
    init_ai_core_db()
    yield
    dispose_engine()
    try:
        os.unlink(_TEST_DB.name)
    except OSError:
        pass


@pytest.fixture(autouse=True)
def restore_test_settings():
    import buzzard_ai_complete.config.settings as settings

    settings.DATABASE_URL = SQLITE_TEST_URL
    settings.API_TOKEN = os.environ.get("BUZZARD_API_TOKEN", "test-token-phase1")
    settings.API_TOKEN_ROLES = {"test-token-phase1": "operator"}
    settings.ALLOW_ROLE_HEADER = False
    settings.DEFAULT_API_ROLE = "api-user"
    os.environ["DATABASE_URL"] = SQLITE_TEST_URL
    yield
    settings.DATABASE_URL = SQLITE_TEST_URL
    settings.API_TOKEN = os.environ.get("BUZZARD_API_TOKEN", "test-token-phase1")
    settings.API_TOKEN_ROLES = {"test-token-phase1": "operator"}
    settings.ALLOW_ROLE_HEADER = False
    dispose_engine()
