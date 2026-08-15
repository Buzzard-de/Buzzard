import tempfile
from pathlib import Path

import buzzard_ai_complete.config.settings as settings

_test_db = Path(tempfile.gettempdir()) / "buzzard_complete_final_test.db"
if _test_db.exists():
    _test_db.unlink()
settings.DB_PATH = _test_db

from buzzard_ai_complete.agents.aslan_bey import AslanBey
from buzzard_ai_complete.agents.esat_bey import EsatBey
from buzzard_ai_complete.database.db import init_db
from buzzard_ai_complete.memory.store import MemoryStore


def setup_module():
    init_db()


def test_full_chain():
    aslan = AslanBey()
    task_id = aslan.create_research_task("T-001", "Research public evidence", "HIGH")
    assert aslan.tasks.get(task_id)["assigned_to"] == "dogu_bey"
    result = aslan.dispatch(task_id, "https://example.com")
    assert result["status"] in {"COMPLETED", "FAILED"}


def test_memory_versioning():
    store = MemoryStore()
    store.put("test", "x", "one", confidence=50)
    store.put("test", "x", "two", confidence=80)
    assert store.get("test", "x")["version"] == 2
    assert len(store.history("test", "x")) >= 1


def test_security_gate():
    esat = EsatBey()
    assert esat.scan_text("hello")["safe"] is True
    assert esat.scan_text("credential exfiltration")["safe"] is False
