import tempfile
from pathlib import Path

import buzzard_ai_complete.config.settings as settings

_test_db = Path(tempfile.gettempdir()) / "buzzard_complete_orchestration_test.db"
if _test_db.exists():
    _test_db.unlink()
settings.DB_PATH = _test_db

from buzzard_ai_complete.core.orchestrator import BuzzardOrchestrator
from buzzard_ai_complete.database.db import init_db


def setup_module():
    init_db()


def test_orchestrator_chain():
    result = BuzzardOrchestrator().run("T-CHAIN", "Build a public-source research plan")
    assert result["task"].status == "COMPLETED"
    assert len(result["task"].subtasks) == 3
