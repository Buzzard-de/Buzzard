import tempfile
from pathlib import Path

import buzzard_ai_gesamt.config.settings as settings

_test_db = Path(tempfile.gettempdir()) / "buzzard_test_v2.db"
if _test_db.exists():
    _test_db.unlink()
settings.DB_PATH = _test_db

from buzzard_ai_gesamt.agents.aslan_bey import AslanBey
from buzzard_ai_gesamt.agents.esat_bey import EsatBey
from buzzard_ai_gesamt.database.db import init_db
from buzzard_ai_gesamt.memory.store import MemoryStore


def setup_module():
    init_db()


def test_memory_versioning():
    store = MemoryStore()
    store.put("test", "x", "one", confidence=50)
    store.put("test", "x", "two", confidence=80)
    assert store.get("test", "x")["version"] == 2
    assert len(store.history("test", "x")) >= 1


def test_task_and_security():
    aslan = AslanBey()
    task_id = aslan.create_research_task("t", "d")
    assert aslan.tasks.get(task_id)["assigned_to"] == "dogu_bey"
    esat = EsatBey()
    assert esat.scan_text("hello")["safe"]
