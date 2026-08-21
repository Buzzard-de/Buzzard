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

from buzzard_ai_complete.ai_core.database.base import dispose_engine, init_ai_core_db  # noqa: E402


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
    os.environ["DATABASE_URL"] = SQLITE_TEST_URL
    yield
    settings.DATABASE_URL = SQLITE_TEST_URL
    settings.API_TOKEN = os.environ.get("BUZZARD_API_TOKEN", "test-token-phase1")
    os.environ["DATABASE_URL"] = SQLITE_TEST_URL
    dispose_engine()
