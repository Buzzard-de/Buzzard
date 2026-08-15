import uuid

from buzzard_ai_complete.agents.aslan_bey import AslanBey
from buzzard_ai_complete.agents.esat_bey import EsatBey
from buzzard_ai_complete.agents.dogu_bey import DoguBey
from buzzard_ai_complete.memory.store import MemoryStore


def test_full_chain():
    a = AslanBey()
    tid = a.create_research_task("T-001", "Research public evidence", "HIGH")
    assert a.tasks.get(tid)["assigned_to"] == "dogu_bey"
    result = a.dispatch(tid, "https://example.com")
    assert result["status"] in {"COMPLETED", "FAILED"}


def test_memory_versioning():
    suffix = uuid.uuid4().hex[:8]
    namespace = f"test-{suffix}"
    m = MemoryStore()
    m.put(namespace, "x", "one", confidence=50)
    m.put(namespace, "x", "two", confidence=80)
    assert m.get(namespace, "x")["version"] == 2
    assert len(m.history(namespace, "x")) >= 1


def test_security_gate():
    s = EsatBey()
    assert s.scan_text("hello")["safe"] is True
    assert s.scan_text("credential exfiltration")["safe"] is False
