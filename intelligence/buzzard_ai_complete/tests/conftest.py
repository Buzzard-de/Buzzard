import os
import tempfile

import pytest

# Isolated SQLite DB per test session — never touches production paths.
_TEST_DB = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_TEST_DB.close()
os.environ["DATABASE_URL"] = f"sqlite:///{_TEST_DB.name}"
os.environ["BUZZARD_API_TOKEN"] = "test-token-phase1"

from buzzard_ai_complete.ai_core.database.base import dispose_engine, init_ai_core_db  # noqa: E402
from buzzard_ai_complete.ai_core.services.exception_service import ExceptionService  # noqa: E402


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
def reset_halted_workers():
    ExceptionService.HALTED_WORKERS.clear()
    yield
    ExceptionService.HALTED_WORKERS.clear()
