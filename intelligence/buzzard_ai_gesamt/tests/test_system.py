import tempfile
from pathlib import Path
import buzzard_ai_gesamt.config.settings as settings

# Isolate tests from production database.
_test_db=Path(tempfile.gettempdir())/'buzzard_test.db'
if _test_db.exists(): _test_db.unlink()
settings.DB_PATH=_test_db
from buzzard_ai_gesamt.database.db import init_db
from buzzard_ai_gesamt.core.registry import AgentRegistry
from buzzard_ai_gesamt.agents.aslan_bey import AslanBey
from buzzard_ai_gesamt.agents.esat_bey import EsatBey

def setup_function():
    init_db()

def test_agents_and_task_flow():
    r=AgentRegistry(); r.register('dogu_bey','intel'); r.register('aslan_bey','chief'); r.register('esat_bey','security')
    a=AslanBey(); tid=a.create_research_task('Test','Research example','HIGH')
    assert a.tasks.get(tid)['assigned_to']=='dogu_bey'
    assert a.tasks.get(tid)['priority']=='HIGH'

def test_security_event():
    e=EsatBey(); e.record('LOW','TEST','ok'); assert e.recent(1)[0]['event_type']=='TEST'
