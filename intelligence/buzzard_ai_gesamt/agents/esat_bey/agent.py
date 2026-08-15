import re
from buzzard_ai_gesamt.database.db import connect
from buzzard_ai_gesamt.core.events import EventBus
from buzzard_ai_gesamt.core.time import now
class EsatBey:
    name='esat_bey'; role='AI Siber Güvenlik ve Savunma Uzmanı'
    def __init__(self): self.events=EventBus()
    def record(self,severity,event_type,message,actor='system'):
        severity=severity.upper()
        if severity not in {'INFO','LOW','MEDIUM','HIGH','CRITICAL'}: raise ValueError('invalid severity')
        with connect() as c:c.execute('INSERT INTO security_events(severity,event_type,actor,message,created_at) VALUES(?,?,?,?,?)',(severity,event_type,actor,message,now()))
        self.events.emit('SECURITY_EVENT',self.name,{'severity':severity,'event_type':event_type})
    def scan_text(self,text):
        patterns={'prompt_injection':r'ignore\s+(all|previous)\s+instructions','credential_like':r'(?i)(api[_-]?key|password|secret)\s*[:=]','path_traversal':r'\.\./','script_tag':r'<\s*script\b'}
        hits=[name for name,pat in patterns.items() if re.search(pat,text)]
        if hits:self.record('HIGH','CONTENT_THREAT',','.join(hits))
        return {'safe':not hits,'findings':hits}
    def recent(self,limit=50):
        with connect() as c:return [dict(r) for r in c.execute('SELECT * FROM security_events ORDER BY id DESC LIMIT ?',(limit,)).fetchall()]
