from buzzard_ai_complete.agents.aslan_bey import AslanBey
from buzzard_ai_complete.agents.esat_bey import EsatBey
from buzzard_ai_complete.agents.dogu_bey import DoguBey
from buzzard_ai_complete.memory.store import MemoryStore

def test_full_chain():
    a=AslanBey()
    tid=a.create_research_task("T-001","Research public evidence","HIGH")
    assert a.tasks.get(tid)["assigned_to"]=="dogu_bey"
    result=a.dispatch(tid,"https://example.com")
    assert result["status"] in {"COMPLETED","FAILED"}

def test_memory_versioning():
    m=MemoryStore()
    m.put("test","x","one",confidence=50)
    m.put("test","x","two",confidence=80)
    assert m.get("test","x")["version"]==2
    assert len(m.history("test","x"))>=1

def test_security_gate():
    s=EsatBey()
    assert s.scan_text("hello")["safe"] is True
    assert s.scan_text("credential exfiltration")["safe"] is False
