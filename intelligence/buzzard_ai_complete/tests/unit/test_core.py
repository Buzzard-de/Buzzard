import os
import tempfile

from buzzard_ai_complete.database.db import Database
from buzzard_ai_complete.memory.store import MemoryStore
from buzzard_ai_complete.tasks.manager import TaskManager


def test_memory_and_tasks():
    handle = tempfile.NamedTemporaryFile(delete=False)
    handle.close()
    db = Database(handle.name)
    memory = MemoryStore(db)
    assert memory.put("x", {"a": 1}) == 1
    assert memory.latest("x")["a"] == 1
    tasks = TaskManager(db)
    task_id = tasks.create("x", "y")
    assert tasks.list()[0]["id"] == task_id
    os.unlink(handle.name)
