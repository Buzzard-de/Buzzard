from buzzard_ai_gesamt.database.db import connect
from buzzard_ai_gesamt.core.time import now
from buzzard_ai_gesamt.core.events import EventBus
from buzzard_ai_gesamt.memory.store import MemoryStore
from buzzard_ai_gesamt.research.engine import ResearchEngine

class DoguBey:
    name='dogu_bey'; role='Uzman İstihbarat ve Araştırma AI'
    def __init__(self): self.events=EventBus(); self.memory=MemoryStore(); self.research=ResearchEngine()
    def research_url(self,url,namespace='research'):
        result=self.research.fetch(url)
        self.events.emit('RESEARCH_COMPLETED',self.name,{'url':url,'success':'error' not in result})
        return result
    def save_finding(self,key,value,source=None,confidence=0):
        self.memory.put('intelligence',key,value,source,confidence)
        self.events.emit('FINDING_SAVED',self.name,{'key':key,'confidence':confidence})
    def claims(self):
        with connect() as c: return [dict(r) for r in c.execute('SELECT * FROM claims ORDER BY updated_at DESC').fetchall()]
